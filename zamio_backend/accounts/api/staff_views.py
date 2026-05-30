"""
Staff Management API Views
Provides comprehensive staff management functionality for admin users
"""

from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from accounts.models import AuditLog, UserPermission
from stations.models import StationStaff
from core.utils import log_audit_event

User = get_user_model()


class StaffPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'per_page'
    max_page_size = 100


def is_admin_user(user):
    """Check if user has admin privileges"""
    return user.is_authenticated and (user.admin or user.is_staff or user.user_type == 'Admin')


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_staff_overview(request):
    """Get staff management overview statistics"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get staff statistics
        total_staff = User.objects.filter(
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
        ).count()
        
        active_staff = User.objects.filter(
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin'),
            is_active=True
        ).count()
        
        inactive_staff = total_staff - active_staff
        
        # Get recent staff activity
        recent_activity = AuditLog.objects.filter(
            user__in=User.objects.filter(
                Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
            ),
            timestamp__gte=timezone.now() - timezone.timedelta(days=30)
        ).count()
        
        # Get staff by type
        admin_staff = User.objects.filter(admin=True).count()
        regular_staff = User.objects.filter(staff=True, admin=False).count()
        
        # Get station staff statistics
        station_staff_count = StationStaff.objects.filter(active=True).count()
        
        overview_data = {
            'staff_stats': {
                'total_staff': total_staff,
                'active_staff': active_staff,
                'inactive_staff': inactive_staff,
                'admin_staff': admin_staff,
                'regular_staff': regular_staff,
                'station_staff': station_staff_count
            },
            'activity_stats': {
                'recent_activity': recent_activity,
                'last_updated': timezone.now().isoformat()
            }
        }
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='view_staff_overview',
            resource_type='staff_management',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        
        return Response(overview_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to load staff overview',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_all_staff(request):
    """Get paginated list of all staff members with filtering"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Base queryset for staff members
        queryset = User.objects.filter(
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
        ).select_related().prefetch_related('user_permissions')
        
        # Apply filters
        search = request.GET.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        staff_type = request.GET.get('staff_type', '').strip()
        if staff_type == 'admin':
            queryset = queryset.filter(admin=True)
        elif staff_type == 'regular':
            queryset = queryset.filter(staff=True, admin=False)
        
        is_active = request.GET.get('is_active', '').strip()
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)
        
        # Order by
        order_by = request.GET.get('order_by', '-timestamp')
        if order_by in ['timestamp', '-timestamp', 'first_name', '-first_name', 'last_activity', '-last_activity']:
            queryset = queryset.order_by(order_by)
        
        # Paginate results
        paginator = StaffPagination()
        paginated_staff = paginator.paginate_queryset(queryset, request)
        
        # Serialize staff data
        staff_data = []
        for staff_member in paginated_staff:
            staff_info = {
                'user_id': str(staff_member.user_id) if staff_member.user_id else str(staff_member.id),
                'email': staff_member.email,
                'first_name': staff_member.first_name,
                'last_name': staff_member.last_name,
                'photo_url': staff_member.photo.url if staff_member.photo else None,
                'user_type': staff_member.user_type,
                'is_admin': staff_member.admin,
                'is_staff': staff_member.staff,
                'is_active': staff_member.is_active,
                'email_verified': staff_member.email_verified,
                'last_activity': staff_member.last_activity.isoformat() if staff_member.last_activity else None,
                'created_at': staff_member.timestamp.isoformat(),
                'permissions': list(staff_member.user_permissions.filter(is_active=True).values_list('permission', flat=True))
            }
            staff_data.append(staff_info)
        
        response_data = {
            'staff': staff_data,
            'pagination': {
                'page_number': paginator.page.number,
                'per_page': paginator.page_size,
                'total_pages': paginator.page.paginator.num_pages,
                'total_count': paginator.page.paginator.count,
                'has_next': paginator.page.has_next(),
                'has_previous': paginator.page.has_previous(),
            }
        }
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='view_staff_list',
            resource_type='staff_management',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            request_data={'filters': request.GET.dict()}
        )
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to load staff list',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_staff_details(request, staff_id):
    """Get detailed information about a specific staff member"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get staff member
        staff_member = User.objects.select_related().prefetch_related(
            'user_permissions', 'granted_permissions'
        ).get(
            Q(user_id=staff_id) | Q(id=staff_id),
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
        )
        
        # Get recent activity
        recent_activity = AuditLog.objects.filter(
            user=staff_member
        ).order_by('-timestamp')[:10]
        
        # Get permissions
        permissions = staff_member.user_permissions.filter(is_active=True)
        
        staff_details = {
            'user_id': str(staff_member.user_id) if staff_member.user_id else str(staff_member.id),
            'email': staff_member.email,
            'first_name': staff_member.first_name,
            'last_name': staff_member.last_name,
            'photo_url': staff_member.photo.url if staff_member.photo else None,
            'phone': staff_member.phone,
            'country': staff_member.country,
            'user_type': staff_member.user_type,
            'is_admin': staff_member.admin,
            'is_staff': staff_member.staff,
            'is_active': staff_member.is_active,
            'email_verified': staff_member.email_verified,
            'profile_complete': staff_member.profile_complete,
            'kyc_status': staff_member.kyc_status,
            'two_factor_enabled': staff_member.two_factor_enabled,
            'last_activity': staff_member.last_activity.isoformat() if staff_member.last_activity else None,
            'created_at': staff_member.timestamp.isoformat(),
            'permissions': [
                {
                    'permission': perm.permission,
                    'granted_by': f"{perm.granted_by.first_name} {perm.granted_by.last_name}",
                    'granted_at': perm.granted_at.isoformat(),
                    'expires_at': perm.expires_at.isoformat() if perm.expires_at else None
                }
                for perm in permissions
            ],
            'recent_activity': [
                {
                    'action': activity.action,
                    'resource_type': activity.resource_type,
                    'timestamp': activity.timestamp.isoformat(),
                    'ip_address': activity.ip_address
                }
                for activity in recent_activity
            ]
        }
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='view_staff_details',
            resource_type='staff_management',
            resource_id=str(staff_member.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        
        return Response(staff_details, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'Staff member not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to load staff details',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_staff_member(request):
    """Create a new staff member"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['email', 'first_name', 'last_name', 'password']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    'error': f'{field} is required'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        if User.objects.filter(email=data['email']).exists():
            return Response({
                'error': 'User with this email already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create staff member
        staff_member = User.objects.create_user(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            password=data['password'],
            is_staff=data.get('is_staff', True),
            is_admin=data.get('is_admin', False)
        )
        
        # Set additional fields
        staff_member.user_type = data.get('user_type', 'Admin')
        staff_member.phone = data.get('phone', '')
        staff_member.country = data.get('country', '')
        staff_member.email_verified = True  # Admin-created accounts are pre-verified
        staff_member.save()
        
        # Add permissions if provided
        permissions = data.get('permissions', [])
        for permission in permissions:
            UserPermission.objects.create(
                user=staff_member,
                permission=permission,
                granted_by=request.user
            )
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='create_staff_member',
            resource_type='staff_management',
            resource_id=str(staff_member.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            request_data={
                'email': data['email'],
                'user_type': staff_member.user_type,
                'is_admin': staff_member.admin,
                'permissions': permissions
            }
        )
        
        return Response({
            'message': 'Staff member created successfully',
            'staff_id': str(staff_member.user_id) if staff_member.user_id else str(staff_member.id)
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': 'Failed to create staff member',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def update_staff_member(request, staff_id):
    """Update staff member information and permissions"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get staff member
        staff_member = User.objects.get(
            Q(user_id=staff_id) | Q(id=staff_id),
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
        )
        
        data = request.data
        
        # Update basic information
        if 'first_name' in data:
            staff_member.first_name = data['first_name']
        if 'last_name' in data:
            staff_member.last_name = data['last_name']
        if 'phone' in data:
            staff_member.phone = data['phone']
        if 'country' in data:
            staff_member.country = data['country']
        if 'user_type' in data:
            staff_member.user_type = data['user_type']
        
        # Update staff status (only super admins can modify admin status)
        if request.user.admin and 'is_admin' in data:
            staff_member.admin = data['is_admin']
        if 'is_staff' in data:
            staff_member.staff = data['is_staff']
        if 'is_active' in data:
            staff_member.is_active = data['is_active']
        
        staff_member.save()
        
        # Update permissions if provided
        if 'permissions' in data:
            # Deactivate existing permissions
            staff_member.user_permissions.filter(is_active=True).update(is_active=False)
            
            # Add new permissions
            for permission in data['permissions']:
                UserPermission.objects.get_or_create(
                    user=staff_member,
                    permission=permission,
                    defaults={'granted_by': request.user}
                )
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='update_staff_member',
            resource_type='staff_management',
            resource_id=str(staff_member.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            request_data=data
        )
        
        return Response({
            'message': 'Staff member updated successfully'
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'Staff member not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to update staff member',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def deactivate_staff_member(request, staff_id):
    """Deactivate a staff member (soft delete)"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get staff member
        staff_member = User.objects.get(
            Q(user_id=staff_id) | Q(id=staff_id),
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
        )
        
        # Prevent self-deactivation
        if staff_member.id == request.user.id:
            return Response({
                'error': 'Cannot deactivate your own account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Deactivate staff member
        staff_member.is_active = False
        staff_member.save()
        
        # Deactivate permissions
        staff_member.user_permissions.filter(is_active=True).update(is_active=False)
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='deactivate_staff_member',
            resource_type='staff_management',
            resource_id=str(staff_member.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            request_data={'deactivated_user': staff_member.email}
        )
        
        return Response({
            'message': 'Staff member deactivated successfully'
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'Staff member not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to deactivate staff member',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_staff_activity_log(request, staff_id):
    """Get activity log for a specific staff member"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get staff member
        staff_member = User.objects.get(
            Q(user_id=staff_id) | Q(id=staff_id),
            Q(admin=True) | Q(staff=True) | Q(user_type='Admin')
        )
        
        # Get activity log with pagination
        page = int(request.GET.get('page', 1))
        per_page = min(int(request.GET.get('per_page', 20)), 100)
        
        activities = AuditLog.objects.filter(
            user=staff_member
        ).order_by('-timestamp')
        
        # Apply date filter if provided
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if date_from:
            activities = activities.filter(timestamp__gte=date_from)
        if date_to:
            activities = activities.filter(timestamp__lte=date_to)
        
        # Paginate
        total_count = activities.count()
        start = (page - 1) * per_page
        end = start + per_page
        activities = activities[start:end]
        
        activity_data = [
            {
                'id': activity.id,
                'action': activity.action,
                'resource_type': activity.resource_type,
                'resource_id': activity.resource_id,
                'ip_address': activity.ip_address,
                'timestamp': activity.timestamp.isoformat(),
                'status_code': activity.status_code
            }
            for activity in activities
        ]
        
        response_data = {
            'activities': activity_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_count': total_count,
                'total_pages': (total_count + per_page - 1) // per_page
            }
        }
        
        # Log audit event
        log_audit_event(
            user=request.user,
            action='view_staff_activity_log',
            resource_type='staff_management',
            resource_id=str(staff_member.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'Staff member not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to load activity log',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_available_permissions(request):
    """Get list of available permissions that can be assigned to staff"""
    
    if not is_admin_user(request.user):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Define available permissions
    available_permissions = [
        {
            'permission': 'manage_users',
            'description': 'Manage user accounts and profiles',
            'category': 'User Management'
        },
        {
            'permission': 'manage_artists',
            'description': 'Manage artist profiles and content',
            'category': 'Content Management'
        },
        {
            'permission': 'manage_stations',
            'description': 'Manage radio station accounts',
            'category': 'Station Management'
        },
        {
            'permission': 'manage_publishers',
            'description': 'Manage publisher accounts and contracts',
            'category': 'Publisher Management'
        },
        {
            'permission': 'manage_royalties',
            'description': 'Manage royalty calculations and distributions',
            'category': 'Financial Management'
        },
        {
            'permission': 'manage_disputes',
            'description': 'Handle dispute resolution and mediation',
            'category': 'Dispute Management'
        },
        {
            'permission': 'view_analytics',
            'description': 'Access platform analytics and reports',
            'category': 'Analytics'
        },
        {
            'permission': 'manage_system',
            'description': 'System administration and configuration',
            'category': 'System Administration'
        },
        {
            'permission': 'audit_logs',
            'description': 'View and manage audit logs',
            'category': 'Security'
        },
        {
            'permission': 'manage_staff',
            'description': 'Manage staff accounts and permissions',
            'category': 'Staff Management'
        }
    ]
    
    return Response({
        'permissions': available_permissions
    }, status=status.HTTP_200_OK)