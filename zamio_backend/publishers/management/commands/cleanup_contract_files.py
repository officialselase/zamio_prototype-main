"""
Management command to clean up contract files based on retention policy
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.contrib.auth import get_user_model
from publishers.services.contract_security_service import ContractRetentionService
from accounts.models import AuditLog

User = get_user_model()


class Command(BaseCommand):
    help = 'Clean up contract files based on retention policy'
    
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
                f'Starting contract file cleanup (dry_run={dry_run}, max_files={max_files})'
            )
        )
        
        try:
            # Get files eligible for deletion
            eligible_files = ContractRetentionService.get_contracts_for_deletion()
            
            if not eligible_files:
                self.stdout.write(
                    self.style.SUCCESS('No contract files are eligible for deletion.')
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
                self.stdout.write(
                    self.style.WARNING('DRY RUN - No files will actually be deleted')
                )
                
                for file_info in files_to_process:
                    self.stdout.write(
                        f"Would delete: Contract {file_info['contract_id']} "
                        f"({file_info['contract_type']}) - {file_info['reason']}"
                    )
                return
            
            # Confirm deletion if not forced
            if not force:
                confirm = input(
                    f'Are you sure you want to delete {len(files_to_process)} contract files? '
                    'This action cannot be undone. (yes/no): '
                )
                if confirm.lower() != 'yes':
                    self.stdout.write(self.style.ERROR('Operation cancelled.'))
                    return
            
            # Get system user for audit logging
            try:
                system_user = User.objects.filter(is_staff=True).first()
                if not system_user:
                    system_user = User.objects.filter(is_superuser=True).first()
            except:
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
                        self.stdout.write(
                            f"Deleted: Contract {file_info['contract_id']} "
                            f"({file_info['contract_type']})"
                        )
                    else:
                        error_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f"Failed to delete: Contract {file_info['contract_id']} "
                                f"({file_info['contract_type']})"
                            )
                        )
                        
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error deleting Contract {file_info['contract_id']}: {str(e)}"
                        )
                    )
            
            # Log cleanup summary
            if system_user:
                AuditLog.objects.create(
                    user=system_user,
                    action='contract_cleanup_completed',
                    resource_type='System',
                    resource_id='retention_cleanup',
                    request_data={
                        'files_processed': len(files_to_process),
                        'files_deleted': deleted_count,
                        'errors': error_count,
                        'timestamp': timezone.now().isoformat(),
                        'dry_run': dry_run,
                        'max_files': max_files
                    }
                )
            
            # Summary
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleanup completed: {deleted_count} files deleted, {error_count} errors'
                )
            )
            
            if error_count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        'Some files could not be deleted. Check the logs for details.'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Cleanup failed: {str(e)}')
            )
            raise CommandError(f'Contract file cleanup failed: {str(e)}')
    
    def _format_file_size(self, size_bytes):
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"