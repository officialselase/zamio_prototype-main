"""
API views for secure media file upload and access
"""
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError, PermissionDenied
from django.http import Http404
from django.utils import timezone
from artists.services.media_file_service import MediaFileService
from artists.services.media_access_service import MediaAccessService
from artists.models import Track, Album
from accounts.models import AuditLog
from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.tasks import delete_track_record


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def upload_track_view(request):
    """Upload a track with enhanced security and async processing"""
    try:
        user = request.user
        
        # Check if user has artist profile
        if not hasattr(user, 'artist_profile'):
            return Response({
                'message': 'Artist profile required',
                'errors': {'user': ['You must have an artist profile to upload tracks']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get files from request
        audio_file = request.FILES.get('audio_file')
        cover_art = request.FILES.get('cover_art')
        
        if not audio_file:
            return Response({
                'message': 'Audio file required',
                'errors': {'audio_file': ['Audio file is required']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get track metadata
        track_data = {
            'title': request.data.get('title', 'Untitled'),
            'genre_id': request.data.get('genre_id'),
            'album_id': request.data.get('album_id'),
            'release_date': request.data.get('release_date'),
            'lyrics': request.data.get('lyrics', ''),
            'explicit': request.data.get('explicit', False)
        }
        
        # Process async by default, but allow sync for testing
        process_async = request.data.get('process_async', 'true').lower() == 'true'
        
        # Process the track upload
        result = MediaFileService.process_track_upload(
            user=user,
            track_data=track_data,
            audio_file=audio_file,
            cover_art=cover_art,
            process_async=process_async
        )
        
        return Response({
            'message': 'Track uploaded successfully',
            'data': result
        }, status=status.HTTP_201_CREATED)
        
    except ValidationError as e:
        errors = e.messages if hasattr(e, 'messages') else [str(e)]
        return Response({
            'message': 'Upload validation failed',
            'errors': {'validation': errors}
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            'message': 'Upload failed',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def track_processing_status_view(request, track_id):
    """Get processing status for a track"""
    try:
        status_info = MediaFileService.get_track_processing_status(track_id)
        
        return Response({
            'message': 'Processing status retrieved',
            'data': status_info
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Failed to get processing status',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_secure_media_url_view(request, resource_type, resource_id, file_type):
    """Get a secure URL for media file access"""
    try:
        user = request.user
        
        # Validate parameters
        if resource_type not in ['track', 'album']:
            return Response({
                'message': 'Invalid resource type',
                'errors': {'resource_type': ['Must be "track" or "album"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if file_type not in ['audio', 'cover_art']:
            return Response({
                'message': 'Invalid file type',
                'errors': {'file_type': ['Must be "audio" or "cover_art"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate secure URL
        url_info = MediaAccessService.get_secure_media_url(
            user=user,
            resource_type=resource_type,
            resource_id=resource_id,
            file_type=file_type
        )
        
        return Response({
            'message': 'Secure media URL generated',
            'data': url_info
        }, status=status.HTTP_200_OK)
        
    except PermissionDenied as e:
        return Response({
            'message': 'Access denied',
            'errors': {'permission': [str(e)]}
        }, status=status.HTTP_403_FORBIDDEN)
        
    except Exception as e:
        return Response({
            'message': 'Failed to generate secure URL',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def secure_media_download_view(request, resource_type, resource_id, file_type):
    """Secure media file download with token verification"""
    try:
        user = request.user
        token = request.GET.get('token')
        
        # Validate parameters
        if resource_type not in ['track', 'album']:
            return Response({
                'message': 'Invalid resource type',
                'errors': {'resource_type': ['Must be "track" or "album"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if file_type not in ['audio', 'cover_art']:
            return Response({
                'message': 'Invalid file type',
                'errors': {'file_type': ['Must be "audio" or "cover_art"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Serve the file
        response = MediaAccessService.serve_secure_media_file(
            user=user,
            resource_type=resource_type,
            resource_id=resource_id,
            file_type=file_type,
            token=token
        )
        
        return response
        
    except Http404 as e:
        return Response({
            'message': 'Media file not found',
            'errors': {'file': [str(e)]}
        }, status=status.HTTP_404_NOT_FOUND)
        
    except PermissionDenied as e:
        return Response({
            'message': 'Access denied',
            'errors': {'permission': [str(e)]}
        }, status=status.HTTP_403_FORBIDDEN)
        
    except Exception as e:
        return Response({
            'message': 'Failed to serve media file',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def public_media_download_view(request, resource_type, resource_id, file_type):
    """Public media file download for approved content"""
    try:
        # Create anonymous user for public access
        from django.contrib.auth.models import AnonymousUser
        user = AnonymousUser()
        
        # Validate parameters
        if resource_type not in ['track', 'album']:
            return Response({
                'message': 'Invalid resource type',
                'errors': {'resource_type': ['Must be "track" or "album"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if file_type not in ['audio', 'cover_art']:
            return Response({
                'message': 'Invalid file type',
                'errors': {'file_type': ['Must be "audio" or "cover_art"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if content is publicly accessible
        public_url = MediaAccessService.get_public_media_url(resource_type, resource_id, file_type)
        if not public_url:
            return Response({
                'message': 'Content not publicly available',
                'errors': {'access': ['This content is not publicly accessible']}
            }, status=status.HTTP_403_FORBIDDEN)
        
        # For public access, we'll use a system user for logging
        try:
            from accounts.models import User
            system_user = User.objects.filter(email='system@zamio.com').first()
            if not system_user:
                system_user = None
        except:
            system_user = None
        
        # Serve the file (bypass normal permission checks for public content)
        response = MediaAccessService.serve_secure_media_file(
            user=system_user or user,
            resource_type=resource_type,
            resource_id=resource_id,
            file_type=file_type,
            token=None
        )
        
        # Add public cache headers
        response['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
        response['Pragma'] = 'public'
        
        return response
        
    except Http404 as e:
        return Response({
            'message': 'Media file not found',
            'errors': {'file': [str(e)]}
        }, status=status.HTTP_404_NOT_FOUND)
        
    except PermissionDenied as e:
        return Response({
            'message': 'Access denied',
            'errors': {'permission': [str(e)]}
        }, status=status.HTTP_403_FORBIDDEN)
        
    except Exception as e:
        return Response({
            'message': 'Failed to serve media file',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_user_tracks_view(request):
    """List all tracks for the authenticated user"""
    try:
        user = request.user
        
        # Check if user has artist profile
        if not hasattr(user, 'artist_profile'):
            return Response({
                'message': 'Artist profile required',
                'errors': {'user': ['You must have an artist profile to view tracks']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's tracks
        tracks = Track.objects.filter(artist=user.artist_profile).order_by('-created_at')
        
        track_data = []
        for track in tracks:
            # Get secure URLs for the user's own tracks
            try:
                audio_url_info = MediaAccessService.get_secure_media_url(
                    user, 'track', track.id, 'audio'
                )
                cover_url_info = MediaAccessService.get_secure_media_url(
                    user, 'track', track.id, 'cover_art'
                ) if track.cover_art else None
            except:
                audio_url_info = None
                cover_url_info = None
            
            track_data.append({
                'id': track.id,
                'title': track.title,
                'status': track.status,
                'processing_status': track.processing_status,
                'processing_error': track.processing_error,
                'is_quarantined': track.is_quarantined,
                'quarantine_reason': track.quarantine_reason,
                'created_at': track.created_at,
                'updated_at': track.updated_at,
                'audio_url': audio_url_info['media_url'] if audio_url_info else None,
                'cover_art_url': cover_url_info['media_url'] if cover_url_info else None,
                'genre': track.genre.name if track.genre else None,
                'album': track.album.title if track.album else None,
                'explicit': track.explicit,
                'can_be_published': track.can_be_published()
            })
        
        return Response({
            'message': 'Tracks retrieved successfully',
            'data': {
                'tracks': track_data,
                'total_count': len(track_data)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Failed to retrieve tracks',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_track_view(request, track_id):
    """Delete a track (only if user owns it and it's not published)"""
    try:
        user = request.user
        
        # Get the track
        try:
            track = Track.objects.get(id=track_id, artist__user=user)
        except Track.DoesNotExist:
            return Response({
                'message': 'Track not found',
                'errors': {'track': ['Track not found or you do not have permission to delete it']}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if track can be deleted (not published)
        if track.status == 'Approved' and track.active:
            return Response({
                'message': 'Cannot delete published track',
                'errors': {'track': ['Published tracks cannot be deleted']}
            }, status=status.HTTP_400_BAD_REQUEST)

        task_result = delete_track_record.delay(track_id=track.id, user_id=user.id)

        AuditLog.objects.create(
            user=user,
            action='track_deletion_scheduled',
            resource_type='Track',
            resource_id=str(track_id),
            request_data={
                'title': track.title,
                'status': track.status,
                'processing_status': track.processing_status,
            },
            response_data={'success': True, 'task_id': task_result.id},
            status_code=202,
        )

        return Response({
            'message': 'Track deletion scheduled',
            'data': {'track_id': track_id, 'task_id': task_result.id}
        }, status=status.HTTP_202_ACCEPTED)

    except Exception as e:
        return Response({
            'message': 'Failed to delete track',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def verify_media_integrity_view(request, resource_type, resource_id):
    """Manually verify media file integrity for a specific resource"""
    try:
        user = request.user
        
        # Validate parameters
        if resource_type not in ['track', 'album']:
            return Response({
                'message': 'Invalid resource type',
                'errors': {'resource_type': ['Must be "track" or "album"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the resource and verify ownership
        if resource_type == 'track':
            try:
                resource = Track.objects.get(id=resource_id, artist__user=user)
            except Track.DoesNotExist:
                return Response({
                    'message': 'Track not found or access denied',
                    'errors': {'track': ['Track not found or you do not have permission to access it']}
                }, status=status.HTTP_404_NOT_FOUND)
        else:  # album
            try:
                resource = Album.objects.get(id=resource_id, artist__user=user)
            except Album.DoesNotExist:
                return Response({
                    'message': 'Album not found or access denied',
                    'errors': {'album': ['Album not found or you do not have permission to access it']}
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Perform integrity checks
        integrity_results = {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'resource_title': resource.title,
            'checks_performed': [],
            'overall_status': 'passed',
            'timestamp': timezone.now().isoformat()
        }
        
        if resource_type == 'track':
            # Check audio file integrity
            if resource.audio_file and resource.audio_file_hash:
                audio_integrity = resource.verify_audio_integrity()
                integrity_results['checks_performed'].append({
                    'file_type': 'audio',
                    'file_path': resource.audio_file.name,
                    'integrity_passed': audio_integrity,
                    'stored_hash': resource.audio_file_hash
                })
                
                if not audio_integrity:
                    integrity_results['overall_status'] = 'failed'
            
            # Check cover art integrity
            if resource.cover_art and resource.cover_art_hash:
                cover_integrity = resource.verify_cover_art_integrity()
                integrity_results['checks_performed'].append({
                    'file_type': 'cover_art',
                    'file_path': resource.cover_art.name,
                    'integrity_passed': cover_integrity,
                    'stored_hash': resource.cover_art_hash
                })
                
                if not cover_integrity:
                    integrity_results['overall_status'] = 'failed'
        
        else:  # album
            # Check cover art integrity
            if resource.cover_art and resource.cover_art_hash:
                cover_integrity = resource.verify_cover_art_integrity()
                integrity_results['checks_performed'].append({
                    'file_type': 'cover_art',
                    'file_path': resource.cover_art.name,
                    'integrity_passed': cover_integrity,
                    'stored_hash': resource.cover_art_hash
                })
                
                if not cover_integrity:
                    integrity_results['overall_status'] = 'failed'
        
        # Log the integrity check
        AuditLog.objects.create(
            user=user,
            action='manual_integrity_check',
            resource_type=resource_type.title(),
            resource_id=str(resource_id),
            request_data={
                'resource_title': resource.title,
                'integrity_results': integrity_results,
                'checks_count': len(integrity_results['checks_performed']),
                'overall_status': integrity_results['overall_status']
            }
        )
        
        # If integrity failed, optionally quarantine
        if integrity_results['overall_status'] == 'failed' and resource_type == 'track':
            failed_files = [check['file_type'] for check in integrity_results['checks_performed'] if not check['integrity_passed']]
            quarantine_reason = f"Manual integrity check failed for: {', '.join(failed_files)}"
            
            from artists.services.media_file_service import MediaFileService
            MediaFileService.quarantine_media_file(resource, quarantine_reason)
            
            integrity_results['quarantined'] = True
            integrity_results['quarantine_reason'] = quarantine_reason
        
        return Response({
            'message': 'Integrity verification completed',
            'data': integrity_results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Integrity verification failed',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def scan_media_for_malware_view(request, resource_type, resource_id):
    """Manually scan media files for malware for a specific resource"""
    try:
        user = request.user
        
        # Validate parameters
        if resource_type not in ['track', 'album']:
            return Response({
                'message': 'Invalid resource type',
                'errors': {'resource_type': ['Must be "track" or "album"']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the resource and verify ownership
        if resource_type == 'track':
            try:
                resource = Track.objects.get(id=resource_id, artist__user=user)
            except Track.DoesNotExist:
                return Response({
                    'message': 'Track not found or access denied',
                    'errors': {'track': ['Track not found or you do not have permission to access it']}
                }, status=status.HTTP_404_NOT_FOUND)
        else:  # album
            try:
                resource = Album.objects.get(id=resource_id, artist__user=user)
            except Album.DoesNotExist:
                return Response({
                    'message': 'Album not found or access denied',
                    'errors': {'album': ['Album not found or you do not have permission to access it']}
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Perform malware scans
        from django.core.files.storage import default_storage
        from artists.services.media_file_service import MediaFileService
        
        scan_results = {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'resource_title': resource.title,
            'scans_performed': [],
            'overall_status': 'safe',
            'threats_found': [],
            'timestamp': timezone.now().isoformat()
        }
        
        if resource_type == 'track':
            # Scan audio file
            if resource.audio_file and default_storage.exists(resource.audio_file.name):
                try:
                    file_path = default_storage.path(resource.audio_file.name)
                    scan_result = MediaFileService.scan_media_file_for_malware(file_path)
                    
                    scan_results['scans_performed'].append({
                        'file_type': 'audio',
                        'file_path': resource.audio_file.name,
                        'is_safe': scan_result['is_safe'],
                        'threats': scan_result['threats_found'],
                        'scan_details': scan_result['scan_details']
                    })
                    
                    if not scan_result['is_safe']:
                        scan_results['overall_status'] = 'threats_found'
                        scan_results['threats_found'].extend(scan_result['threats_found'])
                        
                except Exception as e:
                    scan_results['scans_performed'].append({
                        'file_type': 'audio',
                        'file_path': resource.audio_file.name,
                        'is_safe': False,
                        'threats': [f'Scan error: {str(e)}'],
                        'scan_details': {}
                    })
                    scan_results['overall_status'] = 'scan_error'
                    scan_results['threats_found'].append(f'Audio scan error: {str(e)}')
            
            # Scan cover art
            if resource.cover_art and default_storage.exists(resource.cover_art.name):
                try:
                    file_path = default_storage.path(resource.cover_art.name)
                    scan_result = MediaFileService.scan_media_file_for_malware(file_path)
                    
                    scan_results['scans_performed'].append({
                        'file_type': 'cover_art',
                        'file_path': resource.cover_art.name,
                        'is_safe': scan_result['is_safe'],
                        'threats': scan_result['threats_found'],
                        'scan_details': scan_result['scan_details']
                    })
                    
                    if not scan_result['is_safe']:
                        scan_results['overall_status'] = 'threats_found'
                        scan_results['threats_found'].extend(scan_result['threats_found'])
                        
                except Exception as e:
                    scan_results['scans_performed'].append({
                        'file_type': 'cover_art',
                        'file_path': resource.cover_art.name,
                        'is_safe': False,
                        'threats': [f'Scan error: {str(e)}'],
                        'scan_details': {}
                    })
                    scan_results['threats_found'].append(f'Cover art scan error: {str(e)}')
        
        else:  # album
            # Scan cover art
            if resource.cover_art and default_storage.exists(resource.cover_art.name):
                try:
                    file_path = default_storage.path(resource.cover_art.name)
                    scan_result = MediaFileService.scan_media_file_for_malware(file_path)
                    
                    scan_results['scans_performed'].append({
                        'file_type': 'cover_art',
                        'file_path': resource.cover_art.name,
                        'is_safe': scan_result['is_safe'],
                        'threats': scan_result['threats_found'],
                        'scan_details': scan_result['scan_details']
                    })
                    
                    if not scan_result['is_safe']:
                        scan_results['overall_status'] = 'threats_found'
                        scan_results['threats_found'].extend(scan_result['threats_found'])
                        
                except Exception as e:
                    scan_results['scans_performed'].append({
                        'file_type': 'cover_art',
                        'file_path': resource.cover_art.name,
                        'is_safe': False,
                        'threats': [f'Scan error: {str(e)}'],
                        'scan_details': {}
                    })
                    scan_results['threats_found'].append(f'Cover art scan error: {str(e)}')
        
        # Update last malware scan timestamp
        resource.last_malware_scan = timezone.now()
        
        # Handle threats found
        if scan_results['overall_status'] == 'threats_found' and resource_type == 'track':
            quarantine_reason = f"Manual malware scan detected threats: {'; '.join(scan_results['threats_found'][:3])}"
            MediaFileService.quarantine_media_file(resource, quarantine_reason)
            scan_results['quarantined'] = True
            scan_results['quarantine_reason'] = quarantine_reason
        
        resource.save()
        
        # Log the malware scan
        AuditLog.objects.create(
            user=user,
            action='manual_malware_scan',
            resource_type=resource_type.title(),
            resource_id=str(resource_id),
            request_data={
                'resource_title': resource.title,
                'scan_results': scan_results,
                'scans_count': len(scan_results['scans_performed']),
                'overall_status': scan_results['overall_status'],
                'threats_count': len(scan_results['threats_found'])
            }
        )
        
        return Response({
            'message': 'Malware scan completed',
            'data': scan_results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Malware scan failed',
            'errors': {'general': [str(e)]}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)