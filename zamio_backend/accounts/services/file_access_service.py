"""
File access control service for secure file serving
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
from accounts.models import KYCDocument, User, AuditLog


class FileAccessService:
    """Service for controlling access to uploaded files with security checks"""
    
    # Token expiry time in seconds (1 hour)
    TOKEN_EXPIRY = 3600
    
    @classmethod
    def generate_secure_token(cls, document_id: int, user_id: int) -> str:
        """Generate a secure token for file access"""
        timestamp = str(int(time.time()))
        message = f"{document_id}:{user_id}:{timestamp}"
        
        # Use Django's SECRET_KEY for HMAC
        secret_key = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
        
        return f"{timestamp}.{signature}"
    
    @classmethod
    def verify_secure_token(cls, token: str, document_id: int, user_id: int) -> bool:
        """Verify a secure token for file access"""
        try:
            timestamp_str, signature = token.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check if token has expired
            if time.time() - timestamp > cls.TOKEN_EXPIRY:
                return False
            
            # Regenerate expected signature
            message = f"{document_id}:{user_id}:{timestamp_str}"
            secret_key = settings.SECRET_KEY.encode('utf-8')
            expected_signature = hmac.new(secret_key, message.encode('utf-8'), hashlib.sha256).hexdigest()
            
            # Compare signatures securely
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, TypeError):
            return False
    
    @classmethod
    def check_file_access_permission(cls, user: User, document: KYCDocument) -> bool:
        """Check if user has permission to access the file"""
        # Owner can always access their files
        if document.user_id == user.id:
            return True
        
        # Admin users can access files for review
        if user.is_staff or user.admin:
            return True
        
        # Publishers can access their artists' files if there's a relationship
        if user.user_type == 'Publisher':
            from publishers.models import PublisherArtistRelationship
            try:
                PublisherArtistRelationship.objects.get(
                    publisher__user=user,
                    artist__user=document.user,
                    status='active'
                )
                return True
            except:
                pass
        
        return False
    
    @classmethod
    def serve_secure_file(
        cls, 
        user: User, 
        document_id: int, 
        token: Optional[str] = None
    ) -> HttpResponse:
        """
        Serve a file securely with access controls
        
        Args:
            user: The requesting user
            document_id: ID of the document to serve
            token: Optional secure token for additional verification
            
        Returns:
            HttpResponse with file content or error
            
        Raises:
            Http404: If document not found
            PermissionDenied: If user doesn't have access
        """
        try:
            # Get the document
            document = KYCDocument.objects.get(id=document_id)
        except KYCDocument.DoesNotExist:
            raise Http404("Document not found")
        
        # Check basic access permission
        if not cls.check_file_access_permission(user, document):
            raise PermissionDenied("You don't have permission to access this file")
        
        # Verify token if provided
        if token and not cls.verify_secure_token(token, document_id, user.id):
            raise PermissionDenied("Invalid or expired access token")
        
        # Verify file integrity
        if not document.verify_file_integrity():
            raise Http404("File integrity check failed - file may be corrupted")
        
        # Check if file exists in storage
        if not document.file or not default_storage.exists(document.file.name):
            raise Http404("File not found in storage")
        
        # Log the access
        AuditLog.objects.create(
            user=user,
            action='file_access',
            resource_type='KYCDocument',
            resource_id=str(document_id),
            request_data={
                'filename': document.original_filename,
                'access_method': 'secure_token' if token else 'direct',
                'file_size': document.file_size
            }
        )
        
        # Serve the file
        try:
            file_content = document.file.read()
            content_type = document.content_type or 'application/octet-stream'
            
            response = HttpResponse(file_content, content_type=content_type)
            
            # Set security headers
            response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
            response['Content-Length'] = len(file_content)
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            return response
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=user,
                action='file_access_error',
                resource_type='KYCDocument',
                resource_id=str(document_id),
                request_data={
                    'error': str(e),
                    'filename': document.original_filename
                }
            )
            raise Http404("Error serving file")
    
    @classmethod
    def get_secure_download_url(cls, user: User, document_id: int) -> Dict[str, Any]:
        """
        Generate a secure download URL with token
        
        Args:
            user: The requesting user
            document_id: ID of the document
            
        Returns:
            Dict with download URL and token info
        """
        try:
            document = KYCDocument.objects.get(id=document_id)
        except KYCDocument.DoesNotExist:
            raise Http404("Document not found")
        
        # Check access permission
        if not cls.check_file_access_permission(user, document):
            raise PermissionDenied("You don't have permission to access this file")
        
        # Generate secure token
        token = cls.generate_secure_token(document_id, user.id)
        
        return {
            'download_url': f'/api/accounts/secure-download/{document_id}/?token={token}',
            'token': token,
            'expires_in': cls.TOKEN_EXPIRY,
            'filename': document.original_filename,
            'file_size': document.file_size
        }
    
    @classmethod
    def cleanup_expired_tokens(cls):
        """Cleanup method for expired tokens (can be called by a periodic task)"""
        # This is a placeholder - in a real implementation, you might store tokens
        # in a database or cache for more sophisticated cleanup
        pass
    
    @classmethod
    def scan_file_for_malware(cls, file_path: str) -> Dict[str, Any]:
        """
        Basic file scanning for malware indicators
        
        Args:
            file_path: Path to the file to scan
            
        Returns:
            Dict with scan results
        """
        scan_result = {
            'is_safe': True,
            'threats_found': [],
            'scan_time': time.time()
        }
        
        try:
            with open(file_path, 'rb') as f:
                content = f.read(10240)  # Read first 10KB
                
                # Check for common malware signatures (basic patterns)
                malware_patterns = [
                    b'eval(',
                    b'exec(',
                    b'system(',
                    b'shell_exec(',
                    b'<script',
                    b'javascript:',
                    b'vbscript:',
                    b'data:text/html',
                ]
                
                for pattern in malware_patterns:
                    if pattern in content.lower():
                        scan_result['is_safe'] = False
                        scan_result['threats_found'].append(f'Suspicious pattern: {pattern.decode("utf-8", errors="ignore")}')
                
                # Check for suspicious file headers
                if content.startswith(b'MZ'):  # Windows executable
                    scan_result['is_safe'] = False
                    scan_result['threats_found'].append('Executable file detected')
                
                if content.startswith(b'#!/'):  # Shell script
                    scan_result['is_safe'] = False
                    scan_result['threats_found'].append('Shell script detected')
                    
        except Exception as e:
            scan_result['is_safe'] = False
            scan_result['threats_found'].append(f'Scan error: {str(e)}')
        
        return scan_result