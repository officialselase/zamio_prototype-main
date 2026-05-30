import os
import random
import uuid
import hashlib
import mimetypes
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import models
from django.db.models import Q
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from rest_framework.authtoken.models import Token

from core.utils import unique_user_id_generator


def get_default_profile_image():
    return "defaults/default_profile_image.png"


def get_file_ext(filepath):
    base_name = os.path.basename(filepath)
    name, ext = os.path.splitext(base_name)
    return name, ext


def upload_image_path(instance, filename):
    new_filename = random.randint(1, 3910209312)
    name, ext = get_file_ext(filename)
    final_filename = '{new_filename}{ext}'.format(new_filename=new_filename, ext=ext)
    return "users/{final_filename}".format(
        final_filename=final_filename
    )


def validate_file_size(file):
    """Validate file size - max 10MB for documents, 5MB for images"""
    max_size = 10 * 1024 * 1024  # 10MB for documents
    if hasattr(file, 'content_type') and file.content_type.startswith('image/'):
        max_size = 5 * 1024 * 1024  # 5MB for images
    
    if file.size > max_size:
        raise ValidationError(f'File size cannot exceed {max_size // (1024*1024)}MB')


def validate_file_type(file):
    """Validate file type for security with enhanced checks"""
    allowed_types = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
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
        raise ValidationError(f'File type {content_type} is not allowed')
    
    # Check for null bytes in filename (security issue)
    if '\x00' in file.name:
        raise ValidationError('File name contains invalid characters')
    
    # Basic file content validation for images
    if content_type and content_type.startswith('image/'):
        try:
            from PIL import Image
            file.seek(0)
            img = Image.open(file)
            img.verify()  # Verify it's a valid image
            file.seek(0)
        except Exception:
            raise ValidationError('Invalid image file or corrupted image')
    
    # Check for embedded scripts in PDFs (basic check)
    if content_type == 'application/pdf':
        file.seek(0)
        content = file.read(1024)  # Read first 1KB
        file.seek(0)
        
        # Look for JavaScript in PDF
        if b'/JavaScript' in content or b'/JS' in content:
            raise ValidationError('PDF files with embedded JavaScript are not allowed')
        
        # Look for forms that might be malicious
        if b'/AcroForm' in content:
            raise ValidationError('PDF files with forms are not allowed')


def secure_file_upload_path(instance, filename):
    """Generate secure file upload path with user isolation"""
    # Sanitize filename
    name, ext = get_file_ext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    
    # Generate unique filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    final_filename = f"{safe_name}_{timestamp}_{unique_id}{ext}"
    
    # Create user-specific path
    user_id = instance.user.id if hasattr(instance, 'user') else 'anonymous'
    return f"documents/{user_id}/{instance.__class__.__name__.lower()}/{final_filename}"


class UserManager(BaseUserManager):
    def create_user(self, email, first_name=None, last_name=None, password=None, is_active=True, is_staff=False, is_admin=False):
        if not email:
            raise ValueError("User must have an email address")
        if not password:
            raise ValueError("user must have a password")

        user_obj = self.model(
            email=self.normalize_email(email),
            first_name=first_name,
            last_name=last_name,
        )
        user_obj.set_password(password)
        user_obj.staff = is_staff
        user_obj.is_active = is_active
        user_obj.save(using=self._db)
        return user_obj


    def create_staffuser(self, email, first_name=None, last_name=None, password=None):
        user = self.create_user(
            email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=True
        )
        return user



    def create_superuser(self, email, first_name=None, last_name=None, password=None, ):
        user = self.create_user(
            email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,
            is_admin=True
        )
        return user


    def search(self, query=None):
        qs = self.get_queryset()

        if query is not None:
            or_lookup = (Q(email__icontains=query) | Q(full_name__icontains=query))
            qs = qs.filter(or_lookup).distinct()

        return qs

GENDER_CHOICES = (
    ('Male', 'Male'),
    ('Female', 'Female'),

)



USER_TYPE = (
    ('Artist', 'Artist'),
    ('Station', 'Station'),
    ('Admin', 'Admin'),
    #('Fan', 'Fan'),
    ('Publisher', 'Publisher'),
    ('contributor', 'contributor'),

)

KYC_STATUS_CHOICES = (
    ('pending', 'Pending'),
    ('verified', 'Verified'),
    ('rejected', 'Rejected'),
    ('incomplete', 'Incomplete'),
)


