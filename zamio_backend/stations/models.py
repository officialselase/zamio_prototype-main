import uuid
import os
import mimetypes
from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.core.exceptions import ValidationError
from django.utils import timezone
import requests
from urllib.parse import urlparse

from core.utils import unique_station_id_generator

User = get_user_model()


def get_default_station_image():
    return "defaults/default_profile_image.png"


def secure_station_cover_image_path(instance, filename):
    """Generate secure file upload path for station cover images."""
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()

    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    final_filename = f"{safe_name}_{timestamp}_{unique_id}{ext}"

    station_id = getattr(instance, 'station_id', None) or 'temp'
    return f"stations/covers/{station_id}/{final_filename}"


def station_document_upload_path(instance, filename):
    """Upload path for station compliance documents."""
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()

    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    final_filename = f"{safe_name}_{timestamp}_{unique_id}{ext}"

    station_id = getattr(instance.station, 'station_id', None) or 'temp'
    return f"stations/documents/{station_id}/{final_filename}"


def validate_station_image_size(file):
    """Validate station image file size - max 5MB"""
    max_size = 5 * 1024 * 1024  # 5MB
    if file.size > max_size:
        raise ValidationError(f'Image size cannot exceed {max_size // (1024*1024)}MB')


def validate_station_image_type(file):
    """Validate station image file type for security"""
    allowed_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
    
    # Dangerous file extensions to block
    dangerous_extensions = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.ps1', '.msi', '.deb', '.rpm', '.svg'  # SVG can contain scripts
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
        raise ValidationError(f'Image type {content_type} is not allowed')
    
    # Check for null bytes in filename (security issue)
    if '\x00' in file.name:
        raise ValidationError('File name contains invalid characters')
    
    # Basic image content validation
    if content_type and content_type.startswith('image/'):
        try:
            from PIL import Image
            file.seek(0)
            img = Image.open(file)
            img.verify()  # Verify it's a valid image
            file.seek(0)
        except Exception:
            raise ValidationError('Invalid image file or corrupted image')


def secure_station_image_path(instance, filename):
    """Generate secure file upload path for station images"""
    # Sanitize filename
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    
    # Generate unique filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    final_filename = f"{safe_name}_{timestamp}_{unique_id}{ext}"
    
    # Create station-specific path
    station_id = instance.station_id or 'temp'
    return f"stations/photos/{station_id}/{final_filename}"


def validate_stream_url(url):
    """Validate stream URL format and accessibility"""
    if not url:
        return
    
    # Parse URL to check format
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValidationError('Invalid URL format. URL must include protocol (http:// or https://)')
        
        if parsed.scheme not in ['http', 'https']:
            raise ValidationError('URL must use HTTP or HTTPS protocol')
            
    except Exception as e:
        raise ValidationError(f'Invalid URL format: {str(e)}')


def test_stream_connectivity(url, timeout=10):
    """Test if stream URL is accessible and returns audio content"""
    if not url:
        return False, "No URL provided"
    
    try:
        # Make a HEAD request first to check if URL is accessible
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '').lower()
            
            # Check if it's likely an audio stream
            audio_types = ['audio/', 'application/ogg', 'video/mp2t']
            if any(audio_type in content_type for audio_type in audio_types):
                return True, "Stream URL is accessible and appears to be audio content"
            else:
                # Try a small GET request to check content
                try:
                    response = requests.get(url, timeout=timeout, stream=True)
                    # Read first few bytes to check for audio signatures
                    chunk = next(response.iter_content(chunk_size=1024), b'')
                    if chunk:
                        return True, "Stream URL is accessible"
                    else:
                        return False, "Stream URL is accessible but no content received"
                except:
                    return False, "Stream URL is accessible but content check failed"
        else:
            return False, f"Stream URL returned status code {response.status_code}"
            
    except requests.exceptions.Timeout:
        return False, "Stream URL connection timed out"
    except requests.exceptions.ConnectionError:
        return False, "Could not connect to stream URL"
    except requests.exceptions.RequestException as e:
        return False, f"Stream URL test failed: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error testing stream URL: {str(e)}"




