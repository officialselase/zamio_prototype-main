"""
Management command to fix claimed status for existing playlogs.
Sets claimed=True for all playlogs that have a track assigned.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from music_monitor.models import PlayLog


class Command(BaseCommand):
    help = 'Fix claimed status for existing playlogs with tracks assigned'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Find playlogs that have a track but claimed=False
        playlogs_to_fix = PlayLog.objects.filter(
            track__isnull=False,
            claimed=False,
            is_archived=False
        )

        count = playlogs_to_fix.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No playlogs need fixing. All good!'))
            return

        self.stdout.write(f'Found {count} playlogs with tracks that need claimed=True')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
            
            # Show sample of what would be updated
            sample = playlogs_to_fix[:10]
            self.stdout.write('\nSample of playlogs that would be updated:')
            for playlog in sample:
                self.stdout.write(
                    f'  - PlayLog ID: {playlog.id}, '
                    f'Track: {playlog.track.title}, '
                    f'Station: {playlog.station.name}, '
                    f'Played: {playlog.played_at}'
                )
            
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
        else:
            # Update the playlogs
            updated = playlogs_to_fix.update(claimed=True)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated {updated} playlogs to claimed=True'
                )
            )

        # Show statistics
        self.stdout.write('\nStatistics:')
        total_playlogs = PlayLog.objects.filter(is_archived=False).count()
        claimed_playlogs = PlayLog.objects.filter(claimed=True, is_archived=False).count()
        unclaimed_playlogs = PlayLog.objects.filter(claimed=False, is_archived=False).count()
        
        self.stdout.write(f'  Total active playlogs: {total_playlogs}')
        self.stdout.write(f'  Claimed playlogs: {claimed_playlogs}')
        self.stdout.write(f'  Unclaimed playlogs: {unclaimed_playlogs}')
