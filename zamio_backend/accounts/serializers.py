"""
Accounts Serializers
Provides serialization for User and related models
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserPermission, AuditLog, KYCDocument

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer for staff management"""
    
    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'first_name', 'last_name', 'photo',
            'phone', 'country', 'user_type', 'is_active', 'email_verified',
            'profile_complete', 'kyc_status', 'two_factor_enabled',
            'last_activity', 'timestamp', 'staff', 'admin'
        ]
        read_only_fields = ['user_id', 'timestamp', 'last_activity']


class UserPermissionSerializer(serializers.ModelSerializer):
    """Serializer for user permissions"""
    
    granted_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPermission
        fields = [
            'id', 'permission', 'granted_by', 'granted_by_name',
            'granted_at', 'expires_at', 'is_active'
        ]
        read_only_fields = ['id', 'granted_at']
    
    def get_granted_by_name(self, obj):
        if obj.granted_by:
            return f"{obj.granted_by.first_name} {obj.granted_by.last_name}"
        return "System"


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""
    
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'resource_type',
            'resource_id', 'ip_address', 'user_agent', 'request_data',
            'response_data', 'status_code', 'timestamp', 'trace_id'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else "System"


class KYCDocumentSerializer(serializers.ModelSerializer):
    """Serializer for KYC documents"""
    
    user_email = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = KYCDocument
        fields = [
            'id', 'user', 'user_email', 'document_type', 'file',
            'original_filename', 'file_size', 'content_type', 'status',
            'notes', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'uploaded_at', 'updated_at', 'expires_at'
        ]
        read_only_fields = [
            'id', 'file_size', 'file_hash', 'content_type',
            'uploaded_at', 'updated_at'
        ]
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else "Unknown"
    
    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}"
        return None


class StaffCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating staff members"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password',
            'phone', 'country', 'user_type', 'staff', 'admin',
            'permissions'
        ]
    
    def create(self, validated_data):
        permissions = validated_data.pop('permissions', [])
        password = validated_data.pop('password')
        
        # Create user
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Set email as verified for admin-created accounts
        user.email_verified = True
        user.save()
        
        # Add permissions if provided
        request_user = self.context.get('request_user')
        for permission in permissions:
            UserPermission.objects.create(
                user=user,
                permission=permission,
                granted_by=request_user
            )
        
        return user


class StaffUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating staff members"""
    
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'country',
            'user_type', 'staff', 'admin', 'is_active', 'permissions'
        ]
    
    def update(self, instance, validated_data):
        permissions = validated_data.pop('permissions', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update permissions if provided
        if permissions is not None:
            request_user = self.context.get('request_user')
            
            # Deactivate existing permissions
            instance.user_permissions.filter(is_active=True).update(is_active=False)
            
            # Add new permissions
            for permission in permissions:
                UserPermission.objects.get_or_create(
                    user=instance,
                    permission=permission,
                    defaults={'granted_by': request_user}
                )
        
        return instance


class StaffDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for staff member details"""
    
    permissions = UserPermissionSerializer(source='user_permissions', many=True, read_only=True)
    recent_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'first_name', 'last_name', 'photo',
            'phone', 'country', 'user_type', 'is_active', 'email_verified',
            'profile_complete', 'kyc_status', 'two_factor_enabled',
            'last_activity', 'timestamp', 'staff', 'admin', 'permissions',
            'recent_activity'
        ]
        read_only_fields = ['user_id', 'timestamp', 'last_activity']
    
    def get_recent_activity(self, obj):
        recent_logs = AuditLog.objects.filter(user=obj).order_by('-timestamp')[:10]
        return AuditLogSerializer(recent_logs, many=True).data