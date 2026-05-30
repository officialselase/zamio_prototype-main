"""
Media file access control service for secure media serving
"""
import os
import time
import hmac
import hashlib
from typing import Optional, Dict, Any
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse, Http404
from django.core.files.storage import default_storage
from django.utils import timezone
from artists.models import Track, Album
from accounts.models import User, AuditLog


class MediaAccessService:
    """Service for controlling access to media files with security checks"""
    
    # Token expiry time in seconds (2 hours for media files)
    TOKEN_EXPIRY = 7200
    
    @classmethod
    def generate_secure_token(cls, resource_type: str, resource_id: int, user_id: int) -> str:
        """Generate a secure token for media file access"""
        timestamp = str(int(time.time()))
        message = f"{resource_type}:{resource_id}:{user_id}:{timestamp}"
        
        # Use Django's SECRET_KEY for HMAC
        secret_key = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
        
        return f"{timestamp}.{signature}"
    
    @classmethod
    def verify_secure_token(cls, token: str, resource_type: str, resource_id: int, user_id: int) -> bool:
        """Verify a secure token for media file access"""
        try:
            timestamp_str, signature = token.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check if token has expired
            if time.time() - timestamp > cls.TOKEN_EXPIRY:
                return False
            
            # Regenerate expected signature
            message = f"{resource_type}:{resource_id}:{user_id}:{timestamp_str}"
            secret_key = settings.SECRET_KEY.encode('utf-8')
            expected_signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
            
            # Compare signatures securely
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, TypeError):
            return False
    
    @classmethod
    def check_media_access_permission(cls, user: User, resource_type: str, resource_id: int) -> bool:
        """Check if user has permission to access the media file"""
        try:
            if resource_type == 'track':
                track = Track.objects.get(id=resource_id)
                
                # Owner can always access their tracks
                if track.artist.user_id == user.id:
                    return True
                
                # Admin users can access tracks for review
                if user.is_staff or user.admin:
                    return True
                
                # Publishers can access their artists' tracks
                if user.user_type == 'Publisher':
                    from publishers.models import PublisherArtistRelationship
                    try:
                        PublisherArtistRelationship.objects.get(
                            publisher__user=user,
                            artist=track.artist,
                            status='active'
                        )
                        return True
                    except:
                        pass
                
                # Public access for published, non-quarantined tracks
                if (track.status == 'Approved' and 
                    track.processing_status == 'completed' and 
                    not track.is_quarantined and 
                    track.active):
                    return True
                
            elif resource_type == 'album':
                album = Album.objects.get(id=resource_id)
                
                # Owner can always access their albums
                if album.artist.user_id == user.id:
                    return True
                
                # Admin users can access albums for review
                if user.is_staff or user.admin:
                    return True
                
                # Publishers can access their artists' albums
                if user.user_type == 'Publisher':
                    from publishers.models import PublisherArtistRelationship
                    try:
                        PublisherArtistRelationship.objects.get(
                            publisher__user=user,
                            artist=album.artist,
                            status='active'
                        )
                        return True
                    except:
                        pass
                
                # Public access for active albums
                if album.active:
                    return True
            
            return False
            
        except (Track.DoesNotExist, Album.DoesNotExist):
            return False
    
    @classmethod
    def serve_secure_media_file(
        cls, 
        user: User, 
        resource_type: str,
        resource_id: int,
        file_type: str,  # 'audio', 'cover_art'
        token: Optional[str] = None
    ) -> HttpResponse:
        """
        Serve a media file securely with access controls
        
        Args:
            user: The requesting user
            resource_type: 'track' or 'album'
            resource_id: ID of the resource
            file_type: Type of file to serve ('audio', 'cover_art')
            token: Optional secure token for additional verification
            
        Returns:
            HttpResponse with file content or error
            
        Raises:
            Http404: If resource not found
            PermissionDenied: If user doesn't have access
        """
        # Check basic access permission
        if not cls.check_media_access_permission(user, resource_type, resource_id):
            raise PermissionDenied("You don't have permission to access this media file")
        
        # Verify token if provided
        if token and not cls.verify_secure_token(token, resource_type, resource_id, user.id):
            raise PermissionDenied("Invalid or expired access token")
        
        # Get the resource and file
        try:
            if resource_type == 'track':
                track = Track.objects.get(id=resource_id)
                
                # Check if track is quarantined
                if track.is_quarantined and not (user.is_staff or user.admin):
                    raise PermissionDenied("This track has been quarantined for security reasons")
                
                if file_type == 'audio':
                    file_field = track.audio_file
                    filename = f"{track.title}.{file_field.name.split('.')[-1]}"
                    content_type = 'audio/mpeg'  # Default, could be detected
                elif file_type == 'cover_art':
                    file_field = track.cover_art
                    filename = f"{track.title}_cover.{file_field.name.split('.')[-1]}"
                    content_type = 'image/jpeg'  # Default, could be detected
                else:
                    raise Http404("Invalid file type")
                
                # Verify file integrity
                if file_type == 'audio' and not track.verify_audio_integrity():
                    raise Http404("Audio file integrity check failed")
                elif file_type == 'cover_art' and not track.verify_cover_art_integrity():
                    raise Http404("Cover art integrity check failed")
                
            elif resource_type == 'album':
                album = Album.objects.get(id=resource_id)
                
                if file_type == 'cover_art':
                    file_field = album.cover_art
                    filename = f"{album.title}_cover.{file_field.name.split('.')[-1]}"
                    content_type = 'image/jpeg'  # Default, could be detected
                else:
                    raise Http404("Invalid file type for album")
                
                # Verify file integrity
                if not album.verify_cover_art_integrity():
                    raise Http404("Cover art integrity check failed")
            
            else:
                raise Http404("Invalid resource type")
                
        except (Track.DoesNotExist, Album.DoesNotExist):
            raise Http404("Resource not found")
        
        # Check if file exists in storage
        if not file_field or not default_storage.exists(file_field.name):
            raise Http404("File not found in storage")
        
        # Enhanced audit logging for media access
        audit_data = {
            'file_type': file_type,
            'filename': filename,
            'access_method': 'secure_token' if token else 'direct',
            'file_size': file_field.size if hasattr(file_field, 'size') else None,
            'file_path': file_field.name if file_field else None,
            'access_timestamp': timezone.now().isoformat(),
            'user_agent': getattr(user, 'user_agent', 'Unknown'),
            'ip_address': getattr(user, 'ip_address', 'Unknown')
        }
        
        # Add resource-specific information
        if resource_type == 'track':
            audit_data.update({
                'track_title': track.title,
                'artist_name': track.artist.stage_name,
                'track_status': track.status,
                'is_quarantined': track.is_quarantined,
                'processing_status': track.processing_status
            })
        elif resource_type == 'album':
            audit_data.update({
                'album_title': album.title,
                'artist_name': album.artist.stage_name,
                'album_active': album.active
            })
        
        AuditLog.objects.create(
            user=user,
            action='media_file_access',
            resource_type=resource_type.title(),
            resource_id=str(resource_id),
            request_data=audit_data
        )
        
        # Serve the file
        try:
            file_content = file_field.read()
            
            response = HttpResponse(file_content, content_type=content_type)
            
            # Set security headers
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(file_content)
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['Cache-Control'] = 'private, max-age=3600'  # Cache for 1 hour
            response['Pragma'] = 'private'
            
            # Add CORS headers for media files (if needed for web players)
            if file_type == 'audio':
                response['Access-Control-Allow-Origin'] = '*'
                response['Access-Control-Allow-Methods'] = 'GET'
            
            return response
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=user,
                action='media_file_access_error',
                resource_type=resource_type.title(),
                resource_id=str(resource_id),
                request_data={
                    'error': str(e),
                    'file_type': file_type,
                    'filename': filename
                }
            )
            raise Http404("Error serving media file")
    
    @classmethod
    def get_secure_media_url(
        cls, 
        user: User, 
        resource_type: str, 
        resource_id: int, 
        file_type: str
    ) -> Dict[str, Any]:
        """
        Generate a secure media URL with token
        
        Args:
            user: The requesting user
            resource_type: 'track' or 'album'
            resource_id: ID of the resource
            file_type: Type of file ('audio', 'cover_art')
            
        Returns:
            Dict with media URL and token info
        """
        # Check access permission
        if not cls.check_media_access_permission(user, resource_type, resource_id):
            raise PermissionDenied("You don't have permission to access this media file")
        
        # Generate secure token
        token = cls.generate_secure_token(resource_type, resource_id, user.id)
        
        # Build URL
        base_url = f'/api/artists/media/{resource_type}/{resource_id}/{file_type}/'
        secure_url = f'{base_url}?token={token}'
        
        return {
            'media_url': secure_url,
            'token': token,
            'expires_in': cls.TOKEN_EXPIRY,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'file_type': file_type
        }
    
    @classmethod
    def get_public_media_url(cls, resource_type: str, resource_id: int, file_type: str) -> Optional[str]:
        """
        Get public media URL for approved, non-quarantined content
        
        Args:
            resource_type: 'track' or 'album'
            resource_id: ID of the resource
            file_type: Type of file ('audio', 'cover_art')
            
        Returns:
            Public URL if content is public, None otherwise
        """
        try:
            if resource_type == 'track':
                track = Track.objects.get(id=resource_id)
                if (track.status == 'Approved' and 
                    track.processing_status == 'completed' and 
                    not track.is_quarantined and 
                    track.active):
                    return f'/api/artists/media/public/{resource_type}/{resource_id}/{file_type}/'
            
            elif resource_type == 'album':
                album = Album.objects.get(id=resource_id)
                if album.active:
                    return f'/api/artists/media/public/{resource_type}/{resource_id}/{file_type}/'
            
            return None
            
        except (Track.DoesNotExist, Album.DoesNotExist):
            return None
    
    @classmethod
    def cleanup_expired_tokens(cls):
        """Cleanup method for expired tokens (placeholder for future implementation)"""
        # This could be implemented to track and clean up expired tokens
        # if they were stored in a database or cache
        pass