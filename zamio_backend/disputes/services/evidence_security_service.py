"""
Evidence file security service for dispute management
Provides enhanced validation, access controls, and audit logging for legal evidence files
"""
import os
import time
import hmac
import hashlib
import mimetypes
import uuid
from typing import Optional, Dict, Any, List
from django.conf import settings
from django.core.exceptions import ValidationError, PermissionDenied
from django.core.files.storage import default_storage
from django.http import HttpResponse, Http404
from django.utils import timezone
from django.contrib.auth import get_user_model
from PIL import Image
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

User = get_user_model()


class EvidenceFileValidator:
    """Enhanced file validation for dispute evidence files"""
    
    # Allowed file types for legal evidence
    ALLOWED_EVIDENCE_TYPES = {
        # Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        
        # Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/tiff',
        
        # Audio (for evidence recordings)
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/aac',
        'audio/ogg',
        
        # Video (for evidence recordings)
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/webm'
    }
    
    # Maximum file sizes by type (in bytes)
    MAX_FILE_SIZES = {
        'document': 50 * 1024 * 1024,  # 50MB for documents
        'image': 25 * 1024 * 1024,     # 25MB for images
        'audio': 100 * 1024 * 1024,    # 100MB for audio
        'video': 500 * 1024 * 1024,    # 500MB for video
    }
    
    # Dangerous file extensions to block
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.ps1', '.msi', '.deb', '.rpm', '.dll', '.sys', '.bin'
    }
    
    @classmethod
    def validate_evidence_file(cls, file, dispute_id: int) -> Dict[str, Any]:
        """
        Comprehensive validation for dispute evidence files
        
        Args:
            file: Django UploadedFile object
            dispute_id: ID of the dispute this evidence belongs to
            
        Returns:
            Dict with validation results and file metadata
            
        Raises:
            ValidationError: If file fails validation
        """
        validation_result = {
            'is_valid': False,
            'file_type': None,
            'file_category': None,
            'file_size': 0,
            'sha256_hash': None,
            'mime_type': None,
            'validation_errors': []
        }
        
        try:
            # Basic file checks
            if not file or not hasattr(file, 'name'):
                raise ValidationError("Invalid file object")
            
            if not file.name:
                raise ValidationError("File must have a name")
            
            # Check file size
            file_size = file.size
            validation_result['file_size'] = file_size
            
            if file_size == 0:
                raise ValidationError("File cannot be empty")
            
            if file_size > max(cls.MAX_FILE_SIZES.values()):
                raise ValidationError(f"File size exceeds maximum allowed size")
            
            # Check filename for security issues
            cls._validate_filename(file.name)
            
            # Detect actual file type using python-magic
            file.seek(0)
            file_content = file.read()
            file.seek(0)
            
            # Get MIME type from file content (more reliable than filename)
            if HAS_MAGIC:
                mime_type = magic.from_buffer(file_content, mime=True)
            else:
                # Fallback to mimetypes module
                mime_type, _ = mimetypes.guess_type(file.name)
                if not mime_type:
                    mime_type = 'application/octet-stream'
            
            validation_result['mime_type'] = mime_type
            
            # Validate against allowed types
            if mime_type not in cls.ALLOWED_EVIDENCE_TYPES:
                raise ValidationError(f"File type '{mime_type}' is not allowed for evidence files")
            
            # Determine file category and validate size
            file_category = cls._get_file_category(mime_type)
            validation_result['file_category'] = file_category
            
            max_size = cls.MAX_FILE_SIZES.get(file_category, cls.MAX_FILE_SIZES['document'])
            if file_size > max_size:
                raise ValidationError(f"File size exceeds maximum for {file_category} files ({max_size // (1024*1024)}MB)")
            
            # Generate file hash for integrity checking
            sha256_hash = hashlib.sha256(file_content).hexdigest()
            validation_result['sha256_hash'] = sha256_hash
            
            # Perform content-specific validation
            cls._validate_file_content(file, mime_type, file_content)
            
            # Check for malicious content
            cls._scan_for_malicious_content(file_content, mime_type)
            
            validation_result['is_valid'] = True
            validation_result['file_type'] = mime_type
            
            return validation_result
            
        except ValidationError as e:
            validation_result['validation_errors'].append(str(e))
            raise e
        except Exception as e:
            validation_result['validation_errors'].append(f"Unexpected validation error: {str(e)}")
            raise ValidationError(f"File validation failed: {str(e)}")
    
    @classmethod
    def _validate_filename(cls, filename: str):
        """Validate filename for security issues"""
        # Check for null bytes
        if '\x00' in filename:
            raise ValidationError("Filename contains null bytes")
        
        # Check for path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            raise ValidationError("Filename contains invalid path characters")
        
        # Check for dangerous extensions
        _, ext = os.path.splitext(filename.lower())
        if ext in cls.DANGEROUS_EXTENSIONS:
            raise ValidationError(f"File extension '{ext}' is not allowed for security reasons")
        
        # Check filename length
        if len(filename) > 255:
            raise ValidationError("Filename is too long")
        
        # Check for control characters
        if any(ord(c) < 32 for c in filename):
            raise ValidationError("Filename contains control characters")
    
    @classmethod
    def _get_file_category(cls, mime_type: str) -> str:
        """Determine file category from MIME type"""
        if mime_type.startswith('image/'):
            return 'image'
        elif mime_type.startswith('audio/'):
            return 'audio'
        elif mime_type.startswith('video/'):
            return 'video'
        else:
            return 'document'
    
    @classmethod
    def _validate_file_content(cls, file, mime_type: str, content: bytes):
        """Validate file content based on type"""
        file.seek(0)
        
        if mime_type.startswith('image/'):
            cls._validate_image_content(file)
        elif mime_type == 'application/pdf':
            cls._validate_pdf_content(content)
        elif mime_type.startswith('audio/'):
            cls._validate_audio_content(file)
        
        file.seek(0)
    
    @classmethod
    def _validate_image_content(cls, file):
        """Validate image file content"""
        try:
            img = Image.open(file)
            img.verify()  # Verify it's a valid image
            
            # Check image dimensions (prevent extremely large images)
            if hasattr(img, 'size'):
                width, height = img.size
                if width > 10000 or height > 10000:
                    raise ValidationError("Image dimensions are too large")
                    
        except Exception as e:
            if isinstance(e, ValidationError):
                raise e
            raise ValidationError("Invalid or corrupted image file")
    
    @classmethod
    def _validate_pdf_content(cls, content: bytes):
        """Validate PDF file content for security"""
        # Check for JavaScript in PDF
        if b'/JavaScript' in content or b'/JS' in content:
            raise ValidationError("PDF files with embedded JavaScript are not allowed")
        
        # Check for forms that might be malicious
        if b'/AcroForm' in content:
            raise ValidationError("PDF files with interactive forms are not allowed")
        
        # Check for embedded files
        if b'/EmbeddedFile' in content:
            raise ValidationError("PDF files with embedded files are not allowed")
    
    @classmethod
    def _validate_audio_content(cls, file):
        """Basic validation for audio files"""
        # For now, just check if it's a valid audio file by trying to read metadata
        # In production, you might want to use librosa or similar for deeper validation
        try:
            # Basic check - ensure file has audio-like structure
            file.seek(0)
            header = file.read(12)
            file.seek(0)
            
            # Check for common audio file signatures
            if not (header.startswith(b'ID3') or  # MP3
                   header.startswith(b'RIFF') or  # WAV
                   header.startswith(b'fLaC') or  # FLAC
                   header.startswith(b'OggS')):   # OGG
                # Allow other formats but log for review
                pass
                
        except Exception:
            raise ValidationError("Invalid audio file format")
    
    @classmethod
    def _scan_for_malicious_content(cls, content: bytes, mime_type: str):
        """Scan file content for potentially malicious patterns"""
        # Convert to lowercase for case-insensitive scanning
        content_lower = content.lower()
        
        # Common malicious patterns
        malicious_patterns = [
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'onload=',
            b'onerror=',
            b'eval(',
            b'document.write',
            b'window.location',
            b'<iframe',
            b'<object',
            b'<embed'
        ]
        
        for pattern in malicious_patterns:
            if pattern in content_lower:
                raise ValidationError(f"File contains potentially malicious content: {pattern.decode('utf-8', errors='ignore')}")


