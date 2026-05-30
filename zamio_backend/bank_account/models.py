from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models.signals import pre_save
from django.core.exceptions import ValidationError
from decimal import Decimal

from core.utils import unique_account_id_generator



class BankAccount(models.Model):

    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='bank_accounts')
    account_id = models.CharField(max_length=20, unique=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    currency = models.CharField(max_length=50, blank=True, null=True, default="Ghc")

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - {self.account_id}"

    def deposit(self, amount, description=None):
        if amount > 0:
            self.balance += amount
            self.save()
            Transaction.objects.create(
                bank_account=self,
                transaction_type='Deposit',
                amount=amount,
                description=description
            )
            return True
        return False

    def withdraw(self, amount, description=None):
        if 0 < amount <= self.balance:
            self.balance -= amount
            self.save()
            Transaction.objects.create(
                bank_account=self,
                transaction_type='Withdrawal',
                amount=amount,
                status="Paid",
                description=description
            )
            return True
        return False

def pre_save_account_id_receiver(sender, instance, *args, **kwargs):
    if not instance.account_id:
        instance.account_id = unique_account_id_generator(instance)

pre_save.connect(pre_save_account_id_receiver, sender=BankAccount)

class Transaction(models.Model):

    STATUS_TYPE = (
    ('Requested', 'Requested'),
    ('Paid', 'Paid'),
    ('Declined', 'Declined')

    )


    TRANSACTION_TYPES = [
        ('Deposit', 'Deposit'),
        ('Withdrawal', 'Withdrawal'),
        ('Transfer', 'Transfer'),
    ]


    PAYMENT_TYPE = [
        ('MTN MoMo', 'MTN MoMo'),
        ('Bank Transfer', 'Bank Transfer'),
    ]

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_id = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=100, choices=STATUS_TYPE, blank=True, null=True)
    payment_method = models.CharField(max_length=100, choices=PAYMENT_TYPE, blank=True, null=True)

    currency = models.CharField(max_length=50, blank=True, null=True, default="Ghc")


    requested_on = models.DateTimeField(blank=True, null=True)
    paid_on = models.DateTimeField(blank=True, null=True)
    declined_on = models.DateTimeField(blank=True, null=True)
    date_processed = models.DateTimeField(blank=True, null=True)


    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(default=timezone.now)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.transaction_id} - {self.bank_account.account_id} - {self.transaction_type} - {self.amount}"



def pre_save_transaction_id_receiver(sender, instance, *args, **kwargs):
    if not instance.transaction_id:
        instance.transaction_id = unique_transaction_id_generator(instance)

pre_save.connect(pre_save_transaction_id_receiver, sender=Transaction)



import uuid

def unique_transaction_id_generator(instance):
    return f"TXN-{uuid.uuid4().hex[:10].upper()}"


class PlatformAccount(models.Model):
    """
    Central ZamIO platform account that holds all station payments
    before distribution to artists/publishers
    """
    account_id = models.CharField(max_length=50, unique=True, default='ZAMIO-CENTRAL-POOL')
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=50, default='GHS')
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    total_received = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="Total money received from stations")
    total_paid_out = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="Total money paid to artists/publishers")
    
    class Meta:
        verbose_name = "Platform Central Account"
        verbose_name_plural = "Platform Central Accounts"
    
    def __str__(self):
        return f"ZamIO Central Pool - Balance: {self.balance} {self.currency}"
    
    @classmethod
    def get_central_pool(cls):
        """Get or create the central platform account"""
        account, created = cls.objects.get_or_create(
            account_id='ZAMIO-CENTRAL-POOL',
            defaults={
                'balance': Decimal('0.00'),
                'currency': 'GHS',
                'is_active': True
            }
        )
        return account
    
    def receive_from_station(self, amount, station, play_log=None, description=None):
        """
        Receive payment from station for a play
        """
        if amount <= 0:
            raise ValidationError("Amount must be greater than zero")
        
        self.balance += Decimal(str(amount))
        self.total_received += Decimal(str(amount))
        self.save()
        
        # Create platform transaction record
        PlatformTransaction.objects.create(
            platform_account=self,
            transaction_type='station_payment',
            amount=amount,
            station=station,
            play_log=play_log,
            description=description or f"Payment from {station.name} for play"
        )
        
        return True
    
    def pay_to_user(self, amount, user_account, withdrawal_request=None, description=None):
        """
        Pay out to artist/publisher from central pool
        """
        if amount <= 0:
            raise ValidationError("Amount must be greater than zero")
        
        if amount > self.balance:
            raise ValidationError(f"Insufficient funds in central pool. Available: {self.balance}, Requested: {amount}")
        
        self.balance -= Decimal(str(amount))
        self.total_paid_out += Decimal(str(amount))
        self.save()
        
        # Create platform transaction record
        PlatformTransaction.objects.create(
            platform_account=self,
            transaction_type='payout',
            amount=amount,
            user_account=user_account,
            withdrawal_request=withdrawal_request,
            description=description or f"Payout to {user_account.user.email}"
        )
        
        # Credit the user's bank account
        user_account.deposit(
            amount=amount,
            description=description or f"Royalty payout"
        )
        
        return True


