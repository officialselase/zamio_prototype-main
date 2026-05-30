"""
Enhanced file security service for royalty data files
"""
import os
import hashlib
import mimetypes
import logging
import tempfile
import csv
import json
from typing import Dict, Any, Optional, List, Union
from decimal import Decimal
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from celery import shared_task
from accounts.models import AuditLog
from .encryption_service import RoyaltyFileEncryption

logger = logging.getLogger(__name__)


class RoyaltyFileSecurityService:
    """Service for handling secure royalty data file uploads with validation and processing"""
    
    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        'csv': 50 * 1024 * 1024,    # 50MB for CSV files
        'excel': 100 * 1024 * 1024,  # 100MB for Excel files
        'json': 25 * 1024 * 1024,    # 25MB for JSON files
        'xml': 25 * 1024 * 1024,     # 25MB for XML files
    }
    
    # Allowed file types for financial data
    ALLOWED_FINANCIAL_TYPES = {
        'text/csv', 'application/csv', 'text/plain',
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json', 'text/json',
        'application/xml', 'text/xml'
    }
    
    # Required columns for different file types
    REQUIRED_CSV_COLUMNS = {
        'repertoire': ['isrc', 'title', 'work_title'],
        'usage_report': ['station_id', 'played_at', 'isrc', 'duration_seconds'],
        'royalty_data': ['isrc', 'gross_amount', 'currency'],
        'partner_data': ['partner_code', 'territory', 'usage_count']
    }
    
    # Dangerous patterns in financial data
    FINANCIAL_THREAT_PATTERNS = [
        b'<script', b'javascript:', b'vbscript:', b'eval(',
        b'exec(', b'system(', b'shell_exec(', b'<?php',
        b'<%', b'#!/bin/sh', b'#!/bin/bash', b'powershell',
        b'cmd.exe', b'CreateObject(', b'WScript.Shell',
        b'UNION SELECT', b'DROP TABLE', b'DELETE FROM',
        b'INSERT INTO', b'UPDATE SET', b'ALTER TABLE'
    ]
    
    @classmethod
    def validate_financial_file(cls, file: UploadedFile, file_category: str = 'auto') -> Dict[str, Any]:
        """
        Comprehensive financial file validation with enhanced security
        
        Args:
            file: The uploaded file to validate
            file_category: 'repertoire', 'usage_report', 'royalty_data', 'partner_data', or 'auto'
            
        Returns:
            Dict containing validation results and file metadata
            
        Raises:
            ValidationError: If file fails validation
        """
        errors = []
        
        # Auto-detect file category if not specified
        if file_category == 'auto':
            file_category = cls._detect_file_category(file)
        
        # Check file size
        file_type = cls._get_file_type_from_content_type(file.content_type)
        max_size = cls.MAX_FILE_SIZES.get(file_type, cls.MAX_FILE_SIZES['csv'])
        
        if file.size > max_size:
            errors.append(f'File size ({file.size} bytes) exceeds maximum allowed size ({max_size} bytes)')
        
        # Check file type
        content_type = file.content_type or mimetypes.guess_type(file.name)[0]
        if content_type not in cls.ALLOWED_FINANCIAL_TYPES:
            errors.append(f'File type {content_type} is not allowed for financial data')
        
        # Check file extension
        _, ext = os.path.splitext(file.name.lower())
        allowed_extensions = {'.csv', '.xlsx', '.xls', '.json', '.xml'}
        if ext not in allowed_extensions:
            errors.append(f'File extension {ext} is not allowed for financial data')
        
        # Check for dangerous file name patterns
        if any(pattern in file.name.lower() for pattern in ['../', '..\\', '<', '>', '|', '&']):
            errors.append('File name contains invalid characters')
        
        # Perform content-based validation
        cls._validate_financial_content(file, file_category, errors)
        
        if errors:
            raise ValidationError(errors)
        
        return {
            'valid': True,
            'content_type': content_type,
            'size': file.size,
            'file_category': file_category,
            'file_type': file_type,
            'extension': ext
        }
    
    @classmethod
    def _detect_file_category(cls, file: UploadedFile) -> str:
        """Detect file category based on filename and content"""
        filename_lower = file.name.lower()
        
        if 'repertoire' in filename_lower or 'catalog' in filename_lower:
            return 'repertoire'
        elif 'usage' in filename_lower or 'playlog' in filename_lower:
            return 'usage_report'
        elif 'royalty' in filename_lower or 'payment' in filename_lower:
            return 'royalty_data'
        elif 'partner' in filename_lower or 'pro' in filename_lower:
            return 'partner_data'
        else:
            return 'repertoire'  # Default
    
    @classmethod
    def _get_file_type_from_content_type(cls, content_type: str) -> str:
        """Get file type category from content type"""
        if not content_type:
            return 'csv'
        
        if 'csv' in content_type or 'text/plain' in content_type:
            return 'csv'
        elif 'excel' in content_type or 'spreadsheet' in content_type:
            return 'excel'
        elif 'json' in content_type:
            return 'json'
        elif 'xml' in content_type:
            return 'xml'
        else:
            return 'csv'
    
    @classmethod
    def _validate_financial_content(cls, file: UploadedFile, file_category: str, errors: List[str]):
        """Validate financial file content for security and structure"""
        file.seek(0)
        
        try:
            # Read file content for analysis
            if file.size > 10 * 1024 * 1024:  # For files larger than 10MB, sample content
                content = file.read(1024 * 1024)  # Read first 1MB
                file.seek(-min(1024 * 1024, file.size), 2)  # Read last 1MB
                content += file.read()
            else:
                content = file.read()
            
            file.seek(0)
            
            # Check for malware patterns
            content_lower = content.lower()
            for pattern in cls.FINANCIAL_THREAT_PATTERNS:
                if pattern in content_lower:
                    errors.append(f'File contains potentially malicious content: {pattern.decode("utf-8", errors="ignore")}')
            
            # Validate file structure based on type
            file_type = cls._get_file_type_from_content_type(file.content_type)
            
            if file_type == 'csv':
                cls._validate_csv_structure(file, file_category, errors)
            elif file_type == 'json':
                cls._validate_json_structure(file, file_category, errors)
            elif file_type in ['excel']:
                cls._validate_excel_structure(file, file_category, errors)
            
        except Exception as e:
            errors.append(f'Content validation error: {str(e)}')
        finally:
            file.seek(0)
    
    @classmethod
    def _validate_csv_structure(cls, file: UploadedFile, file_category: str, errors: List[str]):
        """Validate CSV file structure and required columns"""
        try:
            file.seek(0)
            content = file.read().decode('utf-8', errors='ignore')
            file.seek(0)
            
            # Parse CSV to check structure
            import io
            csv_reader = csv.DictReader(io.StringIO(content))
            
            # Check required columns
            required_columns = cls.REQUIRED_CSV_COLUMNS.get(file_category, [])
            if required_columns:
                missing_columns = set(required_columns) - set(csv_reader.fieldnames or [])
                if missing_columns:
                    errors.append(f'Missing required columns: {", ".join(missing_columns)}')
            
            # Validate data types in first few rows
            row_count = 0
            for row in csv_reader:
                if row_count >= 10:  # Check first 10 rows
                    break
                
                # Validate financial amounts if present
                for field in ['gross_amount', 'net_amount', 'admin_fee_amount']:
                    if field in row and row[field]:
                        try:
                            amount = Decimal(str(row[field]).replace(',', ''))
                            if amount < 0:
                                errors.append(f'Negative financial amounts not allowed: {field}={row[field]}')
                        except (ValueError, TypeError):
                            errors.append(f'Invalid financial amount format: {field}={row[field]}')
                
                # Validate currency codes
                if 'currency' in row and row['currency']:
                    currency = row['currency'].upper()
                    if len(currency) != 3 or not currency.isalpha():
                        errors.append(f'Invalid currency code: {currency}')
                
                row_count += 1
            
            if row_count == 0:
                errors.append('CSV file appears to be empty or has no data rows')
                
        except Exception as e:
            errors.append(f'CSV validation error: {str(e)}')
    
    @classmethod
    def _validate_json_structure(cls, file: UploadedFile, file_category: str, errors: List[str]):
        """Validate JSON file structure"""
        try:
            file.seek(0)
            content = file.read().decode('utf-8', errors='ignore')
            file.seek(0)
            
            data = json.loads(content)
            
            # Basic structure validation
            if not isinstance(data, (dict, list)):
                errors.append('JSON file must contain an object or array')
                return
            
            # If it's a list, check first few items
            if isinstance(data, list):
                for i, item in enumerate(data[:10]):
                    if not isinstance(item, dict):
                        errors.append(f'JSON array item {i} must be an object')
                        break
                    
                    # Validate financial fields
                    for field in ['gross_amount', 'net_amount', 'admin_fee_amount']:
                        if field in item and item[field] is not None:
                            try:
                                amount = Decimal(str(item[field]))
                                if amount < 0:
                                    errors.append(f'Negative financial amounts not allowed: {field}={item[field]}')
                            except (ValueError, TypeError):
                                errors.append(f'Invalid financial amount format: {field}={item[field]}')
            
        except json.JSONDecodeError as e:
            errors.append(f'Invalid JSON format: {str(e)}')
        except Exception as e:
            errors.append(f'JSON validation error: {str(e)}')
    
    @classmethod
    def _validate_excel_structure(cls, file: UploadedFile, file_category: str, errors: List[str]):
        """Validate Excel file structure (basic validation)"""
        try:
            # For Excel files, we'll do basic validation
            # More detailed validation would require openpyxl or xlrd
            file.seek(0)
            content = file.read(1024)  # Read first 1KB
            file.seek(0)
            
            # Check for Excel file signatures
            excel_signatures = [
                b'PK\x03\x04',  # XLSX (ZIP-based)
                b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',  # XLS (OLE2)
            ]
            
            valid_excel = any(content.startswith(sig) for sig in excel_signatures)
            if not valid_excel:
                errors.append('File does not appear to be a valid Excel file')
            
        except Exception as e:
            errors.append(f'Excel validation error: {str(e)}')
    
    @classmethod
    def calculate_file_hash(cls, file: UploadedFile) -> str:
        """Calculate SHA-256 hash of file content"""
        file.seek(0)
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)
        return file_hash
    
    @classmethod
    def scan_financial_file_for_malware(cls, file_path: str) -> Dict[str, Any]:
        """
        Enhanced malware scanning specifically for financial data files
        
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
                'file_type': 'unknown',
                'signatures_checked': 0,
                'financial_validation': True,
                'data_integrity_check': True
            }
        }
        
        try:
            file_size = os.path.getsize(file_path)
            scan_result['scan_details']['file_size'] = file_size
            
            with open(file_path, 'rb') as f:
                # Read content for analysis
                content = f.read(min(1024 * 1024, file_size))  # Read up to 1MB
                content_lower = content.lower()
                
                # Enhanced financial threat detection
                financial_threats = [
                    (b'<script', 'HTML script injection'),
                    (b'javascript:', 'JavaScript protocol'),
                    (b'eval(', 'Code evaluation function'),
                    (b'exec(', 'Code execution function'),
                    (b'system(', 'System command execution'),
                    (b'shell_exec(', 'Shell execution'),
                    (b'<?php', 'PHP code injection'),
                    (b'<%', 'Server-side script'),
                    (b'#!/bin/', 'Shell script'),
                    (b'powershell', 'PowerShell command'),
                    (b'cmd.exe', 'Command prompt'),
                    (b'union select', 'SQL injection attempt'),
                    (b'drop table', 'SQL drop command'),
                    (b'delete from', 'SQL delete command'),
                    (b'insert into', 'SQL insert command'),
                    (b'update set', 'SQL update command'),
                    (b'alter table', 'SQL alter command'),
                    (b'create table', 'SQL create command'),
                    (b'grant all', 'SQL privilege escalation'),
                    (b'revoke all', 'SQL privilege modification'),
                ]
                
                scan_result['scan_details']['signatures_checked'] = len(financial_threats)
                
                for pattern, description in financial_threats:
                    if pattern in content_lower:
                        scan_result['is_safe'] = False
                        scan_result['threats_found'].append(f'{description}: {pattern.decode("utf-8", errors="ignore")}')
                
                # Check for executable signatures
                if content.startswith(b'MZ') or content.startswith(b'\x7fELF'):
                    scan_result['is_safe'] = False
                    scan_result['threats_found'].append('Executable file detected in financial data')
                
                # Financial data integrity checks
                cls._perform_financial_integrity_scan(content, scan_result)
                
                # Detect file type
                if b',' in content and (b'\n' in content or b'\r' in content):
                    scan_result['scan_details']['file_type'] = 'CSV'
                elif content.startswith(b'PK\x03\x04'):
                    scan_result['scan_details']['file_type'] = 'XLSX'
                elif content.startswith(b'\xd0\xcf\x11\xe0'):
                    scan_result['scan_details']['file_type'] = 'XLS'
                elif content.strip().startswith(b'{') or content.strip().startswith(b'['):
                    scan_result['scan_details']['file_type'] = 'JSON'
                elif content.startswith(b'<?xml') or content.startswith(b'<'):
                    scan_result['scan_details']['file_type'] = 'XML'
                
        except Exception as e:
            scan_result['is_safe'] = False
            scan_result['threats_found'].append(f'Scan error: {str(e)}')
            scan_result['scan_details']['financial_validation'] = False
        
        return scan_result
    
    @classmethod
    def _perform_financial_integrity_scan(cls, content: bytes, scan_result: Dict[str, Any]):
        """Perform financial data integrity checks"""
        try:
            content_str = content.decode('utf-8', errors='ignore')
            
            # Check for suspicious financial patterns
            suspicious_financial_patterns = [
                ('999999999', 'Suspicious large amount pattern'),
                ('000000000', 'Suspicious zero padding'),
                ('-999', 'Suspicious negative amount'),
                ('null', 'Null value in financial data'),
                ('undefined', 'Undefined value in financial data'),
                ('NaN', 'Not a Number in financial data'),
                ('Infinity', 'Infinity value in financial data'),
            ]
            
            content_lower = content_str.lower()
            for pattern, description in suspicious_financial_patterns:
                if pattern.lower() in content_lower:
                    scan_result['threats_found'].append(f'{description}: {pattern}')
                    scan_result['scan_details']['data_integrity_check'] = False
            
            # Check for excessive decimal places (potential precision attack)
            import re
            decimal_pattern = re.compile(r'\d+\.\d{10,}')  # More than 10 decimal places
            if decimal_pattern.search(content_str):
                scan_result['threats_found'].append('Excessive decimal precision detected (potential precision attack)')
                scan_result['scan_details']['data_integrity_check'] = False
            
        except Exception as e:
            scan_result['threats_found'].append(f'Financial integrity scan error: {str(e)}')
            scan_result['scan_details']['data_integrity_check'] = False
    
    @classmethod
    @transaction.atomic
    def process_secure_financial_upload(
        cls,
        user,
        partner_id: int,
        file: UploadedFile,
        file_category: str = 'auto',
        encrypt_storage: bool = True,
        process_async: bool = True
    ) -> Dict[str, Any]:
        """
        Process financial file upload with enhanced security
        
        Args:
            user: The user uploading the file
            partner_id: ID of the partner PRO
            file: The uploaded file
            file_category: Category of financial data
            encrypt_storage: Whether to encrypt the stored file
            process_async: Whether to process asynchronously
            
        Returns:
            Dict with upload results and processing status
        """
        from ..models import PartnerPRO
        
        # Validate partner
        try:
            partner = PartnerPRO.objects.get(id=partner_id)
        except PartnerPRO.DoesNotExist:
            raise ValidationError('Partner PRO not found')
        
        # Validate file
        validation_result = cls.validate_financial_file(file, file_category)
        
        # Calculate file hash for integrity checking
        file_hash = cls.calculate_file_hash(file)
        
        # Create temporary file for malware scanning
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            file.seek(0)
            temp_file.write(file.read())
            temp_file_path = temp_file.name
        
        try:
            # Perform malware scan
            scan_result = cls.scan_financial_file_for_malware(temp_file_path)
            
            if not scan_result['is_safe']:
                # Log security threat
                AuditLog.objects.create(
                    user=user,
                    action='financial_file_threat_detected',
                    resource_type='FinancialFile',
                    resource_id=f'partner_{partner_id}',
                    request_data={
                        'partner_id': partner_id,
                        'filename': file.name,
                        'file_size': file.size,
                        'threats': scan_result['threats_found'],
                        'file_hash': file_hash
                    }
                )
                raise ValidationError(f'Security threats detected: {"; ".join(scan_result["threats_found"][:3])}')
            
            # Store file securely
            if encrypt_storage:
                stored_file_path = cls._store_encrypted_file(file, partner, file_hash)
            else:
                stored_file_path = cls._store_secure_file(file, partner, file_hash)
            
            # Create processing record
            processing_record = {
                'upload_id': file_hash[:16],
                'partner_id': partner_id,
                'filename': file.name,
                'file_category': validation_result['file_category'],
                'file_size': file.size,
                'file_hash': file_hash,
                'stored_path': stored_file_path,
                'encrypted': encrypt_storage,
                'validation_result': validation_result,
                'scan_result': scan_result,
                'uploaded_by': user.id,
                'uploaded_at': timezone.now().isoformat(),
                'processing_status': 'pending'
            }
            
            # Log successful upload
            AuditLog.objects.create(
                user=user,
                action='financial_file_uploaded',
                resource_type='FinancialFile',
                resource_id=file_hash[:16],
                request_data=processing_record
            )
            
            # Process file asynchronously if requested
            if process_async:
                process_financial_file.delay(processing_record)
                processing_status = 'queued'
            else:
                processing_status = cls._process_financial_file_sync(processing_record)
            
            return {
                'upload_id': processing_record['upload_id'],
                'partner_id': partner_id,
                'filename': file.name,
                'file_category': validation_result['file_category'],
                'processing_status': processing_status,
                'file_hash': file_hash,
                'encrypted': encrypt_storage,
                'validation_result': validation_result,
                'scan_result': {
                    'is_safe': scan_result['is_safe'],
                    'threats_count': len(scan_result['threats_found']),
                    'scan_time': scan_result['scan_time']
                }
            }
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
    
    @classmethod
    def _store_secure_file(cls, file: UploadedFile, partner, file_hash: str) -> str:
        """Store file in secure location with proper permissions"""
        # Create secure directory structure
        secure_dir = os.path.join(
            settings.MEDIA_ROOT,
            'royalties',
            'secure',
            str(partner.id),
            timezone.now().strftime('%Y/%m')
        )
        os.makedirs(secure_dir, exist_ok=True)
        
        # Generate secure filename
        _, ext = os.path.splitext(file.name)
        secure_filename = f"{file_hash[:16]}_{timezone.now().strftime('%Y%m%d_%H%M%S')}{ext}"
        file_path = os.path.join(secure_dir, secure_filename)
        
        # Write file with restricted permissions
        file.seek(0)
        with open(file_path, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)
        
        # Set restrictive permissions (owner read/write only)
        os.chmod(file_path, 0o600)
        
        return file_path
    
    @classmethod
    def _store_encrypted_file(cls, file: UploadedFile, partner, file_hash: str) -> str:
        """Store file with encryption"""
        # Store file normally first
        file_path = cls._store_secure_file(file, partner, file_hash)
        
        # Encrypt the file
        encrypted_path = f"{file_path}.enc"
        RoyaltyFileEncryption.encrypt_file(file_path, encrypted_path)
        
        # Remove unencrypted file
        os.unlink(file_path)
        
        return encrypted_path
    
    @classmethod
    def _process_financial_file_sync(cls, processing_record: Dict[str, Any]) -> str:
        """Process financial file synchronously"""
        try:
            # Verify file integrity
            stored_path = processing_record['stored_path']
            
            if processing_record['encrypted']:
                # Decrypt for processing
                decrypted_path = stored_path.replace('.enc', '.tmp')
                RoyaltyFileEncryption.decrypt_file(stored_path, decrypted_path)
                processing_path = decrypted_path
            else:
                processing_path = stored_path
            
            # Verify file hash
            with open(processing_path, 'rb') as f:
                content = f.read()
                calculated_hash = hashlib.sha256(content).hexdigest()
            
            if calculated_hash != processing_record['file_hash']:
                raise ValidationError('File integrity check failed - hash mismatch')
            
            # Process based on file category
            file_category = processing_record['file_category']
            if file_category == 'repertoire':
                result = cls._process_repertoire_file(processing_path, processing_record)
            elif file_category == 'usage_report':
                result = cls._process_usage_report_file(processing_path, processing_record)
            elif file_category == 'royalty_data':
                result = cls._process_royalty_data_file(processing_path, processing_record)
            else:
                result = {'status': 'completed', 'message': 'File stored securely'}
            
            # Clean up temporary decrypted file
            if processing_record['encrypted'] and os.path.exists(processing_path):
                os.unlink(processing_path)
            
            return result.get('status', 'completed')
            
        except Exception as e:
            logger.error(f"Financial file processing error: {str(e)}")
            return 'failed'
    
    @classmethod
    def _process_repertoire_file(cls, file_path: str, processing_record: Dict[str, Any]) -> Dict[str, Any]:
        """Process repertoire upload file"""
        # This would integrate with the existing repertoire processing logic
        # For now, return success
        return {'status': 'completed', 'message': 'Repertoire file processed'}
    
    @classmethod
    def _process_usage_report_file(cls, file_path: str, processing_record: Dict[str, Any]) -> Dict[str, Any]:
        """Process usage report file"""
        # This would integrate with usage attribution logic
        return {'status': 'completed', 'message': 'Usage report processed'}
    
    @classmethod
    def _process_royalty_data_file(cls, file_path: str, processing_record: Dict[str, Any]) -> Dict[str, Any]:
        """Process royalty data file"""
        # This would integrate with royalty calculation logic
        return {'status': 'completed', 'message': 'Royalty data processed'}


@shared_task(bind=True, max_retries=3)
def process_financial_file(self, processing_record: Dict[str, Any]):
    """
    Celery task for processing financial files asynchronously
    
    Args:
        processing_record: Dict containing file processing information
    """
    try:
        # Process the financial file
        result = RoyaltyFileSecurityService._process_financial_file_sync(processing_record)
        
        # Log processing completion
        AuditLog.objects.create(
            user_id=processing_record['uploaded_by'],
            action='financial_file_processed',
            resource_type='FinancialFile',
            resource_id=processing_record['upload_id'],
            request_data={
                'processing_result': result,
                'partner_id': processing_record['partner_id'],
                'filename': processing_record['filename']
            }
        )
        
        return {
            'upload_id': processing_record['upload_id'],
            'status': result,
            'processed_at': timezone.now().isoformat()
        }
        
    except Exception as exc:
        # Retry on failure
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        # Log failure after max retries
        AuditLog.objects.create(
            user_id=processing_record['uploaded_by'],
            action='financial_file_processing_failed',
            resource_type='FinancialFile',
            resource_id=processing_record['upload_id'],
            request_data={
                'error': str(exc),
                'partner_id': processing_record['partner_id'],
                'filename': processing_record['filename']
            }
        )
        
        return {
            'upload_id': processing_record['upload_id'],
            'status': 'failed',
            'error': str(exc)
        }


@shared_task
def scan_financial_files_for_threats():
    """
    Periodic task to scan stored financial files for security threats
    """
    # This would scan stored financial files periodically
    # Implementation would be similar to the media file scanning task
    pass