class User(AbstractBaseUser):
    user_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    username = models.CharField(max_length=255, blank=True, null=True, unique=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    photo = models.ImageField(upload_to=upload_image_path, null=True, blank=True, default=get_default_profile_image)

    country = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    user_type = models.CharField(max_length=100, choices=USER_TYPE, blank=True, null=True)
    
    # Enhanced authentication fields
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default='pending')
    kyc_documents = models.JSONField(default=dict, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('skipped', 'Skipped'),
            ('incomplete', 'Incomplete'),
        ],
        default='pending'
    )
    verification_skipped_at = models.DateTimeField(null=True, blank=True)
    verification_reminder_sent = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True, null=True)
    last_activity = models.DateTimeField(auto_now=True)
    failed_login_attempts = models.IntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    
    fcm_token = models.TextField(blank=True, null=True)
    otp_code = models.CharField(max_length=10, blank=True, null=True)
    
    # Enhanced email verification fields
    email_token = models.CharField(max_length=64, blank=True, null=True)  # Expanded for secure tokens
    verification_code = models.CharField(max_length=4, blank=True, null=True)  # 4-digit verification code
    verification_code_hash = models.CharField(max_length=64, blank=True, null=True)  # Hashed verification code
    verification_method = models.CharField(
        max_length=10,
        choices=[('code', 'Code'), ('link', 'Link')],
        default='link',
        blank=True,
        null=True
    )
    verification_expires_at = models.DateTimeField(blank=True, null=True)
    verification_attempts = models.IntegerField(default=0)
    verification_blocked_until = models.DateTimeField(blank=True, null=True)
    last_verification_request = models.DateTimeField(blank=True, null=True)
    
    # Password reset fields
    reset_token = models.CharField(max_length=64, blank=True, null=True)  # Password reset token
    reset_code = models.CharField(max_length=4, blank=True, null=True)  # 4-digit reset code
    reset_code_hash = models.CharField(max_length=64, blank=True, null=True)  # Hashed reset code
    reset_expires_at = models.DateTimeField(blank=True, null=True)
    reset_attempts = models.IntegerField(default=0)
    reset_blocked_until = models.DateTimeField(blank=True, null=True)
    last_reset_request = models.DateTimeField(blank=True, null=True)
    

    profile_complete = models.BooleanField(default=False)
    verified = models.BooleanField(default=False)



    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=False)


    is_archived = models.BooleanField(default=False)

    staff = models.BooleanField(default=False)
    admin = models.BooleanField(default=False)

    timestamp = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'

    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    def __str__(self):
        return self.email


    def get_short_name(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True



    @property
    def is_staff(self):
        if self.is_admin:
            return True
        return self.staff


    @property
    def is_admin(self):
        return self.admin




@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        Token.objects.create(user=instance)


#def pre_save_user_id_receiver(sender, instance, *args, **kwargs):
#    if not instance.user_id:
#        instance.user_id = unique_user_id_generator(instance)
#
#pre_save.connect(pre_save_user_id_receiver, sender=User)





class UserContact(AbstractBaseUser):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_contacts')
    phone_number = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)




class UserEmergencyContact(AbstractBaseUser):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_emergency_contacts')
    phone_number = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class UserPermission(models.Model):
    """Granular permission management for users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_permissions')
    permission = models.CharField(max_length=100)
    granted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='granted_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('user', 'permission')
        indexes = [
            models.Index(fields=['user', 'permission']),
            models.Index(fields=['permission']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.permission}"


class AuditLog(models.Model):
    """Comprehensive audit logging for all user actions and system events"""
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50, null=True, blank=True)
    resource_id = models.CharField(max_length=100, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    request_data = models.JSONField(default=dict, blank=True)
    response_data = models.JSONField(default=dict, blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    trace_id = models.UUIDField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['trace_id']),
        ]
    
    def __str__(self):
        return f"{self.user.email if self.user else 'System'} - {self.action} at {self.timestamp}"


class KYCDocument(models.Model):
    """Enhanced KYC document model with proper file handling and security"""
    
    DOCUMENT_TYPES = (
        ('id_card', 'National ID Card'),
        ('passport', 'Passport'),
        ('drivers_license', 'Driver\'s License'),
        ('utility_bill', 'Utility Bill'),
        ('bank_statement', 'Bank Statement'),
        ('business_registration', 'Business Registration'),
        ('tax_certificate', 'Tax Certificate'),
        ('selfie', 'Selfie Verification'),
    )
    
    STATUS_CHOICES = (
        ('uploaded', 'Uploaded'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_kyc_documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(
        upload_to=secure_file_upload_path,
        validators=[validate_file_size, validate_file_type]
    )
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    file_hash = models.CharField(max_length=64)  # SHA-256 hash for integrity
    content_type = models.CharField(max_length=100)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    notes = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_documents'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('user', 'document_type')
        indexes = [
            models.Index(fields=['user', 'document_type']),
            models.Index(fields=['status']),
            models.Index(fields=['uploaded_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.get_document_type_display()}"
    
    def save(self, *args, **kwargs):
        if self.file:
            # Store original filename and metadata
            self.original_filename = self.file.name
            self.file_size = self.file.size
            
            # Handle content type properly for both UploadedFile and FieldFile
            if hasattr(self.file, 'content_type'):
                self.content_type = self.file.content_type or mimetypes.guess_type(self.file.name)[0]
            else:
                self.content_type = mimetypes.guess_type(self.file.name)[0]
            
            # Generate file hash for integrity checking
            if not self.file_hash:
                self.file.seek(0)
                file_content = self.file.read()
                self.file_hash = hashlib.sha256(file_content).hexdigest()
                self.file.seek(0)
        
        super().save(*args, **kwargs)
    
    def get_secure_url(self):
        """Generate a secure URL for file access"""
        if self.file:
            return default_storage.url(self.file.name)
        return None
    
    def verify_file_integrity(self):
        """Verify file integrity using stored hash"""
        if not self.file:
            return False
        
        try:
            self.file.seek(0)
            file_content = self.file.read()
            current_hash = hashlib.sha256(file_content).hexdigest()
            self.file.seek(0)
            return current_hash == self.file_hash
        except Exception:
            return False


class UserPreferences(models.Model):
    """User preferences for notifications, privacy, and theme settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)
    marketing_emails = models.BooleanField(default=False)
    royalty_alerts = models.BooleanField(default=True)
    match_notifications = models.BooleanField(default=True)
    weekly_reports = models.BooleanField(default=True)
    sound_notifications = models.BooleanField(default=True)
    
    # Privacy preferences
    privacy_profile_public = models.BooleanField(default=False)
    privacy_show_earnings = models.BooleanField(default=False)
    privacy_show_plays = models.BooleanField(default=True)
    
    # Theme and appearance preferences
    theme_preference = models.CharField(
        max_length=10,
        choices=[
            ('light', 'Light'),
            ('dark', 'Dark'),
            ('system', 'System'),
        ],
        default='system'
    )
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'User Preferences'
        verbose_name_plural = 'User Preferences'
    
    def __str__(self):
        return f"Preferences for {self.user.email}"