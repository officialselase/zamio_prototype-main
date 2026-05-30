"""
Celery tasks for artist-related background processing with non-blocking upload processing
"""
import os
import subprocess
import shutil
import uuid
import hashlib
import logging
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Any, List

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth import get_user_model

from artists.models import Track, Fingerprint, UploadProcessingStatus, Contributor, Album
from accounts.models import AuditLog
from artists.utils.audio_loading import AudioLoadError, load_audio_samples
from artists.utils.fingerprint_tracks import simple_fingerprint

logger = logging.getLogger(__name__)

SUPPORTED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.wma'}


User = get_user_model()


def _handle_processing_error(upload_id: str, track_id: int, user_id: int, error_msg: str, error_type: str) -> Dict[str, Any]:
    """Handle processing errors with proper logging and status updates"""
    try:
        # Update processing status
        status = UploadProcessingStatus.objects.get(upload_id=upload_id)
        status.mark_failed(error_msg)

        # Get track for audit logging and flag as failed
        track = Track.objects.get(id=track_id)
        user = User.objects.get(id=user_id)

        track.processing_status = 'failed'
        track.processing_error = error_msg
        track.processed_at = timezone.now()
        track.fingerprinted = False
        track.save(update_fields=['processing_status', 'processing_error', 'processed_at', 'fingerprinted'])
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            action="track_processing_failed",
            resource_type="track",
            resource_id=str(track.track_id),
            request_data={"upload_id": upload_id, "error_type": error_type},
            response_data={"success": False, "error": error_msg},
            status_code=500,
        )
    except Exception:
        pass

    return {
        "success": False,
        "error": error_msg,
        "error_type": error_type,
        "upload_id": upload_id,
        "track_id": track_id,
    }


