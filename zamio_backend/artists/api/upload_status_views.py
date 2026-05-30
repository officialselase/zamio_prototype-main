"""API views for non-blocking upload processing with real-time status tracking."""
import uuid
import os
import math
import json
import mimetypes
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Count
from django.utils.dateparse import parse_date
from django.core.files.storage import default_storage
from accounts.models import AuditLog
from artists.models import Track, Album, Artist, UploadProcessingStatus, Contributor, Genre
from .album_management_views import _parse_release_date, _resolve_genre
from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.tasks import (
    process_track_upload,
    process_cover_art_upload,
    update_contributor_splits,
    delete_upload_artifacts,
)
from artists.services.media_file_service import MediaFileService


def resolve_upload_mime_type(upload):
    """Return the most accurate MIME type available for an upload record."""
    metadata = getattr(upload, "metadata", None) or {}

    candidate = getattr(upload, "mime_type", "") or metadata.get("mime_type") or metadata.get("file_type")
    if candidate:
        return candidate

    original_filename = getattr(upload, "original_filename", "")
    if original_filename:
        guess, _ = mimetypes.guess_type(original_filename)
        if guess:
            return guess

    return ""


def _normalize_identifier(value, field_name):
    """Return an integer identifier or None, raising ValueError for invalid input."""
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        value = stripped
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid {field_name} supplied") from exc


