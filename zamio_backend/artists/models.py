"""Enhanced models for artists with comprehensive media file processing and contributor management"""
import os
import hashlib
from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.conf import settings
from accounts.models import AuditLog
from fan.models import Fan
from publishers.models import PublisherProfile
from core.utils import unique_artist_id_generator

User = get_user_model()


# File validation functions
def validate_audio_file_size(file):
    """Validate audio file size - max 100MB"""
    max_size = 100 * 1024 * 1024  # 100MB
    if file.size > max_size:
        raise ValidationError(f'File size ({file.size} bytes) exceeds maximum allowed size ({max_size} bytes)')


def validate_audio_file_type(file):
    """Validate audio file type for security"""
    allowed_types = {
        'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac',
        'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/x-m4a'
    }
    
    if file.content_type not in allowed_types:
        raise ValidationError(f'File type {file.content_type} is not allowed')


def validate_image_file_size(file):
    """Validate image file size - max 10MB"""
    max_size = 10 * 1024 * 1024  # 10MB
    if file.size > max_size:
        raise ValidationError(f'Image size ({file.size} bytes) exceeds maximum allowed size ({max_size} bytes)')


def validate_image_file_type(file):
    """Validate image file type for security"""
    allowed_types = {
        'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    }
    
    if file.content_type not in allowed_types:
        raise ValidationError(f'Image type {file.content_type} is not allowed')


# Upload path functions
def secure_audio_upload_path(instance, filename):
    """Generate secure upload path for audio files"""
    # Get artist ID for path isolation
    if hasattr(instance, 'artist'):
        artist_id = instance.artist.id
        entity_type = 'tracks' if instance.__class__.__name__ == 'Track' else 'albums'
    else:
        artist_id = 'unknown'
        entity_type = 'media'
    
    # Clean filename and add timestamp for uniqueness
    clean_filename = filename.replace(' ', '_').replace('..', '_')
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    name, ext = os.path.splitext(clean_filename)
    secure_filename = f"{name}_{timestamp}{ext}"
    
    return f'artists/{artist_id}/{entity_type}/audio/{secure_filename}'


def secure_image_upload_path(instance, filename):
    """Generate secure upload path for image files"""
    # Get artist ID for path isolation
    if hasattr(instance, 'artist'):
        artist_id = instance.artist.id
        entity_type = 'tracks' if instance.__class__.__name__ == 'Track' else 'albums'
    else:
        artist_id = 'unknown'
        entity_type = 'media'
    
    # Clean filename and add timestamp for uniqueness
    clean_filename = filename.replace(' ', '_').replace('..', '_')
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    name, ext = os.path.splitext(clean_filename)
    secure_filename = f"{name}_{timestamp}{ext}"
    
    return f'artists/{artist_id}/{entity_type}/images/{secure_filename}'


def get_default_track_cover_image():
    """Get default cover image for tracks"""
    return 'defaults/track_cover.png'


def get_default_album_cover_image():
    """Get default cover image for albums"""
    return 'defaults/album_cover.png'


# ID generators
def unique_track_id_generator(instance):
    """Generate unique track ID"""
    import uuid
    return f"TRK_{uuid.uuid4().hex[:8].upper()}"


def unique_album_id_generator(instance):
    """Generate unique album ID"""
    import uuid
    return f"ALB_{uuid.uuid4().hex[:8].upper()}"


def unique_contributor_id_generator(instance):
    """Generate unique contributor ID"""
    import uuid
    return f"CTR_{uuid.uuid4().hex[:8].upper()}"


# Upload Processing Status Model
class UploadProcessingStatus(models.Model):
    """Track upload processing status with real-time updates"""
    PROCESSING_STATES = [
        ('pending', 'Pending'),
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('deleting', 'Deleting'),
        ('deleted', 'Deleted'),
    ]
    
    UPLOAD_TYPES = [
        ('track_audio', 'Track Audio'),
        ('track_cover', 'Track Cover Art'),
        ('album_cover', 'Album Cover Art'),
    ]
    
    upload_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    upload_type = models.CharField(max_length=20, choices=UPLOAD_TYPES)
    
    # File information
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100, blank=True)
    file_hash = models.CharField(max_length=64, null=True, blank=True)
    
    # Processing status
    status = models.CharField(max_length=20, choices=PROCESSING_STATES, default='pending')
    progress_percentage = models.IntegerField(default=0)
    current_step = models.CharField(max_length=100, blank=True)
    
    # Results
    entity_id = models.IntegerField(null=True, blank=True)  # Track or Album ID
    entity_type = models.CharField(max_length=20, blank=True)  # 'track' or 'album'
    
    # Error handling
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['upload_id']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.upload_type} upload {self.upload_id} - {self.status}"
    
    def update_progress(self, percentage, step=None, save=True):
        """Update processing progress"""
        self.progress_percentage = min(100, max(0, percentage))
        if step:
            self.current_step = step
        self.updated_at = timezone.now()
        if save:
            self.save(update_fields=['progress_percentage', 'current_step', 'updated_at'])
    
    def mark_started(self):
        """Mark upload processing as started"""
        self.status = 'processing'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_completed(self, entity_id=None, entity_type=None):
        """Mark upload processing as completed"""
        self.status = 'completed'
        self.progress_percentage = 100
        self.completed_at = timezone.now()
        if entity_id:
            self.entity_id = entity_id
        if entity_type:
            self.entity_type = entity_type
        self.save(update_fields=['status', 'progress_percentage', 'completed_at', 'entity_id', 'entity_type'])
    
    def mark_failed(self, error_message):
        """Mark upload processing as failed"""
        self.status = 'failed'
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'completed_at'])


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    
    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Artist(models.Model):

    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('skipped', 'Skipped'),
    ]
    ONBOARDING_STEPS = [
        ('profile', 'Profile'),
        ('social-media', 'Social Media'),
        ('payment', 'Payment'),
        ('publisher', 'Publisher'),
        ('kyc', 'Identity Verification'),
        ('done', 'Done'),
    ]
    
    artist_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='artists')
    stage_name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    primary_genre = models.CharField(max_length=100, blank=True, null=True)
    music_style = models.CharField(max_length=100, blank=True, null=True)

    # Social media links
    website = models.URLField(blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    youtube = models.URLField(blank=True, null=True)
    spotify = models.URLField(blank=True, null=True)
    social_metrics = models.JSONField(default=dict, blank=True)

    # Verification status
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='pending'
    )
    verification_documents = models.JSONField(default=list, blank=True)

    # Publishing relationship
    is_self_published = models.BooleanField(default=True)
    publisher = models.ForeignKey(
        'publishers.PublisherProfile', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='managed_artists'
    )
    
    # Onboarding fields
    onboarding_step = models.CharField(max_length=32, choices=ONBOARDING_STEPS, default='profile')
    profile_completed = models.BooleanField(default=False)
    social_media_added = models.BooleanField(default=False)
    payment_info_added = models.BooleanField(default=False)
    publisher_added = models.BooleanField(default=False)
    payment_preferences = models.JSONField(default=dict, blank=True)
    publisher_preferences = models.JSONField(default=dict, blank=True)
    
    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.stage_name
    
    def can_withdraw_royalties(self):
        """Check if artist can withdraw royalties based on publishing status"""
        if self.is_self_published:
            return True
        return False  # Publisher handles withdrawals for managed artists

    def get_next_onboarding_step(self):
        """Return next onboarding step based on completion flags."""
        steps = [
            ('profile', self.profile_completed),
            ('social-media', self.social_media_added),
            ('payment', self.payment_info_added),
            ('publisher', self.publisher_added),
        ]
        for step, completed in steps:
            if not completed:
                return step

        user = getattr(self, 'user', None)
        if user and getattr(user, 'verification_status', None) == 'pending':
            # Surface the identity verification step when no supporting documents have been uploaded yet.
            try:
                if not user.uploaded_kyc_documents.exists():
                    return 'kyc'
            except Exception:
                return 'kyc'

        return 'done'