class EvidenceAccessService:
    """Service for controlling access to dispute evidence files"""
    
    # Token expiry time in seconds (4 hours for evidence files)
    TOKEN_EXPIRY = 14400
    
    @classmethod
    def check_evidence_access_permission(cls, user: User, evidence_id: int) -> bool:
        """
        Check if user has permission to access dispute evidence
        
        Args:
            user: The requesting user
            evidence_id: ID of the evidence file
            
        Returns:
            bool: True if user has access, False otherwise
        """
        from disputes.models import DisputeEvidence, Dispute
        
        try:
            evidence = DisputeEvidence.objects.select_related('dispute', 'uploaded_by').get(id=evidence_id)
            dispute = evidence.dispute
            
            # Admin users can access all evidence
            if user.is_staff or user.admin:
                return True
            
            # Evidence uploader can access their own evidence
            if evidence.uploaded_by_id == user.id:
                return True
            
            # Dispute submitter can access evidence in their dispute
            if dispute.submitted_by_id == user.id:
                return True
            
            # Assigned dispute handler can access evidence
            if dispute.assigned_to_id == user.id:
                return True
            
            # Publishers can access evidence for disputes involving their artists
            if user.user_type == 'Publisher' and dispute.related_track:
                from publishers.models import PublisherArtistRelationship
                try:
                    PublisherArtistRelationship.objects.get(
                        publisher__user=user,
                        artist=dispute.related_track.artist,
                        status='active'
                    )
                    return True
                except PublisherArtistRelationship.DoesNotExist:
                    pass
            
            # Station owners can access evidence for disputes involving their station
            if user.user_type == 'Station' and dispute.related_station:
                if dispute.related_station.user_id == user.id:
                    return True
            
            return False
            
        except DisputeEvidence.DoesNotExist:
            return False
    
    @classmethod
    def generate_evidence_access_token(cls, user_id: int, evidence_id: int) -> str:
        """Generate a secure token for evidence file access"""
        timestamp = str(int(time.time()))
        message = f"evidence:{evidence_id}:{user_id}:{timestamp}"
        
        secret_key = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
        
        return f"{timestamp}.{signature}"
    
    @classmethod
    def verify_evidence_access_token(cls, token: str, user_id: int, evidence_id: int) -> bool:
        """Verify a secure token for evidence file access"""
        try:
            timestamp_str, signature = token.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check if token has expired
            if time.time() - timestamp > cls.TOKEN_EXPIRY:
                return False
            
            # Regenerate expected signature
            message = f"evidence:{evidence_id}:{user_id}:{timestamp_str}"
            secret_key = settings.SECRET_KEY.encode('utf-8')
            expected_signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
            
            # Compare signatures securely
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, TypeError):
            return False
    
    @classmethod
    def serve_evidence_file(
        cls, 
        user: User, 
        evidence_id: int,
        token: Optional[str] = None
    ) -> HttpResponse:
        """
        Serve an evidence file securely with access controls and audit logging
        
        Args:
            user: The requesting user
            evidence_id: ID of the evidence file
            token: Optional secure token for additional verification
            
        Returns:
            HttpResponse with file content
            
        Raises:
            Http404: If evidence not found
            PermissionDenied: If user doesn't have access
        """
        from disputes.models import DisputeEvidence
        from accounts.models import AuditLog
        
        # Check basic access permission
        if not cls.check_evidence_access_permission(user, evidence_id):
            # Log unauthorized access attempt
            AuditLog.objects.create(
                user=user,
                action='evidence_access_denied',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data={
                    'reason': 'insufficient_permissions',
                    'timestamp': timezone.now().isoformat(),
                    'ip_address': getattr(user, 'ip_address', 'Unknown'),
                    'user_agent': getattr(user, 'user_agent', 'Unknown')
                }
            )
            raise PermissionDenied("You don't have permission to access this evidence file")
        
        # Verify token if provided
        if token and not cls.verify_evidence_access_token(token, user.id, evidence_id):
            AuditLog.objects.create(
                user=user,
                action='evidence_access_denied',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data={
                    'reason': 'invalid_token',
                    'timestamp': timezone.now().isoformat()
                }
            )
            raise PermissionDenied("Invalid or expired access token")
        
        # Get the evidence file
        try:
            evidence = DisputeEvidence.objects.select_related('dispute', 'uploaded_by').get(id=evidence_id)
        except DisputeEvidence.DoesNotExist:
            raise Http404("Evidence file not found")
        
        # Check if file exists in storage
        if not evidence.file or not default_storage.exists(evidence.file.name):
            raise Http404("Evidence file not found in storage")
        
        # Verify file integrity
        if not cls._verify_file_integrity(evidence):
            AuditLog.objects.create(
                user=user,
                action='evidence_integrity_failure',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data={
                    'file_path': evidence.file.name,
                    'timestamp': timezone.now().isoformat()
                }
            )
            raise Http404("Evidence file integrity check failed")
        
        # Comprehensive audit logging
        audit_data = {
            'evidence_title': evidence.title,
            'dispute_id': str(evidence.dispute.dispute_id),
            'file_type': evidence.file_type,
            'file_size': evidence.file_size,
            'access_method': 'secure_token' if token else 'direct',
            'file_path': evidence.file.name,
            'uploaded_by': evidence.uploaded_by.username,
            'dispute_status': evidence.dispute.status,
            'access_timestamp': timezone.now().isoformat(),
            'user_agent': getattr(user, 'user_agent', 'Unknown'),
            'ip_address': getattr(user, 'ip_address', 'Unknown')
        }
        
        AuditLog.objects.create(
            user=user,
            action='evidence_file_access',
            resource_type='DisputeEvidence',
            resource_id=str(evidence_id),
            request_data=audit_data
        )
        
        # Serve the file
        try:
            file_content = evidence.file.read()
            
            # Determine content type
            content_type = evidence.file_type or 'application/octet-stream'
            if not content_type.startswith(('image/', 'audio/', 'video/', 'application/', 'text/')):
                content_type = 'application/octet-stream'
            
            # Generate safe filename
            safe_filename = cls._generate_safe_filename(evidence)
            
            response = HttpResponse(file_content, content_type=content_type)
            
            # Set security headers
            response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
            response['Content-Length'] = len(file_content)
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            # Add evidence-specific headers
            response['X-Evidence-ID'] = str(evidence_id)
            response['X-Dispute-ID'] = str(evidence.dispute.dispute_id)
            
            return response
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=user,
                action='evidence_file_access_error',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data={
                    'error': str(e),
                    'file_path': evidence.file.name,
                    'timestamp': timezone.now().isoformat()
                }
            )
            raise Http404("Error serving evidence file")
    
    @classmethod
    def _verify_file_integrity(cls, evidence) -> bool:
        """Verify file integrity using stored hash"""
        if not evidence.file_hash:
            return True  # No hash stored, assume valid (for legacy files)
        
        try:
            evidence.file.seek(0)
            content = evidence.file.read()
            evidence.file.seek(0)
            
            current_hash = hashlib.sha256(content).hexdigest()
            return current_hash == evidence.file_hash
            
        except Exception:
            return False
    
    @classmethod
    def _generate_safe_filename(cls, evidence) -> str:
        """Generate a safe filename for download"""
        # Use evidence title or fallback to original filename
        base_name = evidence.title or "evidence"
        
        # Sanitize the name
        safe_name = "".join(c for c in base_name if c.isalnum() or c in (' ', '-', '_')).strip()
        
        # Add file extension if available
        if evidence.file and evidence.file.name:
            _, ext = os.path.splitext(evidence.file.name)
            if ext:
                safe_name += ext
        
        return safe_name or "evidence_file"
    
    @classmethod
    def get_secure_evidence_url(cls, user: User, evidence_id: int) -> Dict[str, Any]:
        """
        Generate a secure evidence URL with token
        
        Args:
            user: The requesting user
            evidence_id: ID of the evidence file
            
        Returns:
            Dict with evidence URL and token info
        """
        # Check access permission
        if not cls.check_evidence_access_permission(user, evidence_id):
            raise PermissionDenied("You don't have permission to access this evidence file")
        
        # Generate secure token
        token = cls.generate_evidence_access_token(user.id, evidence_id)
        
        # Build URL
        secure_url = f'/api/disputes/evidence/{evidence_id}/download/?token={token}'
        
        return {
            'evidence_url': secure_url,
            'token': token,
            'expires_in': cls.TOKEN_EXPIRY,
            'evidence_id': evidence_id
        }


