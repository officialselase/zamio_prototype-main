"""
Royalty calculation and payment processing services
"""
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from bank_account.models import PlatformAccount, StationAccount
from royalties.models import RoyaltyRate, RoyaltyWithdrawal


class RoyaltyPaymentService:
    """
    Service for handling royalty payments and money flow
    """
    
    @staticmethod
    def get_royalty_rate_for_play(play_log):
        """
        Get the applicable royalty rate for a play log
        """
        # Try to get specific rate for the track/artist
        if play_log.track:
            # Check for artist-specific rate
            if play_log.track.artist:
                rate = RoyaltyRate.objects.filter(
                    artist=play_log.track.artist,
                    is_active=True
                ).first()
                if rate:
                    return rate.rate_per_play
        
        # Fall back to default rate
        default_rate = RoyaltyRate.objects.filter(
            artist__isnull=True,
            is_active=True
        ).first()
        
        if default_rate:
            return default_rate.rate_per_play
        
        # Ultimate fallback
        return Decimal('2.00')  # GHS 2.00 per play
    
    @staticmethod
    def calculate_royalty_amount(play_log, rate_per_play=None):
        """
        Calculate the royalty amount for a play
        """
        if rate_per_play is None:
            rate_per_play = RoyaltyPaymentService.get_royalty_rate_for_play(play_log)
        
        # For now, simple calculation: rate per play
        # Future: Could factor in duration, time of day, etc.
        return Decimal(str(rate_per_play))
    
    @staticmethod
    @transaction.atomic
    def process_play_payment(play_log):
        """
        Process payment for a play log:
        1. Calculate royalty amount
        2. Charge station account
        3. Credit platform central pool
        """
        # Skip if already processed
        if hasattr(play_log, 'payment_processed') and play_log.payment_processed:
            return False, "Play already processed"
        
        # Get or create station account
        station_account, created = StationAccount.objects.get_or_create(
            station=play_log.station,
            defaults={
                'balance': Decimal('0.00'),
                'currency': 'GHS',
                'allow_negative_balance': False
            }
        )
        
        # Calculate royalty amount
        royalty_amount = RoyaltyPaymentService.calculate_royalty_amount(play_log)
        
        try:
            # Charge station and transfer to central pool
            station_account.charge_for_play(play_log, royalty_amount)
            
            # Mark play as processed (if field exists)
            if hasattr(play_log, 'payment_processed'):
                play_log.payment_processed = True
                play_log.payment_amount = royalty_amount
                play_log.payment_processed_at = timezone.now()
                play_log.save()
            
            return True, f"Successfully processed payment of {royalty_amount} GHS"
            
        except ValidationError as e:
            return False, str(e)
    
    @staticmethod
    @transaction.atomic
    def approve_and_process_withdrawal(withdrawal_id, admin_user):
        """
        Approve a withdrawal request and transfer money from central pool to user
        """
        try:
            withdrawal = RoyaltyWithdrawal.objects.get(withdrawal_id=withdrawal_id)
        except RoyaltyWithdrawal.DoesNotExist:
            raise ValidationError("Withdrawal request not found")
        
        # Check if already processed
        if withdrawal.status in ['processed', 'rejected', 'cancelled']:
            raise ValidationError(f"Withdrawal already {withdrawal.status}")
        
        # Validate publishing authority
        is_valid, message = withdrawal.validate_publishing_authority()
        if not is_valid:
            raise ValidationError(f"Publishing authority validation failed: {message}")
        
        # Get central pool
        central_pool = PlatformAccount.get_central_pool()
        
        # Determine recipient account
        if withdrawal.requester_type == 'artist':
            # Self-published artist
            if not withdrawal.artist:
                raise ValidationError("Artist not specified for artist withdrawal")
            
            user_account = withdrawal.artist.user.bank_accounts.first()
            if not user_account:
                raise ValidationError(f"No bank account found for artist {withdrawal.artist.stage_name}")
        
        elif withdrawal.requester_type == 'publisher':
            # Publisher requesting for artist
            if not withdrawal.publisher:
                raise ValidationError("Publisher not specified for publisher withdrawal")
            
            user_account = withdrawal.publisher.user.bank_accounts.first()
            if not user_account:
                raise ValidationError(f"No bank account found for publisher {withdrawal.publisher.company_name}")
        
        else:
            raise ValidationError(f"Invalid requester type: {withdrawal.requester_type}")
        
        # Transfer money from central pool to user account
        try:
            central_pool.pay_to_user(
                amount=withdrawal.amount,
                user_account=user_account,
                withdrawal_request=withdrawal,
                description=f"Royalty payout: {withdrawal.withdrawal_id}"
            )
        except ValidationError as e:
            raise ValidationError(f"Payment failed: {str(e)}")
        
        # Update withdrawal status
        withdrawal.status = 'processed'
        withdrawal.processed_by = admin_user
        withdrawal.processed_at = timezone.now()
        withdrawal.publishing_status_validated = True
        withdrawal.validation_notes = message
        withdrawal.save()
        
        return withdrawal
    
    @staticmethod
    @transaction.atomic
    def reject_withdrawal(withdrawal_id, admin_user, rejection_reason):
        """
        Reject a withdrawal request
        """
        try:
            withdrawal = RoyaltyWithdrawal.objects.get(withdrawal_id=withdrawal_id)
        except RoyaltyWithdrawal.DoesNotExist:
            raise ValidationError("Withdrawal request not found")
        
        # Check if already processed
        if withdrawal.status in ['processed', 'rejected', 'cancelled']:
            raise ValidationError(f"Withdrawal already {withdrawal.status}")
        
        # Update withdrawal status
        withdrawal.status = 'rejected'
        withdrawal.processed_by = admin_user
        withdrawal.processed_at = timezone.now()
        withdrawal.rejection_reason = rejection_reason
        withdrawal.save()
        
        return withdrawal
    
    @staticmethod
    def get_available_balance_for_artist(artist):
        """
        Calculate available balance for an artist
        This would sum up all processed plays minus withdrawals
        """
        # TODO: Implement proper balance calculation
        # For now, return pending_payments from their account
        user_account = artist.user.bank_accounts.first()
        if user_account:
            return user_account.balance
        return Decimal('0.00')
    
    @staticmethod
    def get_available_balance_for_publisher(publisher):
        """
        Calculate available balance for a publisher
        """
        # TODO: Implement proper balance calculation
        user_account = publisher.user.bank_accounts.first()
        if user_account:
            return user_account.balance
        return Decimal('0.00')


class StationAccountService:
    """
    Service for managing station accounts
    """
    
    @staticmethod
    @transaction.atomic
    def create_station_account(station, initial_balance=None):
        """
        Create a station account with optional initial balance
        """
        account, created = StationAccount.objects.get_or_create(
            station=station,
            defaults={
                'balance': initial_balance or Decimal('0.00'),
                'currency': 'GHS',
                'allow_negative_balance': False,
                'credit_limit': Decimal('0.00')
            }
        )
        return account, created
    
    @staticmethod
    @transaction.atomic
    def add_funds_to_station(station, amount, description=None):
        """
        Add funds to a station account
        """
        account = station.account
        return account.add_funds(amount, description)
    
    @staticmethod
    def get_station_balance(station):
        """
        Get current balance for a station
        """
        try:
            return station.account.balance
        except StationAccount.DoesNotExist:
            return Decimal('0.00')