class ArtistIdentityProfile(models.Model):
    """Capture identity information submitted during the onboarding KYC step."""

    ID_TYPE_CHOICES = [
        ('ghana_card', 'Ghana Card'),
        ('passport', 'Passport'),
        ('drivers_license', "Driver's License"),
        ('voter_id', 'Voter ID'),
    ]

    artist = models.OneToOneField(
        Artist,
        on_delete=models.CASCADE,
        related_name='identity_profile'
    )
    full_legal_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=120, blank=True)
    id_type = models.CharField(max_length=40, choices=ID_TYPE_CHOICES)
    id_number = models.CharField(max_length=120)
    residential_address = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['artist']),
            models.Index(fields=['id_type']),
        ]

    def __str__(self):
        return f"Identity profile for {self.artist.stage_name}"

    def as_payload(self) -> dict:
        return {
            'full_name': self.full_legal_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else '',
            'nationality': self.nationality or '',
            'id_type': self.id_type,
            'id_number': self.id_number,
            'residential_address': self.residential_address,
        }

class Album(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
    ]
    
    album_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    title = models.CharField(max_length=255)
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name='albums')
    
    cover_art = models.ImageField(
        upload_to=secure_image_upload_path, 
        default=get_default_album_cover_image,
        validators=[validate_image_file_size, validate_image_file_type]
    )
    
    release_date = models.DateField(blank=True, null=True)
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, null=True)
    
    # Enhanced security and processing fields
    cover_art_hash = models.CharField(max_length=64, null=True, blank=True)
    last_malware_scan = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Pending")
    
    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} by {self.artist.stage_name}"
    
    def save(self, *args, **kwargs):
        # Generate cover art hash if not present
        if self.cover_art and not self.cover_art_hash:
            try:
                self.cover_art.seek(0)
                file_content = self.cover_art.read()
                self.cover_art_hash = hashlib.sha256(file_content).hexdigest()
                self.cover_art.seek(0)
            except Exception:
                pass
        
        super().save(*args, **kwargs)


