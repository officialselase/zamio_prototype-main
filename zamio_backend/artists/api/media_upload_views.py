"""
API views for secure media file uploads
"""
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.http import Http404
from accounts.models import AuditLog
from artists.models import Track, Album, Artist
from artists.services.media_file_service import MediaFileService


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def upload_track_audio_view(request):
    """Upload audio file for a track with enhanced security"""
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
        
        # Get form data
        audio_file = request.FILES.get('audio_file')
        track_id = request.data.get('track_id')  # Optional, for updating existing track
        
        # Get metadata
        metadata = {
            'title': request.data.get('title', ''),
            'explicit': request.data.get('explicit', False),
            'lyrics': request.data.get('lyrics', ''),
            'genre_id': request.data.get('genre_id'),
            'album_id': request.data.get('album_id'),
        }
        
        # Validate required fields
        if not audio_file:
            payload['message'] = 'Audio file is required'
            payload['errors'] = {'audio_file': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        if not metadata['title']:
            payload['message'] = 'Track title is required'
            payload['errors'] = {'title': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate track ownership if updating existing track
        if track_id:
            try:
                track = Track.objects.get(id=track_id, artist=artist)
            except Track.DoesNotExist:
                payload['message'] = 'Track not found or access denied'
                payload['errors'] = {'track_id': ['Track not found or you do not have permission to modify it']}
                return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
        # Initiate secure upload processing
        upload_result = MediaFileService.initiate_media_upload(
            user=user,
            file=audio_file,
            media_type='audio',
            entity_type='track',
            entity_id=int(track_id) if track_id else None,
            metadata=metadata
        )
        
        payload['message'] = 'Audio upload initiated successfully'
        payload['data'] = upload_result
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except ValidationError as e:
        payload['message'] = 'File validation failed'
        payload['errors'] = {'audio_file': e.messages if hasattr(e, 'messages') else [str(e)]}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        payload['message'] = 'Upload failed'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def upload_track_cover_view(request):
    """Upload cover art for a track with enhanced security"""
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Verify user is an artist
        try:
            artist = Artist.objects.get(user=user)
        except Artist.DoesNotExist:
            payload['message'] = 'User is not registered as an artist'
            payload['errors'] = {'user': ['Only artists can upload track covers']}
            return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
        # Get form data
        cover_file = request.FILES.get('cover_art')
        track_id = request.data.get('track_id')
        
        # Validate required fields
        if not cover_file:
            payload['message'] = 'Cover art file is required'
            payload['errors'] = {'cover_art': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        if not track_id:
            payload['message'] = 'Track ID is required'
            payload['errors'] = {'track_id': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate track ownership
        try:
            track = Track.objects.get(id=track_id, artist=artist)
        except Track.DoesNotExist:
            payload['message'] = 'Track not found or access denied'
            payload['errors'] = {'track_id': ['Track not found or you do not have permission to modify it']}
            return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
        # Initiate secure upload processing
        upload_result = MediaFileService.initiate_media_upload(
            user=user,
            file=cover_file,
            media_type='image',
            entity_type='track',
            entity_id=int(track_id),
            metadata={'track_title': track.title}
        )
        
        payload['message'] = 'Cover art upload initiated successfully'
        payload['data'] = upload_result
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except ValidationError as e:
        payload['message'] = 'File validation failed'
        payload['errors'] = {'cover_art': e.messages if hasattr(e, 'messages') else [str(e)]}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        payload['message'] = 'Upload failed'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def upload_album_cover_view(request):
    """Upload cover art for an album with enhanced security"""
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Verify user is an artist
        try:
            artist = Artist.objects.get(user=user)
        except Artist.DoesNotExist:
            payload['message'] = 'User is not registered as an artist'
            payload['errors'] = {'user': ['Only artists can upload album covers']}
            return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
        # Get form data
        cover_file = request.FILES.get('cover_art')
        album_id = request.data.get('album_id')
        
        # Get metadata
        metadata = {
            'title': request.data.get('title', ''),
            'release_date': request.data.get('release_date'),
        }
        
        # Validate required fields
        if not cover_file:
            payload['message'] = 'Cover art file is required'
            payload['errors'] = {'cover_art': ['This field is required']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate album ownership if updating existing album
        if album_id:
            try:
                album = Album.objects.get(id=album_id, artist=artist)
            except Album.DoesNotExist:
                payload['message'] = 'Album not found or access denied'
                payload['errors'] = {'album_id': ['Album not found or you do not have permission to modify it']}
                return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
        # Initiate secure upload processing
        upload_result = MediaFileService.initiate_media_upload(
            user=user,
            file=cover_file,
            media_type='image',
            entity_type='album',
            entity_id=int(album_id) if album_id else None,
            metadata=metadata
        )
        
        payload['message'] = 'Album cover upload initiated successfully'
        payload['data'] = upload_result
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except ValidationError as e:
        payload['message'] = 'File validation failed'
        payload['errors'] = {'cover_art': e.messages if hasattr(e, 'messages') else [str(e)]}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        payload['message'] = 'Upload failed'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_upload_status_view(request, upload_id):
    """Get status of media upload processing"""
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        # Get upload status
        status_info = MediaFileService.get_upload_status(upload_id)
        
        payload['message'] = 'Upload status retrieved successfully'
        payload['data'] = status_info
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        payload['message'] = 'Failed to retrieve upload status'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_secure_media_url_view(request, entity_type, entity_id):
    """Get secure URL for accessing media files"""
    payload = {'message': '', 'data': {}, 'errors': {}}
    
    try:
        user = request.user
        
        # Verify user is an artist
        try:
            artist = Artist.objects.get(user=user)
        except Artist.DoesNotExist:
            payload['message'] = 'User is not registered as an artist'
            payload['errors'] = {'user': ['Only artists can access media files']}
            return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
        # Get the entity and verify ownership
        if entity_type == 'track':
            try:
                entity = Track.objects.get(id=entity_id, artist=artist)
            except Track.DoesNotExist:
                raise Http404("Track not found or access denied")
        elif entity_type == 'album':
            try:
                entity = Album.objects.get(id=entity_id, artist=artist)
            except Album.DoesNotExist:
                raise Http404("Album not found or access denied")
        else:
            payload['message'] = 'Invalid entity type'
            payload['errors'] = {'entity_type': ['Must be "track" or "album"']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate secure URLs for media files
        media_urls = {}
        
        if entity_type == 'track':
            if entity.audio_file:
                media_urls['audio_file'] = entity.audio_file.url
            if entity.audio_file_mp3:
                media_urls['audio_file_mp3'] = entity.audio_file_mp3.url
            if entity.audio_file_wav:
                media_urls['audio_file_wav'] = entity.audio_file_wav.url
            if entity.cover_art:
                media_urls['cover_art'] = entity.cover_art.url
        else:  # album
            if entity.cover_art:
                media_urls['cover_art'] = entity.cover_art.url
        
        # Log media access
        AuditLog.objects.create(
            user=user,
            action='media_access',
            resource_type=entity_type,
            resource_id=str(entity_id),
            request_data={
                'entity_title': entity.title,
                'accessed_files': list(media_urls.keys())
            }
        )
        
        payload['message'] = 'Media URLs retrieved successfully'
        payload['data'] = {
            'entity_type': entity_type,
            'entity_id': entity_id,
            'entity_title': entity.title,
            'media_urls': media_urls
        }
        return Response(payload, status=status.HTTP_200_OK)
        
    except Http404 as e:
        payload['message'] = str(e)
        payload['errors'] = {'entity': ['Entity not found or access denied']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        payload['message'] = 'Failed to retrieve media URLs'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)