class Station(models.Model):
    ONBOARDING_STEPS = [
        ('profile', 'Complete Profile'),
        ('stream', 'Configure Stream'),
        ('staff', 'Staff'),
        ('compliance', 'Compliance'),
        ('payment', 'Add Payment Info'),
    ]
    
    STATION_CLASSES = [
        ('class_a', 'Class A - Major Metropolitan'),
        ('class_b', 'Class B - Regional'),
        ('class_c', 'Class C - Local/Community'),
        ('online', 'Online Only'),
        ('community', 'Community/Non-Profit'),
    ]
    
    STATION_TYPES = [
        ('commercial', 'Commercial'),
        ('public', 'Public/Educational'),
        ('community', 'Community'),
        ('religious', 'Religious'),
        ('online', 'Online Only'),
    ]

    station_id = models.CharField(max_length=255, blank=True, null=True,  default=uuid.uuid4, unique=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='station_user')

    name = models.CharField(max_length=100)
    photo = models.ImageField(
        upload_to=secure_station_image_path,
        null=True,
        blank=True,
        default=get_default_station_image,
        validators=[validate_station_image_size, validate_station_image_type]
    )
    cover_image = models.ImageField(
        upload_to=secure_station_cover_image_path,
        null=True,
        blank=True,
        validators=[validate_station_image_size, validate_station_image_type]
    )
    tagline = models.CharField(max_length=255, blank=True, null=True)
    founded_year = models.PositiveIntegerField(blank=True, null=True)
    primary_contact_name = models.CharField(max_length=100, blank=True, null=True)
    primary_contact_title = models.CharField(max_length=100, blank=True, null=True)
    primary_contact_email = models.EmailField(blank=True, null=True)
    primary_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    phone = models.CharField(max_length=255, null=True, blank=True)

    city = models.CharField(max_length=255, null=True, blank=True)
    region = models.CharField(max_length=255, null=True, blank=True)
    country = models.CharField(max_length=255, null=True, blank=True)

    # Enhanced station classification for royalty calculation
    station_class = models.CharField(max_length=20, choices=STATION_CLASSES, default='class_c')
    station_type = models.CharField(max_length=20, choices=STATION_TYPES, default='commercial')
    license_number = models.CharField(max_length=50, null=True, blank=True, help_text="Broadcasting license number")
    license_issuing_authority = models.CharField(max_length=255, null=True, blank=True)
    license_issue_date = models.DateField(null=True, blank=True)
    license_expiry_date = models.DateField(null=True, blank=True)
    coverage_area = models.CharField(max_length=100, null=True, blank=True, help_text="Coverage area description")
    estimated_listeners = models.IntegerField(null=True, blank=True, help_text="Estimated daily listeners")
    station_category = models.CharField(max_length=100, null=True, blank=True)
    
    # Compliance and regulatory information
    regulatory_body = models.CharField(max_length=100, null=True, blank=True, help_text="e.g., GHAMRO, COSGA")
    compliance_contact_name = models.CharField(max_length=100, null=True, blank=True)
    compliance_contact_email = models.EmailField(null=True, blank=True)
    compliance_contact_phone = models.CharField(max_length=20, null=True, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, null=True, blank=True)
    
    # Operational details
    operating_hours_start = models.TimeField(null=True, blank=True)
    operating_hours_end = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='Africa/Accra')
    website_url = models.URLField(null=True, blank=True)
    social_media_links = models.JSONField(default=dict, blank=True)
    
    # Technical specifications
    broadcast_frequency = models.CharField(max_length=20, null=True, blank=True, help_text="e.g., 101.5 FM")
    transmission_power = models.CharField(max_length=50, null=True, blank=True, help_text="e.g., 10kW")
    
    # Stream monitoring
    stream_url = models.URLField(blank=True, null=True, help_text="Live stream URL for audio monitoring")
    backup_stream_url = models.URLField(blank=True, null=True, help_text="Fallback stream URL for redundancy")
    stream_type = models.CharField(max_length=50, null=True, blank=True)
    stream_bitrate = models.CharField(max_length=50, null=True, blank=True)
    stream_format = models.CharField(max_length=50, null=True, blank=True)
    stream_mount_point = models.CharField(max_length=100, null=True, blank=True)
    stream_username = models.CharField(max_length=100, null=True, blank=True)
    stream_password = models.CharField(max_length=255, null=True, blank=True)
    monitoring_enabled = models.BooleanField(default=True)
    monitoring_interval_seconds = models.PositiveIntegerField(default=60)
    stream_auto_restart = models.BooleanField(default=True)
    stream_quality_check_enabled = models.BooleanField(default=True)
    stream_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('error', 'Error'),
            ('testing', 'Testing'),
        ],
        default='inactive'
    )
    last_monitored = models.DateTimeField(null=True, blank=True)
    stream_validation_errors = models.TextField(blank=True, null=True, help_text="Last validation error messages")
    
    # Verification and approval
    verification_status = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending Verification'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
            ('suspended', 'Suspended')
        ], 
        default='pending'
    )
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_stations')
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(null=True, blank=True)

    bank_account = models.CharField(max_length=100,  null=True, blank=True)
    bank_name = models.CharField(max_length=255, null=True, blank=True)
    bank_account_number = models.CharField(max_length=50, null=True, blank=True)
    bank_account_name = models.CharField(max_length=255, null=True, blank=True)
    bank_branch_code = models.CharField(max_length=50, null=True, blank=True)
    bank_swift_code = models.CharField(max_length=50, null=True, blank=True)
    momo_account = models.CharField(max_length=100,  null=True, blank=True)
    momo_provider = models.CharField(max_length=50, null=True, blank=True)
    momo_account_name = models.CharField(max_length=255, null=True, blank=True)
    bio = models.TextField(blank=True, null=True)


    location_name = models.CharField(max_length=900, null=True, blank=True)
    lat = models.DecimalField(default=0.0, max_digits=50, decimal_places=20, null=True, blank=True)
    lng = models.DecimalField(default=0.0, max_digits=50, decimal_places=20, null=True, blank=True)

    avg_detection_confidence = models.DecimalField(default=0.0, max_digits=50, decimal_places=20, null=True, blank=True)

    about = models.TextField(blank=True, null=True)
    
    onboarding_step = models.CharField(max_length=20, choices=ONBOARDING_STEPS, default='profile')

    profile_completed = models.BooleanField(default=False)
    stream_setup_completed = models.BooleanField(default=False)
    staff_completed = models.BooleanField(default=False)
    compliance_completed = models.BooleanField(default=False)
    report_completed = models.BooleanField(default=False)
    payment_info_added = models.BooleanField(default=False)

    preferred_payout_method = models.CharField(max_length=20, null=True, blank=True)
    preferred_currency = models.CharField(max_length=10, default='GHS')
    payout_frequency = models.CharField(max_length=20, default='monthly')
    minimum_payout_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tax_identification_number = models.CharField(max_length=100, null=True, blank=True)
    business_registration_number = models.CharField(max_length=100, null=True, blank=True)


    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def __str__(self):
        return self.name
    

    
    def get_next_onboarding_step(self):
        if not self.profile_completed:
            return 'profile'
        elif not self.stream_setup_completed:
            return 'stream'
        elif not self.staff_completed:
            return 'staff'
        elif not self.compliance_completed:
            return 'compliance'
        elif not self.payment_info_added:
            return 'payment'
        return 'done'
    
    def test_stream_url(self):
        """Test the stream URL and update status"""
        if not self.stream_url:
            self.stream_status = 'inactive'
            self.stream_validation_errors = 'No stream URL provided'
            return False, 'No stream URL provided'
        
        try:
            # Validate URL format first
            validate_stream_url(self.stream_url)
            
            # Test connectivity
            is_accessible, message = test_stream_connectivity(self.stream_url)
            
            if is_accessible:
                self.stream_status = 'active'
                self.stream_validation_errors = None
                self.last_monitored = timezone.now()
            else:
                self.stream_status = 'error'
                self.stream_validation_errors = message
            
            return is_accessible, message
            
        except ValidationError as e:
            self.stream_status = 'error'
            self.stream_validation_errors = str(e)
            return False, str(e)
        except Exception as e:
            self.stream_status = 'error'
            self.stream_validation_errors = f'Unexpected error: {str(e)}'
            return False, f'Unexpected error: {str(e)}'
    
    def clean(self):
        """Validate model fields"""
        super().clean()
        if self.stream_url:
            validate_stream_url(self.stream_url)
    
    def get_stream_status_display(self):
        """Get human-readable stream status"""
        status_map = {
            'active': 'Active',
            'inactive': 'Inactive', 
            'error': 'Error',
            'testing': 'Testing'
        }
        return status_map.get(self.stream_status, 'Unknown')

    