class Track(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
    ]
    
    track_id = models.CharField(max_length=255, blank=True, null=True, unique=True)

    title = models.CharField(max_length=255)
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)

    album = models.ForeignKey(Album, on_delete=models.SET_NULL, null=True, blank=True)
    
    cover_art = models.ImageField(
        upload_to=secure_image_upload_path, 
        default=get_default_track_cover_image,
        validators=[validate_image_file_size, validate_image_file_type]
    )

    audio_file = models.FileField(
        upload_to=secure_audio_upload_path,
        validators=[validate_audio_file_size, validate_audio_file_type]
    )
    
    audio_file_mp3 = models.FileField(
        upload_to=secure_audio_upload_path, 
        null=True, 
        blank=True,
        validators=[validate_audio_file_size, validate_audio_file_type]
    )
    audio_file_wav = models.FileField(
        upload_to=secure_audio_upload_path, 
        null=True, 
        blank=True,
        validators=[validate_audio_file_size, validate_audio_file_type]
    )

    release_date = models.DateField(blank=True, null=True)
    isrc_code = models.CharField(max_length=30, unique=True, null=True, blank=True, help_text="International Standard Recording Code")
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, null=True)
    duration = models.DurationField(help_text="Track length", null=True, blank=True)
    lyrics = models.TextField(blank=True, null=True)
    explicit = models.BooleanField(default=False)

    bpm = models.PositiveIntegerField(null=True, blank=True)
    musical_key = models.CharField(max_length=50, null=True, blank=True)
    mood = models.CharField(max_length=100, null=True, blank=True)
    language = models.CharField(max_length=50, null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    distribution_platforms = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    collaborators = models.JSONField(default=list, blank=True)
    catalog_notes = models.TextField(null=True, blank=True)

    publisher = models.ForeignKey('publishers.PublisherProfile', on_delete=models.SET_NULL, null=True, related_name='track_publishers')

    # Enhanced security and processing fields
    audio_file_hash = models.CharField(max_length=64, null=True, blank=True)  # SHA-256 hash
    cover_art_hash = models.CharField(max_length=64, null=True, blank=True)  # SHA-256 hash
    processing_status = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending'),
            ('queued', 'Queued'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed')
        ],
        default='pending'
    )
    processing_error = models.TextField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Security scanning fields
    last_malware_scan = models.DateTimeField(null=True, blank=True)
    is_quarantined = models.BooleanField(default=False)
    quarantine_reason = models.TextField(null=True, blank=True)

    fingerprinted = models.BooleanField(default=False)
    royalty_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Pending")

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)  # Changed to True so tracks are active by default for matching
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_royalty(self, duration):
        """Calculate royalty for this track based on play duration"""
        # Placeholder for royalty calculation logic
        base_rate = Decimal('0.01')  # $0.01 per play
        return base_rate * Decimal(str(duration))

    def __str__(self):
        return f"{self.title} by {self.artist.stage_name}"
    
    def validate_contributor_splits(self):
        """Validate that contributor splits total 100%"""
        return Contributor.validate_track_splits(self)
    
    def can_be_published(self):
        """Check if track can be published (has valid splits and required metadata)"""
        splits_valid, _ = self.validate_contributor_splits()
        has_required_metadata = bool(self.title and self.artist and self.audio_file)
        processing_complete = self.processing_status == 'completed'
        not_quarantined = not self.is_quarantined
        
        return splits_valid and has_required_metadata and processing_complete and not_quarantined
    
    def verify_audio_integrity(self):
        """Verify audio file integrity using stored hash"""
        if not self.audio_file or not self.audio_file_hash:
            return False
        
        try:
            self.audio_file.seek(0)
            file_content = self.audio_file.read()
            current_hash = hashlib.sha256(file_content).hexdigest()
            self.audio_file.seek(0)
            return current_hash == self.audio_file_hash
        except Exception:
            return False
    
    def get_contributor_splits_summary(self):
        """Get summary of contributor splits for this track"""
        return Contributor.get_track_split_summary(self)
    
    def auto_balance_contributor_splits(self):
        """Auto-balance contributor splits to total 100%"""
        return Contributor.auto_balance_splits(self)

    def save(self, *args, **kwargs):
        # Generate file hashes if not present
        if self.audio_file and not self.audio_file_hash:
            try:
                self.audio_file.seek(0)
                file_content = self.audio_file.read()
                self.audio_file_hash = hashlib.sha256(file_content).hexdigest()
                self.audio_file.seek(0)
            except Exception:
                pass
        
        if self.cover_art and not self.cover_art_hash:
            try:
                self.cover_art.seek(0)
                file_content = self.cover_art.read()
                self.cover_art_hash = hashlib.sha256(file_content).hexdigest()
                self.cover_art.seek(0)
            except Exception:
                pass
        
        super().save(*args, **kwargs)


