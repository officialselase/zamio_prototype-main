"""
Management command to clean up evidence files based on retention policy
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.contrib.auth import get_user_model
from disputes.services.evidence_security_service import EvidenceRetentionService
from accounts.models import AuditLog

User = get_user_model()


class Command(BaseCommand):
    help = 'Clean up evidence files based on retention policy'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting files',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation prompts',
        )
        parser.add_argument(
            '--max-files',
            type=int,
            default=100,
            help='Maximum number of files to process in one run (default: 100)',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        max_files = options['max_files']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting evidence file cleanup (dry_run={dry_run}, max_files={max_files})'
            )
        )
        
        try:
            # Get files eligible for deletion
            eligible_files = EvidenceRetentionService.get_evidence_files_for_deletion()
            
            if not eligible_files:
                self.stdout.write(
                    self.style.SUCCESS('No evidence files are eligible for deletion at this time.')
                )
                return
            
            # Limit the number of files to process
            files_to_process = eligible_files[:max_files]
            
            self.stdout.write(
                self.style.WARNING(
                    f'Found {len(eligible_files)} eligible files, processing {len(files_to_process)}'
                )
            )
            
            if dry_run:
                self._show_dry_run_results(files_to_process)
                return
            
            # Confirm deletion if not forced
            if not force:
                if not self._confirm_deletion(files_to_process):
                    self.stdout.write(self.style.ERROR('Deletion cancelled by user.'))
                    return
            
            # Get system user for audit logging
            system_user = self._get_system_user()
            
            # Process deletions
            deleted_count = 0
            error_count = 0
            
            for file_info in files_to_process:
                evidence_id = file_info['evidence_id']
                reason = f"Retention policy: {file_info['reason']}"
                
                try:
                    success = EvidenceRetentionService.delete_evidence_file(
                        evidence_id=evidence_id,
                        reason=reason,
                        deleted_by=system_user
                    )
                    
                    if success:
                        deleted_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Deleted evidence {evidence_id} (dispute {file_info["dispute_id"]})'
                            )
                        )
                    else:
                        error_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f'Failed to delete evidence {evidence_id}'
                            )
                        )
                        
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'Error deleting evidence {evidence_id}: {str(e)}'
                        )
                    )
            
            # Log cleanup summary
            AuditLog.objects.create(
                user=system_user,
                action='evidence_cleanup_completed',
                resource_type='System',
                resource_id='retention_cleanup',
                request_data={
                    'total_eligible': len(eligible_files),
                    'processed': len(files_to_process),
                    'deleted': deleted_count,
                    'errors': error_count,
                    'dry_run': dry_run,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleanup completed: {deleted_count} files deleted, {error_count} errors'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Cleanup failed: {str(e)}')
            )
            raise CommandError(f'Evidence cleanup failed: {str(e)}')
    
    def _show_dry_run_results(self, files_to_process):
        """Show what would be deleted in dry run mode"""
        self.stdout.write(self.style.WARNING('\n=== DRY RUN - No files will be deleted ===\n'))
        
        for file_info in files_to_process:
            self.stdout.write(
                f"Would delete: Evidence {file_info['evidence_id']} "
                f"(Dispute {file_info['dispute_id']}) - {file_info['reason']}"
            )
            if file_info.get('file_path'):
                self.stdout.write(f"  File: {file_info['file_path']}")
            if file_info.get('resolved_date'):
                self.stdout.write(f"  Resolved: {file_info['resolved_date']}")
            self.stdout.write('')
        
        self.stdout.write(
            self.style.WARNING(f'Total files that would be deleted: {len(files_to_process)}')
        )
    
    def _confirm_deletion(self, files_to_process):
        """Ask user to confirm deletion"""
        self.stdout.write(
            self.style.WARNING(
                f'\nThis will permanently delete {len(files_to_process)} evidence files.'
            )
        )
        self.stdout.write(self.style.WARNING('This action cannot be undone.'))
        
        response = input('\nAre you sure you want to continue? (yes/no): ')
        return response.lower() in ['yes', 'y']
    
    def _get_system_user(self):
        """Get or create system user for audit logging"""
        try:
            # Try to get existing system user
            system_user = User.objects.get(username='system')
        except User.DoesNotExist:
            # Create system user if it doesn't exist
            system_user = User.objects.create_user(
                username='system',
                email='system@zamio.com',
                first_name='System',
                last_name='User',
                is_active=False,  # System user should not be able to log in
                user_type='Admin'
            )
        
        return system_user