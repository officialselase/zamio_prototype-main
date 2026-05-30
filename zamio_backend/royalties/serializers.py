from rest_framework import serializers

from .models import (
    PartnerPRO,
    ReciprocalAgreement,
    RoyaltyCycle,
    RoyaltyLineItem,
    PartnerRemittance,
    RoyaltyRateStructure,
    CurrencyExchangeRate,
    RoyaltyCalculationAudit,
    RoyaltyWithdrawal,
)


class PartnerPROSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerPRO
        fields = [
            "id",
            "display_name",
            "company_name",
            "country_code",
            "contact_email",
            "reporting_standard",
            "default_admin_fee_percent",
            "active",
            "metadata",
        ]


class ReciprocalAgreementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReciprocalAgreement
        fields = [
            "id",
            "partner",
            "territory",
            "effective_date",
            "expiry_date",
            "admin_fee_percent",
            "status",
            "reporting_frequency",
            "notes",
        ]


class RoyaltyCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoyaltyCycle
        fields = [
            "id",
            "name",
            "territory",
            "period_start",
            "period_end",
            "status",
            "admin_fee_percent_default",
            "created_at",
        ]


class RoyaltyLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoyaltyLineItem
        fields = [
            "id",
            "royalty_cycle",
            "partner",
            "external_work",
            "external_recording",
            "usage_count",
            "total_duration_seconds",
            "gross_amount",
            "admin_fee_amount",
            "net_amount",
            "calculation_notes",
        ]


class PartnerRemittanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerRemittance
        fields = [
            "id",
            "partner",
            "royalty_cycle",
            "currency",
            "gross_amount",
            "admin_fee_amount",
            "net_payable",
            "payment_reference",
            "statement_file",
            "status",
            "sent_at",
            "settled_at",
            "notes",
            "created_at",
        ]


class ImportRequestSerializer(serializers.Serializer):
    csv_path = serializers.CharField()
    dry_run = serializers.BooleanField(required=False, default=False)


class UploadRepertoireSerializer(serializers.Serializer):
    file = serializers.FileField()
    dry_run = serializers.BooleanField(required=False, default=False)


class SecureFinancialFileUploadSerializer(serializers.Serializer):
    """Serializer for secure financial file uploads"""
    file = serializers.FileField(
        help_text="Financial data file (CSV, Excel, JSON, XML)"
    )
    file_category = serializers.ChoiceField(
        choices=[
            ('auto', 'Auto-detect'),
            ('repertoire', 'Repertoire/Catalog'),
            ('usage_report', 'Usage Report'),
            ('royalty_data', 'Royalty Data'),
            ('partner_data', 'Partner Data')
        ],
        default='auto',
        help_text="Category of financial data"
    )
    encrypt_storage = serializers.BooleanField(
        default=True,
        help_text="Whether to encrypt the stored file"
    )
    process_async = serializers.BooleanField(
        default=True,
        help_text="Whether to process the file asynchronously"
    )
    
    def validate_file(self, value):
        """Validate file size and type"""
        # Basic validation - detailed validation happens in the service
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError(f"File size exceeds maximum allowed size of {max_size} bytes")
        
        allowed_types = {
            'text/csv', 'application/csv', 'text/plain',
            'application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json', 'text/json',
            'application/xml', 'text/xml'
        }
        
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(f"File type {value.content_type} is not allowed")
        
        return value


class FileIntegrityVerificationSerializer(serializers.Serializer):
    """Serializer for file integrity verification requests"""
    upload_ids = serializers.ListField(
        child=serializers.CharField(max_length=16),
        min_length=1,
        max_length=50,
        help_text="List of upload IDs to verify (max 50)"
    )


class RoyaltyRateStructureSerializer(serializers.ModelSerializer):
    station_class_display = serializers.CharField(source='get_station_class_display', read_only=True)
    time_period_display = serializers.CharField(source='get_time_period_display', read_only=True)
    
    class Meta:
        model = RoyaltyRateStructure
        fields = [
            'id', 'name', 'station_class', 'station_class_display',
            'time_period', 'time_period_display', 'base_rate_per_second',
            'multiplier', 'effective_date', 'expiry_date', 'currency',
            'territory', 'notes', 'is_active', 'created_at', 'updated_at'
        ]


class CurrencyExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyExchangeRate
        fields = [
            'id', 'from_currency', 'to_currency', 'rate',
            'effective_date', 'source', 'is_active', 'created_at'
        ]


class RoyaltyCalculationAuditSerializer(serializers.ModelSerializer):
    calculated_by_email = serializers.CharField(source='calculated_by.email', read_only=True)
    
    class Meta:
        model = RoyaltyCalculationAudit
        fields = [
            'id', 'calculation_id', 'calculation_type', 'total_amount',
            'currency', 'distributions_count', 'calculation_metadata',
            'rate_structure_used', 'errors', 'calculated_by_email',
            'calculated_at'
        ]


class RoyaltyWithdrawalSerializer(serializers.ModelSerializer):
    """Serializer for royalty withdrawal requests with publishing status validation"""
    requester_email = serializers.CharField(source='requester.email', read_only=True)
    artist_name = serializers.CharField(source='artist.stage_name', read_only=True)
    publisher_name = serializers.CharField(source='publisher.company_name', read_only=True)
    processed_by_email = serializers.CharField(source='processed_by.email', read_only=True)
    
    class Meta:
        model = RoyaltyWithdrawal
        fields = [
            'id', 'withdrawal_id', 'requester', 'requester_email', 'requester_type',
            'amount', 'currency', 'artist', 'artist_name', 'publisher', 'publisher_name',
            'status', 'publishing_status_validated', 'validation_notes',
            'payment_method', 'payment_details', 'processed_by', 'processed_by_email',
            'processed_at', 'rejection_reason', 'admin_notes', 'requested_at', 'updated_at'
        ]
        read_only_fields = [
            'withdrawal_id', 'publishing_status_validated', 'validation_notes',
            'processed_by', 'processed_at', 'requester_email', 'artist_name',
            'publisher_name', 'processed_by_email'
        ]
    
    def validate(self, data):
        """Validate withdrawal request data"""
        requester_type = data.get('requester_type')
        artist = data.get('artist')
        publisher = data.get('publisher')
        
        if requester_type == 'artist' and not artist:
            raise serializers.ValidationError("Artist must be specified for artist withdrawals")
        
        if requester_type == 'publisher' and not publisher:
            raise serializers.ValidationError("Publisher must be specified for publisher withdrawals")
        
        if data.get('amount', 0) <= 0:
            raise serializers.ValidationError("Withdrawal amount must be greater than zero")
        
        return data


class RoyaltyWithdrawalCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new royalty withdrawal requests"""
    
    class Meta:
        model = RoyaltyWithdrawal
        fields = [
            'requester_type', 'amount', 'currency', 'artist', 'publisher',
            'payment_method', 'payment_details', 'admin_notes'
        ]
    
    def validate(self, data):
        """Validate withdrawal creation data"""
        requester_type = data.get('requester_type')
        artist = data.get('artist')
        publisher = data.get('publisher')
        
        if requester_type == 'artist':
            if not artist:
                raise serializers.ValidationError("Artist must be specified for artist withdrawals")
        elif requester_type == 'publisher':
            if not publisher:
                raise serializers.ValidationError("Publisher must be specified for publisher withdrawals")
        elif requester_type != 'admin':
            raise serializers.ValidationError("Invalid requester type")
        
        if data.get('amount', 0) <= 0:
            raise serializers.ValidationError("Withdrawal amount must be greater than zero")
        
        return data
    
    def create(self, validated_data):
        """Create withdrawal request with requester set from context"""
        validated_data['requester'] = self.context['request'].user
        return super().create(validated_data)


class RoyaltyWithdrawalActionSerializer(serializers.Serializer):
    """Serializer for withdrawal actions (approve, reject, process, cancel)"""
    action = serializers.ChoiceField(
        choices=['approve', 'reject', 'process', 'cancel'],
        help_text="Action to perform on the withdrawal"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for rejection or cancellation"
    )
    admin_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Additional admin notes"
    )
    
    def validate(self, data):
        """Validate action data"""
        action = data.get('action')
        reason = data.get('reason', '')
        
        if action in ['reject', 'cancel'] and not reason.strip():
            raise serializers.ValidationError(f"Reason is required for {action} action")
        
        return data