class StationAccount(models.Model):
    """
    Account for radio stations to pay for plays
    Stations pre-fund this account, and it gets debited per play
    """
    station = models.OneToOneField('stations.Station', on_delete=models.CASCADE, related_name='account')
    account_id = models.CharField(max_length=20, unique=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=50, default='GHS')
    
    # Settings
    allow_negative_balance = models.BooleanField(default=False, help_text="Allow station to go into debt")
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="Maximum negative balance allowed")
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    total_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="Total spent on plays")
    total_plays = models.IntegerField(default=0, help_text="Total number of plays charged")
    
    class Meta:
        verbose_name = "Station Account"
        verbose_name_plural = "Station Accounts"
    
    def __str__(self):
        return f"{self.station.name} - {self.account_id} - Balance: {self.balance} {self.currency}"
    
    def add_funds(self, amount, description=None):
        """Station adds funds to their account"""
        if amount <= 0:
            raise ValidationError("Amount must be greater than zero")
        
        self.balance += Decimal(str(amount))
        self.save()
        
        StationTransaction.objects.create(
            station_account=self,
            transaction_type='deposit',
            amount=amount,
            description=description or "Account top-up"
        )
        
        return True
    
    def charge_for_play(self, play_log, royalty_amount):
        """
        Deduct cost when track is played and transfer to central pool
        """
        if royalty_amount <= 0:
            raise ValidationError("Royalty amount must be greater than zero")
        
        # Check if station has sufficient funds
        if not self.allow_negative_balance and self.balance < royalty_amount:
            raise ValidationError(
                f"Insufficient funds. Balance: {self.balance}, Required: {royalty_amount}"
            )
        
        # Check credit limit if negative balance allowed
        if self.allow_negative_balance:
            potential_balance = self.balance - Decimal(str(royalty_amount))
            if potential_balance < -self.credit_limit:
                raise ValidationError(
                    f"Credit limit exceeded. Current: {self.balance}, Limit: {self.credit_limit}"
                )
        
        # Deduct from station account
        self.balance -= Decimal(str(royalty_amount))
        self.total_spent += Decimal(str(royalty_amount))
        self.total_plays += 1
        self.save()
        
        # Create station transaction
        StationTransaction.objects.create(
            station_account=self,
            transaction_type='play_charge',
            amount=royalty_amount,
            play_log=play_log,
            description=f"Charge for playing: {play_log.track.title if play_log.track else 'Unknown track'}"
        )
        
        # Transfer to central pool
        central_pool = PlatformAccount.get_central_pool()
        central_pool.receive_from_station(
            amount=royalty_amount,
            station=self.station,
            play_log=play_log,
            description=f"Payment from {self.station.name} for play"
        )
        
        return True


def pre_save_station_account_id_receiver(sender, instance, *args, **kwargs):
    if not instance.account_id:
        instance.account_id = f"STA-{uuid.uuid4().hex[:10].upper()}"

