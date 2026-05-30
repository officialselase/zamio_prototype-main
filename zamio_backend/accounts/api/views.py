"""
Enhanced Authentication and Session Management Views
Implements comprehensive logout, session cleanup, audit logging, and error handling
"""

import uuid
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
try:
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

from accounts.models import AuditLog, UserPermission
from activities.models import AllActivity

User = get_user_model()


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def create_audit_log(user, action, resource_type=None, resource_id=None, 
                    request_data=None, response_data=None, status_code=None,
                    ip_address=None, user_agent=None, trace_id=None):
    """Create comprehensive audit log entry"""
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type or 'authentication',
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data=request_data or {},
            response_data=response_data or {},
            status_code=status_code,
            trace_id=trace_id or uuid.uuid4()
        )
    except Exception as e:
        # Log audit creation failure but don't break the main flow
        print(f"Failed to create audit log: {str(e)}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
@csrf_exempt
def logout_view(request):
    """
    Enhanced logout endpoint with comprehensive session cleanup and audit logging
    Supports both Token and JWT authentication
    """
    payload = {}
    data = {}
    errors = {}
    
    # Extract request metadata
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    trace_id = uuid.uuid4()
    
    try:
        with transaction.atomic():
            user = request.user
            
            # Validate user is active
            if not user.is_active:
                errors['user'] = ['Account is deactivated']
                payload['message'] = 'Error'
                payload['errors'] = errors
                
                create_audit_log(
                    user=user,
                    action='logout_failed',
                    request_data={'reason': 'account_deactivated'},
                    response_data={'error': 'account_deactivated'},
                    status_code=400,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    trace_id=trace_id
                )
                
                return Response(payload, status=status.HTTP_400_BAD_REQUEST)
            
            # Session cleanup operations
            cleanup_results = {
                'token_invalidated': False,
                'jwt_blacklisted': False,
                'fcm_cleared': False,
                'session_data_cleared': False
            }
            
            # 1. Invalidate DRF Token
            try:
                token = Token.objects.get(user=user)
                token.delete()
                cleanup_results['token_invalidated'] = True
            except Token.DoesNotExist:
                pass  # Token already deleted or doesn't exist
            
            # 2. Blacklist JWT tokens if using JWT
            jwt_token = request.data.get('refresh_token')
            if jwt_token and JWT_AVAILABLE:
                try:
                    refresh_token = RefreshToken(jwt_token)
                    refresh_token.blacklist()
                    cleanup_results['jwt_blacklisted'] = True
                except Exception as e:
                    # Log JWT blacklist failure but continue
                    create_audit_log(
                        user=user,
                        action='jwt_blacklist_failed',
                        request_data={'error': str(e)},
                        ip_address=ip_address,
                        user_agent=user_agent,
                        trace_id=trace_id
                    )
            
            # 3. Clear FCM token for security
            if user.fcm_token:
                user.fcm_token = None
                cleanup_results['fcm_cleared'] = True
            
            # 4. Clear sensitive session data
            user.otp_code = None
            user.email_token = None
            user.last_activity = timezone.now()
            user.save(update_fields=['fcm_token', 'otp_code', 'email_token', 'last_activity'])
            cleanup_results['session_data_cleared'] = True
            
            # 5. Create activity log
            try:
                AllActivity.objects.create(
                    user=user,
                    type="Authentication",
                    subject="User Logout",
                    body=f"{user.email} successfully logged out from {ip_address}"
                )
            except Exception as e:
                # Log activity creation failure but continue
                print(f"Failed to create activity log: {str(e)}")
            
            # Prepare response data
            data = {
                'message': 'Successfully logged out',
                'user_id': str(user.user_id) if user.user_id else None,
                'email': user.email,
                'logout_timestamp': timezone.now().isoformat(),
                'session_cleanup': cleanup_results,
                'trace_id': str(trace_id)
            }
            
            # Create comprehensive audit log
            create_audit_log(
                user=user,
                action='logout_success',
                resource_id=str(user.user_id) if user.user_id else None,
                request_data={
                    'user_type': user.user_type,
                    'jwt_provided': bool(jwt_token)
                },
                response_data={
                    'success': True,
                    'cleanup_results': cleanup_results
                },
                status_code=200,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id
            )
            
            payload['message'] = 'Successful'
            payload['data'] = data
            
            return Response(payload, status=status.HTTP_200_OK)
            
    except Exception as e:
        # Handle unexpected errors
        error_message = str(e)
        
        create_audit_log(
            user=getattr(request, 'user', None),
            action='logout_error',
            request_data={'error': error_message},
            response_data={'system_error': True},
            status_code=500,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response({
            'message': 'Error',
            'errors': {'system': ['An unexpected error occurred during logout']},
            'trace_id': str(trace_id)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
@csrf_exempt
def invalidate_all_sessions_view(request):
    """
    Invalidate all active sessions for the current user
    Useful for security incidents or when user wants to log out from all devices
    """
    payload = {}
    data = {}
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    trace_id = uuid.uuid4()
    
    try:
        with transaction.atomic():
            user = request.user
            
            # Track what was invalidated
            invalidation_results = {
                'tokens_deleted': 0,
                'jwt_tokens_blacklisted': 0,
                'fcm_cleared': False,
                'session_data_cleared': False
            }
            
            # 1. Delete all DRF tokens for this user
            deleted_tokens = Token.objects.filter(user=user).delete()
            invalidation_results['tokens_deleted'] = deleted_tokens[0] if deleted_tokens[0] else 0
            
            # 2. Blacklist all outstanding JWT tokens
            if JWT_AVAILABLE:
                try:
                    outstanding_tokens = OutstandingToken.objects.filter(user=user)
                    for token in outstanding_tokens:
                        if not BlacklistedToken.objects.filter(token=token).exists():
                            BlacklistedToken.objects.create(token=token)
                            invalidation_results['jwt_tokens_blacklisted'] += 1
                except Exception as e:
                    # JWT blacklist might not be available
                    pass
            
            # 3. Clear all session-related data
            user.fcm_token = None
            user.otp_code = None
            user.email_token = None
            user.last_activity = timezone.now()
            user.save(update_fields=['fcm_token', 'otp_code', 'email_token', 'last_activity'])
            
            invalidation_results['fcm_cleared'] = True
            invalidation_results['session_data_cleared'] = True
            
            # Create activity log
            try:
                AllActivity.objects.create(
                    user=user,
                    type="Security",
                    subject="All Sessions Invalidated",
                    body=f"{user.email} invalidated all active sessions from {ip_address}"
                )
            except Exception:
                pass
            
            data = {
                'message': 'All sessions invalidated successfully',
                'user_id': str(user.user_id) if user.user_id else None,
                'invalidation_results': invalidation_results,
                'timestamp': timezone.now().isoformat(),
                'trace_id': str(trace_id)
            }
            
            # Create audit log
            create_audit_log(
                user=user,
                action='invalidate_all_sessions',
                resource_id=str(user.user_id) if user.user_id else None,
                request_data={'initiated_by': 'user'},
                response_data=invalidation_results,
                status_code=200,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id
            )
            
            payload['message'] = 'Successful'
            payload['data'] = data
            
            return Response(payload, status=status.HTTP_200_OK)
            
    except Exception as e:
        create_audit_log(
            user=getattr(request, 'user', None),
            action='invalidate_all_sessions_error',
            request_data={'error': str(e)},
            status_code=500,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response({
            'message': 'Error',
            'errors': {'system': ['Failed to invalidate sessions']},
            'trace_id': str(trace_id)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def session_status_view(request):
    """
    Get current session status and security information
    """
    payload = {}
    data = {}
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    trace_id = uuid.uuid4()
    
    try:
        user = request.user
        
        # Get session information
        session_info = {
            'user_id': str(user.user_id) if user.user_id else None,
            'email': user.email,
            'user_type': user.user_type,
            'is_active': user.is_active,
            'email_verified': user.email_verified,
            'profile_complete': user.profile_complete,
            'kyc_status': user.kyc_status,
            'two_factor_enabled': user.two_factor_enabled,
            'last_activity': user.last_activity.isoformat() if user.last_activity else None,
            'account_locked_until': user.account_locked_until.isoformat() if user.account_locked_until else None,
            'failed_login_attempts': user.failed_login_attempts,
            'current_ip': ip_address,
            'session_valid': True
        }
        
        # Get active tokens count
        active_tokens = Token.objects.filter(user=user).count()
        session_info['active_token_sessions'] = active_tokens
        
        # Get recent login activity (last 10 entries)
        recent_logins = AuditLog.objects.filter(
            user=user,
            action__in=['login_success', 'logout_success', 'login_failed']
        ).order_by('-timestamp')[:10]
        
        session_info['recent_activity'] = [
            {
                'action': log.action,
                'timestamp': log.timestamp.isoformat(),
                'ip_address': log.ip_address,
                'status_code': log.status_code
            }
            for log in recent_logins
        ]
        
        data = session_info
        payload['message'] = 'Successful'
        payload['data'] = data
        
        # Log session status check
        create_audit_log(
            user=user,
            action='session_status_check',
            resource_id=str(user.user_id) if user.user_id else None,
            response_data={'session_valid': True},
            status_code=200,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        create_audit_log(
            user=getattr(request, 'user', None),
            action='session_status_error',
            request_data={'error': str(e)},
            status_code=500,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response({
            'message': 'Error',
            'errors': {'system': ['Failed to retrieve session status']},
            'trace_id': str(trace_id)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def authentication_audit_logs_view(request):
    """
    Get authentication-related audit logs for the current user
    """
    payload = {}
    data = {}
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    trace_id = uuid.uuid4()
    
    try:
        user = request.user
        
        # Get pagination parameters
        page = int(request.GET.get('page', 1))
        per_page = min(int(request.GET.get('per_page', 20)), 100)  # Max 100 per page
        
        # Get authentication-related logs
        auth_actions = [
            'login_success', 'login_failed', 'logout_success', 'logout_failed',
            'password_reset', 'password_changed', 'email_verified',
            'two_factor_enabled', 'two_factor_disabled', 'account_locked',
            'session_status_check', 'invalidate_all_sessions'
        ]
        
        logs_queryset = AuditLog.objects.filter(
            user=user,
            action__in=auth_actions
        ).order_by('-timestamp')
        
        # Simple pagination
        start = (page - 1) * per_page
        end = start + per_page
        logs = logs_queryset[start:end]
        total_count = logs_queryset.count()
        
        # Format logs
        formatted_logs = []
        for log in logs:
            formatted_logs.append({
                'id': log.id,
                'action': log.action,
                'timestamp': log.timestamp.isoformat(),
                'ip_address': log.ip_address,
                'user_agent': log.user_agent[:100] if log.user_agent else None,  # Truncate for readability
                'status_code': log.status_code,
                'resource_type': log.resource_type,
                'success': log.status_code and log.status_code < 400
            })
        
        data = {
            'logs': formatted_logs,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_count': total_count,
                'total_pages': (total_count + per_page - 1) // per_page,
                'has_next': end < total_count,
                'has_previous': page > 1
            }
        }
        
        payload['message'] = 'Successful'
        payload['data'] = data
        
        # Log audit access
        create_audit_log(
            user=user,
            action='view_auth_audit_logs',
            resource_id=str(user.user_id) if user.user_id else None,
            request_data={'page': page, 'per_page': per_page},
            response_data={'logs_returned': len(formatted_logs)},
            status_code=200,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        create_audit_log(
            user=getattr(request, 'user', None),
            action='view_auth_audit_logs_error',
            request_data={'error': str(e)},
            status_code=500,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response({
            'message': 'Error',
            'errors': {'system': ['Failed to retrieve audit logs']},
            'trace_id': str(trace_id)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])
@authentication_classes([])
@csrf_exempt
def location_search_view(request):
    """
    Location search API with autocomplete functionality
    Provides location suggestions based on query parameter
    """
    payload = {}
    data = {}
    
    try:
        query = request.GET.get('q', '').strip()
        
        if not query:
            return Response({
                'message': 'Error',
                'errors': {'query': ['Query parameter "q" is required']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(query) < 2:
            return Response({
                'message': 'Error',
                'errors': {'query': ['Query must be at least 2 characters long']}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, we'll provide a basic list of common locations
        # In a production environment, this would integrate with a proper geocoding service
        # like Google Places API, Mapbox, or OpenStreetMap Nominatim
        
        common_locations = [
            # Major cities worldwide
            "New York, NY, USA",
            "Los Angeles, CA, USA", 
            "Chicago, IL, USA",
            "Houston, TX, USA",
            "Phoenix, AZ, USA",
            "Philadelphia, PA, USA",
            "San Antonio, TX, USA",
            "San Diego, CA, USA",
            "Dallas, TX, USA",
            "San Jose, CA, USA",
            "Austin, TX, USA",
            "Jacksonville, FL, USA",
            "Fort Worth, TX, USA",
            "Columbus, OH, USA",
            "Charlotte, NC, USA",
            "San Francisco, CA, USA",
            "Indianapolis, IN, USA",
            "Seattle, WA, USA",
            "Denver, CO, USA",
            "Washington, DC, USA",
            "Boston, MA, USA",
            "El Paso, TX, USA",
            "Nashville, TN, USA",
            "Detroit, MI, USA",
            "Oklahoma City, OK, USA",
            "Portland, OR, USA",
            "Las Vegas, NV, USA",
            "Memphis, TN, USA",
            "Louisville, KY, USA",
            "Baltimore, MD, USA",
            "Milwaukee, WI, USA",
            "Albuquerque, NM, USA",
            "Tucson, AZ, USA",
            "Fresno, CA, USA",
            "Sacramento, CA, USA",
            "Mesa, AZ, USA",
            "Kansas City, MO, USA",
            "Atlanta, GA, USA",
            "Long Beach, CA, USA",
            "Colorado Springs, CO, USA",
            "Raleigh, NC, USA",
            "Miami, FL, USA",
            "Virginia Beach, VA, USA",
            "Omaha, NE, USA",
            "Oakland, CA, USA",
            "Minneapolis, MN, USA",
            "Tulsa, OK, USA",
            "Arlington, TX, USA",
            "Tampa, FL, USA",
            "New Orleans, LA, USA",
            # International cities
            "London, UK",
            "Paris, France",
            "Berlin, Germany",
            "Madrid, Spain",
            "Rome, Italy",
            "Amsterdam, Netherlands",
            "Brussels, Belgium",
            "Vienna, Austria",
            "Prague, Czech Republic",
            "Warsaw, Poland",
            "Stockholm, Sweden",
            "Oslo, Norway",
            "Copenhagen, Denmark",
            "Helsinki, Finland",
            "Dublin, Ireland",
            "Lisbon, Portugal",
            "Athens, Greece",
            "Budapest, Hungary",
            "Zurich, Switzerland",
            "Toronto, Canada",
            "Vancouver, Canada",
            "Montreal, Canada",
            "Calgary, Canada",
            "Ottawa, Canada",
            "Sydney, Australia",
            "Melbourne, Australia",
            "Brisbane, Australia",
            "Perth, Australia",
            "Adelaide, Australia",
            "Tokyo, Japan",
            "Osaka, Japan",
            "Seoul, South Korea",
            "Beijing, China",
            "Shanghai, China",
            "Hong Kong",
            "Singapore",
            "Mumbai, India",
            "Delhi, India",
            "Bangalore, India",
            "Chennai, India",
            "Kolkata, India",
            "São Paulo, Brazil",
            "Rio de Janeiro, Brazil",
            "Buenos Aires, Argentina",
            "Mexico City, Mexico",
            "Lima, Peru",
            "Bogotá, Colombia",
            "Santiago, Chile",
            "Caracas, Venezuela",
            "Cairo, Egypt",
            "Lagos, Nigeria",
            "Johannesburg, South Africa",
            "Cape Town, South Africa",
            "Nairobi, Kenya",
            "Casablanca, Morocco",
            "Tel Aviv, Israel",
            "Dubai, UAE",
            "Riyadh, Saudi Arabia",
            "Kuwait City, Kuwait",
            "Doha, Qatar",
            "Bangkok, Thailand",
            "Manila, Philippines",
            "Jakarta, Indonesia",
            "Kuala Lumpur, Malaysia",
            "Ho Chi Minh City, Vietnam",
            "Hanoi, Vietnam"
        ]
        
        # Filter locations based on query (case-insensitive)
        query_lower = query.lower()
        matching_locations = [
            location for location in common_locations 
            if query_lower in location.lower()
        ]
        
        # Limit results to 10 for better UX
        matching_locations = matching_locations[:10]
        
        # Format results
        suggestions = []
        for location in matching_locations:
            suggestions.append({
                'value': location,
                'label': location,
                'type': 'city'
            })
        
        data = {
            'query': query,
            'suggestions': suggestions,
            'count': len(suggestions)
        }
        
        payload['message'] = 'Successful'
        payload['data'] = data
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Error',
            'errors': {'system': ['An error occurred while searching locations']},
            'debug': str(e) if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
@csrf_exempt
def user_profile_view(request):
    """
    Enhanced user profile management endpoint with comprehensive edit functionality
    GET: Retrieve user profile data
    PUT/PATCH: Update user profile data including location and photo
    """
    payload = {}
    data = {}
    errors = {}
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    trace_id = uuid.uuid4()
    
    try:
        user = request.user
        
        if request.method == 'GET':
            # Return user profile data
            profile_data = {
                'user_id': str(user.user_id) if user.user_id else None,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': user.phone,
                'country': user.country,
                'location': user.location,
                'user_type': user.user_type,
                'profile_complete': user.profile_complete,
                'verified': user.verified,
                'email_verified': user.email_verified,
                'kyc_status': user.kyc_status,
                'verification_status': user.verification_status,
                'photo': user.photo.url if user.photo else None,
                'timestamp': user.timestamp.isoformat() if user.timestamp else None,
                'last_activity': user.last_activity.isoformat() if user.last_activity else None
            }
            
            data = profile_data
            payload['message'] = 'Successful'
            payload['data'] = data
            
            # Log profile access
            create_audit_log(
                user=user,
                action='profile_viewed',
                resource_id=str(user.user_id) if user.user_id else None,
                response_data={'fields_accessed': list(profile_data.keys())},
                status_code=200,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id
            )
            
            return Response(payload, status=status.HTTP_200_OK)
            
        elif request.method in ['PUT', 'PATCH']:
            # Update user profile data
            with transaction.atomic():
                # Extract data from request
                first_name = request.data.get('first_name')
                last_name = request.data.get('last_name')
                username = request.data.get('username')
                phone = request.data.get('phone')
                country = request.data.get('country')
                location = request.data.get('location')
                photo = request.FILES.get('photo')
                
                # Password change fields
                current_password = request.data.get('current_password')
                new_password = request.data.get('new_password')
                
                # Store old values for audit logging
                old_values = {
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'username': user.username,
                    'phone': user.phone,
                    'country': user.country,
                    'location': user.location,
                    'photo': user.photo.name if user.photo else None
                }
                
                # Track changes
                changes_made = {}
                validation_errors = {}
                
                # Validate and update fields if provided
                if first_name is not None:
                    first_name = first_name.strip()
                    if len(first_name) < 1:
                        validation_errors['first_name'] = ['First name is required']
                    elif len(first_name) > 255:
                        validation_errors['first_name'] = ['First name is too long']
                    elif first_name != old_values['first_name']:
                        user.first_name = first_name
                        changes_made['first_name'] = {'old': old_values['first_name'], 'new': first_name}
                        
                if last_name is not None:
                    last_name = last_name.strip()
                    if len(last_name) < 1:
                        validation_errors['last_name'] = ['Last name is required']
                    elif len(last_name) > 255:
                        validation_errors['last_name'] = ['Last name is too long']
                    elif last_name != old_values['last_name']:
                        user.last_name = last_name
                        changes_made['last_name'] = {'old': old_values['last_name'], 'new': last_name}
                
                if username is not None:
                    username = username.strip().lower()
                    if username and username != old_values['username']:
                        # Check if username is already taken
                        if User.objects.filter(username=username).exclude(id=user.id).exists():
                            validation_errors['username'] = ['Username is already taken']
                        elif len(username) < 3:
                            validation_errors['username'] = ['Username must be at least 3 characters']
                        elif len(username) > 255:
                            validation_errors['username'] = ['Username is too long']
                        else:
                            user.username = username
                            changes_made['username'] = {'old': old_values['username'], 'new': username}
                        
                if phone is not None:
                    phone = phone.strip()
                    if phone and phone != old_values['phone']:
                        # Basic phone validation
                        if len(phone) > 20:
                            validation_errors['phone'] = ['Phone number is too long']
                        else:
                            user.phone = phone
                            changes_made['phone'] = {'old': old_values['phone'], 'new': phone}
                    elif not phone and old_values['phone']:
                        user.phone = ''
                        changes_made['phone'] = {'old': old_values['phone'], 'new': ''}
                        
                if country is not None:
                    country = country.strip()
                    if country != old_values['country']:
                        if len(country) > 255:
                            validation_errors['country'] = ['Country name is too long']
                        else:
                            user.country = country
                            changes_made['country'] = {'old': old_values['country'], 'new': country}
                        
                if location is not None:
                    location = location.strip()
                    if location != old_values['location']:
                        if len(location) > 255:
                            validation_errors['location'] = ['Location is too long']
                        else:
                            user.location = location
                            changes_made['location'] = {'old': old_values['location'], 'new': location}
                
                # Handle photo upload with enhanced validation
                if photo:
                    try:
                        # Validate file type and size using existing validators
                        from accounts.models import validate_file_type, validate_file_size
                        validate_file_type(photo)
                        validate_file_size(photo)
                        
                        # Delete old photo if it exists and is not the default
                        if user.photo and 'default' not in user.photo.name:
                            try:
                                user.photo.delete(save=False)
                            except Exception:
                                pass  # Continue even if old photo deletion fails
                        
                        user.photo = photo
                        changes_made['photo'] = {
                            'old': old_values['photo'], 
                            'new': photo.name,
                            'size': photo.size,
                            'content_type': getattr(photo, 'content_type', 'unknown')
                        }
                    except ValidationError as e:
                        validation_errors['photo'] = e.messages if hasattr(e, 'messages') else [str(e)]
                
                # Handle password change
                if new_password:
                    if not current_password:
                        validation_errors['current_password'] = ['Current password is required to change password']
                    elif not user.check_password(current_password):
                        validation_errors['current_password'] = ['Current password is incorrect']
                    elif len(new_password) < 8:
                        validation_errors['new_password'] = ['New password must be at least 8 characters long']
                    else:
                        user.set_password(new_password)
                        changes_made['password'] = {'changed': True}
                        
                        # Invalidate all other sessions when password is changed
                        from rest_framework.authtoken.models import Token
                        Token.objects.filter(user=user).delete()
                        Token.objects.create(user=user)  # Create new token
                
                # Return validation errors if any
                if validation_errors:
                    payload['message'] = 'Validation Error'
                    payload['errors'] = validation_errors
                    
                    create_audit_log(
                        user=user,
                        action='profile_update_failed',
                        resource_id=str(user.user_id) if user.user_id else None,
                        request_data={'validation_errors': validation_errors},
                        response_data={'error': 'validation_failed'},
                        status_code=400,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        trace_id=trace_id
                    )
                    
                    return Response(payload, status=status.HTTP_400_BAD_REQUEST)
                
                # Save changes if any were made
                if changes_made:
                    user.save()
                    
                    # Create activity log
                    try:
                        AllActivity.objects.create(
                            user=user,
                            type="Profile",
                            subject="Profile Updated",
                            body=f"{user.email} updated their profile from {ip_address}"
                        )
                    except Exception:
                        pass
                
                # Return updated profile data
                updated_data = {
                    'user_id': str(user.user_id) if user.user_id else None,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone,
                    'country': user.country,
                    'location': user.location,
                    'user_type': user.user_type,
                    'profile_complete': user.profile_complete,
                    'verified': user.verified,
                    'email_verified': user.email_verified,
                    'kyc_status': user.kyc_status,
                    'verification_status': user.verification_status,
                    'photo': user.photo.url if user.photo else None,
                    'changes_made': changes_made,
                    'updated_at': timezone.now().isoformat()
                }
                
                data = updated_data
                payload['message'] = 'Successful'
                payload['data'] = data
                
                # Log profile update
                create_audit_log(
                    user=user,
                    action='profile_updated',
                    resource_id=str(user.user_id) if user.user_id else None,
                    request_data={
                        'fields_updated': list(changes_made.keys()),
                        'method': request.method
                    },
                    response_data={
                        'success': True,
                        'changes_made': changes_made
                    },
                    status_code=200,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    trace_id=trace_id
                )
                
                return Response(payload, status=status.HTTP_200_OK)
                
    except Exception as e:
        create_audit_log(
            user=getattr(request, 'user', None),
            action='profile_management_error',
            request_data={'error': str(e), 'method': request.method},
            status_code=500,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response({
            'message': 'Error',
            'errors': {'system': ['An error occurred while managing profile']},
            'trace_id': str(trace_id)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
@csrf_exempt
def user_preferences_view(request):
    """
    User preferences management endpoint
    GET: Retrieve user preferences
    PATCH: Update user preferences
    """
    from accounts.models import UserPreferences
    
    payload = {}
    data = {}
    errors = {}
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    trace_id = uuid.uuid4()
    
    try:
        user = request.user
        
        # Get or create user preferences
        preferences, created = UserPreferences.objects.get_or_create(
            user=user,
            defaults={
                'email_notifications': True,
                'sms_notifications': False,
                'push_notifications': True,
                'marketing_emails': False,
                'royalty_alerts': True,
                'match_notifications': True,
                'weekly_reports': True,
                'sound_notifications': True,
                'privacy_profile_public': False,
                'privacy_show_earnings': False,
                'privacy_show_plays': True,
                'theme_preference': 'system',
                'language': 'en',
                'timezone': 'UTC',
            }
        )
        
        if request.method == 'GET':
            # Return user preferences data
            preferences_data = {
                'email_notifications': preferences.email_notifications,
                'sms_notifications': preferences.sms_notifications,
                'push_notifications': preferences.push_notifications,
                'marketing_emails': preferences.marketing_emails,
                'royalty_alerts': preferences.royalty_alerts,
                'match_notifications': preferences.match_notifications,
                'weekly_reports': preferences.weekly_reports,
                'sound_notifications': preferences.sound_notifications,
                'privacy_profile_public': preferences.privacy_profile_public,
                'privacy_show_earnings': preferences.privacy_show_earnings,
                'privacy_show_plays': preferences.privacy_show_plays,
                'theme_preference': preferences.theme_preference,
                'language': preferences.language,
                'timezone': preferences.timezone,
            }
            
            data = preferences_data
            payload['message'] = 'Successful'
            payload['data'] = data
            
            # Log preferences access
            create_audit_log(
                user=user,
                action='preferences_viewed',
                resource_id=str(user.user_id) if user.user_id else None,
                response_data={'fields_accessed': list(preferences_data.keys())},
                status_code=200,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id
            )
            
            return Response(payload, status=status.HTTP_200_OK)
            
        elif request.method == 'PATCH':
            # Update user preferences
            old_values = {
                'email_notifications': preferences.email_notifications,
                'sms_notifications': preferences.sms_notifications,
                'push_notifications': preferences.push_notifications,
                'marketing_emails': preferences.marketing_emails,
                'royalty_alerts': preferences.royalty_alerts,
                'match_notifications': preferences.match_notifications,
                'weekly_reports': preferences.weekly_reports,
                'sound_notifications': preferences.sound_notifications,
                'privacy_profile_public': preferences.privacy_profile_public,
                'privacy_show_earnings': preferences.privacy_show_earnings,
                'privacy_show_plays': preferences.privacy_show_plays,
                'theme_preference': preferences.theme_preference,
                'language': preferences.language,
                'timezone': preferences.timezone,
            }
            
            # Track changes
            changes_made = {}
            
            # Update notification preferences
            for field in ['email_notifications', 'sms_notifications', 'push_notifications', 
                         'marketing_emails', 'royalty_alerts', 'match_notifications', 
                         'weekly_reports', 'sound_notifications']:
                if field in request.data:
                    new_value = request.data[field]
                    if new_value != old_values[field]:
                        setattr(preferences, field, new_value)
                        changes_made[field] = {'old': old_values[field], 'new': new_value}
            
            # Update privacy preferences
            for field in ['privacy_profile_public', 'privacy_show_earnings', 'privacy_show_plays']:
                if field in request.data:
                    new_value = request.data[field]
                    if new_value != old_values[field]:
                        setattr(preferences, field, new_value)
                        changes_made[field] = {'old': old_values[field], 'new': new_value}
            
            # Update theme and appearance preferences
            for field in ['theme_preference', 'language', 'timezone']:
                if field in request.data:
                    new_value = request.data[field]
                    if new_value != old_values[field]:
                        setattr(preferences, field, new_value)
                        changes_made[field] = {'old': old_values[field], 'new': new_value}
            
            # Save changes
            preferences.save()
            
            # Return updated preferences data
            updated_data = {
                'email_notifications': preferences.email_notifications,
                'sms_notifications': preferences.sms_notifications,
                'push_notifications': preferences.push_notifications,
                'marketing_emails': preferences.marketing_emails,
                'royalty_alerts': preferences.royalty_alerts,
                'match_notifications': preferences.match_notifications,
                'weekly_reports': preferences.weekly_reports,
                'sound_notifications': preferences.sound_notifications,
                'privacy_profile_public': preferences.privacy_profile_public,
                'privacy_show_earnings': preferences.privacy_show_earnings,
                'privacy_show_plays': preferences.privacy_show_plays,
                'theme_preference': preferences.theme_preference,
                'language': preferences.language,
                'timezone': preferences.timezone,
                'changes_made': changes_made
            }
            
            data = updated_data
            payload['message'] = 'Successful'
            payload['data'] = data
            
            # Log preferences update
            create_audit_log(
                user=user,
                action='preferences_updated',
                resource_id=str(user.user_id) if user.user_id else None,
                request_data={
                    'fields_updated': list(changes_made.keys())
                },
                response_data={
                    'success': True,
                    'changes_made': changes_made
                },
                status_code=200,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id
            )
            
            # Create activity log
            try:
                AllActivity.objects.create(
                    user=user,
                    type="Preferences",
                    subject="Preferences Updated",
                    body=f"{user.email} updated their preferences from {ip_address}"
                )
            except Exception:
                pass
            
            return Response(payload, status=status.HTTP_200_OK)
            
    except Exception as e:
        create_audit_log(
            user=getattr(request, 'user', None),
            action='preferences_management_error',
            request_data={'error': str(e)},
            status_code=500,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id
        )
        
        return Response({
            'message': 'Error',
            'errors': {'system': ['An error occurred while managing preferences']},
            'trace_id': str(trace_id)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)