@shared_task(bind=True, max_retries=3)
def process_track_upload(
    self,
    upload_id: str,
    track_id: int,
    source_file_path: str,
    original_filename: str,
    user_id: int,
) -> Dict[str, Any]:
    """
    Process uploaded track file in background with progress tracking.
    """
    source_temp_path = wav_path = mp3_path = None
    try:
        status = UploadProcessingStatus.objects.get(upload_id=upload_id)
        status.mark_started()
        status.update_progress(10, "Starting file processing")

        track = Track.objects.get(id=track_id)
        user = User.objects.get(id=user_id)

        status.update_progress(20, "Preparing file conversion")

        # Prepare paths
        ext = os.path.splitext(original_filename)[1].lower()
        if not ext:
            ext = os.path.splitext(source_file_path)[1].lower()
        if ext not in SUPPORTED_AUDIO_EXTENSIONS:
            raise ValueError(
                "Unsupported file type. Please upload MP3, WAV, M4A, AAC, FLAC, OGG, OPUS, or WMA audio."
            )

        base = uuid.uuid4().hex
        temp_dir = os.path.join(settings.MEDIA_ROOT, "temp")
        os.makedirs(temp_dir, exist_ok=True)

        source_suffix = ext if ext else ".upload"
        source_temp_path = os.path.join(temp_dir, f"{base}_source{source_suffix}")
        try:
            with default_storage.open(source_file_path, "rb") as stored_file, open(source_temp_path, "wb") as temp_file:
                shutil.copyfileobj(stored_file, temp_file)
        except FileNotFoundError:
            raise FileNotFoundError(f"Stored upload {source_file_path} could not be located for processing")

        wav_path = os.path.join(temp_dir, f"{base}.wav")
        mp3_path = os.path.join(temp_dir, f"{base}.mp3")

        status.update_progress(30, "Converting audio formats")

        # Convert audio formats with FFmpeg
        if ext == ".mp3":
            subprocess.run(
                ["ffmpeg", "-y", "-i", source_temp_path, "-vn", "-ar", "44100", "-ac", "2", wav_path],
                check=True,
                capture_output=True,
            )
            shutil.copyfile(source_temp_path, mp3_path)
        elif ext == ".wav":
            subprocess.run(
                ["ffmpeg", "-y", "-i", source_temp_path, "-vn", "-b:a", "192k", mp3_path],
                check=True,
                capture_output=True,
            )
            shutil.copyfile(source_temp_path, wav_path)
        else:
            subprocess.run(
                ["ffmpeg", "-y", "-i", source_temp_path, "-vn", "-ar", "44100", "-ac", "2", wav_path],
                check=True,
                capture_output=True,
            )
            subprocess.run(
                ["ffmpeg", "-y", "-i", source_temp_path, "-vn", "-b:a", "192k", mp3_path],
                check=True,
                capture_output=True,
            )

        status.update_progress(50, "Extracting audio features")

        # Extract audio features. We decode through FFmpeg instead of librosa's
        # loader because the local audio stack can fail with _signal_api errors.
        samples = sr = duration = None
        try:
            samples, sr = load_audio_samples(wav_path)
            duration = samples.size / sr
        except AudioLoadError as e:
            logger.error(f"Audio loading error for track {track_id}: {str(e)}")
            raise Exception(f"Audio loading failed: {str(e)}")
        except Exception as e:
            logger.error(f"Audio loading error for track {track_id}: {type(e).__name__}: {str(e)}")
            raise Exception(f"Audio loading failed: {str(e)}")
        
        if samples is None or sr is None:
            raise Exception("Audio loading produced empty samples or invalid sample rate")
        
        track.duration = timedelta(seconds=round(duration))

        status.update_progress(60, "Generating fingerprints")
        try:
            fingerprints = simple_fingerprint(samples, sr, plot=False)
            if not fingerprints:
                raise ValueError("No fingerprints generated from audio")
        except Exception as e:
            logger.error(f"Fingerprint generation error for track {track_id}: {str(e)}")
            raise Exception(f"Fingerprint generation failed: {str(e)}")

        status.update_progress(70, "Calculating file hashes")

        def file_hash(path):
            with open(path, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()

        wav_hash = file_hash(wav_path)
        mp3_hash = file_hash(mp3_path)

        status.update_progress(80, "Saving audio files")

        with open(wav_path, "rb") as wav_file, open(mp3_path, "rb") as mp3_file:
            track.audio_file_wav.save(f"{base}.wav", ContentFile(wav_file.read()), save=False)
            track.audio_file_mp3.save(f"{base}.mp3", ContentFile(mp3_file.read()), save=False)

        track.audio_file_hash = wav_hash
        track.fingerprinted = False
        track.processing_status = "completed"
        track.processed_at = timezone.now()
        track.save()

        status.update_progress(85, "Saving fingerprint data")

        if fingerprints:
            Fingerprint.objects.bulk_create(
                [Fingerprint(track=track, hash=h, offset=o) for h, o in fingerprints],
                batch_size=1000,
            )
            cache.delete("fingerprints_index_v1")
            track.fingerprinted = True
            track.save(update_fields=["fingerprinted"])

        status.update_progress(90, "Setting up contributor splits")

        # Ensure default contributor
        if not track.contributors.exists():
            Contributor.objects.create(
                track=track,
                user=user,
                role="Artist",
                percent_split=Decimal("100.00"),
                active=True,
            )

        # Complete
        status.update_progress(100, "Processing completed successfully")
        status.mark_completed(entity_id=track.id, entity_type='track')

        # Audit log
        AuditLog.objects.create(
            user=user,
            action="track_processed",
            resource_type="track",
            resource_id=str(track.track_id),
            request_data={
                "upload_id": upload_id,
                "original_filename": original_filename,
            },
            response_data={
                "success": True,
                "duration_seconds": float(track.duration.total_seconds()) if track.duration else 0,
                "fingerprints_created": len(fingerprints),
                "file_hash": wav_hash,
            },
            status_code=200,
        )

        return {
            "success": True,
            "track_id": track_id,
            "upload_id": upload_id,
            "duration_seconds": float(track.duration.total_seconds()) if track.duration else 0,
            "fingerprints_created": len(fingerprints),
        }

    except FileNotFoundError as e:
        return _handle_processing_error(
            upload_id, track_id, user_id, str(e), "missing_source_file"
        )

    except subprocess.CalledProcessError as e:
        return _handle_processing_error(
            upload_id, track_id, user_id, f"Audio conversion failed: {e.stderr.decode()}", "conversion_failed"
        )

    except Exception as e:
        return _handle_processing_error(upload_id, track_id, user_id, str(e), "processing_failed")

    finally:
        # Clean up temporary files
        for path in [source_temp_path, wav_path, mp3_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        if source_file_path and default_storage.exists(source_file_path):
            try:
                default_storage.delete(source_file_path)
            except Exception:
                pass


@shared_task(bind=True, max_retries=2)
def update_contributor_splits(self, track_id: int, contributors_data: list, user_id: int) -> Dict[str, Any]:
    """
    Update contributor splits for a track.
    """
    try:
        track = Track.objects.get(id=track_id)
        user = User.objects.get(id=user_id)

        total_split = sum(Decimal(str(c["percent_split"])) for c in contributors_data)
        if total_split != Decimal("100.00"):
            raise ValueError(f"Contributor splits must total 100%, got {total_split}%")

        track.contributors.all().delete()

        contributors = [
            Contributor.objects.create(
                track=track,
                user_id=c["user_id"],
                role=c["role"],
                percent_split=Decimal(str(c["percent_split"])),
                active=True,
            )
            for c in contributors_data
        ]

        AuditLog.objects.create(
            user=user,
            action="contributor_splits_updated",
            resource_type="track",
            resource_id=str(track.track_id),
            request_data={"contributors_count": len(contributors), "total_split": float(total_split)},
            response_data={"success": True, "contributors_created": [
                {
                    "id": contrib.id,
                    "user_id": contrib.user_id,
                    "role": contrib.role,
                    "percent_split": float(contrib.percent_split),
                }
                for contrib in contributors
            ]},
            status_code=200,
        )

        return {
            "success": True,
            "track_id": track_id,
            "contributors": [
                {
                    "id": c.id,
                    "user_id": c.user_id,
                    "role": c.role,
                    "percent_split": float(c.percent_split),
                }
                for c in contributors
            ],
            "total_split": float(total_split),
        }

    except Exception as e:
        return {"success": False, "error": str(e), "track_id": track_id}


@shared_task(bind=True, max_retries=3)
def process_cover_art_upload(
    self,
    upload_id: str,
    track_id: int,
    source_file_path: str,
    original_filename: str,
    user_id: int,
) -> Dict[str, Any]:
    """
    Process uploaded cover art file in background with progress tracking.
    """
    source_temp_path = optimized_path = None
    try:
        status = UploadProcessingStatus.objects.get(upload_id=upload_id)
        status.mark_started()
        status.update_progress(10, "Starting cover art processing")

        track = Track.objects.get(id=track_id)
        user = User.objects.get(id=user_id)

        status.update_progress(30, "Validating image file")

        # Validate image file
        from PIL import Image
        ext = os.path.splitext(original_filename)[1].lower()
        if not ext:
            ext = os.path.splitext(source_file_path)[1].lower()
        temp_dir = os.path.join(settings.MEDIA_ROOT, "temp")
        os.makedirs(temp_dir, exist_ok=True)
        source_suffix = ext if ext else ".upload"
        base = uuid.uuid4().hex
        source_temp_path = os.path.join(temp_dir, f"{base}_cover{source_suffix}")
        try:
            with default_storage.open(source_file_path, "rb") as stored_file, open(source_temp_path, "wb") as temp_file:
                shutil.copyfileobj(stored_file, temp_file)
        except FileNotFoundError:
            raise FileNotFoundError(f"Stored upload {source_file_path} could not be located for processing")
        try:
            with Image.open(source_temp_path) as img:
                # Verify it's a valid image
                img.verify()

            # Reopen for processing (verify() closes the file)
            with Image.open(source_temp_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')

                status.update_progress(50, "Optimizing image")

                # Resize if too large (max 1024x1024)
                max_size = (1024, 1024)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)

                # Save optimized image
                optimized_path = source_temp_path + "_optimized.jpg"
                img.save(optimized_path, 'JPEG', quality=85, optimize=True)

        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")

        status.update_progress(70, "Calculating file hash")

        # Calculate file hash
        with open(optimized_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        status.update_progress(80, "Saving cover art")

        # Save to track
        with open(optimized_path, "rb") as img_file:
            track.cover_art.save(
                f"cover_{uuid.uuid4().hex[:8]}.jpg",
                ContentFile(img_file.read()),
                save=False
            )

        track.cover_art_hash = file_hash
        track.save()

        status.update_progress(100, "Cover art processing completed")
        status.mark_completed(entity_id=track.id, entity_type='track')

        # Audit log
        AuditLog.objects.create(
            user=user,
            action="cover_art_processed",
            resource_type="track",
            resource_id=str(track.track_id),
            request_data={
                "upload_id": upload_id,
                "original_filename": original_filename,
            },
            response_data={
                "success": True,
                "file_hash": file_hash,
                "cover_art_url": track.cover_art.url if track.cover_art else None,
            },
            status_code=200,
        )

        return {
            "success": True,
            "track_id": track_id,
            "upload_id": upload_id,
            "cover_art_url": track.cover_art.url if track.cover_art else None,
        }

    except FileNotFoundError as e:
        return _handle_processing_error(
            upload_id, track_id, user_id, str(e), "missing_source_file"
        )

    except Exception as e:
        return _handle_processing_error(
            upload_id, track_id, user_id, str(e), "cover_art_processing_failed"
        )

    finally:
        # Clean up temporary files
        for path in [source_temp_path, optimized_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        if source_file_path and default_storage.exists(source_file_path):
            try:
                default_storage.delete(source_file_path)
            except Exception:
                pass


@shared_task(bind=True, max_retries=2)
def cleanup_failed_uploads(self) -> Dict[str, Any]:
    """
    Clean up failed upload processing records and temporary files.
    """
    try:
        # Find failed uploads older than 24 hours
        cutoff_time = timezone.now() - timedelta(hours=24)
        failed_uploads = UploadProcessingStatus.objects.filter(
            status='failed',
            created_at__lt=cutoff_time
        )

        cleaned_count = 0
        for upload in failed_uploads:
            try:
                temp_storage_key = (upload.metadata or {}).get('internal_temp_storage_path')
                if temp_storage_key and default_storage.exists(temp_storage_key):
                    try:
                        default_storage.delete(temp_storage_key)
                    except Exception:
                        pass
                # Clean up any associated temporary files
                temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
                if os.path.isdir(temp_dir):
                    for filename in os.listdir(temp_dir):
                        if upload.upload_id in filename:
                            os.remove(os.path.join(temp_dir, filename))
                
                # Delete the upload record
                upload.delete()
                cleaned_count += 1
                
            except Exception:
                continue

        return {
            "success": True,
            "cleaned_uploads": cleaned_count,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


def _delete_file_field(file_field) -> str | None:
    """Delete a Django file field safely and return the removed path."""
    if not file_field:
        return None

    file_name = getattr(file_field, "name", None)
    if not file_name:
        return None

    storage = getattr(file_field, "storage", default_storage)
    try:
        if storage.exists(file_name):
            storage.delete(file_name)
    except Exception:
        # Storage clean-up failures shouldn't block the deletion pipeline
        pass

    return file_name


def _delete_track_resources(track: Track) -> Dict[str, Any]:
    """Delete a track and its heavy fingerprint data, returning a summary."""

    track_id = track.id
    track_title = track.title

    removed_files: List[str] = []
    for field_name in ["audio_file", "audio_file_mp3", "audio_file_wav", "cover_art"]:
        removed_path = _delete_file_field(getattr(track, field_name, None))
        if removed_path:
            removed_files.append(removed_path)

    fingerprints_deleted, _ = Fingerprint.objects.filter(track_id=track_id).delete()
    contributors_deleted, _ = track.contributors.all().delete()

    track.delete()

    return {
        "track_id": track_id,
        "track_title": track_title,
        "fingerprints_deleted": fingerprints_deleted,
        "contributors_deleted": contributors_deleted,
        "files_removed": removed_files,
    }


def _delete_album_resources(album: Album) -> Dict[str, Any]:
    """Delete an album and related files."""

    album_id = album.id
    album_title = album.title
    removed_cover = _delete_file_field(getattr(album, "cover_art", None))
    album.delete()

    payload = {
        "album_id": album_id,
        "album_title": album_title,
        "files_removed": [],
    }
    if removed_cover:
        payload["files_removed"].append(removed_cover)
    return payload


def _purge_upload_source_files(metadata: Dict[str, Any]) -> List[str]:
    """Remove any temporary storage keys referenced in upload metadata."""

    removed: List[str] = []
    for key in [
        "internal_temp_storage_path",
        "storage_path",
        "source_storage_path",
    ]:
        storage_key = metadata.get(key)
        if not storage_key:
            continue
        try:
            if default_storage.exists(storage_key):
                default_storage.delete(storage_key)
                removed.append(storage_key)
        except Exception:
            continue
    return removed


@shared_task(bind=True, max_retries=2)
def delete_upload_artifacts(self, upload_id: str, user_id: int) -> Dict[str, Any]:
    """Delete upload related resources asynchronously to improve UX."""

    summary: Dict[str, Any] = {"success": False, "upload_id": upload_id}

    try:
        upload_status = UploadProcessingStatus.objects.filter(upload_id=upload_id, user_id=user_id).first()
        if not upload_status:
            summary["error"] = "Upload not found"
            return summary

        metadata = upload_status.metadata or {}
        removed_files = _purge_upload_source_files(metadata)

        deletion_summary: Dict[str, Any] = {}

        upload_type = getattr(upload_status, "upload_type", "")

        if upload_status.entity_type == "track" and upload_status.entity_id:
            track = Track.objects.filter(id=upload_status.entity_id, artist__user_id=user_id).first()
            if track and upload_type == "track_audio":
                try:
                    track_summary = _delete_track_resources(track)
                    deletion_summary["track"] = track_summary
                    removed_files.extend(track_summary.get("files_removed", []))
                except Exception as track_error:
                    deletion_summary["track"] = {
                        "track_id": upload_status.entity_id,
                        "error": f"Failed to delete track: {str(track_error)}",
                    }
            elif track:
                deletion_summary["track"] = {
                    "track_id": track.id,
                    "track_title": track.title,
                    "skipped": True,
                    "reason": f"Upload type {upload_type} does not remove track",
                }
            else:
                deletion_summary["track"] = {
                    "track_id": upload_status.entity_id,
                    "skipped": True,
                    "reason": "Track already deleted",
                }
        elif upload_status.entity_type == "album" and upload_status.entity_id and upload_type != "album_cover":
            album = Album.objects.filter(id=upload_status.entity_id, artist__user_id=user_id).first()
            if album:
                try:
                    album_summary = _delete_album_resources(album)
                    deletion_summary["album"] = album_summary
                    removed_files.extend(album_summary.get("files_removed", []))
                except Exception as album_error:
                    deletion_summary["album"] = {
                        "album_id": upload_status.entity_id,
                        "error": f"Failed to delete album: {str(album_error)}",
                    }
            else:
                deletion_summary["album"] = {
                    "album_id": upload_status.entity_id,
                    "skipped": True,
                    "reason": "Album already deleted",
                }

        metadata = {
            **metadata,
            "deleted_at": timezone.now().isoformat(),
            "deletion_summary": deletion_summary,
        }

        upload_status.status = "deleted"
        upload_status.progress_percentage = 100
        upload_status.current_step = "Deletion completed"
        upload_status.completed_at = timezone.now()
        upload_status.entity_id = None
        upload_status.entity_type = ""
        upload_status.metadata = metadata
        upload_status.save(
            update_fields=[
                "status",
                "progress_percentage",
                "current_step",
                "completed_at",
                "entity_id",
                "entity_type",
                "metadata",
            ]
        )

        AuditLog.objects.create(
            user_id=user_id,
            action="upload_deletion_completed",
            resource_type="upload",
            resource_id=upload_id,
            request_data={},
            response_data={
                "success": True,
                "removed_files": removed_files,
                "deletion_summary": deletion_summary,
            },
            status_code=200,
        )

        summary.update(
            {
                "success": True,
                "removed_files": removed_files,
                "deletion_summary": deletion_summary,
            }
        )
        return summary


    except Exception as exc:
        summary["error"] = str(exc)

        try:
            upload_status = UploadProcessingStatus.objects.get(upload_id=upload_id, user_id=user_id)
            upload_status.status = "failed"
            upload_status.error_message = f"Deletion failed: {exc}"
            upload_status.save(update_fields=["status", "error_message"])
        except UploadProcessingStatus.DoesNotExist:
            pass

        AuditLog.objects.create(
            user_id=user_id,
            action="upload_deletion_failed",
            resource_type="upload",
            resource_id=upload_id,
            request_data={},
            response_data={"success": False, "error": str(exc)},
            status_code=500,
        )

        return summary


@shared_task(bind=True, max_retries=2)
def delete_track_record(self, track_id: int, user_id: int) -> Dict[str, Any]:
    """Delete a track asynchronously."""

    summary: Dict[str, Any] = {"success": False, "track_id": track_id}

    try:
        track = Track.objects.filter(id=track_id, artist__user_id=user_id).first()
        if not track:
            summary["error"] = "Track not found"
            return summary

        deletion_summary = _delete_track_resources(track)

        AuditLog.objects.create(
            user_id=user_id,
            action="track_deletion_completed",
            resource_type="track",
            resource_id=str(track_id),
            request_data={},
            response_data={
                "success": True,
                **deletion_summary,
            },
            status_code=200,
        )

        summary.update({"success": True, **deletion_summary})
        return summary

    except Exception as exc:
        summary["error"] = str(exc)

        AuditLog.objects.create(
            user_id=user_id,
            action="track_deletion_failed",
            resource_type="track",
            resource_id=str(track_id),
            request_data={},
            response_data={"success": False, "error": str(exc)},
            status_code=500,
        )

        return summary
