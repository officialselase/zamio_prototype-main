import json
import os
import tempfile
import uuid
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import logging
import numpy as np

import ffmpeg
import librosa
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.timezone import is_naive, make_aware
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import AuditLog
from artists.models import Fingerprint, Track
from music_monitor.models import AudioDetection, MatchCache, SnippetIngest
from music_monitor.utils.match_engine import simple_match, simple_match_mp3
from music_monitor.utils.stream_monitor import StreamMonitor, active_sessions
from stations.models import Station

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def start_stream_monitoring(request):
    """Start monitoring a radio stream"""
    try:
        stream_url = request.data.get('stream_url')
        station_id = request.data.get('station_id')
        
        if not stream_url or not station_id:
            return Response({
                'error': 'stream_url and station_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate station exists
        try:
            station = Station.objects.get(station_id=station_id)
        except Station.DoesNotExist:
            return Response({
                'error': 'Station not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Create and start monitor
        monitor = StreamMonitor(session_id, stream_url, station_id)
        monitor.start()
        
        # Store in active sessions
        active_sessions[session_id] = monitor
        
        return Response({
            'session_id': session_id,
            'message': 'Stream monitoring started successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to start monitoring: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def stop_stream_monitoring(request, session_id):
    """Stop monitoring a radio stream"""
    try:
        if session_id not in active_sessions:
            return Response({
                'error': 'Session not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        # Stop the monitor
        monitor = active_sessions[session_id]
        monitor.stop()
        
        # Remove from active sessions
        del active_sessions[session_id]
        
        return Response({
            'message': 'Stream monitoring stopped successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to stop monitoring: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_stream_matches(request, session_id):
    """Get recent matches for a monitoring session"""
    try:
        if session_id not in active_sessions:
            return Response({
                'error': 'Session not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        monitor = active_sessions[session_id]
        
        return Response({
            'matches': monitor.matches,
            'session_active': monitor.is_running
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to get matches: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_active_sessions(request):
    """Get list of active monitoring sessions"""
    try:
        sessions = []
        for session_id, monitor in active_sessions.items():
            sessions.append({
                'session_id': session_id,
                'station_id': monitor.station_id,
                'stream_url': monitor.stream_url,
                'is_running': monitor.is_running,
                'matches_count': len(monitor.matches)
            })
            
        return Response({
            'active_sessions': sessions
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to get sessions: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






# views/upload_audio.py




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def upload_audio_match2222(request):
    """
    Accepts an uploaded audio file and station ID, matches it,
    and logs the result into MatchCache (and PlayLog if needed).
    """
    audio_file = request.FILES.get('file')
    station_id = request.POST.get('station_id')

    if not audio_file:
        return Response({'error': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)
    if not station_id:
        return Response({'error': 'Station ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        return Response({'error': 'Invalid station ID'}, status=status.HTTP_404_NOT_FOUND)

    try:
        samples, sr = librosa.load(audio_file, sr=44100)

        if len(samples) == 0:
            return Response({'error': 'Empty audio data'}, status=status.HTTP_400_BAD_REQUEST)


        # Get fingerprints
        fingerprints = [
            (fp.track.id, fp.hash, fp.offset)
            for fp in Fingerprint.objects.select_related('track').all()
        ]

        match_result = simple_match(samples, sr, fingerprints)

        if match_result["match"]:
            track = Track.objects.get(id=match_result["song_id"])

            # Save to MatchCache
            match_cache = MatchCache.objects.create(
                track=track,
                station=station,
                station_program=None,
                matched_at=timezone.now()
            )

            return Response({
                'match': True,
                'track_title': track.title,
                'artist_name': track.artist.stage_name,
                'album_title': track.album.title if track.album else None,
                'confidence': min(100, (match_result["hashes_matched"] / 20) * 100),
                'hashes_matched': match_result["hashes_matched"]
            }, status=status.HTTP_200_OK)
        
    
        return Response({'match': False}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': f'Processing error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def upload_audio_match(request):
    """
    Uploads an audio clip, matches it to known fingerprints, and logs to MatchCache.
    """
    # Get client IP for audit logging
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def build_detection_response(detection):
        payload = {
            'detection_id': str(detection.detection_id),
            'match': detection.track_id is not None,
        }

        confidence_ratio = detection.confidence_score or Decimal('0')
        payload['confidence'] = round(float(confidence_ratio) * 100, 2)

        metadata = detection.external_metadata or {}

        if detection.track_id:
            track = detection.track
            payload.update({
                'track_title': track.title,
                'artist_name': track.artist.stage_name,
                'album_title': track.album.title if track.album else None,
            })
            if 'hashes_matched' in metadata:
                payload['hashes_matched'] = metadata['hashes_matched']
        else:
            reason = detection.error_message or metadata.get('reason')
            if reason:
                payload['reason'] = reason
            if 'hashes_matched' in metadata:
                payload['hashes_matched'] = metadata['hashes_matched']

        return payload

    ip_address = get_client_ip(request)

    audio_file = request.FILES.get('file')
    station_id = request.POST.get('station_id')
    chunk_id = request.POST.get('chunk_id')
    started_at = request.POST.get('started_at')
    duration_seconds = request.POST.get('duration_seconds')
    raw_metadata = request.POST.get('metadata')

    metadata = {}
    if raw_metadata:
        try:
            parsed_metadata = json.loads(raw_metadata)
            metadata = parsed_metadata if isinstance(parsed_metadata, dict) else {'raw': parsed_metadata}
        except json.JSONDecodeError as exc:
            metadata = {'raw': raw_metadata, 'parse_error': str(exc)}

    file_size_bytes = getattr(audio_file, 'size', None)

    if not audio_file:
        # Log failed audio match attempt - no file
        AuditLog.objects.create(
            user=request.user,
            action='audio_match_failed',
            resource_type='music_detection',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'station_id': station_id, 'chunk_id': chunk_id, 'metadata': metadata},
            response_data={'error': 'no_audio_file'},
            status_code=400
        )
        return Response({'error': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)

    if not station_id:
        # Log failed audio match attempt - no station ID
        AuditLog.objects.create(
            user=request.user,
            action='audio_match_failed',
            resource_type='music_detection',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'chunk_id': chunk_id, 'file_size': file_size_bytes},
            response_data={'error': 'no_station_id'},
            status_code=400
        )
        return Response({'error': 'Station ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        # Log failed audio match attempt - invalid station
        AuditLog.objects.create(
            user=request.user,
            action='audio_match_failed',
            resource_type='music_detection',
            resource_id=station_id,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={
                'station_id': station_id,
                'chunk_id': chunk_id,
                'file_size': file_size_bytes,
                'metadata': metadata,
            },
            response_data={'error': 'invalid_station_id'},
            status_code=404
        )
        return Response({'error': 'Invalid station ID'}, status=status.HTTP_404_NOT_FOUND)

    parsed_started = None
    if started_at:
        parsed_started = parse_datetime(started_at)
        if parsed_started and is_naive(parsed_started):
            parsed_started = make_aware(parsed_started, timezone.get_current_timezone())

    audio_timestamp = parsed_started or timezone.now()

    try:
        session_uuid = uuid.UUID(chunk_id) if chunk_id else uuid.uuid4()
    except (ValueError, AttributeError, TypeError):
        session_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id) if chunk_id else uuid.uuid4()

    duration_seconds_value = None
    if duration_seconds:
        try:
            duration_seconds_value = int(duration_seconds)
        except (TypeError, ValueError):
            duration_seconds_value = None

    def sync_ingest_metadata(ingest_obj):
        update_fields = []
        if parsed_started and ingest_obj.started_at != parsed_started:
            ingest_obj.started_at = parsed_started
            update_fields.append('started_at')
        if duration_seconds_value is not None and ingest_obj.duration_seconds != duration_seconds_value:
            ingest_obj.duration_seconds = duration_seconds_value
            update_fields.append('duration_seconds')
        if ingest_obj.metadata != metadata:
            ingest_obj.metadata = metadata
            update_fields.append('metadata')
        if file_size_bytes is not None and ingest_obj.file_size_bytes != file_size_bytes:
            ingest_obj.file_size_bytes = file_size_bytes
            update_fields.append('file_size_bytes')
        return update_fields

    ingest = None
    ingest_created = False
    if chunk_id:
        ingest_defaults = {
            'station': station,
            'duration_seconds': duration_seconds_value,
            'started_at': parsed_started,
            'metadata': metadata,
            'file_size_bytes': file_size_bytes,
        }
        ingest, ingest_created = SnippetIngest.objects.get_or_create(
            chunk_id=chunk_id,
            defaults=ingest_defaults,
        )
        if not ingest_created:
            update_fields = sync_ingest_metadata(ingest)
            if update_fields:
                ingest.save(update_fields=update_fields)

            if ingest.processed:
                response_payload = {'ok': True, 'already_processed': True, 'chunk_id': chunk_id}
                if ingest.audio_detection_id:
                    response_payload.update(build_detection_response(ingest.audio_detection))
                return Response(response_payload, status=status.HTTP_200_OK)

    processing_started = timezone.now()

    try:
        try:
            # Validate file size (max 5MB)
            MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
            if audio_file.size > MAX_UPLOAD_SIZE:
                logger.warning(f"File too large: {audio_file.size} bytes (max: {MAX_UPLOAD_SIZE})")
                return Response(
                    {'error': 'File too large', 'detail': f'Maximum file size is 5MB. Received: {audio_file.size / 1024 / 1024:.2f}MB'},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )
            
            # Save file temporarily, then decode to WAV mono 44.1kHz
            suffix = Path(getattr(audio_file, 'name', '')).suffix or '.aac'
            logger.info(f"Received audio file with suffix: {suffix}, size: {audio_file.size} bytes")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_in:
                for c in audio_file.chunks():
                    temp_in.write(c)
                temp_in_path = temp_in.name
            
            logger.info(f"Saved temp input file: {temp_in_path}, size: {os.path.getsize(temp_in_path)} bytes")

            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_out:
                temp_out_path = temp_out.name

            try:
                logger.info(f"Converting {temp_in_path} (suffix: {suffix}) to WAV using ffmpeg")
                
                # More robust ffmpeg conversion with error recovery
                # Use -y to overwrite, -loglevel error for cleaner logs
                # Add -vn to ignore video streams, -sn to ignore subtitles
                (
                    ffmpeg
                    .input(temp_in_path, **{'loglevel': 'error'})
                    .output(
                        temp_out_path,
                        format='wav',
                        acodec='pcm_s16le',
                        ar=44100,
                        ac=1,
                        **{'vn': None, 'sn': None}  # No video, no subtitles
                    )
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
                logger.info(f"FFmpeg conversion successful: {temp_out_path}")
                
                # Verify the output file exists and has content
                if not os.path.exists(temp_out_path):
                    raise Exception("FFmpeg output file does not exist")
                    
                output_size = os.path.getsize(temp_out_path)
                if output_size == 0:
                    raise Exception("FFmpeg produced empty output file")
                    
                logger.info(f"Converted file size: {output_size} bytes")
                    
            except ffmpeg.Error as e:
                error_msg = e.stderr.decode() if e.stderr else str(e)
                logger.error(f"FFmpeg conversion failed: {error_msg}")
                
                # Clean up temp files
                try:
                    os.remove(temp_in_path)
                    if os.path.exists(temp_out_path):
                        os.remove(temp_out_path)
                except Exception:
                    pass
                
                return Response(
                    {
                        'error': 'Audio format conversion failed',
                        'detail': f'Could not convert {suffix} to WAV format. FFmpeg error: {error_msg[:200]}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Unexpected error during ffmpeg conversion: {str(e)}", exc_info=True)
                
                # Clean up temp files
                try:
                    os.remove(temp_in_path)
                    if os.path.exists(temp_out_path):
                        os.remove(temp_out_path)
                except Exception:
                    pass
                
                return Response(
                    {
                        'error': 'Audio processing failed',
                        'detail': f'Unexpected error during audio conversion: {str(e)}'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Audio processing with enhanced error handling
            samples = None
            sr = None
            try:
                logger.info(f"Loading audio from {temp_out_path}")
                samples, sr = librosa.load(temp_out_path, sr=44100, mono=True)
                logger.info(f"Audio loaded: {len(samples)} samples at {sr}Hz")
                
                if len(samples) == 0:
                    logger.error(f"Empty audio file: {temp_out_path}")
                    # Clean up before returning
                    try:
                        os.remove(temp_in_path)
                        os.remove(temp_out_path)
                    except Exception:
                        pass
                    return Response(
                        {'error': 'Invalid audio - zero samples'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # More lenient silent audio threshold for studio environments
                max_amplitude = np.max(np.abs(samples))
                if max_amplitude < 0.001:  # Reduced from 0.01 to 0.001
                    logger.info(f"Silent audio detected: {temp_out_path} (max: {max_amplitude})")
                    # Continue processing silent audio instead of rejecting
                    
            except Exception as e:
                logger.error(f"Audio loading failed: {str(e)}\nFile: {temp_out_path}", exc_info=True)
                # Clean up before returning
                try:
                    os.remove(temp_in_path)
                    os.remove(temp_out_path)
                except Exception:
                    pass
                return Response(
                    {'error': 'Audio loading failed', 'detail': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Ensure audio was loaded successfully
            if samples is None or sr is None:
                logger.error(f"Audio loading failed - samples or sr is None")
                # Clean up before returning
                try:
                    os.remove(temp_in_path)
                    os.remove(temp_out_path)
                except Exception:
                    pass
                return Response(
                    {'error': 'Audio processing failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Collect all known fingerprints with caching
            from django.core.cache import cache
            
            cache_key = 'fingerprints_index_v1'
            fingerprints = cache.get(cache_key)
            
            if fingerprints is None:
                # Convert hash from string to int for matching
                fingerprints_raw = Fingerprint.objects.select_related('track').values_list('track_id', 'hash', 'offset')
                fingerprints = [(track_id, int(hash_str), offset) for track_id, hash_str, offset in fingerprints_raw]
                # Cache for 1 hour
                cache.set(cache_key, fingerprints, timeout=3600)
                logger.info(f"Loaded {len(fingerprints)} fingerprints from database (cached)")
            else:
                logger.info(f"Loaded {len(fingerprints)} fingerprints from cache")

            try:
                logger.info(f"Starting fingerprint matching with {len(samples)} samples")
                result = simple_match_mp3(samples, sr, fingerprints)
                logger.info(f"Fingerprint matching completed: {result}")
                processing_finished = timezone.now()
                processing_time_ms = int((processing_finished - processing_started).total_seconds() * 1000)
            except Exception as e:
                logger.error(f"Fingerprinting failed: {str(e)}", exc_info=True)
                # Clean up temp files
                try:
                    os.remove(temp_in_path)
                    os.remove(temp_out_path)
                except Exception:
                    pass
                return Response({'error': 'Fingerprinting failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Fingerprinting complete - clean up temp files
            try:
                os.remove(temp_in_path)
                os.remove(temp_out_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp files: {e}")

            detection_metadata = {
                'chunk_id': chunk_id,
                'station_id': station.station_id,
                'capture_metadata': metadata,
                'capture_started_at': started_at,
                'duration_seconds_reported': duration_seconds_value,
                'file_size_bytes': file_size_bytes,
                'ingest_id': ingest.id if ingest else None,
                'processing_started_at': processing_started.isoformat(),
                'processing_completed_at': processing_finished.isoformat(),
                'match_engine': 'simple_match_mp3',
                'uploader_user_id': request.user.id,
                'upload_ip': ip_address,
            }

            if result['match']:
                track = Track.objects.get(id=result['song_id'])
                hashes_matched = result['hashes_matched']
                confidence_ratio = Decimal(hashes_matched) / Decimal(20)
                if confidence_ratio > Decimal('1'):
                    confidence_ratio = Decimal('1')
                confidence_ratio = confidence_ratio.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                confidence_score = float(confidence_ratio * Decimal('100'))

                detection_metadata.update({
                    'match_found': True,
                    'hashes_matched': hashes_matched,
                    'matcher_confidence_reported': result.get('confidence'),
                })

                with transaction.atomic():
                    detection = AudioDetection.objects.create(
                        session_id=session_uuid,
                        station=station,
                        track=track,
                        detected_title=track.title,
                        detected_artist=track.artist.stage_name,
                        detected_album=track.album.title if track.album else None,
                        detection_source='local',
                        confidence_score=confidence_ratio,
                        processing_status='completed',
                        audio_timestamp=audio_timestamp,
                        duration_seconds=duration_seconds_value,
                        processing_time_ms=processing_time_ms,
                        external_metadata=detection_metadata,
                    )

                    if ingest:
                        extra_fields = sync_ingest_metadata(ingest)
                        ingest.processed = True
                        ingest.audio_detection = detection
                        update_fields = ['processed', 'audio_detection']
                        update_fields.extend(f for f in extra_fields if f not in update_fields)
                        ingest.save(update_fields=update_fields)

                MatchCache.objects.create(
                    track=track,
                    station=station,
                    station_program=None,
                    matched_at=timezone.now(),
                    avg_confidence_score=confidence_score,
                    processed=False
                )
                if chunk_id:
                    try:
                        SnippetIngest.objects.filter(chunk_id=chunk_id).update(processed=True)
                    except Exception:
                        pass

                response_payload = build_detection_response(detection)
                response_payload['processing_time_ms'] = processing_time_ms

                return Response(response_payload, status=status.HTTP_200_OK)

            else:
                detection_metadata.update({
                    'match_found': False,
                    'reason': result.get('reason'),
                    'hashes_matched': result.get('hashes_matched'),
                    'matcher_confidence_reported': result.get('confidence'),
                })

                with transaction.atomic():
                    detection = AudioDetection.objects.create(
                        session_id=session_uuid,
                        station=station,
                        detection_source='local',
                        confidence_score=Decimal('0'),
                        processing_status='completed',
                        audio_timestamp=audio_timestamp,
                        duration_seconds=duration_seconds_value,
                        processing_time_ms=processing_time_ms,
                        external_metadata=detection_metadata,
                        error_message=result.get('reason'),
                    )

                    if ingest:
                        extra_fields = sync_ingest_metadata(ingest)
                        ingest.processed = True
                        ingest.audio_detection = detection
                        update_fields = ['processed', 'audio_detection']
                        update_fields.extend(f for f in extra_fields if f not in update_fields)
                        ingest.save(update_fields=update_fields)

                # Create MatchCache entry even for unmatched clips
                MatchCache.objects.create(
                    track=None,
                    station=station,
                    station_program=None,
                    matched_at=timezone.now(),
                    avg_confidence_score=0.0,
                    processed=False,
                    failed_reason=result.get('reason')
                )

                response_payload = build_detection_response(detection)
                response_payload['processing_time_ms'] = processing_time_ms
                return Response(response_payload, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Audio processing failed (outer try): {str(e)}", exc_info=True)
            return Response({'error': 'Audio processing failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Audio processing failed (outermost try): {str(e)}", exc_info=True)
        return Response({'error': 'Audio processing failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