class Contributor(models.Model):
    ROLE_CHOICES = [
        ('Composer', 'Composer'),
        ('Producer', 'Producer'),
        ('Writer', 'Writer'),
        ('Featured Artist', 'Featured Artist'),
        ('Mixer', 'Mixer'),
        ('Engineer', 'Engineer'),
    ]

    contributor_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contributor')

    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name='contributors')
    percent_split = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    publisher = models.ForeignKey('publishers.PublisherProfile', on_delete=models.SET_NULL, null=True, related_name='contributor_publishers')

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        user = getattr(self, 'user', None)
        first = getattr(user, 'first_name', '') if user else ''
        last = getattr(user, 'last_name', '') if user else ''
        username = getattr(user, 'username', '') if user else ''
        email = getattr(user, 'email', '') if user else ''
        name = (f"{first} {last}".strip() or username or email or "Contributor")
        return f"{name} ({self.role}) on {self.track.title}"
    
    def clean(self):
        """Validate that contributor splits for a track don't exceed 100%"""
        if self.track_id:
            # Get total splits for this track excluding current contributor
            total_splits = Contributor.objects.filter(
                track=self.track, 
                active=True
            ).exclude(id=self.id).aggregate(
                total=Sum('percent_split')
            )['total'] or 0
            
            # Add current contributor's split
            total_splits += self.percent_split
            
            if total_splits > 100:
                raise ValidationError(
                    f'Total contributor splits cannot exceed 100%. Current total: {total_splits}%'
                )
            
            # Validate percentage is positive
            if self.percent_split <= 0:
                raise ValidationError('Contributor split percentage must be greater than 0%')
            
            # Validate percentage is not more than 100
            if self.percent_split > 100:
                raise ValidationError('Contributor split percentage cannot exceed 100%')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    @classmethod
    def validate_track_splits(cls, track):
        """Validate that all contributor splits for a track total 100%"""
        total_splits = cls.objects.filter(
            track=track, 
            active=True
        ).aggregate(total=Sum('percent_split'))['total'] or 0
        
        return total_splits == 100, total_splits
    
    @classmethod
    def auto_balance_splits(cls, track, exclude_contributor=None):
        """Automatically balance contributor splits to total 100%"""
        contributors = cls.objects.filter(track=track, active=True)
        if exclude_contributor:
            contributors = contributors.exclude(id=exclude_contributor.id)
        
        count = contributors.count()
        if count == 0:
            return []
        
        # Calculate equal split
        equal_split = Decimal('100') / count
        equal_split = equal_split.quantize(Decimal('0.01'), rounding='ROUND_DOWN')
        
        # Handle remainder
        remainder = Decimal('100') - (equal_split * count)
        
        updated_contributors = []
        for i, contributor in enumerate(contributors):
            # Add remainder to first contributor
            split = equal_split + (remainder if i == 0 else Decimal('0'))
            contributor.percent_split = split
            contributor.save()
            updated_contributors.append(contributor)
        
        return updated_contributors
    
    @classmethod
    def get_track_split_summary(cls, track):
        """Get comprehensive split summary for a track"""
        contributors = cls.objects.filter(track=track, active=True).select_related('user', 'publisher')
        total_split = contributors.aggregate(total=Sum('percent_split'))['total'] or 0
        
        splits = []
        for contributor in contributors:
            user_name = f"{contributor.user.first_name} {contributor.user.last_name}".strip() or contributor.user.email
            splits.append({
                'id': contributor.id,
                'user_id': contributor.user.id,
                'user_name': user_name,
                'role': contributor.role,
                'percentage': float(contributor.percent_split),
                'publisher': contributor.publisher.company_name if contributor.publisher else None,
                'is_artist': contributor.user == track.artist.user
            })
        
        return {
            'contributors': splits,
            'total_percentage': float(total_split),
            'is_valid': total_split == 100,
            'remaining_percentage': float(100 - total_split)
        }


