from django.contrib import admin

from bank_account.models import (
    BankAccount, 
    Transaction, 
    PlatformAccount, 
    StationAccount,
    PlatformTransaction,
    StationTransaction,
    StationDepositRequest
)


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'account_id', 'balance', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('account_id', 'user__email', 'user__full_name')
    readonly_fields = ('account_id', 'created_at', 'updated_at')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'bank_account', 'transaction_type', 'amount', 'status', 'timestamp')
    list_filter = ('transaction_type', 'status', 'timestamp')
    search_fields = ('transaction_id', 'bank_account__account_id', 'description')
    readonly_fields = ('transaction_id', 'timestamp')


@admin.register(PlatformAccount)
class PlatformAccountAdmin(admin.ModelAdmin):
    list_display = ('account_id', 'balance', 'total_received', 'total_paid_out', 'currency', 'is_active', 'updated_at')
    list_filter = ('is_active', 'currency')
    search_fields = ('account_id',)
    readonly_fields = ('account_id', 'created_at', 'updated_at', 'total_received', 'total_paid_out')
    
    fieldsets = (
        ('Account Information', {
            'fields': ('account_id', 'balance', 'currency', 'is_active')
        }),
        ('Statistics', {
            'fields': ('total_received', 'total_paid_out')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(StationAccount)
class StationAccountAdmin(admin.ModelAdmin):
    list_display = ('station', 'account_id', 'balance', 'total_spent', 'total_plays', 'is_active', 'updated_at')
    list_filter = ('is_active', 'allow_negative_balance')
    search_fields = ('account_id', 'station__name')
    readonly_fields = ('account_id', 'created_at', 'updated_at', 'total_spent', 'total_plays')
    
    fieldsets = (
        ('Account Information', {
            'fields': ('station', 'account_id', 'balance', 'currency', 'is_active')
        }),
        ('Credit Settings', {
            'fields': ('allow_negative_balance', 'credit_limit')
        }),
        ('Statistics', {
            'fields': ('total_spent', 'total_plays')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(PlatformTransaction)
class PlatformTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'transaction_type', 'amount', 'station', 'user_account', 'timestamp')
    list_filter = ('transaction_type', 'timestamp')
    search_fields = ('transaction_id', 'description', 'station__name')
    readonly_fields = ('transaction_id', 'timestamp')
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('transaction_id', 'platform_account', 'transaction_type', 'amount')
        }),
        ('Related Objects', {
            'fields': ('station', 'play_log', 'user_account', 'withdrawal_request')
        }),
        ('Details', {
            'fields': ('description', 'timestamp')
        }),
    )


@admin.register(StationTransaction)
class StationTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'station_account', 'transaction_type', 'amount', 'timestamp')
    list_filter = ('transaction_type', 'timestamp')
    search_fields = ('transaction_id', 'description', 'station_account__station__name')
    readonly_fields = ('transaction_id', 'timestamp')
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('transaction_id', 'station_account', 'transaction_type', 'amount')
        }),
        ('Related Objects', {
            'fields': ('play_log',)
        }),
        ('Details', {
            'fields': ('description', 'timestamp')
        }),
    )


@admin.register(StationDepositRequest)
class StationDepositRequestAdmin(admin.ModelAdmin):
    list_display = ('station', 'amount', 'payment_method', 'status', 'requested_at', 'processed_at')
    list_filter = ('status', 'payment_method', 'requested_at')
    search_fields = ('station__name', 'reference', 'notes')
    readonly_fields = ('requested_at', 'updated_at')
    date_hierarchy = 'requested_at'
    
    fieldsets = (
        ('Deposit Information', {
            'fields': ('station', 'amount', 'currency', 'payment_method', 'reference')
        }),
        ('Status', {
            'fields': ('status', 'processed_by', 'processed_at', 'rejection_reason')
        }),
        ('Details', {
            'fields': ('notes', 'requested_at', 'updated_at')
        }),
    )
    
    actions = ['approve_deposits', 'reject_deposits']
    
    def approve_deposits(self, request, queryset):
        """Approve selected deposit requests"""
        count = 0
        for deposit in queryset.filter(status='pending'):
            try:
                deposit.approve_and_process(request.user)
                count += 1
            except Exception as e:
                self.message_user(request, f"Failed to approve deposit {deposit.id}: {str(e)}", level='ERROR')
        
        self.message_user(request, f"Successfully approved {count} deposit(s)")
    approve_deposits.short_description = "Approve selected deposits"
    
    def reject_deposits(self, request, queryset):
        """Reject selected deposit requests"""
        # This would need a custom admin action with a form to get rejection reason
        self.message_user(request, "Use the detail page to reject deposits with a reason", level='WARNING')
    reject_deposits.short_description = "Reject selected deposits"