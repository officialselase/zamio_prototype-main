from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.contrib.auth import get_user_model

from accounts.permissions import (
    require_permission, 
    require_role, 
    require_kyc_verified,
    IsAdminUser,
    IsArtistUser,
    IsPublisherUser,
    IsKYCVerified
)
from accounts.models import UserPermission, AuditLog

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_role(['Artist'])
def artist_only_view(request):
    """Example view that only artists can access"""
    return Response({
        'message': 'This is an artist-only endpoint',
        'user': request.user.email,
        'user_type': request.user.user_type
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_role(['Publisher'])
def publisher_only_view(request):
    """Example view that only publishers can access"""
    return Response({
        'message': 'This is a publisher-only endpoint',
        'user': request.user.email,
        'user_type': request.user.user_type
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_role(['Admin'])
def admin_only_view(request):
    """Example view that only admins can access"""
    return Response({
        'message': 'This is an admin-only endpoint',
        'user': request.user.email,
        'user_type': request.user.user_type
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission('upload_music')
def upload_music_view(request):
    """Example view that requires specific permission"""
    return Response({
        'message': 'Music upload endpoint - permission verified',
        'user': request.user.email,
        'has_permission': True
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_kyc_verified
def kyc_required_view(request):
    """Example view that requires KYC verification"""
    return Response({
        'message': 'KYC-verified endpoint accessed successfully',
        'user': request.user.email,
        'kyc_status': request.user.kyc_status
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_permissions_view(request):
    """View to get current user's permissions"""
    permissions = UserPermission.objects.filter(
        user=request.user,
        is_active=True
    ).values_list('permission', flat=True)
    
    return Response({
        'user': request.user.email,
        'user_type': request.user.user_type,
        'permissions': list(permissions),
        'kyc_status': request.user.kyc_status,
        'profile_complete': request.user.profile_complete
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def grant_permission_view(request):
    """Admin endpoint to grant permissions to users"""
    user_email = request.data.get('user_email')
    permission = request.data.get('permission')
    
    if not user_email or not permission:
        return Response({
            'error': 'user_email and permission are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_user = User.objects.get(email=user_email)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if permission already exists
    existing_permission = UserPermission.objects.filter(
        user=target_user,
        permission=permission
    ).first()
    
    if existing_permission:
        existing_permission.is_active = True
        existing_permission.granted_by = request.user
        existing_permission.save()
        action = 'reactivated'
    else:
        UserPermission.objects.create(
            user=target_user,
            permission=permission,
            granted_by=request.user
        )
        action = 'granted'
    
    return Response({
        'message': f'Permission {permission} {action} for user {user_email}',
        'user_email': user_email,
        'permission': permission,
        'granted_by': request.user.email
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def revoke_permission_view(request):
    """Admin endpoint to revoke permissions from users"""
    user_email = request.data.get('user_email')
    permission = request.data.get('permission')
    
    if not user_email or not permission:
        return Response({
            'error': 'user_email and permission are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_user = User.objects.get(email=user_email)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Find and deactivate the permission
    user_permission = UserPermission.objects.filter(
        user=target_user,
        permission=permission,
        is_active=True
    ).first()
    
    if not user_permission:
        return Response({
            'error': 'Permission not found or already inactive'
        }, status=status.HTTP_404_NOT_FOUND)
    
    user_permission.is_active = False
    user_permission.save()
    
    return Response({
        'message': f'Permission {permission} revoked from user {user_email}',
        'user_email': user_email,
        'permission': permission,
        'revoked_by': request.user.email
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def audit_logs_view(request):
    """Enhanced admin endpoint to view audit logs with pagination and filtering"""
    from django.core.paginator import Paginator
    from django.utils import timezone
    from datetime import datetime, timedelta
    
    # Verify admin permissions (same pattern as other admin endpoints)
    if not hasattr(request.user, 'mr_admin') or request.user.user_type != 'Admin':
        return Response({
            'message': 'Unauthorized',
            'errors': {'permission': ['Admin access required']}
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get query parameters
    user_email = request.query_params.get('user_email')
    action = request.query_params.get('action')
    resource_type = request.query_params.get('resource_type')
    ip_address = request.query_params.get('ip_address')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    page = int(request.query_params.get('page', 1))
    per_page = int(request.query_params.get('per_page', 50))
    
    # Build query
    logs = AuditLog.objects.all().order_by('-timestamp')
    
    # Apply filters
    if user_email:
        try:
            user = User.objects.get(email=user_email)
            logs = logs.filter(user=user)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    if action:
        logs = logs.filter(action__icontains=action)
    
    if resource_type:
        logs = logs.filter(resource_type=resource_type)
    
    if ip_address:
        logs = logs.filter(ip_address=ip_address)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            logs = logs.filter(timestamp__gte=start_dt)
        except ValueError:
            return Response({
                'error': 'Invalid start_date format. Use ISO format.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            logs = logs.filter(timestamp__lte=end_dt)
        except ValueError:
            return Response({
                'error': 'Invalid end_date format. Use ISO format.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Paginate results
    paginator = Paginator(logs, per_page)
    page_obj = paginator.get_page(page)
    
    # Serialize logs
    log_data = []
    for log in page_obj:
        log_data.append({
            'id': log.id,
            'user': log.user.email if log.user else 'System',
            'user_id': str(log.user.user_id) if log.user and log.user.user_id else None,
            'action': log.action,
            'resource_type': log.resource_type,
            'resource_id': log.resource_id,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'status_code': log.status_code,
            'timestamp': log.timestamp.isoformat(),
            'trace_id': str(log.trace_id) if log.trace_id else None,
            'request_data': log.request_data,
            'response_data': log.response_data
        })
    
    # Get summary statistics
    total_logs = logs.count()
    unique_users = logs.values('user').distinct().count()
    unique_actions = logs.values('action').distinct().count()
    
    # Recent activity summary (last 24 hours)
    last_24h = timezone.now() - timedelta(hours=24)
    recent_activity = logs.filter(timestamp__gte=last_24h).count()
    
    return Response({
        'logs': log_data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_pages': paginator.num_pages,
            'total_count': total_logs,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        },
        'summary': {
            'total_logs': total_logs,
            'unique_users': unique_users,
            'unique_actions': unique_actions,
            'recent_activity_24h': recent_activity
        },
        'filters_applied': {
            'user_email': user_email,
            'action': action,
            'resource_type': resource_type,
            'ip_address': ip_address,
            'start_date': start_date,
            'end_date': end_date
        }
    })