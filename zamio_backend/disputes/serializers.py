from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Dispute, DisputeEvidence, DisputeAuditLog, DisputeComment,
    DisputeNotification, DisputeType, DisputeStatus, DisputePriority
)
from .workflow import DisputeWorkflow

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for dispute-related objects"""
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'first_name', 'last_name', 'user_type']
        read_only_fields = fields


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by = UserBasicSerializer(read_only=True)
    secure_url = serializers.SerializerMethodField()
    file_integrity_status = serializers.SerializerMethodField()
    retention_info = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeEvidence
        fields = [
            'id', 'title', 'description', 'file_type', 'file_size', 'file_category',
            'file_hash', 'access_count', 'last_accessed', 'is_quarantined',
            'quarantine_reason', 'text_content', 'external_url', 'uploaded_by',
            'uploaded_at', 'updated_at', 'secure_url', 'file_integrity_status',
            'retention_info', 'retention_policy', 'delete_after'
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'uploaded_at', 'updated_at', 'file_size',
            'file_hash', 'file_category', 'access_count', 'last_accessed',
            'secure_url', 'file_integrity_status', 'retention_info'
        ]
    
    def get_secure_url(self, obj):
        """Get secure URL for evidence file download"""
        if obj.file and not obj.is_quarantined:
            request = self.context.get('request')
            if request and request.user:
                try:
                    from disputes.services.evidence_security_service import EvidenceAccessService
                    
                    # Check if user has access
                    if EvidenceAccessService.check_evidence_access_permission(request.user, obj.id):
                        url_data = EvidenceAccessService.get_secure_evidence_url(request.user, obj.id)
                        return url_data['evidence_url']
                except Exception:
                    pass
        return None
    
    def get_file_integrity_status(self, obj):
        """Get file integrity verification status"""
        if obj.file and obj.file_hash:
            try:
                is_valid = obj.verify_file_integrity()
                return {
                    'verified': is_valid,
                    'hash': obj.file_hash,
                    'last_checked': obj.updated_at.isoformat() if obj.updated_at else None
                }
            except Exception:
                return {
                    'verified': False,
                    'hash': obj.file_hash,
                    'error': 'Verification failed'
                }
        return None
    
    def get_retention_info(self, obj):
        """Get retention policy information"""
        if obj.retention_policy:
            return {
                'policy': obj.retention_policy,
                'delete_after': obj.delete_after.isoformat() if obj.delete_after else None,
                'days_remaining': self._calculate_days_remaining(obj.delete_after) if obj.delete_after else None
            }
        return None
    
    def _calculate_days_remaining(self, delete_after):
        """Calculate days remaining until deletion"""
        if delete_after:
            from django.utils import timezone
            delta = delete_after - timezone.now()
            return max(0, delta.days)
        return None
    
    def to_representation(self, instance):
        """Customize representation based on user permissions"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Hide sensitive information for non-admin users
        if request and request.user and not (request.user.is_staff or request.user.admin):
            # Remove file hash for security
            data.pop('file_hash', None)
            
            # Hide quarantine details if not quarantined
            if not instance.is_quarantined:
                data.pop('quarantine_reason', None)
        
        # Remove secure_url if file is quarantined
        if instance.is_quarantined:
            data['secure_url'] = None
        
        return data


