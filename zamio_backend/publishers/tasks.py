"""
Celery tasks for publisher contract file management
"""
from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.conf import settings
import logging

from publishers.services.contract_security_service import ContractRetentionService
from accounts.models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def cleanup_expired_contract_files(self, dry_run=False, max_files=50):
    """
    Automated task to clean up expired contract files based on retention policy
    
    Args:
        dry_run (bool): If True, only report what would be deleted
        max_files (int): Maximum number of files to process in one run
    """
    try:
        logger.info(f"Starting contract file cleanup task (dry_run={dry_run}, max_files={max_files})")
        
        # Get files eligible for deletion
        eligible_files = ContractRetentionService.get_contracts_for_deletion()
        
        if not eligible_files:
            logger.info("No contract files are eligible for deletion")
            return {
                'status': 'completed',
                'files_processed': 0,
                'files_deleted': 0,
                'errors': 0,
                'message': 'No files eligible for deletion'
            }
        
        # Limit the number of files to process
        files_to_process = eligible_files[:max_files]
        
        logger.info(f"Found {len(eligible_files)} eligible files, processing {len(files_to_process)}")
        
        if dry_run:
            logger.info("DRY RUN - No files will actually be deleted")
            return {
                'status': 'dry_run_completed',
                'files_processed': len(files_to_process),
                'files_deleted': 0,
                'errors': 0,
                'eligible_files': files_to_process,
                'message': f'Dry run completed, {len(files_to_process)} files would be deleted'
            }
        
        # Get system user for audit logging
        try:
            system_user = User.objects.filter(is_staff=True, is_active=True).first()
            if not system_user:
                system_user = User.objects.filter(is_superuser=True, is_active=True).first()
        except Exception as e:
            logger.warning(f"Could not find system user for audit logging: {str(e)}")
            system_user = None
        
        # Process deletions
        deleted_count = 0
        error_count = 0
        
        for file_info in files_to_process:
            try:
                success = ContractRetentionService.delete_contract_file(
                    contract_id=file_info['contract_id'],
                    contract_type=file_info['contract_type'],
                    reason=f"Automated cleanup: {file_info['reason']}",
                    deleted_by=system_user
                )
                
                if success:
                    deleted_count += 1
                    logger.info(
                        f"Deleted contract file: {file_info['contract_id']} "
                        f"({file_info['contract_type']})"
                    )
                else:
                    error_count += 1
                    logger.error(
                        f"Failed to delete contract file: {file_info['contract_id']} "
                        f"({file_info['contract_type']})"
                    )
                    
            except Exception as e:
                error_count += 1
                logger.error(
                    f"Error deleting contract {file_info['contract_id']}: {str(e)}"
                )
        
        # Log cleanup summary
        if system_user:
            try:
                AuditLog.objects.create(
                    user=system_user,
                    action='automated_contract_cleanup',
                    resource_type='System',
                    resource_id='retention_cleanup',
                    request_data={
                        'task_id': str(self.request.id),
                        'files_processed': len(files_to_process),
                        'files_deleted': deleted_count,
                        'errors': error_count,
                        'timestamp': timezone.now().isoformat(),
                        'dry_run': dry_run,
                        'max_files': max_files
                    }
                )
            except Exception as e:
                logger.error(f"Failed to create audit log: {str(e)}")
        
        result = {
            'status': 'completed',
            'files_processed': len(files_to_process),
            'files_deleted': deleted_count,
            'errors': error_count,
            'message': f'Cleanup completed: {deleted_count} files deleted, {error_count} errors'
        }
        
        logger.info(f"Contract file cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Contract file cleanup task failed: {str(e)}")
        
        # Retry the task if it hasn't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task in 60 seconds (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60, exc=e)
        
        # Log final failure
        try:
            system_user = User.objects.filter(is_staff=True, is_active=True).first()
            if system_user:
                AuditLog.objects.create(
                    user=system_user,
                    action='automated_contract_cleanup_failed',
                    resource_type='System',
                    resource_id='retention_cleanup',
                    request_data={
                        'task_id': str(self.request.id),
                        'error': str(e),
                        'retries': self.request.retries,
                        'timestamp': timezone.now().isoformat()
                    }
                )
        except:
            pass
        
        raise e