pre_save.connect(pre_save_station_account_id_receiver, sender=StationAccount)


class PlatformTransaction(models.Model):
    """
    Transaction records for the platform central account
    """
    TRANSACTION_TYPES = [
        ('station_payment', 'Station Payment'),
        ('payout', 'Payout to User'),
        ('adjustment', 'Manual Adjustment'),
        ('refund', 'Refund'),
    ]
    
    platform_account = models.ForeignKey(PlatformAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_id = models.CharField(max_length=20, unique=True)
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Related objects
    station = models.ForeignKey('stations.Station', on_delete=models.SET_NULL, null=True, blank=True)
    play_log = models.ForeignKey('music_monitor.PlayLog', on_delete=models.SET_NULL, null=True, blank=True)
    user_account = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True)
    withdrawal_request = models.ForeignKey('royalties.RoyaltyWithdrawal', on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['platform_account', 'transaction_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.transaction_id} - {self.transaction_type} - {self.amount}"


def pre_save_platform_transaction_id_receiver(sender, instance, *args, **kwargs):
    if not instance.transaction_id:
        instance.transaction_id = f"PLT-{uuid.uuid4().hex[:10].upper()}"

pre_save.connect(pre_save_platform_transaction_id_receiver, sender=PlatformTransaction)


class StationTransaction(models.Model):
    """
    Transaction records for station accounts
    """
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit/Top-up'),
        ('play_charge', 'Play Charge'),
        ('refund', 'Refund'),
        ('adjustment', 'Manual Adjustment'),
    ]
    
    station_account = models.ForeignKey(StationAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_id = models.CharField(max_length=20, unique=True)
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Related objects
    play_log = models.ForeignKey('music_monitor.PlayLog', on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['station_account', 'transaction_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.transaction_id} - {self.transaction_type} - {self.amount}"


def pre_save_station_transaction_id_receiver(sender, instance, *args, **kwargs):
    if not instance.transaction_id:
        instance.transaction_id = f"STX-{uuid.uuid4().hex[:10].upper()}"

pre_save.connect(pre_save_station_transaction_id_receiver, sender=StationTransaction)


class StationDepositRequest(models.Model):
    """
    Deposit requests from stations to add funds to their accounts
    Requires admin approval or payment verification
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    PAYMENT_METHODS = [
        ('mtn_momo', 'MTN Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
        ('card', 'Credit/Debit Card'),
        ('cash', 'Cash'),
    ]
    
    station = models.ForeignKey('stations.Station', on_delete=models.CASCADE, related_name='deposit_requests')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=50, default='GHS')
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS)
    reference = models.CharField(max_length=255, blank=True, help_text="Payment reference number")
    notes = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_deposits'
    )
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['station', 'status']),
            models.Index(fields=['status', 'requested_at']),
        ]
    
    def __str__(self):
        return f"Deposit Request - {self.station.name} - {self.amount} {self.currency} ({self.status})"
    
    def approve_and_process(self, admin_user):
        """Approve deposit and add funds to station account"""
        if self.status != 'pending':
            raise ValidationError(f"Cannot approve deposit with status: {self.status}")
        
        # Add funds to station account
        station_account, created = StationAccount.objects.get_or_create(
            station=self.station,
            defaults={
                'balance': Decimal('0.00'),
                'currency': self.currency
            }
        )
        
        station_account.add_funds(
            amount=self.amount,
            description=f"Deposit via {self.get_payment_method_display()} - Ref: {self.reference}"
        )
        
        # Update deposit request
        self.status = 'completed'
        self.processed_at = timezone.now()
        self.processed_by = admin_user
        self.save()
        
        return True
    
    def reject(self, admin_user, reason):
        """Reject deposit request"""
        if self.status != 'pending':
            raise ValidationError(f"Cannot reject deposit with status: {self.status}")
        
        self.status = 'rejected'
        self.processed_at = timezone.now()
        self.processed_by = admin_user
        self.rejection_reason = reason
        self.save()
        
        return True
