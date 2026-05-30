"""
Contract file security service for publisher management
Provides enhanced validation, access controls, and audit logging for legal contract files
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


class ContractFileValidator:
    """Enhanced file validation for publisher contract files"""
    
    # Allowed file types for legal contracts
    ALLOWED_CONTRACT_TYPES = {
        # Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
        
        # Images (for scanned contracts)
        'image/jpeg',
        'image/png',
        'image/tiff',
        'image/gif'
    }
    
    # Maximum file size for contracts (50MB)
    MAX_CONTRACT_SIZE = 50 * 1024 * 1024
    
    # Dangerous file extensions to block
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.ps1', '.msi', '.deb', '.rpm', '.dll', '.sys', '.bin'
    }
    
    @classmethod
    def validate_contract_file(cls, file, publisher_id: int) -> Dict[str, Any]:
        """
        Comprehensive validation for publisher contract files
        
        Args:
            file: Django UploadedFile object
            publisher_id: ID of the publisher this contract belongs to
            
        Returns:
            Dict with validation results and file metadata
            
        Raises:
            ValidationError: If file fails validation
        """
        validation_result = {
            'is_valid': False,
            'file_type': None,
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
            
            if file_size > cls.MAX_CONTRACT_SIZE:
                raise ValidationError(f"File size exceeds maximum allowed size ({cls.MAX_CONTRACT_SIZE // (1024*1024)}MB)")
            
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
            if mime_type not in cls.ALLOWED_CONTRACT_TYPES:
                raise ValidationError(f"File type '{mime_type}' is not allowed for contract files")
            
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
    def _validate_file_content(cls, file, mime_type: str, content: bytes):
        """Validate file content based on type"""
        file.seek(0)
        
        if mime_type.startswith('image/'):
            cls._validate_image_content(file)
        elif mime_type == 'application/pdf':
            cls._validate_pdf_content(content)
        
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


class ContractAccessService:
    """Service for controlling access to publisher contract files"""
    
    # Token expiry time in seconds (4 hours for contract files)
    TOKEN_EXPIRY = 14400
    
    @classmethod
    def check_contract_access_permission(cls, user: User, contract_id: int) -> bool:
        """
        Check if user has permission to access publisher contract
        
        Args:
            user: The requesting user
            contract_id: ID of the contract file
            
        Returns:
            bool: True if user has access, False otherwise
        """
        from publishers.models import PublisherArtistRelationship, PublishingAgreement
        
        try:
            # Try both relationship and agreement models
            contract = None
            contract_type = None
            
            # Check PublisherArtistRelationship first
            try:
                contract = PublisherArtistRelationship.objects.select_related(
                    'publisher__user', 'artist__user', 'created_by'
                ).get(id=contract_id)
                contract_type = 'relationship'
            except PublisherArtistRelationship.DoesNotExist:
                pass
            
            # Check PublishingAgreement if not found
            if not contract:
                try:
                    contract = PublishingAgreement.objects.select_related(
                        'publisher__user', 'songwriter__user'
                    ).get(id=contract_id)
                    contract_type = 'agreement'
                except PublishingAgreement.DoesNotExist:
                    return False
            
            # Admin users can access all contracts
            if user.is_staff or user.admin:
                return True
            
            if contract_type == 'relationship':
                # Publisher can access their own contracts
                if contract.publisher.user_id == user.id:
                    return True
                
                # Artist can access contracts they're party to
                if contract.artist.user_id == user.id:
                    return True
                
                # Contract creator can access
                if contract.created_by_id == user.id:
                    return True
                
            elif contract_type == 'agreement':
                # Publisher can access their own agreements
                if contract.publisher.user_id == user.id:
                    return True
                
                # Songwriter can access agreements they're party to
                if contract.songwriter.user_id == user.id:
                    return True
            
            return False
            
        except Exception:
            return False
    
    @classmethod
    def generate_contract_access_token(cls, user_id: int, contract_id: int) -> str:
        """Generate a secure token for contract file access"""
        timestamp = str(int(time.time()))
        message = f"contract:{contract_id}:{user_id}:{timestamp}"
        
        secret_key = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
        
        return f"{timestamp}.{signature}"
    
    @classmethod
    def verify_contract_access_token(cls, token: str, user_id: int, contract_id: int) -> bool:
        """Verify a secure token for contract file access"""
        try:
            timestamp_str, signature = token.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check if token has expired
            if time.time() - timestamp > cls.TOKEN_EXPIRY:
                return False
            
            # Regenerate expected signature
            message = f"contract:{contract_id}:{user_id}:{timestamp_str}"
            secret_key = settings.SECRET_KEY.encode('utf-8')
            expected_signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
            
            # Compare signatures securely
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, TypeError):
            return False
    
    @classmethod
    def serve_contract_file(
        cls, 
        user: User, 
        contract_id: int,
        token: Optional[str] = None
    ) -> HttpResponse:
        """
        Serve a contract file securely with access controls and audit logging
        
        Args:
            user: The requesting user
            contract_id: ID of the contract
            token: Optional secure token for additional verification
            
        Returns:
            HttpResponse with file content
            
        Raises:
            Http404: If contract not found
            PermissionDenied: If user doesn't have access
        """
        from publishers.models import PublisherArtistRelationship, PublishingAgreement
        from accounts.models import AuditLog
        
        # Check basic access permission
        if not cls.check_contract_access_permission(user, contract_id):
            # Log unauthorized access attempt
            AuditLog.objects.create(
                user=user,
                action='contract_access_denied',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'reason': 'insufficient_permissions',
                    'timestamp': timezone.now().isoformat(),
                    'ip_address': getattr(user, 'ip_address', 'Unknown'),
                    'user_agent': getattr(user, 'user_agent', 'Unknown')
                }
            )
            raise PermissionDenied("You don't have permission to access this contract file")
        
        # Verify token if provided
        if token and not cls.verify_contract_access_token(token, user.id, contract_id):
            AuditLog.objects.create(
                user=user,
                action='contract_access_denied',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'reason': 'invalid_token',
                    'timestamp': timezone.now().isoformat()
                }
            )
            raise PermissionDenied("Invalid or expired access token")
        
        # Get the contract file
        contract = None
        contract_type = None
        file_field = None
        
        # Try PublisherArtistRelationship first
        try:
            contract = PublisherArtistRelationship.objects.select_related(
                'publisher__user', 'artist__user'
            ).get(id=contract_id)
            contract_type = 'relationship'
            file_field = contract.contract_file
        except PublisherArtistRelationship.DoesNotExist:
            pass
        
        # Try PublishingAgreement if not found
        if not contract:
            try:
                contract = PublishingAgreement.objects.select_related(
                    'publisher__user', 'songwriter__user'
                ).get(id=contract_id)
                contract_type = 'agreement'
                file_field = contract.contract_file
            except PublishingAgreement.DoesNotExist:
                raise Http404("Contract not found")
        
        # Check if file exists
        if not file_field or not default_storage.exists(file_field.name):
            raise Http404("Contract file not found in storage")
        
        # Verify file integrity
        if not cls._verify_file_integrity(contract, file_field):
            AuditLog.objects.create(
                user=user,
                action='contract_integrity_failure',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'file_path': file_field.name,
                    'contract_type': contract_type,
                    'timestamp': timezone.now().isoformat()
                }
            )
            raise Http404("Contract file integrity check failed")
        
        # Comprehensive audit logging
        audit_data = {
            'contract_type': contract_type,
            'file_path': file_field.name,
            'access_method': 'secure_token' if token else 'direct',
            'file_size': file_field.size if hasattr(file_field, 'size') else None,
            'access_timestamp': timezone.now().isoformat(),
            'user_agent': getattr(user, 'user_agent', 'Unknown'),
            'ip_address': getattr(user, 'ip_address', 'Unknown')
        }
        
        # Add contract-specific information
        if contract_type == 'relationship':
            audit_data.update({
                'publisher_name': contract.publisher.company_name,
                'artist_name': contract.artist.stage_name,
                'relationship_type': contract.relationship_type,
                'status': contract.status
            })
        elif contract_type == 'agreement':
            audit_data.update({
                'publisher_name': contract.publisher.company_name,
                'songwriter_name': contract.songwriter.stage_name,
                'track_title': contract.track.title if contract.track else None,
                'status': contract.status
            })
        
        AuditLog.objects.create(
            user=user,
            action='contract_file_access',
            resource_type='Contract',
            resource_id=str(contract_id),
            request_data=audit_data
        )
        
        # Serve the file
        try:
            file_content = file_field.read()
            
            # Determine content type
            content_type, _ = mimetypes.guess_type(file_field.name)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Generate safe filename
            safe_filename = cls._generate_safe_filename(contract, contract_type, file_field)
            
            response = HttpResponse(file_content, content_type=content_type)
            
            # Set security headers
            response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
            response['Content-Length'] = len(file_content)
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            # Add contract-specific headers
            response['X-Contract-ID'] = str(contract_id)
            response['X-Contract-Type'] = contract_type
            
            return response
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=user,
                action='contract_file_access_error',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'error': str(e),
                    'file_path': file_field.name,
                    'contract_type': contract_type,
                    'timestamp': timezone.now().isoformat()
                }
            )
            raise Http404("Error serving contract file")
    
    @classmethod
    def _verify_file_integrity(cls, contract, file_field) -> bool:
        """Verify file integrity using stored hash"""
        # Check if contract has file_hash attribute
        file_hash = getattr(contract, 'file_hash', None)
        
        if not file_hash:
            return True  # No hash stored, assume valid (for legacy files)
        
        try:
            file_field.seek(0)
            content = file_field.read()
            file_field.seek(0)
            
            current_hash = hashlib.sha256(content).hexdigest()
            return current_hash == file_hash
            
        except Exception:
            return False
    
    @classmethod
    def _generate_safe_filename(cls, contract, contract_type: str, file_field) -> str:
        """Generate a safe filename for download"""
        # Generate descriptive name based on contract type
        if contract_type == 'relationship':
            base_name = f"contract_{contract.publisher.company_name}_{contract.artist.stage_name}"
        elif contract_type == 'agreement':
            base_name = f"agreement_{contract.publisher.company_name}_{contract.songwriter.stage_name}"
        else:
            base_name = "contract"
        
        # Sanitize the name
        safe_name = "".join(c for c in base_name if c.isalnum() or c in (' ', '-', '_')).strip()
        
        # Add file extension if available
        if file_field and file_field.name:
            _, ext = os.path.splitext(file_field.name)
            if ext:
                safe_name += ext
        
        return safe_name or "contract_file"
    
    @classmethod
    def get_secure_contract_url(cls, user: User, contract_id: int) -> Dict[str, Any]:
        """
        Generate a secure contract URL with token
        
        Args:
            user: The requesting user
            contract_id: ID of the contract
            
        Returns:
            Dict with contract URL and token info
        """
        # Check access permission
        if not cls.check_contract_access_permission(user, contract_id):
            raise PermissionDenied("You don't have permission to access this contract file")
        
        # Generate secure token
        token = cls.generate_contract_access_token(user.id, contract_id)
        
        # Build URL
        secure_url = f'/api/publishers/contracts/{contract_id}/download/?token={token}'
        
        return {
            'contract_url': secure_url,
            'token': token,
            'expires_in': cls.TOKEN_EXPIRY,
            'contract_id': contract_id
        }


class ContractRetentionService:
    """Service for managing contract file retention and deletion policies"""
    
    # Retention periods in days
    RETENTION_PERIODS = {
        'active_contract': 0,  # Keep indefinitely while contract is active
        'terminated_contract': 2555,  # 7 years after termination (legal requirement)
        'expired_contract': 2555,  # 7 years after expiration
        'rejected_contract': 1095,  # 3 years after rejection
    }
    
    @classmethod
    def get_retention_policy(cls, contract_status: str, end_date: Optional[timezone.datetime] = None) -> Dict[str, Any]:
        """
        Get retention policy for contract based on status
        
        Args:
            contract_status: Current status of the contract
            end_date: Date when contract ended (if applicable)
            
        Returns:
            Dict with retention policy information
        """
        if contract_status == 'active':
            return {
                'retention_days': cls.RETENTION_PERIODS['active_contract'],
                'delete_after': None,
                'policy': 'Keep indefinitely while contract is active'
            }
        
        elif contract_status == 'terminated':
            if end_date:
                delete_after = end_date + timezone.timedelta(days=cls.RETENTION_PERIODS['terminated_contract'])
            else:
                delete_after = None
            
            return {
                'retention_days': cls.RETENTION_PERIODS['terminated_contract'],
                'delete_after': delete_after,
                'policy': 'Keep for 7 years after termination (legal requirement)'
            }
        
        elif contract_status == 'rejected':
            if end_date:
                delete_after = end_date + timezone.timedelta(days=cls.RETENTION_PERIODS['rejected_contract'])
            else:
                delete_after = None
            
            return {
                'retention_days': cls.RETENTION_PERIODS['rejected_contract'],
                'delete_after': delete_after,
                'policy': 'Keep for 3 years after rejection'
            }
        
        else:
            # Default policy
            return {
                'retention_days': cls.RETENTION_PERIODS['terminated_contract'],
                'delete_after': None,
                'policy': 'Keep for 7 years (default policy)'
            }
    
    @classmethod
    def get_contracts_for_deletion(cls) -> List[Dict[str, Any]]:
        """
        Get list of contract files that are eligible for deletion based on retention policy
        
        Returns:
            List of contract files with deletion information
        """
        from publishers.models import PublisherArtistRelationship, PublishingAgreement
        
        eligible_files = []
        current_time = timezone.now()
        
        # Check PublisherArtistRelationship contracts
        terminated_relationships = PublisherArtistRelationship.objects.filter(
            status='terminated',
            end_date__lt=current_time - timezone.timedelta(days=cls.RETENTION_PERIODS['terminated_contract'])
        )
        
        for contract in terminated_relationships:
            if contract.contract_file:
                eligible_files.append({
                    'contract_id': contract.id,
                    'contract_type': 'relationship',
                    'file_path': contract.contract_file.name,
                    'reason': 'terminated_contract_retention_expired',
                    'end_date': contract.end_date,
                    'eligible_for_deletion': True
                })
        
        # Check PublishingAgreement contracts
        rejected_agreements = PublishingAgreement.objects.filter(
            status='rejected',
            updated_at__lt=current_time - timezone.timedelta(days=cls.RETENTION_PERIODS['rejected_contract'])
        )
        
        for contract in rejected_agreements:
            if contract.contract_file:
                eligible_files.append({
                    'contract_id': contract.id,
                    'contract_type': 'agreement',
                    'file_path': contract.contract_file.name,
                    'reason': 'rejected_contract_retention_expired',
                    'end_date': contract.updated_at,
                    'eligible_for_deletion': True
                })
        
        return eligible_files
    
    @classmethod
    def delete_contract_file(cls, contract_id: int, contract_type: str, reason: str, deleted_by: User) -> bool:
        """
        Safely delete a contract file with audit logging
        
        Args:
            contract_id: ID of the contract
            contract_type: Type of contract ('relationship' or 'agreement')
            reason: Reason for deletion
            deleted_by: User performing the deletion
            
        Returns:
            bool: True if deletion was successful
        """
        from publishers.models import PublisherArtistRelationship, PublishingAgreement
        from accounts.models import AuditLog
        
        try:
            contract = None
            
            if contract_type == 'relationship':
                contract = PublisherArtistRelationship.objects.get(id=contract_id)
            elif contract_type == 'agreement':
                contract = PublishingAgreement.objects.get(id=contract_id)
            else:
                return False
            
            if not contract.contract_file:
                return False
            
            # Create audit log before deletion
            audit_data = {
                'contract_type': contract_type,
                'file_path': contract.contract_file.name,
                'file_size': contract.contract_file.size if hasattr(contract.contract_file, 'size') else None,
                'deletion_reason': reason,
                'deletion_timestamp': timezone.now().isoformat()
            }
            
            # Add contract-specific data
            if contract_type == 'relationship':
                audit_data.update({
                    'publisher_name': contract.publisher.company_name,
                    'artist_name': contract.artist.stage_name,
                    'relationship_type': contract.relationship_type,
                    'status': contract.status
                })
            elif contract_type == 'agreement':
                audit_data.update({
                    'publisher_name': contract.publisher.company_name,
                    'songwriter_name': contract.songwriter.stage_name,
                    'track_title': contract.track.title if contract.track else None,
                    'status': contract.status
                })
            
            AuditLog.objects.create(
                user=deleted_by,
                action='contract_file_deleted',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data=audit_data
            )
            
            # Delete the file from storage
            if default_storage.exists(contract.contract_file.name):
                default_storage.delete(contract.contract_file.name)
            
            # Clear the file field
            contract.contract_file = None
            contract.save()
            
            return True
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=deleted_by,
                action='contract_file_deletion_error',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'error': str(e),
                    'contract_type': contract_type,
                    'deletion_reason': reason,
                    'timestamp': timezone.now().isoformat()
                }
            )
            return False