@shared_task
def verify_contract_file_integrity():
    """
    Task to verify integrity of all contract files
    """
    try:
        logger.info("Starting contract file integrity verification")
        
        from publishers.models import PublisherArtistRelationship, PublishingAgreement
        
        # Check PublisherArtistRelationship contracts
        relationship_contracts = PublisherArtistRelationship.objects.filter(
            contract_file__isnull=False,
            is_quarantined=False
        )
        
        # Check PublishingAgreement contracts
        agreement_contracts = PublishingAgreement.objects.filter(
            contract_file__isnull=False,
            is_quarantined=False
        )
        
        integrity_failures = []
        total_checked = 0
        
        # Verify relationship contracts
        for contract in relationship_contracts:
            total_checked += 1
            if not contract.verify_file_integrity():
                integrity_failures.append({
                    'contract_id': contract.id,
                    'contract_type': 'relationship',
                    'publisher': contract.publisher.company_name,
                    'artist': contract.artist.stage_name,
                    'file_path': contract.contract_file.name if contract.contract_file else None
                })
                
                # Quarantine the file
                contract.quarantine_file(
                    reason="File integrity check failed during automated verification",
                    quarantined_by=None
                )
                
                logger.warning(
                    f"Quarantined relationship contract {contract.id} due to integrity failure"
                )
        
        # Verify agreement contracts
        for contract in agreement_contracts:
            total_checked += 1
            if not contract.verify_file_integrity():
                integrity_failures.append({
                    'contract_id': contract.id,
                    'contract_type': 'agreement',
                    'publisher': contract.publisher.company_name,
                    'songwriter': contract.songwriter.stage_name,
                    'file_path': contract.contract_file.name if contract.contract_file else None
                })
                
                # Quarantine the file
                contract.quarantine_file(
                    reason="File integrity check failed during automated verification",
                    quarantined_by=None
                )
                
                logger.warning(
                    f"Quarantined agreement contract {contract.id} due to integrity failure"
                )
        
        # Log results
        system_user = User.objects.filter(is_staff=True, is_active=True).first()
        if system_user:
            AuditLog.objects.create(
                user=system_user,
                action='contract_integrity_verification',
                resource_type='System',
                resource_id='integrity_check',
                request_data={
                    'total_files_checked': total_checked,
                    'integrity_failures': len(integrity_failures),
                    'failed_contracts': integrity_failures,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        result = {
            'status': 'completed',
            'total_checked': total_checked,
            'integrity_failures': len(integrity_failures),
            'failed_contracts': integrity_failures,
            'message': f'Integrity check completed: {total_checked} files checked, {len(integrity_failures)} failures'
        }
        
        logger.info(f"Contract file integrity verification completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Contract file integrity verification failed: {str(e)}")
        raise e


@shared_task
def generate_contract_retention_report():
    """
    Generate a report of contract files eligible for deletion
    """
    try:
        logger.info("Generating contract retention report")
        
        eligible_files = ContractRetentionService.get_contracts_for_deletion()
        
        # Calculate statistics
        total_files = len(eligible_files)
        total_size = sum(
            file_info.get('file_size', 0) for file_info in eligible_files 
            if file_info.get('file_size')
        )
        
        # Group by reason
        reasons = {}
        for file_info in eligible_files:
            reason = file_info['reason']
            if reason not in reasons:
                reasons[reason] = 0
            reasons[reason] += 1
        
        # Group by contract type
        contract_types = {}
        for file_info in eligible_files:
            contract_type = file_info['contract_type']
            if contract_type not in contract_types:
                contract_types[contract_type] = 0
            contract_types[contract_type] += 1
        
        report = {
            'generated_at': timezone.now().isoformat(),
            'total_files_eligible': total_files,
            'total_size_bytes': total_size,
            'breakdown_by_reason': reasons,
            'breakdown_by_type': contract_types,
            'eligible_files': eligible_files
        }
        
        # Log report generation
        system_user = User.objects.filter(is_staff=True, is_active=True).first()
        if system_user:
            AuditLog.objects.create(
                user=system_user,
                action='contract_retention_report_generated',
                resource_type='System',
                resource_id='retention_report',
                request_data={
                    'total_files_eligible': total_files,
                    'total_size_bytes': total_size,
                    'breakdown_by_reason': reasons,
                    'breakdown_by_type': contract_types,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(f"Contract retention report generated: {total_files} files eligible for deletion")
        return report
        
    except Exception as e:
        logger.error(f"Contract retention report generation failed: {str(e)}")
        raise e