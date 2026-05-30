import uuid
import hashlib
import os
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.files.storage import default_storage



User = get_user_model()


def secure_contract_upload_path(instance, filename):
    """Generate secure upload path for contract files with user isolation"""
    # Sanitize filename
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_filename = f"{safe_name}{ext}"
    
    # Create path with user isolation and date organization
    if hasattr(instance, 'publisher'):
        publisher_id = instance.publisher.publisher_id or instance.publisher.id
    else:
        publisher_id = 'unknown'
    
    date_path = timezone.now().strftime('%Y/%m')
    return f'contracts/{publisher_id}/{date_path}/{safe_filename}'


def validate_contract_file(file):
    """Validate contract file upload"""
    from publishers.services.contract_security_service import ContractFileValidator
    
    if file:
        try:
            # Get publisher ID for validation context
            publisher_id = 0  # Default, will be set by the calling model
            validation_result = ContractFileValidator.validate_contract_file(file, publisher_id)
            
            if not validation_result['is_valid']:
                raise ValidationError("Contract file validation failed")
                
        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(f"Contract file validation error: {str(e)}")



class PublisherInvitation(models.Model):
    track = models.ForeignKey('artists.Track', on_delete=models.CASCADE, related_name='publisher_invite')
    invited_by = models.ForeignKey('artists.Artist', on_delete=models.CASCADE)

    email = models.EmailField()
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')])
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    sent_on = models.DateTimeField(auto_now_add=True)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PublisherProfile(models.Model):

    ONBOARDING_STEPS = [
        ('profile', 'Complete Profile'),
        ('revenue-split', 'Revenue Split'),
        ('link-artist', 'Sign Link Artist'),
        ('payment', 'Add Payment Info'),

    ]

    publisher_id = models.CharField(max_length=255, blank=True, null=True, default=uuid.uuid4, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='publisher')
    
    company_name = models.CharField(max_length=255, null=True, blank=True)
    company_type = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)

    # Contact & compliance details
    primary_contact_name = models.CharField(max_length=255, blank=True)
    primary_contact_email = models.EmailField(blank=True)
    primary_contact_phone = models.CharField(max_length=50, blank=True)
    compliance_officer_name = models.CharField(max_length=255, blank=True)
    compliance_officer_email = models.EmailField(blank=True)
    compliance_officer_phone = models.CharField(max_length=50, blank=True)
    compliance_officer_title = models.CharField(max_length=255, blank=True)

    # Business registration & licensing
    tax_id = models.CharField(max_length=50, blank=True)
    business_registration_number = models.CharField(max_length=100, blank=True)
    license_number = models.CharField(max_length=100, blank=True)

    # Location & profile
    region = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    country = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    location_name = models.CharField(max_length=900, null=True, blank=True)
    lat = models.DecimalField(default=0.0, max_digits=50, decimal_places=20, null=True, blank=True)
    lng = models.DecimalField(default=0.0, max_digits=50, decimal_places=20, null=True, blank=True)
    website_url = models.URLField(blank=True)
    description = models.TextField(blank=True)

    # Bank account can be optional during onboarding; allow blank
    bank_name = models.CharField(max_length=150, blank=True)
    bank_account = models.CharField(max_length=100, blank=True)
    bank_account_name = models.CharField(max_length=150, blank=True)
    bank_branch_code = models.CharField(max_length=50, blank=True)
    bank_swift_code = models.CharField(max_length=50, blank=True)

    # Mobile money account (optional)
    momo_account = models.CharField(max_length=100, blank=True)
    momo_account_name = models.CharField(max_length=150, blank=True)
    momo_provider = models.CharField(max_length=100, blank=True)

    preferred_payment_method = models.CharField(max_length=20, blank=True)
    payout_currency = models.CharField(max_length=10, blank=True)
    payout_frequency = models.CharField(max_length=20, blank=True)
    minimum_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    withholding_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    vat_registration_number = models.CharField(max_length=100, blank=True)

    verified = models.BooleanField(default=False)

    writer_split = models.DecimalField(default=0.0, max_digits=10, decimal_places=2, null=True, blank=True)
    publisher_split = models.DecimalField(default=0.0, max_digits=10, decimal_places=2, null=True, blank=True)
    mechanical_share = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    performance_share = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sync_share = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    administrative_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    revenue_split_notes = models.TextField(blank=True)

    onboarding_step = models.CharField(max_length=20, choices=ONBOARDING_STEPS, default='profile')

    profile_completed = models.BooleanField(default=False)
    revenue_split_completed = models.BooleanField(default=False)
    link_artist_completed = models.BooleanField(default=False)
    payment_info_added = models.BooleanField(default=False)


    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def get_next_onboarding_step(self):
        if not self.profile_completed:
            return 'profile'
        elif not self.revenue_split_completed:
            return 'revenue-split'
        elif not self.link_artist_completed:
            return 'link-artist'
        elif not self.payment_info_added:
            return 'payment'
       
        return 'done'