class DisputeCommentSerializer(serializers.ModelSerializer):
    author = UserBasicSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeComment
        fields = [
            'id', 'content', 'is_internal', 'author', 'parent_comment',
            'created_at', 'updated_at', 'replies'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']
    
    def get_replies(self, obj):
        if obj.replies.exists():
            return DisputeCommentSerializer(
                obj.replies.all(),
                many=True,
                context=self.context
            ).data
        return []


class DisputeAuditLogSerializer(serializers.ModelSerializer):
    actor = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = DisputeAuditLog
        fields = [
            'id', 'action', 'description', 'previous_state', 'new_state',
            'evidence', 'actor', 'timestamp'
        ]
        read_only_fields = fields


class DisputeNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisputeNotification
        fields = [
            'id', 'notification_type', 'title', 'message', 'sent_at',
            'read_at', 'email_sent', 'sms_sent'
        ]
        read_only_fields = fields


class DisputeListSerializer(serializers.ModelSerializer):
    """Serializer for dispute list view with minimal data"""
    submitted_by = UserBasicSerializer(read_only=True)
    assigned_to = UserBasicSerializer(read_only=True)
    evidence_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    days_open = serializers.SerializerMethodField()
    
    class Meta:
        model = Dispute
        fields = [
            'dispute_id', 'title', 'dispute_type', 'status', 'priority',
            'submitted_by', 'assigned_to', 'created_at', 'updated_at',
            'resolved_at', 'evidence_count', 'comments_count', 'days_open'
        ]
        read_only_fields = fields
    
    def get_evidence_count(self, obj):
        return obj.evidence.count()
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_days_open(self, obj):
        from django.utils import timezone
        if obj.resolved_at:
            delta = obj.resolved_at - obj.created_at
        else:
            delta = timezone.now() - obj.created_at
        return delta.days


class DisputeDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single dispute view"""
    submitted_by = UserBasicSerializer(read_only=True)
    assigned_to = UserBasicSerializer(read_only=True)
    evidence = DisputeEvidenceSerializer(many=True, read_only=True)
    comments = DisputeCommentSerializer(many=True, read_only=True)
    audit_logs = DisputeAuditLogSerializer(many=True, read_only=True)
    available_transitions = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    
    # Related object details
    related_track_info = serializers.SerializerMethodField()
    related_station_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Dispute
        fields = [
            'dispute_id', 'title', 'description', 'dispute_type', 'status',
            'priority', 'submitted_by', 'assigned_to', 'related_track',
            'related_detection', 'related_royalty', 'related_station',
            'created_at', 'updated_at', 'resolved_at', 'resolution_summary',
            'resolution_action_taken', 'metadata', 'evidence', 'comments',
            'audit_logs', 'available_transitions', 'timeline',
            'related_track_info', 'related_station_info'
        ]
        read_only_fields = [
            'dispute_id', 'submitted_by', 'created_at', 'updated_at',
            'resolved_at', 'evidence', 'comments', 'audit_logs',
            'available_transitions', 'timeline', 'related_track_info',
            'related_station_info'
        ]
    
    def get_available_transitions(self, obj):
        request = self.context.get('request')
        if request and request.user:
            workflow = DisputeWorkflow()
            return workflow.get_available_transitions(obj, request.user)
        return []
    
    def get_timeline(self, obj):
        workflow = DisputeWorkflow()
        return workflow.get_dispute_timeline(obj)
    
    def get_related_track_info(self, obj):
        if obj.related_track:
            return {
                'id': obj.related_track.id,
                'title': obj.related_track.title,
                'artist': obj.related_track.artist.stage_name if obj.related_track.artist else None
            }
        return None
    
    def get_related_station_info(self, obj):
        if obj.related_station:
            return {
                'id': obj.related_station.id,
                'name': obj.related_station.name,
                'location': getattr(obj.related_station, 'location', None)
            }
        return None


class DisputeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new disputes"""
    
    class Meta:
        model = Dispute
        fields = [
            'title', 'description', 'dispute_type', 'priority',
            'related_track', 'related_detection', 'related_royalty',
            'related_station', 'metadata'
        ]
    
    def validate(self, data):
        # Ensure at least one related object is provided for context
        related_fields = [
            'related_track', 'related_detection', 'related_royalty', 'related_station'
        ]
        
        if not any(data.get(field) for field in related_fields):
            raise serializers.ValidationError(
                "At least one related object (track, detection, royalty, or station) must be provided."
            )
        
        return data
    
    def create(self, validated_data):
        # Set the submitter to the current user
        validated_data['submitted_by'] = self.context['request'].user
        return super().create(validated_data)


class DisputeUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating dispute details"""
    
    class Meta:
        model = Dispute
        fields = [
            'title', 'description', 'priority', 'assigned_to',
            'resolution_summary', 'resolution_action_taken', 'metadata'
        ]
    
    def validate_assigned_to(self, value):
        if value and value.user_type not in ['Admin', 'Mediator']:
            raise serializers.ValidationError(
                "Disputes can only be assigned to Admin or Mediator users."
            )
        return value


class DisputeStatusTransitionSerializer(serializers.Serializer):
    """Serializer for dispute status transitions"""
    new_status = serializers.ChoiceField(choices=DisputeStatus.choices)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    notify = serializers.BooleanField(default=True)
    
    def validate_new_status(self, value):
        dispute = self.context.get('dispute')
        user = self.context.get('user')
        
        if dispute and user:
            workflow = DisputeWorkflow()
            if not workflow.can_transition(dispute, value, user):
                raise serializers.ValidationError(
                    f"Invalid transition from {dispute.status} to {value} for current user."
                )
        
        return value


class DisputeEvidenceCreateSerializer(serializers.ModelSerializer):
    """Serializer for adding evidence to disputes"""
    
    class Meta:
        model = DisputeEvidence
        fields = [
            'title', 'description', 'file', 'text_content', 'external_url'
        ]
    
    def validate(self, data):
        # Ensure at least one type of evidence is provided
        if not any([data.get('file'), data.get('text_content'), data.get('external_url')]):
            raise serializers.ValidationError(
                "At least one form of evidence (file, text content, or external URL) must be provided."
            )
        return data


class DisputeCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for adding comments to disputes"""
    
    class Meta:
        model = DisputeComment
        fields = ['content', 'is_internal', 'parent_comment']
    
    def validate_parent_comment(self, value):
        if value:
            dispute = self.context.get('dispute')
            if value.dispute != dispute:
                raise serializers.ValidationError(
                    "Parent comment must belong to the same dispute."
                )
        return value


class DisputeStatsSerializer(serializers.Serializer):
    """Serializer for dispute statistics"""
    total_disputes = serializers.IntegerField()
    open_disputes = serializers.IntegerField()
    resolved_disputes = serializers.IntegerField()
    by_status = serializers.DictField()
    by_type = serializers.DictField()
    by_priority = serializers.DictField()
    average_resolution_time = serializers.FloatField()
    recent_activity = serializers.ListField()


# Choice serializers for frontend dropdowns
class DisputeChoicesSerializer(serializers.Serializer):
    """Serializer for dispute choice fields"""
    dispute_types = serializers.SerializerMethodField()
    dispute_statuses = serializers.SerializerMethodField()
    dispute_priorities = serializers.SerializerMethodField()
    
    def get_dispute_types(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in DisputeType.choices]
    
    def get_dispute_statuses(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in DisputeStatus.choices]
    
    def get_dispute_priorities(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in DisputePriority.choices]