# def pre_save_station_id_receiver(sender, instance, *args, **kwargs):
#     if not instance.station_id:
#         instance.station_id = unique_station_id_generator(instance)
# 
# pre_save.connect(pre_save_station_id_receiver, sender=Station)




class StationStreamLink(models.Model):
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='station_links')
    link = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=False)

    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class StationProgram(models.Model):
    program_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)

    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='station_programs')
        
    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.program_name


ROLE_CHOICES = [
        ('Producer', 'Producer'),
        ('Presenter', 'Presenter'),
        ('Dj', 'Dj')
    ]


class ProgramStaff(models.Model):
    station_program = models.ForeignKey(StationProgram, on_delete=models.CASCADE, related_name='station_programs')
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def __str__(self):
        return self.name


class StationStaff(models.Model):
    STAFF_ROLES = [
        ('manager', 'Station Manager'),
        ('producer', 'Producer'),
        ('presenter', 'Presenter'),
        ('dj', 'DJ'),
        ('engineer', 'Sound Engineer'),
        ('admin', 'Administrator'),
        ('reporter', 'Reporter'),
        ('compliance_officer', 'Compliance Officer'),
    ]
    
    PERMISSION_LEVELS = [
        ('view', 'View Only'),
        ('edit', 'Edit'),
        ('admin', 'Administrator'),
    ]

    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='station_staff')
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    role = models.CharField(max_length=50, choices=STAFF_ROLES, default='presenter')
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVELS, default='view')
    
    # Contact and emergency information
    emergency_contact = models.CharField(max_length=100, null=True, blank=True)
    emergency_phone = models.CharField(max_length=20, null=True, blank=True)
    
    # Employment details
    hire_date = models.DateField(null=True, blank=True)
    employee_id = models.CharField(max_length=50, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    
    # Access control
    can_upload_playlogs = models.BooleanField(default=False)
    can_manage_streams = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=True)
    can_view_reports = models.BooleanField(default=False)
    can_monitor_streams = models.BooleanField(default=False)
    can_manage_staff = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    can_manage_payments = models.BooleanField(default=False)
    can_manage_compliance = models.BooleanField(default=False)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    PERMISSION_MAP = {
        'reports': 'can_view_reports',
        'monitoring': 'can_monitor_streams',
        'staff': 'can_manage_staff',
        'settings': 'can_manage_settings',
        'payments': 'can_manage_payments',
        'compliance': 'can_manage_compliance',
    }

    ROLE_PERMISSION_DEFAULTS = {
        'admin': ['reports', 'monitoring', 'staff', 'settings', 'payments', 'compliance'],
        'manager': ['reports', 'monitoring', 'staff'],
        'reporter': ['reports'],
    }

    class Meta:
        unique_together = ['station', 'email']

    def __str__(self):
        return f"{self.name} - {self.role}"

    @classmethod
    def resolve_permission_level(cls, role_key: str) -> str:
        role_key = (role_key or '').strip().lower()
        mapping = {
            'admin': 'admin',
            'manager': 'edit',
            'reporter': 'view',
        }
        return mapping.get(role_key, 'view')

    @classmethod
    def resolve_role_key(cls, permission_level: str) -> str:
        permission_level = (permission_level or '').strip().lower()
        reverse_mapping = {
            'admin': 'admin',
            'edit': 'manager',
            'view': 'reporter',
        }
        return reverse_mapping.get(permission_level, 'reporter')

    @classmethod
    def role_defaults(cls) -> dict:
        return {key: value[:] for key, value in cls.ROLE_PERMISSION_DEFAULTS.items()}

    def get_permission_ids(self) -> list:
        normalized = []
        for permission, field_name in self.PERMISSION_MAP.items():
            if getattr(self, field_name, False):
                normalized.append(permission)

        if self.permission_level == 'admin':
            admin_defaults = set(self.ROLE_PERMISSION_DEFAULTS['admin'])
            normalized = sorted(admin_defaults.union(normalized))
        else:
            normalized = sorted(set(normalized))

        return normalized

    def apply_permissions(self, permissions: list[str]) -> None:
        permissions_set = {
            (item or '').strip().lower()
            for item in permissions or []
            if isinstance(item, str)
        }

        for permission, field_name in self.PERMISSION_MAP.items():
            setattr(self, field_name, permission in permissions_set)

        # Maintain legacy compatibility
        self.can_upload_playlogs = 'reports' in permissions_set or 'monitoring' in permissions_set
        self.can_manage_streams = 'monitoring' in permissions_set
        self.can_view_analytics = 'reports' in permissions_set

    def compose_full_name(self) -> str:
        parts = [
            (self.first_name or '').strip(),
            (self.last_name or '').strip(),
        ]
        return ' '.join(filter(None, parts)).strip()

    def sync_name_fields(self) -> None:
        self.first_name = (self.first_name or '').strip()
        self.last_name = (self.last_name or '').strip()
        self.name = (self.name or '').strip()

        if not self.first_name and not self.last_name and self.name:
            tokens = self.name.split(' ', 1)
            self.first_name = tokens[0]
            if len(tokens) > 1:
                self.last_name = tokens[1]

        if not self.name:
            full_name = self.compose_full_name()
            if full_name:
                self.name = full_name

    def save(self, *args, **kwargs):
        self.sync_name_fields()
        super().save(*args, **kwargs)


class StationComplianceDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('license', 'License'),
        ('certificate', 'Certificate'),
        ('report', 'Report'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('pending', 'Pending Review'),
        ('expired', 'Expired'),
        ('rejected', 'Rejected'),
    ]

    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='compliance_documents')
    name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=32, choices=DOCUMENT_TYPE_CHOICES, default='other')
    file = models.FileField(upload_to=station_document_upload_path, null=True, blank=True)
    file_size = models.BigIntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class Complaint(models.Model):
    COMPLAINT_STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    COMPLAINT_TYPE_CHOICES = [
        ('technical', 'Technical Issue'),
        ('content', 'Content Dispute'),
        ('billing', 'Billing Issue'),
        ('service', 'Service Quality'),
        ('compliance', 'Compliance Issue'),
        ('other', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    complaint_id = models.CharField(max_length=50, unique=True, blank=True)
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='complaints')
    complainant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='filed_complaints')
    
    # Complaint details
    subject = models.CharField(max_length=200)
    description = models.TextField()
    complaint_type = models.CharField(max_length=20, choices=COMPLAINT_TYPE_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Status and workflow
    status = models.CharField(max_length=20, choices=COMPLAINT_STATUS_CHOICES, default='open')
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_complaints'
    )
    
    # Resolution details
    resolution_notes = models.TextField(blank=True, null=True)
    resolved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='resolved_complaints'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Contact information
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Metadata
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['station', 'status']),
            models.Index(fields=['complainant', 'created_at']),
            models.Index(fields=['assigned_to', 'status']),
        ]

    def __str__(self):
        return f"{self.complaint_id} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.complaint_id:
            # Generate unique complaint ID
            import uuid
            self.complaint_id = f"COMP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)
    
    def get_status_display_color(self):
        """Return color class for status display"""
        status_colors = {
            'open': 'text-red-600',
            'investigating': 'text-yellow-600',
            'resolved': 'text-green-600',
            'closed': 'text-gray-600',
        }
        return status_colors.get(self.status, 'text-gray-600')
    
    def get_priority_display_color(self):
        """Return color class for priority display"""
        priority_colors = {
            'low': 'text-blue-600',
            'medium': 'text-yellow-600',
            'high': 'text-orange-600',
            'urgent': 'text-red-600',
        }
        return priority_colors.get(self.priority, 'text-gray-600')


class ComplaintUpdate(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='updates')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    update_type = models.CharField(
        max_length=20,
        choices=[
            ('comment', 'Comment'),
            ('status_change', 'Status Change'),
            ('assignment', 'Assignment'),
            ('resolution', 'Resolution'),
        ],
        default='comment'
    )
    message = models.TextField()
    old_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.complaint.complaint_id} - {self.update_type} by {self.user.username}"