class PublishingAgreement(models.Model):
    publisher = models.ForeignKey(PublisherProfile, on_delete=models.CASCADE)
    songwriter = models.ForeignKey('artists.Artist', on_delete=models.CASCADE, related_name='published_songs')
    track = models.ForeignKey('artists.Track', on_delete=models.CASCADE)

    writer_share = models.DecimalField(max_digits=5, decimal_places=2)
    publisher_share = models.DecimalField(max_digits=5, decimal_places=2)

    # Enhanced contract file field with security
    contract_file = models.FileField(
        upload_to=secure_contract_upload_path, 
        blank=True,
        validators=[validate_contract_file],
        help_text="Upload contract document (PDF, DOC, DOCX, or image files only)"
    )
    
    # File security and integrity fields
    file_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash for file integrity")
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    file_type = models.CharField(max_length=100, blank=True, help_text="MIME type of the file")
    original_filename = models.CharField(max_length=255, blank=True, help_text="Original filename")
    
    # Version tracking
    version = models.PositiveIntegerField(default=1, help_text="Contract version number")
    previous_version = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='newer_versions',
        help_text="Reference to previous version of this contract"
    )
    
    # Access tracking
    access_count = models.PositiveIntegerField(default=0, help_text="Number of times file has been accessed")
    last_accessed = models.DateTimeField(null=True, blank=True, help_text="Last time file was accessed")
    
    # Security flags
    is_quarantined = models.BooleanField(default=False, help_text="File quarantined for security reasons")
    quarantine_reason = models.TextField(blank=True, help_text="Reason for quarantine")
    quarantined_at = models.DateTimeField(null=True, blank=True)
    quarantined_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='quarantined_agreements'
    )

    verified_by_admin = models.BooleanField(default=False)

    agreement_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')])

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['publisher', 'status']),
            models.Index(fields=['songwriter', 'status']),
            models.Index(fields=['track', 'status']),
            models.Index(fields=['version', 'created_at']),
        ]
    
    def save(self, *args, **kwargs):
        """Override save to handle file security processing"""
        if self.contract_file and self.contract_file.name:
            # Process file security if it's a new file
            if not self.file_hash or self._state.adding:
                self._process_file_security()
        
        super().save(*args, **kwargs)
    
    def _process_file_security(self):
        """Process file for security metadata"""
        if self.contract_file:
            try:
                # Calculate file hash
                self.contract_file.seek(0)
                file_content = self.contract_file.read()
                self.contract_file.seek(0)
                
                self.file_hash = hashlib.sha256(file_content).hexdigest()
                self.file_size = len(file_content)
                
                # Store original filename
                if hasattr(self.contract_file, 'name'):
                    self.original_filename = os.path.basename(self.contract_file.name)
                
                # Detect file type
                import mimetypes
                self.file_type, _ = mimetypes.guess_type(self.contract_file.name)
                if not self.file_type:
                    self.file_type = 'application/octet-stream'
                    
            except Exception as e:
                # Log error but don't fail the save
                pass
    
    def verify_file_integrity(self) -> bool:
        """Verify file integrity using stored hash"""
        if not self.contract_file or not self.file_hash:
            return True  # No file or hash to verify
        
        try:
            self.contract_file.seek(0)
            content = self.contract_file.read()
            self.contract_file.seek(0)
            
            current_hash = hashlib.sha256(content).hexdigest()
            return current_hash == self.file_hash
            
        except Exception:
            return False
    
    def quarantine_file(self, reason: str, quarantined_by: User = None):
        """Quarantine the contract file for security reasons"""
        self.is_quarantined = True
        self.quarantine_reason = reason
        self.quarantined_at = timezone.now()
        self.quarantined_by = quarantined_by
        self.save()
    
    def unquarantine_file(self):
        """Remove quarantine from the contract file"""
        self.is_quarantined = False
        self.quarantine_reason = ''
        self.quarantined_at = None
        self.quarantined_by = None
        self.save()
    
    def increment_access_count(self):
        """Increment access count and update last accessed time"""
        self.access_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['access_count', 'last_accessed'])
    
    def create_new_version(self, new_file, updated_by: User = None):
        """Create a new version of this contract"""
        # Create new agreement with incremented version
        new_agreement = PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.songwriter,
            track=self.track,
            writer_share=self.writer_share,
            publisher_share=self.publisher_share,
            contract_file=new_file,
            version=self.version + 1,
            previous_version=self,
            status='pending',
            verified_by_admin=False
        )
        
        return new_agreement
    
    def get_version_history(self):
        """Get all versions of this contract"""
        versions = []
        current = self
        
        # Get newer versions
        newer_versions = PublishingAgreement.objects.filter(
            previous_version=self
        ).order_by('version')
        
        # Get older versions
        while current.previous_version:
            versions.insert(0, current.previous_version)
            current = current.previous_version
        
        # Add current version
        versions.append(self)
        
        # Add newer versions
        versions.extend(newer_versions)
        
        return versions

    def __str__(self):
        return f"Agreement {self.publisher.company_name} - {self.songwriter.stage_name} (v{self.version})"