class PlatformAvailability(models.Model):
    PLATFORM_CHOICES = [
        ('Spotify', 'Spotify'),
        ('Shazam', 'Shazam'),
        ('Apple Music', 'Apple Music'),
        ('YouTube Music', 'YouTube Music'),
        ('Tidal', 'Tidal'),
    ]
    track = models.ForeignKey(Track, on_delete=models.CASCADE)
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES)
    url = models.URLField()
    available = models.BooleanField(default=True)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.track.title} on {self.platform}"


class TrackFeedback(models.Model):
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="track_feedback")
    fan = models.ForeignKey(Fan, on_delete=models.CASCADE, related_name='fan_feedback')
    feedback = models.TextField(null=True, blank=True)
    rating = models.IntegerField(default=0)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TrackEditHistory(models.Model):
    """Track edit history for version tracking"""
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name='edit_history')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # Track what changed
    changed_fields = models.JSONField(default=dict)
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    
    # Edit metadata
    edit_reason = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Edit to {self.track.title} by {self.user.username} on {self.created_at}"


#####################
#### FINGERPRINTING #####
##################################

class Fingerprint(models.Model):
    """Enhanced fingerprint model with versioning and processing status"""
    PROCESSING_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="fingerprint_track")
    hash = models.CharField(max_length=64, db_index=True)  # Increased length for better hashes
    offset = models.IntegerField()
    
    # Versioning and processing
    version = models.IntegerField(default=1)
    processing_status = models.CharField(max_length=20, choices=PROCESSING_STATUS, default='pending')
    processing_error = models.TextField(null=True, blank=True)
    
    # Enhanced metadata
    algorithm_version = models.CharField(max_length=20, default='v1.0')
    confidence_score = models.FloatField(null=True, blank=True)
    audio_features = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('track', 'hash', 'offset')
        indexes = [
            models.Index(fields=['hash']),
            models.Index(fields=['track', 'processing_status']),
        ]

    def __str__(self):
        return f"Fingerprint for {self.track.title} at {self.offset}s"


# Signal handlers
@receiver(pre_save, sender=Artist)
def pre_save_artist_id_receiver(sender, instance, *args, **kwargs):
    if not instance.artist_id:
        instance.artist_id = unique_artist_id_generator(instance)

@receiver(pre_save, sender=Track)
def pre_save_track_id_receiver(sender, instance, *args, **kwargs):
    if not instance.track_id:
        instance.track_id = unique_track_id_generator(instance)


@receiver(pre_save, sender=Album)
def pre_save_album_id_receiver(sender, instance, *args, **kwargs):
    if not instance.album_id:
        instance.album_id = unique_album_id_generator(instance)


@receiver(pre_save, sender=Contributor)
def pre_save_contributor_id_receiver(sender, instance, *args, **kwargs):
    if not instance.contributor_id:
        instance.contributor_id = unique_contributor_id_generator(instance)