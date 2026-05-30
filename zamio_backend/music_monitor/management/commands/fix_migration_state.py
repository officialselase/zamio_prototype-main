"""
Management command to fix inconsistent migration state.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix inconsistent migration state for music_monitor app'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check current state
            cursor.execute(
                "SELECT name FROM django_migrations WHERE app = 'music_monitor' ORDER BY id"
            )
            current_migrations = [row[0] for row in cursor.fetchall()]
            
            self.stdout.write("Current migration state:")
            for migration in current_migrations:
                self.stdout.write(f"  - {migration}")
            
            # Check if 0008 is applied but 0007 is not
            has_0007 = '0007_alter_playlog_options_matchcache_status_and_more' in current_migrations
            has_0008 = '0008_migrate_existing_status_data' in current_migrations
            
            if has_0008 and not has_0007:
                self.stdout.write(self.style.WARNING(
                    "\nInconsistent state detected: 0008 is applied but 0007 is not"
                ))
                self.stdout.write("Fixing by removing 0008 from migration history...")
                
                cursor.execute(
                    "DELETE FROM django_migrations WHERE app = 'music_monitor' AND name = '0008_migrate_existing_status_data'"
                )
                
                self.stdout.write(self.style.SUCCESS(
                    "✓ Removed 0008 from migration history"
                ))
                self.stdout.write("\nNow run: python manage.py migrate")
            elif has_0007 and has_0008:
                self.stdout.write(self.style.SUCCESS(
                    "\n✓ Migration state is consistent"
                ))
            elif not has_0007 and not has_0008:
                self.stdout.write(self.style.SUCCESS(
                    "\n✓ Both migrations are pending - ready to apply"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    "\nUnexpected state - manual intervention may be needed"
                ))