class PublisherAccountSettings(models.Model):
    """Notification and preference settings for publisher accounts."""

    publisher = models.OneToOneField(
        PublisherProfile,
        on_delete=models.CASCADE,
        related_name='account_settings'
    )
    email_notifications = models.BooleanField(default=True)
    royalty_alerts = models.BooleanField(default=True)
    weekly_reports = models.BooleanField(default=False)
    two_factor_auth = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=16, default='en')
    timezone = models.CharField(max_length=128, default='UTC')
    currency = models.CharField(max_length=16, default='GHS')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Account settings for {self.publisher.company_name or self.publisher.publisher_id}"


class PublisherArtistRelationship(models.Model):
    """Enhanced publisher-artist relationship management"""
    RELATIONSHIP_TYPES = [
        ('exclusive', 'Exclusive Publishing'),
        ('co_publishing', 'Co-Publishing'),
        ('administration', 'Administration Only'),
        ('sub_publishing', 'Sub-Publishing'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending Approval'),
        ('suspended', 'Suspended'),
        ('terminated', 'Terminated'),
    ]
    
    publisher = models.ForeignKey(PublisherProfile, on_delete=models.CASCADE, related_name='artist_relationships')
    artist = models.ForeignKey('artists.Artist', on_delete=models.CASCADE, related_name='publisher_relationships')
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_TYPES, default='exclusive')
    
    # Territory and scope
    territory = models.CharField(max_length=100, default='Ghana')
    worldwide = models.BooleanField(default=False)
    
    # Financial terms
    royalty_split_percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="Publisher's percentage")
    advance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True)
    
    # Contract details
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    # Enhanced contract file field with security
    contract_file = models.FileField(
        upload_to=secure_contract_upload_path, 
        blank=True,
        validators=[validate_contract_file],
        help_text="Upload contract document (PDF, DOC, DOCX, or image files only)"
    )
    
    # File security and integrity fields
    file_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash for file integrity")
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    file_type = models.CharField(max_length=100, blank=True, help_text="MIME type of the file")
    original_filename = models.CharField(max_length=255, blank=True, help_text="Original filename")
    
    # Version tracking
    version = models.PositiveIntegerField(default=1, help_text="Contract version number")
    previous_version = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='newer_versions',
        help_text="Reference to previous version of this contract"
    )
    
    # Access tracking
    access_count = models.PositiveIntegerField(default=0, help_text="Number of times file has been accessed")
    last_accessed = models.DateTimeField(null=True, blank=True, help_text="Last time file was accessed")
    
    # Security flags
    is_quarantined = models.BooleanField(default=False, help_text="File quarantined for security reasons")
    quarantine_reason = models.TextField(blank=True, help_text="Reason for quarantine")
    quarantined_at = models.DateTimeField(null=True, blank=True)
    quarantined_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='quarantined_relationships'
    )
    
    # Status and approval
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by_admin = models.BooleanField(default=False)
    approved_by_artist = models.BooleanField(default=False)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_relationships')
    notes = models.TextField(blank=True)
    
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('publisher', 'artist', 'territory')
        indexes = [
            models.Index(fields=['publisher', 'status']),
            models.Index(fields=['artist', 'status']),
            models.Index(fields=['status', 'start_date']),
        ]
    
    def __str__(self):
        return f"{self.publisher.company_name} - {self.artist.stage_name} ({self.relationship_type})"
    
    def is_active(self):
        """Check if relationship is currently active"""
        from django.utils import timezone
        today = timezone.now().date()
        
        return (
            self.status == 'active' and
            self.start_date <= today and
            (self.end_date is None or self.end_date >= today)
        )
    
    def activate_relationship(self):
        """Activate the relationship and update artist's status"""
        self.status = 'active'
        self.approved_by_admin = True
        self.approved_by_artist = True
        self.save()
        
        # Update artist's publisher relationship
        self.artist.update_publisher_relationship(
            publisher=self.publisher, 
            relationship_type='signed'
        )
    
    def terminate_relationship(self, reason=None):
        """Terminate the relationship and revert artist to self-published"""
        self.status = 'terminated'
        self.end_date = timezone.now().date()
        if reason:
            self.notes = f"{self.notes}\nTerminated: {reason}" if self.notes else f"Terminated: {reason}"
        self.save()
        
        # Revert artist to self-published
        self.artist.update_publisher_relationship(publisher=None)
    
    def clean(self):
        """Validate relationship data"""
        from django.core.exceptions import ValidationError
        
        if self.royalty_split_percentage < 0 or self.royalty_split_percentage > 100:
            raise ValidationError('Royalty split percentage must be between 0 and 100')
        
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValidationError('End date must be after start date')
    
    def save(self, *args, **kwargs):
        """Override save to handle file security processing"""
        if self.contract_file and self.contract_file.name:
            # Process file security if it's a new file
            if not self.file_hash or self._state.adding:
                self._process_file_security()
        
        self.clean()
        super().save(*args, **kwargs)
    
    def _process_file_security(self):
        """Process file for security metadata"""
        if self.contract_file:
            try:
                # Calculate file hash
                self.contract_file.seek(0)
                file_content = self.contract_file.read()
                self.contract_file.seek(0)
                
                self.file_hash = hashlib.sha256(file_content).hexdigest()
                self.file_size = len(file_content)
                
                # Store original filename
                if hasattr(self.contract_file, 'name'):
                    self.original_filename = os.path.basename(self.contract_file.name)
                
                # Detect file type
                import mimetypes
                self.file_type, _ = mimetypes.guess_type(self.contract_file.name)
                if not self.file_type:
                    self.file_type = 'application/octet-stream'
                    
            except Exception as e:
                # Log error but don't fail the save
                pass
    
    def verify_file_integrity(self) -> bool:
        """Verify file integrity using stored hash"""
        if not self.contract_file or not self.file_hash:
            return True  # No file or hash to verify
        
        try:
            self.contract_file.seek(0)
            content = self.contract_file.read()
            self.contract_file.seek(0)
            
            current_hash = hashlib.sha256(content).hexdigest()
            return current_hash == self.file_hash
            
        except Exception:
            return False
    
    def quarantine_file(self, reason: str, quarantined_by: User = None):
        """Quarantine the contract file for security reasons"""
        self.is_quarantined = True
        self.quarantine_reason = reason
        self.quarantined_at = timezone.now()
        self.quarantined_by = quarantined_by
        self.save()
    
    def unquarantine_file(self):
        """Remove quarantine from the contract file"""
        self.is_quarantined = False
        self.quarantine_reason = ''
        self.quarantined_at = None
        self.quarantined_by = None
        self.save()
    
    def increment_access_count(self):
        """Increment access count and update last accessed time"""
        self.access_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['access_count', 'last_accessed'])
    
    def create_new_version(self, new_file, updated_by: User = None):
        """Create a new version of this contract"""
        # Create new relationship with incremented version
        new_relationship = PublisherArtistRelationship.objects.create(
            publisher=self.publisher,
            artist=self.artist,
            relationship_type=self.relationship_type,
            territory=self.territory,
            worldwide=self.worldwide,
            royalty_split_percentage=self.royalty_split_percentage,
            advance_amount=self.advance_amount,
            start_date=self.start_date,
            end_date=self.end_date,
            contract_file=new_file,
            version=self.version + 1,
            previous_version=self,
            status='pending',
            approved_by_admin=False,
            approved_by_artist=False,
            created_by=updated_by,
            notes=self.notes
        )
        
        return new_relationship
    
    def get_version_history(self):
        """Get all versions of this contract"""
        versions = []
        current = self
        
        # Get newer versions
        newer_versions = PublisherArtistRelationship.objects.filter(
            previous_version=self
        ).order_by('version')
        
        # Get older versions
        while current.previous_version:
            versions.insert(0, current.previous_version)
            current = current.previous_version
        
        # Add current version
        versions.append(self)
        
        # Add newer versions
        versions.extend(newer_versions)
        
        return versions