class EvidenceRetentionService:
    """Service for managing evidence file retention and deletion policies"""
    
    # Retention periods in days
    RETENTION_PERIODS = {
        'active_dispute': 0,  # Keep indefinitely while dispute is active
        'resolved_dispute': 2555,  # 7 years after resolution (legal requirement)
        'rejected_dispute': 1095,  # 3 years after rejection
        'abandoned_dispute': 365,  # 1 year for abandoned disputes
    }
    
    @classmethod
    def get_retention_policy(cls, dispute_status: str, resolved_date: Optional[timezone.datetime] = None) -> Dict[str, Any]:
        """
        Get retention policy for evidence based on dispute status
        
        Args:
            dispute_status: Current status of the dispute
            resolved_date: Date when dispute was resolved (if applicable)
            
        Returns:
            Dict with retention policy information
        """
        from disputes.models import DisputeStatus
        
        if dispute_status in [DisputeStatus.SUBMITTED, DisputeStatus.UNDER_REVIEW, 
                             DisputeStatus.EVIDENCE_REQUIRED, DisputeStatus.MEDIATION, 
                             DisputeStatus.ESCALATED, DisputeStatus.EXTERNAL_ARBITRATION]:
            return {
                'retention_days': cls.RETENTION_PERIODS['active_dispute'],
                'delete_after': None,
                'policy': 'Keep indefinitely while dispute is active'
            }
        
        elif dispute_status == DisputeStatus.RESOLVED:
            if resolved_date:
                delete_after = resolved_date + timezone.timedelta(days=cls.RETENTION_PERIODS['resolved_dispute'])
            else:
                delete_after = None
            
            return {
                'retention_days': cls.RETENTION_PERIODS['resolved_dispute'],
                'delete_after': delete_after,
                'policy': 'Keep for 7 years after resolution (legal requirement)'
            }
        
        elif dispute_status == DisputeStatus.REJECTED:
            if resolved_date:
                delete_after = resolved_date + timezone.timedelta(days=cls.RETENTION_PERIODS['rejected_dispute'])
            else:
                delete_after = None
            
            return {
                'retention_days': cls.RETENTION_PERIODS['rejected_dispute'],
                'delete_after': delete_after,
                'policy': 'Keep for 3 years after rejection'
            }
        
        else:
            # Default to abandoned dispute policy
            return {
                'retention_days': cls.RETENTION_PERIODS['abandoned_dispute'],
                'delete_after': None,
                'policy': 'Keep for 1 year (abandoned dispute)'
            }
    
    @classmethod
    def get_evidence_files_for_deletion(cls) -> List[Dict[str, Any]]:
        """
        Get list of evidence files that are eligible for deletion based on retention policy
        
        Returns:
            List of evidence files with deletion information
        """
        from disputes.models import DisputeEvidence, DisputeStatus
        
        eligible_files = []
        current_time = timezone.now()
        
        # Get resolved disputes past retention period
        resolved_disputes = DisputeEvidence.objects.filter(
            dispute__status=DisputeStatus.RESOLVED,
            dispute__resolved_at__lt=current_time - timezone.timedelta(days=cls.RETENTION_PERIODS['resolved_dispute'])
        ).select_related('dispute')
        
        for evidence in resolved_disputes:
            eligible_files.append({
                'evidence_id': evidence.id,
                'dispute_id': evidence.dispute.dispute_id,
                'file_path': evidence.file.name if evidence.file else None,
                'reason': 'resolved_dispute_retention_expired',
                'resolved_date': evidence.dispute.resolved_at,
                'eligible_for_deletion': True
            })
        
        # Get rejected disputes past retention period
        rejected_disputes = DisputeEvidence.objects.filter(
            dispute__status=DisputeStatus.REJECTED,
            dispute__resolved_at__lt=current_time - timezone.timedelta(days=cls.RETENTION_PERIODS['rejected_dispute'])
        ).select_related('dispute')
        
        for evidence in rejected_disputes:
            eligible_files.append({
                'evidence_id': evidence.id,
                'dispute_id': evidence.dispute.dispute_id,
                'file_path': evidence.file.name if evidence.file else None,
                'reason': 'rejected_dispute_retention_expired',
                'resolved_date': evidence.dispute.resolved_at,
                'eligible_for_deletion': True
            })
        
        return eligible_files
    
    @classmethod
    def delete_evidence_file(cls, evidence_id: int, reason: str, deleted_by: User) -> bool:
        """
        Safely delete an evidence file with audit logging
        
        Args:
            evidence_id: ID of the evidence to delete
            reason: Reason for deletion
            deleted_by: User performing the deletion
            
        Returns:
            bool: True if deletion was successful
        """
        from disputes.models import DisputeEvidence
        from accounts.models import AuditLog
        
        try:
            evidence = DisputeEvidence.objects.get(id=evidence_id)
            
            # Create audit log before deletion
            audit_data = {
                'evidence_title': evidence.title,
                'dispute_id': str(evidence.dispute.dispute_id),
                'file_path': evidence.file.name if evidence.file else None,
                'file_size': evidence.file_size,
                'file_hash': evidence.file_hash,
                'uploaded_by': evidence.uploaded_by.username,
                'deletion_reason': reason,
                'deletion_timestamp': timezone.now().isoformat()
            }
            
            AuditLog.objects.create(
                user=deleted_by,
                action='evidence_file_deleted',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data=audit_data
            )
            
            # Delete file from storage
            if evidence.file and default_storage.exists(evidence.file.name):
                default_storage.delete(evidence.file.name)
            
            # Delete database record
            evidence.delete()
            
            return True
            
        except DisputeEvidence.DoesNotExist:
            return False
        except Exception as e:
            # Log deletion error
            AuditLog.objects.create(
                user=deleted_by,
                action='evidence_file_deletion_error',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data={
                    'error': str(e),
                    'deletion_reason': reason,
                    'timestamp': timezone.now().isoformat()
                }
            )
            return False