"""
Unified File Security Service for all ZamIO modules
Provides comprehensive file validation, malware scanning, and secure storage
"""
import os
import hashlib
import mimetypes
import logging
import tempfile
import uuid
from typing import Dict, Any, Optional, List, Union, Tuple
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from accounts.models import AuditLog

logger = logging.getLogger(__name__)


class UnifiedFileSecurityService:
    """Unified service for handling secure file uploads across all ZamIO modules"""
    
    # File type categories and their configurations
    FILE_CATEGORIES = {
        'image': {
            'max_size': 5 * 1024 * 1024,  # 5MB
            'allowed_types': {
                'image/jpeg', 'image/png', 'image/gif', 'image/webp'
            },
            'allowed_extensions': {'.jpg', '.jpeg', '.png', '.gif', '.webp'},
            'requires_image_validation': True
        },
        'audio': {
            'max_size': 100 * 1024 * 1024,  # 100MB
            'allowed_types': {
                'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
                'audio/flac', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'
            },
            'allowed_extensions': {'.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a'},
            'requires_audio_validation': True
        },
        'document': {
            'max_size': 10 * 1024 * 1024,  # 10MB
            'allowed_types': {
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            },
            'allowed_extensions': {'.pdf', '.doc', '.docx', '.txt'},
            'requires_document_validation': True
        },
        'financial': {
            'max_size': 50 * 1024 * 1024,  # 50MB
            'allowed_types': {
                'text/csv', 'application/csv', 'text/plain',
                'application/vnd.ms-excel', 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/json', 'text/json'
            },
            'allowed_extensions': {'.csv', '.xlsx', '.xls', '.json'},
            'requires_financial_validation': True
        },
        'contract': {
            'max_size': 25 * 1024 * 1024,  # 25MB
            'allowed_types': {
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            },
            'allowed_extensions': {'.pdf', '.doc', '.docx'},
            'requires_legal_validation': True
        }
    }
    
    # Universal dangerous file extensions and patterns
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.ps1', '.msi', '.deb', '.rpm', '.dmg', '.app', '.pkg',
        '.svg',  # SVG can contain scripts
        '.html', '.htm', '.xml'  # Can contain scripts
    }
    
    # Malware signature patterns
    MALWARE_PATTERNS = [
        b'<script', b'javascript:', b'vbscript:', b'eval(',
        b'exec(', b'system(', b'shell_exec(', b'<?php',
        b'<%', b'#!/bin/sh', b'#!/bin/bash', b'powershell',
        b'cmd.exe', b'CreateObject(', b'WScript.Shell',
        b'UNION SELECT', b'DROP TABLE', b'DELETE FROM',
        b'INSERT INTO', b'UPDATE SET', b'ALTER TABLE'
    ]
    
    @classmethod
    def validate_file(
        cls, 
        file: UploadedFile, 
        category: str, 
        user=None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive file validation with enhanced security
        
        Args:
            file: The uploaded file to validate
            category: File category ('image', 'audio', 'document', 'financial', 'contract')
            user: User uploading the file (for audit logging)
            additional_context: Additional context for validation
            
        Returns:
            Dict containing validation results and file metadata
            
        Raises:
            ValidationError: If file fails validation
        """
        errors = []
        
        # Get category configuration
        if category not in cls.FILE_CATEGORIES:
            raise ValidationError(f'Unknown file category: {category}')
        
        config = cls.FILE_CATEGORIES[category]
        
        # Basic file validation
        cls._validate_basic_file_properties(file, config, errors)
        
        # Content-based validation
        cls._validate_file_content(file, category, config, errors)
        
        # Security validation
        cls._validate_file_security(file, errors)
        
        # Category-specific validation
        if config.get('requires_image_validation') and category == 'image':
            cls._validate_image_file(file, errors)
        elif config.get('requires_audio_validation') and category == 'audio':
            cls._validate_audio_file(file, errors)
        elif config.get('requires_document_validation') and category == 'document':
            cls._validate_document_file(file, errors)
        elif config.get('requires_financial_validation') and category == 'financial':
            cls._validate_financial_file(file, errors)
        elif config.get('requires_legal_validation') and category == 'contract':
            cls._validate_legal_file(file, errors)
        
        if errors:
            # Log validation failure
            if user:
                AuditLog.objects.create(
                    user=user,
                    action='file_validation_failed',
                    resource_type='FileUpload',
                    resource_id=file.name,
                    request_data={
                        'filename': file.name,
                        'category': category,
                        'file_size': file.size,
                        'errors': errors,
                        'additional_context': additional_context or {}
                    }
                )
            raise ValidationError(errors)
        
        # Calculate file hash
        file_hash = cls.calculate_file_hash(file)
        
        # Log successful validation
        if user:
            AuditLog.objects.create(
                user=user,
                action='file_validation_success',
                resource_type='FileUpload',
                resource_id=file_hash[:16],
                request_data={
                    'filename': file.name,
                    'category': category,
                    'file_size': file.size,
                    'file_hash': file_hash,
                    'additional_context': additional_context or {}
                }
            )
        
        return {
            'valid': True,
            'category': category,
            'content_type': file.content_type,
            'size': file.size,
            'file_hash': file_hash,
            'validation_timestamp': timezone.now().isoformat()
        }
    
    @classmethod
    def _validate_basic_file_properties(cls, file: UploadedFile, config: Dict, errors: List[str]):
        """Validate basic file properties like size, type, extension"""
        # Check file size
        max_size = config['max_size']
        if file.size > max_size:
            errors.append(f'File size ({file.size} bytes) exceeds maximum allowed size ({max_size} bytes)')
        
        # Check file type
        content_type = file.content_type or mimetypes.guess_type(file.name)[0]
        allowed_types = config['allowed_types']
        if content_type not in allowed_types:
            errors.append(f'File type {content_type} is not allowed for this category')
        
        # Check file extension
        _, ext = os.path.splitext(file.name.lower())
        allowed_extensions = config['allowed_extensions']
        if ext not in allowed_extensions:
            errors.append(f'File extension {ext} is not allowed for this category')
        
        # Check for dangerous extensions
        if ext in cls.DANGEROUS_EXTENSIONS:
            errors.append(f'File extension {ext} is blocked for security reasons')
    
    @classmethod
    def _validate_file_content(cls, file: UploadedFile, category: str, config: Dict, errors: List[str]):
        """Validate file content for malware and suspicious patterns"""
        try:
            file.seek(0)
            # Read content for analysis (limit to 1MB for large files)
            content_size = min(file.size, 1024 * 1024)
            content = file.read(content_size)
            file.seek(0)
            
            # Check for malware patterns
            content_lower = content.lower()
            for pattern in cls.MALWARE_PATTERNS:
                if pattern in content_lower:
                    errors.append(f'File contains potentially malicious content: {pattern.decode("utf-8", errors="ignore")}')
            
            # Check for executable signatures
            if content.startswith(b'MZ') or content.startswith(b'\x7fELF'):
                errors.append('Executable file detected')
            
            # Check for script content in non-script files
            if category != 'document':  # Documents might legitimately contain code examples
                script_patterns = [b'<script>', b'<?php', b'<%', b'#!/']
                for pattern in script_patterns:
                    if pattern in content_lower:
                        errors.append(f'Script content detected: {pattern.decode("utf-8", errors="ignore")}')
        
        except Exception as e:
            errors.append(f'Content validation error: {str(e)}')
    
    @classmethod
    def _validate_file_security(cls, file: UploadedFile, errors: List[str]):
        """Perform security-specific validations"""
        # Check for null bytes in filename (security issue)
        if '\x00' in file.name:
            errors.append('File name contains null bytes')
        
        # Check for path traversal attempts
        if any(pattern in file.name for pattern in ['../', '..\\', '<', '>', '|', '&']):
            errors.append('File name contains invalid characters')
        
        # Check filename length
        if len(file.name) > 255:
            errors.append('File name is too long')
        
        # Check for hidden files (starting with .)
        if os.path.basename(file.name).startswith('.'):
            errors.append('Hidden files are not allowed')
    
    @classmethod
    def _validate_image_file(cls, file: UploadedFile, errors: List[str]):
        """Validate image files using PIL"""
        try:
            from PIL import Image
            file.seek(0)
            img = Image.open(file)
            img.verify()  # Verify it's a valid image
            file.seek(0)
            
            # Check image dimensions (prevent zip bombs)
            file.seek(0)
            img = Image.open(file)
            width, height = img.size
            if width > 10000 or height > 10000:
                errors.append('Image dimensions are too large')
            
            # Check for excessive EXIF data
            if hasattr(img, '_getexif') and img._getexif():
                exif_size = len(str(img._getexif()))
                if exif_size > 10000:  # 10KB of EXIF data
                    errors.append('Image contains excessive metadata')
            
            file.seek(0)
        except ImportError:
            # PIL not available, skip advanced image validation
            errors.append('PIL not available for image validation')
        except Exception as e:
            errors.append(f'Invalid image file: {str(e)}')
    
    @classmethod
    def _validate_audio_file(cls, file: UploadedFile, errors: List[str]):
        """Validate audio files"""
        try:
            file.seek(0)
            # Basic audio file validation
            content = file.read(1024)  # Read first 1KB
            file.seek(0)
            
            # Check for common audio file signatures
            audio_signatures = [
                b'ID3',  # MP3
                b'RIFF',  # WAV
                b'fLaC',  # FLAC
                b'OggS',  # OGG
                b'\xff\xfb',  # MP3 frame header
                b'\xff\xf3',  # MP3 frame header
                b'\xff\xf2',  # MP3 frame header
            ]
            
            valid_audio = any(content.startswith(sig) for sig in audio_signatures)
            if not valid_audio and len(content) > 100:  # Only check if we have enough content
                errors.append('File does not appear to be a valid audio file')
        
        except Exception as e:
            errors.append(f'Audio validation error: {str(e)}')
    
    @classmethod
    def _validate_document_file(cls, file: UploadedFile, errors: List[str]):
        """Validate document files"""
        try:
            file.seek(0)
            content = file.read(1024)  # Read first 1KB
            file.seek(0)
            
            # Check for document signatures
            if file.name.lower().endswith('.pdf'):
                if not content.startswith(b'%PDF'):
                    errors.append('File does not appear to be a valid PDF')
                
                # Check for JavaScript in PDF
                if b'/JavaScript' in content or b'/JS' in content:
                    errors.append('PDF files with embedded JavaScript are not allowed')
            
            elif file.name.lower().endswith(('.doc', '.docx')):
                # Basic Office document validation
                office_signatures = [
                    b'PK\x03\x04',  # DOCX (ZIP-based)
                    b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',  # DOC (OLE2)
                ]
                valid_office = any(content.startswith(sig) for sig in office_signatures)
                if not valid_office:
                    errors.append('File does not appear to be a valid Office document')
        
        except Exception as e:
            errors.append(f'Document validation error: {str(e)}')
    
    @classmethod
    def _validate_financial_file(cls, file: UploadedFile, errors: List[str]):
        """Validate financial data files"""
        try:
            file.seek(0)
            content = file.read(min(1024 * 1024, file.size))  # Read up to 1MB
            file.seek(0)
            
            # Check for financial data patterns
            if file.name.lower().endswith('.csv'):
                try:
                    import csv, io
                    content_str = content.decode('utf-8', errors='ignore')
                    csv_reader = csv.DictReader(io.StringIO(content_str))
                    
                    # Check for suspicious financial patterns
                    row_count = 0
                    for row in csv_reader:
                        if row_count >= 5:  # Check first 5 rows
                            break
                        
                        # Check for suspicious amounts
                        for field in ['amount', 'gross_amount', 'net_amount']:
                            if field in row and row[field]:
                                value = str(row[field]).replace(',', '')
                                if '999999999' in value or len(value.split('.')[1] if '.' in value else '') > 10:
                                    errors.append('Suspicious financial data pattern detected')
                        
                        row_count += 1
                
                except Exception:
                    errors.append('Invalid CSV format for financial data')
        
        except Exception as e:
            errors.append(f'Financial file validation error: {str(e)}')
    
    @classmethod
    def _validate_legal_file(cls, file: UploadedFile, errors: List[str]):
        """Validate legal/contract files"""
        # Legal files have same validation as documents but with stricter checks
        cls._validate_document_file(file, errors)
        
        # Additional legal document checks
        try:
            file.seek(0)
            content = file.read(min(1024 * 1024, file.size))  # Read up to 1MB
            file.seek(0)
            
            # Check for embedded objects or forms in PDFs (potential security risk)
            if file.name.lower().endswith('.pdf'):
                if b'/EmbeddedFile' in content:
                    errors.append('PDF files with embedded files are not allowed for legal documents')
                if b'/AcroForm' in content:
                    errors.append('PDF files with forms are not allowed for legal documents')
        
        except Exception as e:
            errors.append(f'Legal file validation error: {str(e)}')
    
    @classmethod
    def calculate_file_hash(cls, file: UploadedFile) -> str:
        """Calculate SHA-256 hash of file content"""
        file.seek(0)
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)
        return file_hash
    
    @classmethod
    def generate_secure_filename(cls, original_filename: str, file_hash: str) -> str:
        """Generate a secure filename"""
        # Sanitize original filename
        name, ext = os.path.splitext(original_filename)
        safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        
        # Generate unique filename with timestamp and hash
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        hash_prefix = file_hash[:8]
        
        return f"{safe_name}_{timestamp}_{hash_prefix}{ext}"
    
    @classmethod
    def generate_secure_upload_path(
        cls, 
        category: str, 
        user_id: Optional[int] = None, 
        entity_id: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """Generate secure upload path with proper isolation"""
        # Base path by category
        base_paths = {
            'image': 'images',
            'audio': 'audio',
            'document': 'documents',
            'financial': 'financial',
            'contract': 'contracts'
        }
        
        base_path = base_paths.get(category, 'uploads')
        
        # Add user isolation if provided
        if user_id:
            base_path = f"{base_path}/users/{user_id}"
        
        # Add entity isolation if provided
        if entity_id:
            base_path = f"{base_path}/{entity_id}"
        
        # Add date-based organization
        date_path = timezone.now().strftime('%Y/%m')
        base_path = f"{base_path}/{date_path}"
        
        # Add filename if provided
        if filename:
            base_path = f"{base_path}/{filename}"
        
        return base_path
    
    @classmethod
    def scan_file_for_threats(cls, file_path: str) -> Dict[str, Any]:
        """
        Scan file for security threats
        
        Args:
            file_path: Path to the file to scan
            
        Returns:
            Dict with scan results
        """
        scan_result = {
            'is_safe': True,
            'threats_found': [],
            'scan_time': timezone.now().isoformat(),
            'scan_details': {
                'file_size': 0,
                'patterns_checked': len(cls.MALWARE_PATTERNS),
                'signature_validation': True
            }
        }
        
        try:
            file_size = os.path.getsize(file_path)
            scan_result['scan_details']['file_size'] = file_size
            
            with open(file_path, 'rb') as f:
                # Read content for analysis
                content = f.read(min(1024 * 1024, file_size))  # Read up to 1MB
                content_lower = content.lower()
                
                # Check for malware patterns
                for pattern in cls.MALWARE_PATTERNS:
                    if pattern in content_lower:
                        scan_result['is_safe'] = False
                        scan_result['threats_found'].append(f'Malware pattern detected: {pattern.decode("utf-8", errors="ignore")}')
                
                # Check for executable signatures
                if content.startswith(b'MZ') or content.startswith(b'\x7fELF'):
                    scan_result['is_safe'] = False
                    scan_result['threats_found'].append('Executable file signature detected')
                
                # Check file entropy (high entropy might indicate encryption/packing)
                entropy = cls._calculate_entropy(content[:1024])  # Check first 1KB
                if entropy > 7.5:  # High entropy threshold
                    scan_result['threats_found'].append(f'High entropy detected: {entropy:.2f} (possible packed/encrypted content)')
        
        except Exception as e:
            scan_result['is_safe'] = False
            scan_result['threats_found'].append(f'Scan error: {str(e)}')
            scan_result['scan_details']['signature_validation'] = False
        
        return scan_result
    
    @classmethod
    def _calculate_entropy(cls, data: bytes) -> float:
        """Calculate Shannon entropy of data"""
        if not data:
            return 0
        
        # Count byte frequencies
        byte_counts = [0] * 256
        for byte in data:
            byte_counts[byte] += 1
        
        # Calculate entropy
        entropy = 0
        data_len = len(data)
        for count in byte_counts:
            if count > 0:
                probability = count / data_len
                entropy -= probability * (probability.bit_length() - 1)
        
        return entropy
    
    @classmethod
    @transaction.atomic
    def process_secure_upload(
        cls,
        file: UploadedFile,
        category: str,
        user,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a secure file upload with comprehensive validation and logging
        
        Args:
            file: The uploaded file
            category: File category
            user: User uploading the file
            entity_type: Type of entity the file belongs to
            entity_id: ID of the entity the file belongs to
            additional_context: Additional context for processing
            
        Returns:
            Dict with processing results
        """
        # Validate file
        validation_result = cls.validate_file(file, category, user, additional_context)
        
        # Create temporary file for scanning
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            file.seek(0)
            temp_file.write(file.read())
            temp_file_path = temp_file.name
        
        try:
            # Scan for threats
            scan_result = cls.scan_file_for_threats(temp_file_path)
            
            if not scan_result['is_safe']:
                # Log security threat
                AuditLog.objects.create(
                    user=user,
                    action='file_security_threat_detected',
                    resource_type='FileUpload',
                    resource_id=validation_result['file_hash'][:16],
                    request_data={
                        'filename': file.name,
                        'category': category,
                        'entity_type': entity_type,
                        'entity_id': entity_id,
                        'threats': scan_result['threats_found'],
                        'file_hash': validation_result['file_hash'],
                        'additional_context': additional_context or {}
                    }
                )
                raise ValidationError(f'Security threats detected: {"; ".join(scan_result["threats_found"][:3])}')
            
            # Log successful processing
            AuditLog.objects.create(
                user=user,
                action='file_upload_processed_securely',
                resource_type='FileUpload',
                resource_id=validation_result['file_hash'][:16],
                request_data={
                    'filename': file.name,
                    'category': category,
                    'entity_type': entity_type,
                    'entity_id': entity_id,
                    'file_size': file.size,
                    'file_hash': validation_result['file_hash'],
                    'scan_result': {
                        'is_safe': scan_result['is_safe'],
                        'threats_count': len(scan_result['threats_found']),
                        'scan_time': scan_result['scan_time']
                    },
                    'additional_context': additional_context or {}
                }
            )
            
            return {
                'success': True,
                'file_hash': validation_result['file_hash'],
                'validation_result': validation_result,
                'scan_result': {
                    'is_safe': scan_result['is_safe'],
                    'threats_count': len(scan_result['threats_found']),
                    'scan_time': scan_result['scan_time']
                },
                'processed_at': timezone.now().isoformat()
            }
        
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass


# Convenience functions for specific file types
def validate_image_upload(file: UploadedFile, user=None, **kwargs) -> Dict[str, Any]:
    """Validate image file upload"""
    return UnifiedFileSecurityService.validate_file(file, 'image', user, kwargs)


def validate_audio_upload(file: UploadedFile, user=None, **kwargs) -> Dict[str, Any]:
    """Validate audio file upload"""
    return UnifiedFileSecurityService.validate_file(file, 'audio', user, kwargs)


def validate_document_upload(file: UploadedFile, user=None, **kwargs) -> Dict[str, Any]:
    """Validate document file upload"""
    return UnifiedFileSecurityService.validate_file(file, 'document', user, kwargs)


def validate_financial_upload(file: UploadedFile, user=None, **kwargs) -> Dict[str, Any]:
    """Validate financial file upload"""
    return UnifiedFileSecurityService.validate_file(file, 'financial', user, kwargs)


def validate_contract_upload(file: UploadedFile, user=None, **kwargs) -> Dict[str, Any]:
    """Validate contract file upload"""
    return UnifiedFileSecurityService.validate_file(file, 'contract', user, kwargs)