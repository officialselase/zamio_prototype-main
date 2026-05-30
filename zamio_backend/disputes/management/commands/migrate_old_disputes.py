"""
Management command to migrate old music_monitor.Dispute records to the new disputes.Dispute system.
This ensures that disputes flagged before the new system was implemented appear in the admin panel.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from music_monitor.models import Dispute as OldDispute
from disputes.models import Dispute as FormalDispute, DisputeType, DisputeStatus, DisputePriority


class Command(BaseCommand):
    help = 'Migrate old music_monitor disputes to the new formal dispute system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually migrating',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force migration even if formal dispute already exists',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        # Get all active old disputes that haven't been archived
        old_disputes = OldDispute.objects.filter(
            is_archived=False,
            active=True
        ).select_related('playlog__track__artist', 'playlog__station')

        total_count = old_disputes.count()
        self.stdout.write(f"Found {total_count} old disputes to process")

        migrated_count = 0
        skipped_count = 0
        error_count = 0

        for old_dispute in old_disputes:
            try:
                playlog = old_dispute.playlog
                
                # Skip if playlog doesn't exist
                if not playlog:
                    self.stdout.write(self.style.WARNING(
                        f"Skipping dispute {old_dispute.id}: No playlog found"
                    ))
                    skipped_count += 1
                    continue

                # Get the user who owns the station (submitter)
                station = playlog.station
                if not station or not station.user:
                    self.stdout.write(self.style.WARNING(
                        f"Skipping dispute {old_dispute.id}: No station or station user found"
                    ))
                    skipped_count += 1
                    continue

                submitted_by = station.user
                
                # Create title
                track_title = playlog.track.title if playlog.track else "Unknown Track"
                station_name = station.name if station else "Unknown Station"
                title = f"Play Log Dispute: {track_title} on {station_name}"
                
                # Map old status to new status
                status_mapping = {
                    'Flagged': DisputeStatus.SUBMITTED,
                    'Pending': DisputeStatus.UNDER_REVIEW,
                    'Resolved': DisputeStatus.RESOLVED,
                    'Rejected': DisputeStatus.REJECTED,
                }
                new_status = status_mapping.get(
                    old_dispute.dispute_status,
                    DisputeStatus.SUBMITTED
                )
                
                # Check if formal dispute already exists
                existing = FormalDispute.objects.filter(
                    metadata__old_dispute_id=old_dispute.id
                ).first()
                
                if existing and not force:
                    self.stdout.write(self.style.WARNING(
                        f"Skipping dispute {old_dispute.id}: Already migrated (formal dispute {existing.dispute_id})"
                    ))
                    skipped_count += 1
                    continue

                if dry_run:
                    self.stdout.write(self.style.SUCCESS(
                        f"[DRY RUN] Would migrate dispute {old_dispute.id}: {title}"
                    ))
                    migrated_count += 1
                    continue

                # Create or update formal dispute
                with transaction.atomic():
                    if existing and force:
                        # Update existing
                        existing.title = title
                        existing.description = old_dispute.dispute_comments or "No description provided"
                        existing.status = new_status
                        existing.metadata['old_dispute_id'] = old_dispute.id
                        existing.metadata['playlog_id'] = playlog.id
                        existing.metadata['migrated_at'] = str(old_dispute.created_at)
                        existing.save()
                        
                        self.stdout.write(self.style.SUCCESS(
                            f"Updated formal dispute {existing.dispute_id} from old dispute {old_dispute.id}"
                        ))
                    else:
                        # Create new
                        formal_dispute = FormalDispute.objects.create(
                            title=title,
                            description=old_dispute.dispute_comments or "No description provided",
                            dispute_type=DisputeType.DETECTION_ACCURACY,
                            status=new_status,
                            priority=DisputePriority.MEDIUM,
                            submitted_by=submitted_by,
                            related_track=playlog.track if playlog.track else None,
                            related_station=station,
                            resolution_summary=old_dispute.resolve_comments or "",
                            metadata={
                                'old_dispute_id': old_dispute.id,
                                'playlog_id': playlog.id,
                                'flagged_from': 'station_playlog',
                                'migrated_at': str(old_dispute.created_at),
                                'old_status': old_dispute.dispute_status,
                            }
                        )
                        
                        # Set created_at to match old dispute
                        FormalDispute.objects.filter(id=formal_dispute.id).update(
                            created_at=old_dispute.created_at
                        )
                        
                        # If old dispute was resolved, set resolved_at
                        if new_status == DisputeStatus.RESOLVED and old_dispute.verified_at:
                            FormalDispute.objects.filter(id=formal_dispute.id).update(
                                resolved_at=old_dispute.verified_at
                            )
                        
                        self.stdout.write(self.style.SUCCESS(
                            f"Migrated dispute {old_dispute.id} -> {formal_dispute.dispute_id}"
                        ))
                    
                    migrated_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"Error migrating dispute {old_dispute.id}: {str(e)}"
                ))
                error_count += 1
                continue

        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS(f"Migration {'simulation' if dry_run else 'complete'}!"))
        self.stdout.write(f"Total processed: {total_count}")
        self.stdout.write(self.style.SUCCESS(f"Migrated: {migrated_count}"))
        self.stdout.write(self.style.WARNING(f"Skipped: {skipped_count}"))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"Errors: {error_count}"))
        
        if dry_run:
            self.stdout.write("\nRun without --dry-run to perform actual migration")
