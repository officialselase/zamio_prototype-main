"""
Celery tasks for royalty file processing and security
"""
import os
import logging
from celery import shared_task
from django.utils import timezone
from django.db import models
from accounts.models import AuditLog

logger = logging.getLogger(__name__)


@shared_task
def scan_financial_files_for_security_threats():
    """
    Periodic task to scan stored financial files for security threats and integrity issues
    """
    from .services.file_security_service import RoyaltyFileSecurityService
    from .services.encryption_service import RoyaltyFileEncryption
    
    scan_results = {
        'files_scanned': 0,
        'threats_found': 0,
        'integrity_failures': 0,
        'scan_errors': 0,
        'files_quarantined': 0,
        'scan_start_time': timezone.now().isoformat()
    }
    
    try:
        # Get financial file upload records from the last 30 days
        cutoff_time = timezone.now() - timezone.timedelta(days=30)
        
        financial_uploads = AuditLog.objects.filter(
            action='financial_file_uploaded',
            created_at__gte=cutoff_time
        ).order_by('-created_at')[:100]  # Limit to 100 most recent files
        
        for upload_log in financial_uploads:
            try:
                upload_data = upload_log.request_data
                stored_path = upload_data.get('stored_path')
                expected_hash = upload_data.get('file_hash')
                encrypted = upload_data.get('encrypted', False)
                upload_id = upload_log.resource_id
                
                if not stored_path or not os.path.exists(stored_path):
                    # Log missing file
                    AuditLog.objects.create(
                        user=None,
                        action='financial_file_missing',
                        resource_type='FinancialFile',
                        resource_id=upload_id,
                        request_data={
                            'stored_path': stored_path,
                            'upload_date': upload_log.created_at.isoformat(),
                            'scan_date': timezone.now().isoformat()
                        }
                    )
                    scan_results['scan_errors'] += 1
                    continue
                
                # Verify file integrity
                integrity_ok = True
                if encrypted:
                    # For encrypted files, decrypt temporarily to verify
                    temp_path = stored_path.replace('.enc', '.scan_tmp')
                    try:
                        if RoyaltyFileEncryption.decrypt_file(stored_path, temp_path):
                            integrity_ok = RoyaltyFileEncryption.verify_file_integrity(temp_path, expected_hash)
                            # Scan the decrypted file for threats
                            scan_result = RoyaltyFileSecurityService.scan_financial_file_for_malware(temp_path)
                            os.unlink(temp_path)  # Clean up
                        else:
                            integrity_ok = False
                            scan_result = {'is_safe': False, 'threats_found': ['Decryption failed']}
                    except Exception as e:
                        integrity_ok = False
                        scan_result = {'is_safe': False, 'threats_found': [f'Decryption error: {str(e)}']}
                        if os.path.exists(temp_path):
                            os.unlink(temp_path)
                else:
                    integrity_ok = RoyaltyFileEncryption.verify_file_integrity(stored_path, expected_hash)
                    scan_result = RoyaltyFileSecurityService.scan_financial_file_for_malware(stored_path)
                
                scan_results['files_scanned'] += 1
                
                # Handle integrity failures
                if not integrity_ok:
                    scan_results['integrity_failures'] += 1
                    AuditLog.objects.create(
                        user=None,
                        action='financial_file_integrity_failure',
                        resource_type='FinancialFile',
                        resource_id=upload_id,
                        request_data={
                            'filename': upload_data.get('filename'),
                            'partner_id': upload_data.get('partner_id'),
                            'expected_hash': expected_hash,
                            'scan_date': timezone.now().isoformat(),
                            'encrypted': encrypted
                        }
                    )
                
                # Handle security threats
                if not scan_result['is_safe']:
                    scan_results['threats_found'] += 1
                    
                    # Log security threat
                    AuditLog.objects.create(
                        user=None,
                        action='financial_file_security_threat',
                        resource_type='FinancialFile',
                        resource_id=upload_id,
                        request_data={
                            'filename': upload_data.get('filename'),
                            'partner_id': upload_data.get('partner_id'),
                            'threats': scan_result['threats_found'],
                            'scan_details': scan_result.get('scan_details', {}),
                            'scan_date': timezone.now().isoformat()
                        }
                    )
                    
                    # Quarantine the file (rename with .quarantine extension)
                    try:
                        quarantine_path = f"{stored_path}.quarantine"
                        os.rename(stored_path, quarantine_path)
                        scan_results['files_quarantined'] += 1
                        
                        AuditLog.objects.create(
                            user=None,
                            action='financial_file_quarantined',
                            resource_type='FinancialFile',
                            resource_id=upload_id,
                            request_data={
                                'original_path': stored_path,
                                'quarantine_path': quarantine_path,
                                'reason': 'Security threats detected during periodic scan',
                                'threats': scan_result['threats_found'][:5]  # Limit to first 5 threats
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to quarantine file {stored_path}: {str(e)}")
                
            except Exception as e:
                scan_results['scan_errors'] += 1
                logger.error(f"Error scanning financial file {upload_log.resource_id}: {str(e)}")
        
        scan_results['scan_end_time'] = timezone.now().isoformat()
        scan_results['scan_duration_seconds'] = (
            timezone.now() - timezone.datetime.fromisoformat(scan_results['scan_start_time'].replace('Z', '+00:00'))
        ).total_seconds()
        
        # Log scan completion
        AuditLog.objects.create(
            user=None,
            action='financial_files_security_scan_completed',
            resource_type='System',
            resource_id='periodic_scan',
            request_data=scan_results
        )
        
        return scan_results
        
    except Exception as e:
        logger.error(f"Financial files security scan failed: {str(e)}")
        scan_results['scan_error'] = str(e)
        scan_results['scan_end_time'] = timezone.now().isoformat()
        
        # Log scan failure
        AuditLog.objects.create(
            user=None,
            action='financial_files_security_scan_failed',
            resource_type='System',
            resource_id='periodic_scan',
            request_data=scan_results
        )
        
        return scan_results


@shared_task
def cleanup_old_financial_files():
    """
    Clean up old financial files based on retention policy
    """
    from django.conf import settings
    
    # Default retention period: 7 years for financial data
    retention_days = getattr(settings, 'FINANCIAL_FILE_RETENTION_DAYS', 7 * 365)
    cutoff_time = timezone.now() - timezone.timedelta(days=retention_days)
    
    cleanup_results = {
        'files_deleted': 0,
        'files_archived': 0,
        'cleanup_errors': 0,
        'cleanup_start_time': timezone.now().isoformat()
    }
    
    try:
        # Find old financial file uploads
        old_uploads = AuditLog.objects.filter(
            action='financial_file_uploaded',
            created_at__lt=cutoff_time
        )
        
        for upload_log in old_uploads:
            try:
                upload_data = upload_log.request_data
                stored_path = upload_data.get('stored_path')
                
                if stored_path and os.path.exists(stored_path):
                    # Archive or delete based on policy
                    archive_path = stored_path.replace('/secure/', '/archived/')
                    archive_dir = os.path.dirname(archive_path)
                    os.makedirs(archive_dir, exist_ok=True)
                    
                    # Move to archive
                    os.rename(stored_path, archive_path)
                    cleanup_results['files_archived'] += 1
                    
                    # Log archival
                    AuditLog.objects.create(
                        user=None,
                        action='financial_file_archived',
                        resource_type='FinancialFile',
                        resource_id=upload_log.resource_id,
                        request_data={
                            'original_path': stored_path,
                            'archive_path': archive_path,
                            'upload_date': upload_log.created_at.isoformat(),
                            'archive_date': timezone.now().isoformat()
                        }
                    )
                
            except Exception as e:
                cleanup_results['cleanup_errors'] += 1
                logger.error(f"Error cleaning up financial file {upload_log.resource_id}: {str(e)}")
        
        cleanup_results['cleanup_end_time'] = timezone.now().isoformat()
        
        # Log cleanup completion
        AuditLog.objects.create(
            user=None,
            action='financial_files_cleanup_completed',
            resource_type='System',
            resource_id='periodic_cleanup',
            request_data=cleanup_results
        )
        
        return cleanup_results
        
    except Exception as e:
        logger.error(f"Financial files cleanup failed: {str(e)}")
        cleanup_results['cleanup_error'] = str(e)
        cleanup_results['cleanup_end_time'] = timezone.now().isoformat()
        
        return cleanup_results


@shared_task
def generate_financial_security_report():
    """
    Generate periodic security report for financial file operations
    """
    report_data = {
        'report_period_days': 30,
        'report_generated_at': timezone.now().isoformat()
    }
    
    try:
        # Get data for the last 30 days
        cutoff_time = timezone.now() - timezone.timedelta(days=30)
        
        # Count uploads by category
        uploads = AuditLog.objects.filter(
            action='financial_file_uploaded',
            created_at__gte=cutoff_time
        )
        
        report_data['total_uploads'] = uploads.count()
        report_data['uploads_by_category'] = {}
        
        for upload in uploads:
            category = upload.request_data.get('file_category', 'unknown')
            report_data['uploads_by_category'][category] = report_data['uploads_by_category'].get(category, 0) + 1
        
        # Count security incidents
        threats = AuditLog.objects.filter(
            action__in=['financial_file_threat_detected', 'financial_file_security_threat'],
            created_at__gte=cutoff_time
        )
        
        report_data['security_incidents'] = threats.count()
        report_data['files_quarantined'] = AuditLog.objects.filter(
            action='financial_file_quarantined',
            created_at__gte=cutoff_time
        ).count()
        
        # Count integrity failures
        report_data['integrity_failures'] = AuditLog.objects.filter(
            action='financial_file_integrity_failure',
            created_at__gte=cutoff_time
        ).count()
        
        # Count processing errors
        report_data['processing_errors'] = AuditLog.objects.filter(
            action='financial_file_processing_failed',
            created_at__gte=cutoff_time
        ).count()
        
        # Log the report
        AuditLog.objects.create(
            user=None,
            action='financial_security_report_generated',
            resource_type='System',
            resource_id='security_report',
            request_data=report_data
        )
        
        return report_data
        
    except Exception as e:
        logger.error(f"Financial security report generation failed: {str(e)}")
        report_data['report_error'] = str(e)
        return report_data