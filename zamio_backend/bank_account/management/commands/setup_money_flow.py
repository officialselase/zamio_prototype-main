"""
Management command to set up the money flow system
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal

from bank_account.models import PlatformAccount, StationAccount, BankAccount
from stations.models import Station
from artists.models import Artist
from publishers.models import PublisherProfile


class Command(BaseCommand):
    help = 'Set up the money flow system (central pool, station accounts, user accounts)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-central-pool',
            action='store_true',
            help='Create the central platform account',
        )
        parser.add_argument(
            '--create-station-accounts',
            action='store_true',
            help='Create accounts for all stations',
        )
        parser.add_argument(
            '--create-user-accounts',
            action='store_true',
            help='Create bank accounts for all users (artists, publishers)',
        )
        parser.add_argument(
            '--fund-stations',
            type=float,
            help='Add initial funds to all station accounts (amount in GHS)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Run all setup steps',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['all']:
            options['create_central_pool'] = True
            options['create_station_accounts'] = True
            options['create_user_accounts'] = True
        
        # Create central pool
        if options['create_central_pool']:
            self.stdout.write('Creating central platform account...')
            central_pool = PlatformAccount.get_central_pool()
            self.stdout.write(self.style.SUCCESS(
                f'✓ Central pool created: {central_pool.account_id} - Balance: {central_pool.balance} {central_pool.currency}'
            ))
        
        # Create station accounts
        if options['create_station_accounts']:
            self.stdout.write('\nCreating station accounts...')
            stations = Station.objects.all()
            created_count = 0
            existing_count = 0
            
            for station in stations:
                account, created = StationAccount.objects.get_or_create(
                    station=station,
                    defaults={
                        'balance': Decimal('0.00'),
                        'currency': 'GHS',
                        'allow_negative_balance': False,
                        'credit_limit': Decimal('0.00')
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(f'  ✓ Created account for: {station.name}')
                else:
                    existing_count += 1
            
            self.stdout.write(self.style.SUCCESS(
                f'✓ Station accounts: {created_count} created, {existing_count} already existed'
            ))
        
        # Fund stations
        if options['fund_stations']:
            amount = Decimal(str(options['fund_stations']))
            self.stdout.write(f'\nAdding {amount} GHS to all station accounts...')
            
            station_accounts = StationAccount.objects.all()
            for account in station_accounts:
                account.add_funds(
                    amount=amount,
                    description='Initial funding via management command'
                )
                self.stdout.write(f'  ✓ Funded {account.station.name}: {amount} GHS')
            
            self.stdout.write(self.style.SUCCESS(
                f'✓ Funded {station_accounts.count()} station accounts'
            ))
        
        # Create user bank accounts
        if options['create_user_accounts']:
            self.stdout.write('\nCreating user bank accounts...')
            
            # Artists
            artists = Artist.objects.select_related('user').all()
            artist_created = 0
            artist_existing = 0
            
            for artist in artists:
                if artist.user:
                    account, created = BankAccount.objects.get_or_create(
                        user=artist.user,
                        defaults={
                            'balance': Decimal('0.00'),
                            'currency': 'GHS',
                            'is_active': True
                        }
                    )
                    if created:
                        artist_created += 1
                    else:
                        artist_existing += 1
            
            self.stdout.write(self.style.SUCCESS(
                f'✓ Artist accounts: {artist_created} created, {artist_existing} already existed'
            ))
            
            # Publishers
            publishers = PublisherProfile.objects.select_related('user').all()
            publisher_created = 0
            publisher_existing = 0
            
            for publisher in publishers:
                if publisher.user:
                    account, created = BankAccount.objects.get_or_create(
                        user=publisher.user,
                        defaults={
                            'balance': Decimal('0.00'),
                            'currency': 'GHS',
                            'is_active': True
                        }
                    )
                    if created:
                        publisher_created += 1
                    else:
                        publisher_existing += 1
            
            self.stdout.write(self.style.SUCCESS(
                f'✓ Publisher accounts: {publisher_created} created, {publisher_existing} already existed'
            ))
        
        self.stdout.write(self.style.SUCCESS('\n✓ Money flow system setup complete!'))
