"""File upload service for handling secure file operations"""
import logging
import os
import hashlib
import mimetypes
from typing import Dict, Any, Optional
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
from django.utils import timezone
from accounts.models import KYCDocument, User


logger = logging.getLogger(__name__)


class FileUploadService:
    """Service for handling secure file uploads with validation and processing"""
    
    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        'image': 5 * 1024 * 1024,  # 5MB
        'document': 10 * 1024 * 1024,  # 10MB
    }
    
    # Allowed file types
    ALLOWED_MIME_TYPES = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    }
    
    # Dangerous file extensions to block
    BLOCKED_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl'
    }
    
    @classmethod
    def validate_file(cls, file: UploadedFile) -> Dict[str, Any]:
        """
        Comprehensive file validation
        
        Args:
            file: The uploaded file to validate
            
        Returns:
            Dict containing validation results and file metadata
            
        Raises:
            ValidationError: If file fails validation
        """
        errors = []
        
        # Check file size
        file_category = cls._get_file_category(file)
        max_size = cls.MAX_FILE_SIZES.get(file_category, cls.MAX_FILE_SIZES['document'])
        
        if file.size > max_size:
            errors.append(f'File size ({file.size} bytes) exceeds maximum allowed size ({max_size} bytes)')
        
        # Check file type
        content_type = file.content_type or mimetypes.guess_type(file.name)[0]
        if content_type not in cls.ALLOWED_MIME_TYPES:
            errors.append(f'File type {content_type} is not allowed')
        
        # Check file extension
        _, ext = os.path.splitext(file.name.lower())
        if ext in cls.BLOCKED_EXTENSIONS:
            errors.append(f'File extension {ext} is not allowed for security reasons')
        
        # Check for null bytes (potential security issue)
        if b'\x00' in file.name.encode('utf-8', errors='ignore'):
            errors.append('File name contains invalid characters')
        
        if errors:
            raise ValidationError(errors)
        
        return {
            'valid': True,
            'content_type': content_type,
            'size': file.size,
            'category': file_category,
            'extension': ext
        }
    
    @classmethod
    def _get_file_category(cls, file: UploadedFile) -> str:
        """Determine file category based on content type"""
        content_type = file.content_type or mimetypes.guess_type(file.name)[0]
        if content_type and content_type.startswith('image/'):
            return 'image'
        return 'document'
    
    @classmethod
    def calculate_file_hash(cls, file: UploadedFile) -> str:
        """Calculate SHA-256 hash of file content"""
        file.seek(0)
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)
        return file_hash
    
    @classmethod
    def upload_kyc_document(
        cls, 
        user: User, 
        document_type: str, 
        file: UploadedFile,
        notes: Optional[str] = None
    ) -> KYCDocument:
        """
        Upload and process a KYC document with enhanced security
        
        Args:
            user: The user uploading the document
            document_type: Type of document being uploaded
            file: The uploaded file
            notes: Optional notes about the document
            
        Returns:
            KYCDocument instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate the file
        validation_result = cls.validate_file(file)
        
        # Check if document type is valid
        valid_types = [choice[0] for choice in KYCDocument.DOCUMENT_TYPES]
        if document_type not in valid_types:
            raise ValidationError(f'Invalid document type: {document_type}')
        
        # Calculate file hash for duplicate detection
        file_hash = cls.calculate_file_hash(file)

        existing_doc_same_type = (
            KYCDocument.objects
            .filter(user=user, document_type=document_type)
            .order_by('-uploaded_at')
            .first()
        )

        # If the user is re-uploading the exact same file for the same document type,
        # treat it as an idempotent success instead of raising a duplicate error.
        if existing_doc_same_type and existing_doc_same_type.file_hash == file_hash:
            if existing_doc_same_type.file:
                existing_doc_same_type.file.delete(save=False)

            existing_doc_same_type.file = file
            existing_doc_same_type.original_filename = file.name
            existing_doc_same_type.file_size = file.size
            existing_doc_same_type.content_type = validation_result['content_type']
            existing_doc_same_type.status = 'uploaded'
            existing_doc_same_type.uploaded_at = timezone.now()
            if notes is not None:
                existing_doc_same_type.notes = notes or ''
            existing_doc_same_type.save()

            cls._update_user_kyc_status(user)
            return existing_doc_same_type

        # Check for duplicate files that belong to a different document slot or user
        duplicate_for_other_user = (
            KYCDocument.objects
            .filter(file_hash=file_hash)
            .exclude(id=getattr(existing_doc_same_type, 'id', None))
            .exclude(user=user)
            .exists()
        )
        if duplicate_for_other_user:
            logger.warning(
                "Duplicate KYC upload detected for hash %s on user %s; allowing reuse across accounts",
                file_hash,
                user.id,
            )

        # Perform basic malware scan
        cls._scan_file_content(file)

        if existing_doc_same_type:
            # Replace the existing document in place so the unique file hash constraint
            # remains satisfied while refreshing metadata for the new upload.
            if existing_doc_same_type.file:
                existing_doc_same_type.file.delete(save=False)

            existing_doc_same_type.file = file
            existing_doc_same_type.file_hash = file_hash
            existing_doc_same_type.original_filename = file.name
            existing_doc_same_type.file_size = file.size
            existing_doc_same_type.content_type = validation_result['content_type']
            existing_doc_same_type.status = 'uploaded'
            if notes is not None:
                existing_doc_same_type.notes = notes or ''
            existing_doc_same_type.uploaded_at = timezone.now()
            existing_doc_same_type.save()

            cls._update_user_kyc_status(user)
            return existing_doc_same_type

        # Create new document record
        kyc_document = KYCDocument.objects.create(
            user=user,
            document_type=document_type,
            file=file,
            original_filename=file.name,
            file_size=file.size,
            file_hash=file_hash,
            content_type=validation_result['content_type'],
            status='uploaded',
            notes=notes or ''
        )

        # Update user's KYC status
        cls._update_user_kyc_status(user)

        return kyc_document
    
    @classmethod
    def _update_user_kyc_status(cls, user: User):
        """Update user's overall KYC status based on uploaded documents"""
        user_docs = KYCDocument.objects.filter(user=user)
        
        documents_payload = {}
        for doc in user_docs:
            documents_payload[doc.document_type] = {
                'document_id': doc.id,
                'status': doc.status,
                'uploaded_at': doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                'filename': doc.original_filename,
                'content_type': doc.content_type,
                'file_size': doc.file_size,
            }

        if not user_docs.exists():
            user.kyc_status = 'pending'
        elif user_docs.filter(status='approved').count() >= 2:  # Require at least 2 approved docs
            user.kyc_status = 'verified'
        elif user_docs.filter(status='rejected').exists():
            user.kyc_status = 'rejected'
        else:
            user.kyc_status = 'incomplete'

        user.kyc_documents = documents_payload
        user.save(update_fields=['kyc_status', 'kyc_documents'])
    
    @classmethod
    def get_user_documents(cls, user: User) -> Dict[str, Any]:
        """Get all documents for a user with status information"""
        documents = KYCDocument.objects.filter(user=user).order_by('-uploaded_at')
        
        doc_data = []
        for doc in documents:
            doc_data.append({
                'id': doc.id,
                'document_type': doc.document_type,
                'document_type_display': doc.get_document_type_display(),
                'status': doc.status,
                'status_display': doc.get_status_display(),
                'original_filename': doc.original_filename,
                'file_size': doc.file_size,
                'uploaded_at': doc.uploaded_at,
                'notes': doc.notes,
                'secure_url': doc.get_secure_url() if doc.status == 'approved' else None
            })
        
        return {
            'documents': doc_data,
            'kyc_status': user.kyc_status,
            'total_documents': len(doc_data),
            'approved_documents': len([d for d in doc_data if d['status'] == 'approved'])
        }
    
    @classmethod
    def delete_document(cls, user: User, document_id: int) -> bool:
        """
        Delete a document (only if not approved)
        
        Args:
            user: The user who owns the document
            document_id: ID of the document to delete
            
        Returns:
            True if deleted, False if not allowed
        """
        try:
            document = KYCDocument.objects.get(id=document_id, user=user)
            
            # Don't allow deletion of approved documents
            if document.status == 'approved':
                return False
            
            # Delete the file from storage
            if document.file:
                document.file.delete(save=False)
            
            # Delete the record
            document.delete()
            
            # Update user's KYC status
            cls._update_user_kyc_status(user)
            
            return True
        except KYCDocument.DoesNotExist:
            return False
    
    @classmethod
    def _scan_file_content(cls, file: UploadedFile):
        """
        Perform basic malware scanning on file content
        
        Args:
            file: The uploaded file to scan
            
        Raises:
            ValidationError: If malicious content is detected
        """
        file.seek(0)
        content = file.read(10240)  # Read first 10KB
        file.seek(0)
        
        # Check for common malware patterns
        malware_patterns = [
            b'eval(',
            b'exec(',
            b'system(',
            b'shell_exec(',
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'data:text/html',
            b'<?php',
            b'<%',
            b'#!/bin/sh',
            b'#!/bin/bash'
        ]
        
        content_lower = content.lower()
        for pattern in malware_patterns:
            if pattern in content_lower:
                raise ValidationError(f'File contains potentially malicious content: {pattern.decode("utf-8", errors="ignore")}')
        
        # Check for suspicious file headers
        if content.startswith(b'MZ'):  # Windows executable
            raise ValidationError('Executable files are not allowed')
        
        if content.startswith(b'\x7fELF'):  # Linux executable
            raise ValidationError('Executable files are not allowed')
        
        if content.startswith(b'#!/'):  # Shell script
            raise ValidationError('Script files are not allowed')
        
        # Check for embedded files (ZIP, RAR signatures)
        if content.startswith(b'PK\x03\x04') or content.startswith(b'PK\x05\x06'):  # ZIP
            raise ValidationError('Archive files are not allowed')
        
        if content.startswith(b'Rar!'):  # RAR
            raise ValidationError('Archive files are not allowed')
    
    @classmethod
    def get_file_metadata(cls, file: UploadedFile) -> Dict[str, Any]:
        """
        Extract comprehensive metadata from uploaded file
        
        Args:
            file: The uploaded file
            
        Returns:
            Dict containing file metadata
        """
        metadata = {
            'original_name': file.name,
            'size': file.size,
            'content_type': file.content_type,
            'charset': getattr(file, 'charset', None),
            'upload_timestamp': timezone.now().isoformat(),
        }
        
        # Calculate file hash
        metadata['hash'] = cls.calculate_file_hash(file)
        
        # Get file extension
        _, ext = os.path.splitext(file.name.lower())
        metadata['extension'] = ext
        
        # Determine file category
        metadata['category'] = cls._get_file_category(file)
        
        # Basic file analysis
        file.seek(0)
        first_bytes = file.read(512)
        file.seek(0)
        
        # Check if it's a text file
        try:
            first_bytes.decode('utf-8')
            metadata['is_text'] = True
        except UnicodeDecodeError:
            metadata['is_text'] = False
        
        # Check for common file signatures
        if first_bytes.startswith(b'\xff\xd8\xff'):
            metadata['detected_type'] = 'JPEG'
        elif first_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            metadata['detected_type'] = 'PNG'
        elif first_bytes.startswith(b'%PDF'):
            metadata['detected_type'] = 'PDF'
        elif first_bytes.startswith(b'GIF8'):
            metadata['detected_type'] = 'GIF'
        else:
            metadata['detected_type'] = 'Unknown'
        
        return metadata