@api_view(['POST'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def initiate_non_blocking_upload(request):
    """
    Initiate non-blocking upload processing with immediate response
    """
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Verify user is an artist
        try:
            artist = Artist.objects.get(user=user)
        except Artist.DoesNotExist:
            payload['message'] = 'User is not registered as an artist'
            payload['errors'] = {'user': ['Only artists can upload tracks']}
            return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
        # Get upload type and file
        upload_type = request.data.get('upload_type')  # 'track_audio', 'track_cover', 'album_cover'
        uploaded_file = request.FILES.get('file')
        
        def parse_bool(value, default=False):
            if isinstance(value, bool):
                return value
            if value is None:
                return default
            return str(value).strip().lower() in {'true', '1', 'yes', 'on'}

        # Extract metadata from the request payload
        metadata = {
            'title': (request.data.get('title') or '').strip(),
            'track_id': request.data.get('track_id'),
            'album_id': request.data.get('album_id'),
            'album_title': (request.data.get('album_title') or '').strip(),
            'artist_name': (request.data.get('artist_name') or '').strip(),
            'genre_id': request.data.get('genre_id'),
            'genre_name': (request.data.get('genre_name') or '').strip(),
            'release_date': request.data.get('release_date'),
            'explicit': parse_bool(request.data.get('explicit', False)),
            'lyrics': request.data.get('lyrics', ''),
            'duration': (request.data.get('duration') or '').strip(),
            'isrc': (request.data.get('isrc') or '').strip(),
            'composer': (request.data.get('composer') or '').strip(),
            'producer': (request.data.get('producer') or '').strip(),
            'bpm': (request.data.get('bpm') or '').strip(),
            'key': (request.data.get('key') or '').strip(),
            'mood': (request.data.get('mood') or '').strip(),
            'language': (request.data.get('language') or '').strip(),
            'featured': parse_bool(request.data.get('featured', False)),
            'tags': [],
            'station_name': (request.data.get('station_name') or '').strip(),
        }

        contributors_payload = request.data.get('contributors')
        contributors_data = []
        if contributors_payload:
            try:
                if isinstance(contributors_payload, str):
                    parsed_contributors = json.loads(contributors_payload)
                else:
                    parsed_contributors = contributors_payload
            except (TypeError, json.JSONDecodeError):
                parsed_contributors = []

            if isinstance(parsed_contributors, (list, tuple)):
                for entry in parsed_contributors:
                    if not isinstance(entry, dict):
                        continue
                    contributor_record = {
                        'name': str(entry.get('name', '')).strip(),
                        'email': str(entry.get('email', '')).strip(),
                        'role': str(entry.get('role', '')).strip(),
                        'percent_split': float(
                            entry.get('percent_split', entry.get('royaltyPercentage', 0)) or 0
                        ),
                    }
                    phone_value = entry.get('phone')
                    if phone_value:
                        contributor_record['phone'] = str(phone_value).strip()
                    contributors_data.append(contributor_record)

        if contributors_data:
            metadata['contributors'] = contributors_data

        tags_payload = []
        if hasattr(request.data, 'getlist'):
            tags_payload = request.data.getlist('tags') or request.data.getlist('tags[]')
        if not tags_payload:
            tags_value = request.data.get('tags')
            if isinstance(tags_value, list):
                tags_payload = tags_value
            elif isinstance(tags_value, str):
                tags_payload = [tag.strip() for tag in tags_value.split(',') if tag.strip()]

        metadata['tags'] = [tag for tag in tags_payload if tag]

        if uploaded_file:
            metadata['file_type'] = uploaded_file.content_type
            metadata['file_size_bytes'] = uploaded_file.size
        else:
            metadata['file_type'] = ''
            metadata['file_size_bytes'] = 0

        # Validate required fields
        if not uploaded_file:
            payload['message'] = 'File is required'
            payload['errors'] = {'file': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        if not upload_type:
            payload['message'] = 'Upload type is required'
            payload['errors'] = {'upload_type': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Validate upload type
        valid_upload_types = ['track_audio', 'track_cover', 'album_cover']
        if upload_type not in valid_upload_types:
            payload['message'] = 'Invalid upload type'
            payload['errors'] = {'upload_type': [f'Must be one of: {", ".join(valid_upload_types)}']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Normalize identifiers to integers where applicable
        try:
            metadata['track_id'] = _normalize_identifier(metadata.get('track_id'), 'track ID')
        except ValueError as exc:
            payload['message'] = 'Track identifier is invalid'
            payload['errors'] = {'track_id': [str(exc)]}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        try:
            metadata['album_id'] = _normalize_identifier(metadata.get('album_id'), 'album ID')
        except ValueError as exc:
            payload['message'] = 'Album identifier is invalid'
            payload['errors'] = {'album_id': [str(exc)]}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        try:
            metadata['genre_id'] = _normalize_identifier(metadata.get('genre_id'), 'genre ID')
        except ValueError as exc:
            payload['message'] = 'Genre identifier is invalid'
            payload['errors'] = {'genre_id': [str(exc)]}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # For track uploads, title is required
        if upload_type == 'track_audio' and not metadata['title']:
            payload['message'] = 'Track title is required'
            payload['errors'] = {'title': ['This field is required for track uploads']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        if upload_type == 'track_cover' and not metadata['track_id']:
            payload['message'] = 'Track ID is required for cover uploads'
            payload['errors'] = {'track_id': ['Track ID must be provided when uploading track cover art']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        if upload_type == 'album_cover' and not metadata['album_id']:
            payload['message'] = 'Album ID is required for album cover uploads'
            payload['errors'] = {'album_id': ['Album ID must be provided when uploading album cover art']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Validate track ownership if updating existing track
        track = None
        if metadata['track_id']:
            try:
                track = Track.objects.get(id=metadata['track_id'], artist=artist)
            except Track.DoesNotExist:
                payload['message'] = 'Track not found or access denied'
                payload['errors'] = {'track_id': ['Track not found or you do not have permission to modify it']}
                return Response(payload, status=status.HTTP_404_NOT_FOUND)

        # Validate file based on upload type
        try:
            if upload_type == 'track_audio':
                MediaFileService.validate_media_file(uploaded_file, 'audio')
            else:  # cover art
                MediaFileService.validate_media_file(uploaded_file, 'image')
        except ValidationError as e:
            payload['message'] = 'File validation failed'
            payload['errors'] = {'file': e.messages if hasattr(e, 'messages') else [str(e)]}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        metadata['artist_name'] = metadata['artist_name'] or artist.stage_name

        release_date_value = metadata.get('release_date')
        release_date_obj = parse_date(release_date_value) if release_date_value else None

        genre = None
        genre_identifier = metadata.get('genre_id')
        if genre_identifier:
            try:
                genre = Genre.objects.get(id=genre_identifier)
            except (Genre.DoesNotExist, ValueError, TypeError):
                genre = None
        if not genre and metadata.get('genre_name'):
            genre, _ = Genre.objects.get_or_create(name=metadata['genre_name'])
        if genre:
            metadata['genre_id'] = genre.id
            metadata['genre_name'] = genre.name

        album = None
        if metadata.get('album_id'):
            try:
                album = Album.objects.get(id=metadata['album_id'], artist=artist)
            except Album.DoesNotExist:
                album = None

        if not album and upload_type == 'track_audio' and metadata.get('album_title'):
            album_title = metadata['album_title']
            album_defaults = {}
            if release_date_obj:
                album_defaults['release_date'] = release_date_obj
            album, _ = Album.objects.get_or_create(
                artist=artist,
                title=album_title,
                defaults={**album_defaults, 'active': True}
            )

        if album:
            updates = []
            if release_date_obj and album.release_date != release_date_obj:
                album.release_date = release_date_obj
                updates.append('release_date')
            if genre and album.genre_id != genre.id:
                album.genre = genre
                updates.append('genre')
            if updates:
                album.save(update_fields=updates)
            metadata['album_id'] = album.id
            metadata['album_title'] = album.title

        # Generate unique upload ID
        upload_id = f"{upload_type}_{uuid.uuid4().hex[:16]}"

        # Create or update track record if needed
        if upload_type == 'track_audio':
            if not track:
                # Create new track
                track = Track.objects.create(
                    artist=artist,
                    title=metadata['title'],
                    genre=genre,
                    album=album,
                    release_date=release_date_obj,
                    explicit=metadata['explicit'],
                    lyrics=metadata['lyrics'],
                    processing_status='queued',
                    active=True  # Ensure track is active for matching
                )
            else:
                track_updates = []
                if album and track.album_id != album.id:
                    track.album = album
                    track_updates.append('album')
                if genre and track.genre_id != genre.id:
                    track.genre = genre
                    track_updates.append('genre')
                if release_date_obj and track.release_date != release_date_obj:
                    track.release_date = release_date_obj
                    track_updates.append('release_date')
                if track.processing_status != 'queued':
                    track.processing_status = 'queued'
                    track_updates.append('processing_status')
                if track_updates:
                    track.save(update_fields=track_updates)

            metadata['track_id'] = track.id
            metadata['genre_id'] = track.genre_id
            if track.album:
                metadata['album_id'] = track.album_id
                metadata['album_title'] = track.album.title
            metadata['title'] = track.title
            metadata['artist_name'] = track.artist.stage_name

        # Save file to temporary location
        original_name = os.path.basename(uploaded_file.name)
        original_filename = original_name
        file_size = uploaded_file.size
        mime_type = uploaded_file.content_type or ''
        _, original_ext = os.path.splitext(original_name)
        sanitized_name = f"{upload_id}_{uuid.uuid4().hex}{original_ext.lower()}" if original_ext else f"{upload_id}_{uuid.uuid4().hex}"
        storage_subdir = 'temp'
        if hasattr(default_storage, 'path'):
            os.makedirs(os.path.join(settings.MEDIA_ROOT, storage_subdir), exist_ok=True)
        storage_key = os.path.join(storage_subdir, sanitized_name).replace('\\', '/')
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        stored_file_path = default_storage.save(storage_key, uploaded_file)
        metadata['internal_temp_storage_path'] = stored_file_path

        # Create upload processing status record
        upload_status = UploadProcessingStatus.objects.create(
            upload_id=upload_id,
            user=user,
            upload_type=upload_type,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
            status='queued',
            entity_id=track.id if track else None,
            entity_type='track' if track else None,
            metadata=metadata
        )

        # Queue appropriate background task
        if upload_type == 'track_audio':
            process_track_upload.delay(
                upload_id=upload_id,
                track_id=track.id,
                source_file_path=stored_file_path,
                original_filename=original_filename,
                user_id=user.id
            )
        elif upload_type in ['track_cover', 'album_cover']:
            process_cover_art_upload.delay(
                upload_id=upload_id,
                track_id=track.id if track else None,
                source_file_path=stored_file_path,
                original_filename=original_filename,
                user_id=user.id
            )
        
        # Log upload initiation
        AuditLog.objects.create(
            user=user,
            action='upload_initiated',
            resource_type='upload',
            resource_id=upload_id,
            request_data={
                'upload_type': upload_type,
                'filename': original_filename,
                'file_size': file_size,
                'track_id': track.id if track else None,
                'metadata': metadata
            },
            response_data={
                'upload_id': upload_id,
                'status': 'queued'
            },
            status_code=202
        )
        
        payload['message'] = 'Upload initiated successfully'
        payload['data'] = {
            'upload_id': upload_id,
            'status': 'queued',
            'track_id': track.id if track else None,
            'upload_type': upload_type,
            'estimated_processing_time': '2-5 minutes',
            'status_check_url': f'/api/artists/upload-status/{upload_id}/'
        }
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        payload['message'] = 'Upload initiation failed'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_upload_status(request, upload_id):
    """
    Get real-time status of upload processing
    """
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Get upload status record
        try:
            upload_status = UploadProcessingStatus.objects.get(
                upload_id=upload_id,
                user=user
            )
        except UploadProcessingStatus.DoesNotExist:
            payload['message'] = 'Upload not found or access denied'
            payload['errors'] = {'upload_id': ['Upload not found or you do not have permission to view it']}
            return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
        # Get track/album details if available
        entity_details = None
        if upload_status.entity_id and upload_status.entity_type == 'track':
            try:
                track = Track.objects.get(id=upload_status.entity_id)
                entity_details = {
                    'id': track.id,
                    'title': track.title,
                    'processing_status': track.processing_status,
                    'can_be_published': track.can_be_published(),
                    'contributor_splits_valid': track.validate_contributor_splits()[0],
                    'audio_file_url': track.audio_file.url if track.audio_file else None,
                    'cover_art_url': track.cover_art.url if track.cover_art else None,
                }
            except Track.DoesNotExist:
                pass
        
        payload['message'] = 'Upload status retrieved successfully'
        payload['data'] = {
            'upload_id': upload_id,
            'status': upload_status.status,
            'progress_percentage': upload_status.progress_percentage,
            'current_step': upload_status.current_step,
            'upload_type': upload_status.upload_type,
            'original_filename': upload_status.original_filename,
            'file_size': upload_status.file_size,
            'mime_type': resolve_upload_mime_type(upload_status),
            'error_message': upload_status.error_message,
            'created_at': upload_status.created_at.isoformat(),
            'started_at': upload_status.started_at.isoformat() if upload_status.started_at else None,
            'completed_at': upload_status.completed_at.isoformat() if upload_status.completed_at else None,
            'entity_details': entity_details,
            'metadata': upload_status.metadata
        }
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        payload['message'] = 'Failed to retrieve upload status'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_uploads(request):
    """Return upload records, stats, and pagination for the authenticated artist."""
    payload = {'message': '', 'data': {}, 'errors': {}}

    try:
        user = request.user

        base_query = UploadProcessingStatus.objects.filter(user=user).exclude(status='deleted')
        upload_type_filter = request.GET.get('upload_type')
        excluded_cover_types = ['track_cover', 'album_cover']

        if upload_type_filter == 'cover_art':
            filtered_query = base_query.filter(upload_type__in=excluded_cover_types)
        elif upload_type_filter:
            filtered_query = base_query.filter(upload_type=upload_type_filter)
        else:
            filtered_query = base_query.exclude(upload_type__in=excluded_cover_types)

        status_totals = filtered_query.values('status').annotate(total=Count('id'))
        totals_map = {entry['status']: entry['total'] for entry in status_totals}
        stats = {
            'total': filtered_query.count(),
            'uploading': sum(totals_map.get(status_key, 0) for status_key in ['pending', 'queued']),
            'processing': totals_map.get('processing', 0) + totals_map.get('deleting', 0),
            'completed': totals_map.get('completed', 0),
            'failed': totals_map.get('failed', 0) + totals_map.get('cancelled', 0),
        }

        albums_from_metadata = filtered_query.exclude(metadata__album_title__isnull=True).exclude(metadata__album_title__exact='').values_list('metadata__album_title', flat=True)
        album_titles = {title for title in albums_from_metadata if title}

        track_ids_for_albums = list(filtered_query.filter(entity_type='track', entity_id__isnull=False).values_list('entity_id', flat=True))
        if track_ids_for_albums:
            album_names = Track.objects.filter(id__in=track_ids_for_albums).select_related('album').values_list('album__title', flat=True)
            album_titles.update(name for name in album_names if name)

        page = max(int(request.GET.get('page', 1)), 1)
        page_size = min(max(int(request.GET.get('page_size', 20)), 1), 100)
        status_filter = request.GET.get('status')
        search_term = (request.GET.get('search') or '').strip()
        album_filter = (request.GET.get('album') or '').strip()
        sort_by = request.GET.get('sort_by', 'uploadDate')
        sort_order = request.GET.get('sort_order', 'desc')

        uploads_query = filtered_query

        status_map = {
            'uploading': ['pending', 'queued'],
            'processing': ['processing', 'deleting'],
            'completed': ['completed'],
            'failed': ['failed', 'cancelled'],
            'cancelled': ['cancelled'],
        }

        if status_filter and status_filter != 'all':
            uploads_query = uploads_query.filter(status__in=status_map.get(status_filter, [status_filter]))

        if upload_type_filter == 'cover_art':
            uploads_query = uploads_query.filter(upload_type__in=excluded_cover_types)
        elif upload_type_filter:
            uploads_query = uploads_query.filter(upload_type=upload_type_filter)

        if search_term:
            track_ids_for_search = list(
                Track.objects.filter(
                    Q(title__icontains=search_term) | Q(album__title__icontains=search_term),
                    artist__user=user,
                ).values_list('id', flat=True)
            )
            uploads_query = uploads_query.filter(
                Q(original_filename__icontains=search_term) |
                Q(metadata__title__icontains=search_term) |
                Q(metadata__album_title__icontains=search_term) |
                Q(metadata__artist_name__icontains=search_term) |
                Q(metadata__station_name__icontains=search_term) |
                Q(entity_id__in=track_ids_for_search)
            )

        if album_filter:
            track_ids_for_album = list(
                Track.objects.filter(
                    artist__user=user,
                    album__title__iexact=album_filter
                ).values_list('id', flat=True)
            )
            uploads_query = uploads_query.filter(
                Q(metadata__album_title__iexact=album_filter) |
                Q(entity_id__in=track_ids_for_album)
            )

        ORDERING_MAP = {
            'uploadDate': 'created_at',
            'filename': 'original_filename',
            'fileSize': 'file_size',
            'status': 'status',
        }

        manual_album_sort = sort_by == 'album'
        if manual_album_sort:
            uploads_query = uploads_query.order_by('-created_at')
        else:
            order_field = ORDERING_MAP.get(sort_by, 'created_at')
            if sort_order == 'desc':
                order_field = f'-{order_field}'
            uploads_query = uploads_query.order_by(order_field)

        uploads_list = list(uploads_query)

        track_ids = [upload.entity_id for upload in uploads_list if upload.entity_type == 'track' and upload.entity_id]
        tracks = Track.objects.filter(id__in=track_ids).select_related('artist', 'album')
        track_map = {track.id: track for track in tracks}

        album_ids = set()
        for track in tracks:
            if track.album_id:
                album_ids.add(track.album_id)

        for upload in uploads_list:
            metadata = upload.metadata or {}
            album_identifier = metadata.get('album_id')
            if album_identifier is None:
                continue
            try:
                album_ids.add(int(album_identifier))
            except (TypeError, ValueError):
                continue

        album_map = {
            album.id: album
            for album in Album.objects.filter(id__in=album_ids).select_related('artist')
        }

        def resolve_album_title(upload):
            if upload.entity_type == 'track' and upload.entity_id in track_map:
                album_obj = track_map[upload.entity_id].album
                if album_obj and album_obj.title:
                    return album_obj.title
            metadata = upload.metadata or {}
            return metadata.get('album_title', '') or ''

        if manual_album_sort:
            uploads_list.sort(
                key=lambda item: resolve_album_title(item).lower(),
                reverse=sort_order == 'desc'
            )

        total_count = len(uploads_list)
        if total_count == 0:
            total_pages = 1
            page = 1
        else:
            total_pages = math.ceil(total_count / page_size)
            if page > total_pages:
                page = total_pages

        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        uploads_page = uploads_list[start_index:end_index]

        def map_status(value):
            return {
                'pending': 'uploading',
                'queued': 'uploading',
                'processing': 'processing',
                'deleting': 'processing',
                'completed': 'completed',
                'failed': 'failed',
                'cancelled': 'cancelled',
                'deleted': 'completed',
            }.get(value, value)

        def format_duration_value(upload, track):
            metadata = upload.metadata or {}
            if metadata.get('duration'):
                return metadata['duration']
            if track and track.duration:
                total_seconds = int(track.duration.total_seconds())
                hours, remainder = divmod(total_seconds, 3600)
                minutes, seconds = divmod(remainder, 60)
                if hours:
                    return f"{hours}:{minutes:02d}:{seconds:02d}"
                return f"{minutes}:{seconds:02d}"
            return None

        uploads_data = []
        for upload in uploads_page:
            metadata = upload.metadata or {}
            track = track_map.get(upload.entity_id) if upload.entity_type == 'track' else None
            album_title = resolve_album_title(upload)
            artist_name = metadata.get('artist_name') or (track.artist.stage_name if track and track.artist else None)
            title = metadata.get('title') or (track.title if track else None)
            station_name = metadata.get('station_name')
            duration_value = format_duration_value(upload, track)
            file_type = resolve_upload_mime_type(upload)

            cover_art_url = None
            if track and getattr(track, 'cover_art', None):
                try:
                    cover_art_url = track.cover_art.url
                except ValueError:
                    cover_art_url = track.cover_art.name or None
            if not cover_art_url:
                cover_art_url = metadata.get('cover_art_url') or metadata.get('cover_url') or None

            album_cover_url = None
            album_obj = None
            if track and track.album_id:
                album_obj = track.album or album_map.get(track.album_id)
            if not album_obj:
                album_identifier = metadata.get('album_id')
                if album_identifier is not None:
                    try:
                        album_obj = album_map.get(int(album_identifier))
                    except (TypeError, ValueError):
                        album_obj = None
            if album_obj and getattr(album_obj, 'cover_art', None):
                try:
                    album_cover_url = album_obj.cover_art.url
                except ValueError:
                    album_cover_url = album_obj.cover_art.name or None
            if not album_cover_url:
                album_cover_url = metadata.get('album_cover_url') or None

            uploads_data.append({
                'id': upload.upload_id,
                'upload_id': upload.upload_id,
                'status': map_status(upload.status),
                'raw_status': upload.status,
                'progress': upload.progress_percentage,
                'upload_type': upload.upload_type,
                'filename': upload.original_filename,
                'file_size': upload.file_size,
                'file_type': file_type,
                'upload_date': upload.created_at.isoformat(),
                'error': upload.error_message or None,
                'retry_count': upload.retry_count,
                'duration': duration_value,
                'artist': artist_name,
                'album': album_title or None,
                'title': title,
                'station': station_name or None,
                'entity_id': upload.entity_id,
                'entity_type': upload.entity_type or None,
                'metadata': metadata,
                'cover_art_url': cover_art_url,
                'album_cover_url': album_cover_url,
            })

        payload['message'] = 'Uploads retrieved successfully'
        payload['data'] = {
            'uploads': uploads_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': end_index < total_count,
                'has_previous': page > 1,
            },
            'stats': stats,
            'filters': {
                'albums': sorted(album_titles),
                'status_counts': {
                    'pending': totals_map.get('pending', 0),
                    'queued': totals_map.get('queued', 0),
                    'processing': totals_map.get('processing', 0),
                    'completed': totals_map.get('completed', 0),
                    'failed': totals_map.get('failed', 0),
                    'cancelled': totals_map.get('cancelled', 0),
                },
                'frontend_status_counts': {
                    'uploading': stats['uploading'],
                    'processing': stats['processing'],
                    'completed': stats['completed'],
                    'failed': stats['failed'],
                },
            },
        }
        return Response(payload, status=status.HTTP_200_OK)

    except Exception as e:
        payload['message'] = 'Failed to retrieve uploads'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def create_album_for_uploads(request):
    """Create or fetch an album for the authenticated artist."""
    payload = {'message': '', 'data': {}, 'errors': {}}

    try:
        try:
            artist = Artist.objects.get(user=request.user)
        except Artist.DoesNotExist:
            payload['message'] = 'User is not registered as an artist'
            payload['errors'] = {'user': ['Only artists can create albums']}
            return Response(payload, status=status.HTTP_403_FORBIDDEN)

        title = (request.data.get('title') or '').strip()
        if not title:
            payload['message'] = 'Album title is required'
            payload['errors'] = {'title': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        release_date_raw = request.data.get('release_date')
        genre_name = (request.data.get('genre') or request.data.get('genre_name') or '').strip()
        release_date_value = _parse_release_date(release_date_raw)
        if release_date_raw and release_date_value is None:
            payload['message'] = 'Invalid release date'
            payload['errors'] = {'release_date': ['Use the YYYY-MM-DD date format']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        try:
            genre = _resolve_genre(request.data.get('genre_id'), genre_name)
        except Genre.DoesNotExist:
            payload['message'] = 'Genre not found'
            payload['errors'] = {'genre': ['The provided genre could not be found']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        album = Album.objects.filter(artist=artist, title__iexact=title).first()
        created = False

        if album and album.is_archived:
            album.is_archived = False
            album.active = True
            album.save(update_fields=['is_archived', 'active', 'updated_at'])

        if not album:
            album = Album.objects.create(
                artist=artist,
                title=title,
                release_date=release_date_value,
                genre=genre,
                active=True,
            )
            created = True
        else:
            updates = []
            if release_date_value and album.release_date != release_date_value:
                album.release_date = release_date_value
                updates.append('release_date')
            if genre and album.genre != genre:
                album.genre = genre
                updates.append('genre')
            if updates:
                album.save(update_fields=updates + ['updated_at'])

        AuditLog.objects.create(
            user=request.user,
            action='album_created_via_uploads' if created else 'album_reused_via_uploads',
            resource_type='album',
            resource_id=str(album.id),
            request_data={
                'title': title,
                'release_date': release_date_raw,
                'genre': genre_name,
            },
            response_data={'album_id': album.id, 'created': created},
            status_code=201 if created else 200,
        )

        payload['message'] = 'Album created successfully' if created else 'Album already exists'
        payload['data'] = {
            'album_id': album.id,
            'title': album.title,
            'release_date': album.release_date.isoformat() if album.release_date else None,
            'genre': album.genre.name if album.genre else None,
        }
        return Response(payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    except Exception as e:
        payload['message'] = 'Failed to create album'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_track_contributors(request, track_id):
    """
    Update contributor splits for a track with background processing
    """
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Verify user is an artist and owns the track
        try:
            artist = Artist.objects.get(user=user)
            track = Track.objects.get(id=track_id, artist=artist)
        except (Artist.DoesNotExist, Track.DoesNotExist):
            payload['message'] = 'Track not found or access denied'
            payload['errors'] = {'track_id': ['Track not found or you do not have permission to modify it']}
            return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
        # Get contributors data
        contributors_data = request.data.get('contributors', [])
        
        if not contributors_data:
            payload['message'] = 'Contributors data is required'
            payload['errors'] = {'contributors': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate contributors data structure
        for i, contributor in enumerate(contributors_data):
            required_fields = ['user_id', 'role', 'percent_split']
            for field in required_fields:
                if field not in contributor:
                    payload['message'] = f'Missing required field: {field}'
                    payload['errors'] = {'contributors': [f'Contributor {i+1} missing required field: {field}']}
                    return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Queue background task for contributor update
        task_result = update_contributor_splits.delay(
            track_id=track_id,
            contributors_data=contributors_data,
            user_id=user.id
        )
        
        # Log contributor update initiation
        AuditLog.objects.create(
            user=user,
            action='contributor_update_initiated',
            resource_type='track',
            resource_id=str(track.track_id),
            request_data={
                'track_title': track.title,
                'contributors_count': len(contributors_data),
                'task_id': task_result.id
            },
            response_data={
                'success': True,
                'task_id': task_result.id
            },
            status_code=202
        )
        
        payload['message'] = 'Contributor update initiated successfully'
        payload['data'] = {
            'track_id': track_id,
            'task_id': task_result.id,
            'contributors_count': len(contributors_data),
            'status': 'processing'
        }
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        payload['message'] = 'Failed to update contributors'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def cancel_upload(request, upload_id):
    """
    Cancel an ongoing upload process
    """
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Get upload status record
        try:
            upload_status = UploadProcessingStatus.objects.get(
                upload_id=upload_id,
                user=user
            )
        except UploadProcessingStatus.DoesNotExist:
            payload['message'] = 'Upload not found or access denied'
            payload['errors'] = {'upload_id': ['Upload not found or you do not have permission to cancel it']}
            return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
        # Check if upload can be cancelled
        if upload_status.status in ['completed', 'failed', 'cancelled']:
            payload['message'] = 'Upload cannot be cancelled'
            payload['errors'] = {'status': [f'Upload is already {upload_status.status}']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status to cancelled
        upload_status.status = 'cancelled'
        upload_status.completed_at = timezone.now()
        upload_status.save()
        
        # Log cancellation
        AuditLog.objects.create(
            user=user,
            action='upload_cancelled',
            resource_type='upload',
            resource_id=upload_id,
            request_data={
                'upload_type': upload_status.upload_type,
                'original_filename': upload_status.original_filename
            },
            response_data={
                'success': True,
                'cancelled_at': upload_status.completed_at.isoformat()
            },
            status_code=200
        )
        
        payload['message'] = 'Upload cancelled successfully'
        payload['data'] = {
            'upload_id': upload_id,
            'status': 'cancelled',
            'cancelled_at': upload_status.completed_at.isoformat()
        }
        return Response(payload, status=status.HTTP_200_OK)

    except Exception as e:
        payload['message'] = 'Failed to cancel upload'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_upload(request, upload_id):
    """Delete a completed, failed, or cancelled upload record."""
    payload = {'message': '', 'data': {}, 'errors': {}}

    try:
        user = request.user

        try:
            upload_status = UploadProcessingStatus.objects.get(upload_id=upload_id, user=user)
        except UploadProcessingStatus.DoesNotExist:
            payload['message'] = 'Upload not found or access denied'
            payload['errors'] = {'upload_id': ['Upload not found or you do not have permission to delete it']}
            return Response(payload, status=status.HTTP_404_NOT_FOUND)

        if upload_status.status == 'deleted':
            payload['message'] = 'Upload already deleted'
            payload['data'] = {'upload_id': upload_id, 'status': 'deleted'}
            return Response(payload, status=status.HTTP_200_OK)

        if upload_status.status == 'deleting':
            payload['message'] = 'Upload deletion already in progress'
            payload['data'] = {
                'upload_id': upload_id,
                'status': 'deleting',
                'task_id': (upload_status.metadata or {}).get('deletion_task_id'),
            }
            return Response(payload, status=status.HTTP_202_ACCEPTED)

        if upload_status.status not in ['completed', 'failed', 'cancelled', 'processing']:
            payload['message'] = 'Upload cannot be deleted yet'
            payload['errors'] = {
                'status': ['Only completed, failed, cancelled, or processing uploads can be deleted']
            }
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        metadata = upload_status.metadata or {}
        previous_status = upload_status.status
        deletion_requested_at = timezone.now().isoformat()

        try:
            task_result = delete_upload_artifacts.delay(upload_id=upload_id, user_id=user.id)
        except Exception as task_error:
            payload['message'] = f'Failed to queue deletion task: {str(task_error)}'
            payload['errors'] = {'task': [str(task_error)]}
            return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        metadata.update({
            'deletion_requested_at': deletion_requested_at,
            'deletion_task_id': task_result.id,
        })

        upload_status.status = 'deleting'
        upload_status.progress_percentage = min(upload_status.progress_percentage, 95)
        upload_status.current_step = 'Queued for deletion'
        upload_status.metadata = metadata
        upload_status.save(update_fields=['status', 'progress_percentage', 'current_step', 'metadata'])

        AuditLog.objects.create(
            user=user,
            action='upload_deletion_scheduled',
            resource_type='upload',
            resource_id=upload_id,
            request_data={
                'status_before': previous_status,
                'entity_type': upload_status.entity_type,
                'entity_id': upload_status.entity_id,
            },
            response_data={'success': True, 'task_id': task_result.id},
            status_code=202,
        )

        payload['message'] = 'Upload deletion scheduled'
        payload['data'] = {
            'upload_id': upload_id,
            'status': 'deleting',
            'task_id': task_result.id,
        }
        return Response(payload, status=status.HTTP_202_ACCEPTED)

    except Exception as e:
        payload['message'] = 'Failed to delete upload'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)