# streamer/models.py
import os
import uuid
import hashlib
import mimetypes
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

class StreamSource(models.Model):
    name = models.CharField(max_length=100)
    stream_url = models.URLField()
    is_active = models.BooleanField(default=True)

def validate_audio_clip_size(file):
    """Validate audio clip file size - max 50MB"""
    max_size = 50 * 1024 * 1024  # 50MB
    if file.size > max_size:
        raise ValidationError(f'Audio clip size cannot exceed {max_size // (1024*1024)}MB')


def validate_audio_clip_type(file):
    """Validate audio clip file type for security"""
    allowed_types = {
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/flac', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'
    }
    
    # Dangerous file extensions to block
    dangerous_extensions = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.ps1', '.msi', '.deb', '.rpm'
    }
    
    if hasattr(file, 'content_type'):
        content_type = file.content_type
    else:
        content_type, _ = mimetypes.guess_type(file.name)
    
    # Check file extension
    _, ext = os.path.splitext(file.name.lower())
    if ext in dangerous_extensions:
        raise ValidationError(f'File extension {ext} is not allowed for security reasons')
    
    # Check content type
    if content_type not in allowed_types:
        raise ValidationError(f'Audio file type {content_type} is not allowed')
    
    # Check for null bytes in filename (security issue)
    if '\x00' in file.name:
        raise ValidationError('File name contains invalid characters')


def secure_audio_clip_path(instance, filename):
    """Generate secure file upload path for audio clips"""
    # Sanitize filename
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    
    # Generate unique filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    final_filename = f"{safe_name}_{timestamp}_{unique_id}{ext}"
    
    # Create station-specific path
    station_id = instance.station.id if instance.station else 'unknown'
    return f"matched_clips/{station_id}/{timezone.now().strftime('%Y/%m')}/{final_filename}"


class AudioMatch(models.Model):
    track_title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    matched_at = models.DateTimeField(auto_now_add=True)
    confidence = models.FloatField()
    station = models.ForeignKey(StreamSource, on_delete=models.CASCADE)
    clip_file = models.FileField(
        upload_to=secure_audio_clip_path, 
        null=True, 
        blank=True,
        validators=[validate_audio_clip_size, validate_audio_clip_type]
    )
    
    # Enhanced security fields
    file_hash = models.CharField(max_length=64, null=True, blank=True)  # SHA-256 hash
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if self.clip_file:
            # Store original filename and metadata
            self.original_filename = self.clip_file.name
            self.file_size = self.clip_file.size
            
            # Generate file hash for integrity checking
            if not self.file_hash:
                self.clip_file.seek(0)
                file_content = self.clip_file.read()
                self.file_hash = hashlib.sha256(file_content).hexdigest()
                self.clip_file.seek(0)
        
        super().save(*args, **kwargs)
    
    def verify_file_integrity(self):
        """Verify file integrity using stored hash"""
        if not self.clip_file or not self.file_hash:
            return False
        
        try:
            self.clip_file.seek(0)
            file_content = self.clip_file.read()
            current_hash = hashlib.sha256(file_content).hexdigest()
            self.clip_file.seek(0)
            return current_hash == self.file_hash
        except Exception:
            return False