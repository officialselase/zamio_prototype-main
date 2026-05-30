"""
Money flow services for ZamIO platform
Handles all money transfers between stations, platform, and users
"""
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from bank_account.models import (
    PlatformAccount,
    StationAccount,
    BankAccount
)


class MoneyFlowService:
    """Service for handling money transfers in the platform"""
    
    @staticmethod
    def get_or_create_station_account(station):
        """Get or create account for a station"""
        account, created = StationAccount.objects.get_or_create(
            station=station,
            defaults={
                'balance': Decimal('0.00'),
                'currency': 'GHS',
                'is_active': True
            }
        )
        return account
    
    @staticmethod
    def get_or_create_user_account(user):
        """Get or create bank account for a user"""
        account, created = BankAccount.objects.get_or_create(
            user=user,
            defaults={
                'balance': Decimal('0.00'),
                'currency': 'Ghc',
                'is_active': True
            }
        )
        return account
    
    @staticmethod
    @transaction.atomic
    def charge_station_for_play(play_log, royalty_amount):
        """
        Charge station for a play and transfer to central pool
        
        Args:
            play_log: PlayLog instance
            royalty_amount: Decimal amount to charge
            
        Returns:
            dict with transaction details
            
        Raises:
            ValidationError if insufficient funds or invalid amount
        """
        if not play_log.station:
            raise ValidationError("Play log has no associated station")
        
        if royalty_amount <= 0:
            raise ValidationError("Royalty amount must be greater than zero")
        
        # Get or create station account
        station_account = MoneyFlowService.get_or_create_station_account(play_log.station)
        
        # Charge the station (this also transfers to central pool)
        try:
            station_account.charge_for_play(play_log, royalty_amount)
        except ValidationError as e:
            # Log the error but don't fail the play log processing
            # Station might be in debt or have insufficient funds
            raise ValidationError(f"Failed to charge station: {str(e)}")
        
        return {
            'success': True,
            'station': play_log.station.name,
            'amount': royalty_amount,
            'station_balance': station_account.balance,
            'message': f'Charged {royalty_amount} GHS to {play_log.station.name}'
        }
    
    @staticmethod
    @transaction.atomic
    def process_withdrawal_payout(withdrawal_request, admin_user):
        """
        Process approved withdrawal request and transfer money
        
        Args:
            withdrawal_request: RoyaltyWithdrawal instance
            admin_user: User approving the withdrawal
            
        Returns:
            dict with payout details
            
        Raises:
            ValidationError if validation fails or insufficient funds
        """
        # Validate withdrawal authority
        is_valid, message = withdrawal_request.validate_publishing_authority()
        if not is_valid:
            raise ValidationError(f"Invalid withdrawal authority: {message}")
        
        # Determine recipient based on requester type
        if withdrawal_request.requester_type == 'artist':
            # Self-published artist - pay directly to artist
            if not withdrawal_request.artist:
                raise ValidationError("No artist specified for artist withdrawal")
            
            recipient_user = withdrawal_request.artist.user
            recipient_type = 'artist'
            
        elif withdrawal_request.requester_type == 'publisher':
            # Publisher requesting for artist - pay to publisher
            if not withdrawal_request.publisher:
                raise ValidationError("No publisher specified for publisher withdrawal")
            
            recipient_user = withdrawal_request.publisher.user
            recipient_type = 'publisher'
            
        else:
            raise ValidationError(f"Invalid requester type: {withdrawal_request.requester_type}")
        
        # Get or create recipient's bank account
        user_account = MoneyFlowService.get_or_create_user_account(recipient_user)
        
        # Get central pool
        central_pool = PlatformAccount.get_central_pool()
        
        # Transfer money from central pool to user account
        try:
            central_pool.pay_to_user(
                amount=withdrawal_request.amount,
                user_account=user_account,
                withdrawal_request=withdrawal_request,
                description=f"Royalty payout: {withdrawal_request.withdrawal_id}"
            )
        except ValidationError as e:
            raise ValidationError(f"Failed to process payout: {str(e)}")
        
        # Update withdrawal request status
        withdrawal_request.status = 'processed'
        withdrawal_request.processed_by = admin_user
        withdrawal_request.processed_at = timezone.now()
        withdrawal_request.publishing_status_validated = True
        withdrawal_request.validation_notes = message
        withdrawal_request.save()
        
        return {
            'success': True,
            'withdrawal_id': str(withdrawal_request.withdrawal_id),
            'amount': withdrawal_request.amount,
            'recipient': recipient_user.email,
            'recipient_type': recipient_type,
            'recipient_balance': user_account.balance,
            'platform_balance': central_pool.balance,
            'message': f'Paid {withdrawal_request.amount} GHS to {recipient_user.email}'
        }
    
    @staticmethod
    def get_platform_balance():
        """Get current platform central pool balance"""
        central_pool = PlatformAccount.get_central_pool()
        return {
            'balance': central_pool.balance,
            'currency': central_pool.currency,
            'total_received': central_pool.total_received,
            'total_paid_out': central_pool.total_paid_out,
            'updated_at': central_pool.updated_at
        }
    
    @staticmethod
    def get_station_balance(station):
        """Get station account balance"""
        try:
            account = StationAccount.objects.get(station=station)
            return {
                'balance': account.balance,
                'currency': account.currency,
                'total_spent': account.total_spent,
                'total_plays': account.total_plays,
                'allow_negative': account.allow_negative_balance,
                'credit_limit': account.credit_limit
            }
        except StationAccount.DoesNotExist:
            return None
    
    @staticmethod
    def get_user_balance(user):
        """Get user bank account balance"""
        try:
            account = BankAccount.objects.get(user=user)
            return {
                'balance': account.balance,
                'currency': account.currency,
                'account_id': account.account_id,
                'is_active': account.is_active
            }
        except BankAccount.DoesNotExist:
            return None
    
    @staticmethod
    @transaction.atomic
    def station_add_funds(station, amount, description=None):
        """
        Add funds to station account
        
        Args:
            station: Station instance
            amount: Decimal amount to add
            description: Optional description
            
        Returns:
            dict with transaction details
        """
        if amount <= 0:
            raise ValidationError("Amount must be greater than zero")
        
        station_account = MoneyFlowService.get_or_create_station_account(station)
        station_account.add_funds(amount, description)
        
        return {
            'success': True,
            'station': station.name,
            'amount': amount,
            'new_balance': station_account.balance,
            'message': f'Added {amount} GHS to {station.name} account'
        }
