"""
Enhanced Authentication Components
Includes middleware, error handlers, and authentication utilities
"""

import uuid
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import JsonResponse
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed
from django.utils.deprecation import MiddlewareMixin

from accounts.models import AuditLog

User = get_user_model()


class EnhancedTokenAuthentication(TokenAuthentication):
    """
    Enhanced token authentication with security features
    """
    
    def authenticate_credentials(self, key):
        model = self.get_model()
        try:
            token = model.objects.select_related('user').get(key=key)
        except model.DoesNotExist:
            raise AuthenticationFailed('Invalid token.')

        if not token.user.is_active:
            raise AuthenticationFailed('User inactive or deleted.')

        # Check if account is locked
        if token.user.account_locked_until and token.user.account_locked_until > timezone.now():
            raise AuthenticationFailed('Account is temporarily locked due to security reasons.')

        # Update last activity
        token.user.last_activity = timezone.now()
        token.user.save(update_fields=['last_activity'])

        return (token.user, token)


class AuthenticationAuditMiddleware(MiddlewareMixin):
    """
    Middleware to audit authentication events and security incidents
    """
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def process_response(self, request, response):
        """Log authentication-related responses"""
        
        # Only log authentication endpoints
        auth_paths = [
            '/api/accounts/login-', '/api/accounts/logout-', 
            '/api/accounts/register-', '/api/accounts/verify-',
            '/api/accounts/forgot-', '/api/accounts/reset-'
        ]
        
        if not any(path in request.path for path in auth_paths):
            return response
        
        # Extract metadata
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Determine action based on path and method
        action = self._determine_action(request.path, request.method, response.status_code)
        
        if action:
            try:
                # Get user if authenticated
                user = getattr(request, 'user', None)
                if user and user.is_anonymous:
                    user = None
                
                # Create audit log
                AuditLog.objects.create(
                    user=user,
                    action=action,
                    resource_type='authentication',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_data=self._extract_safe_request_data(request),
                    response_data={'status_code': response.status_code},
                    status_code=response.status_code,
                    trace_id=uuid.uuid4()
                )
            except Exception as e:
                # Don't break the response flow if audit logging fails
                print(f"Audit logging failed: {str(e)}")
        
        return response
    
    def _determine_action(self, path, method, status_code):
        """Determine the audit action based on request details"""
        if 'login' in path and method == 'POST':
            return 'login_success' if status_code == 200 else 'login_failed'
        elif 'logout' in path and method == 'POST':
            return 'logout_success' if status_code == 200 else 'logout_failed'
        elif 'register' in path and method == 'POST':
            return 'registration_success' if status_code == 201 else 'registration_failed'
        elif 'verify' in path:
            return 'verification_success' if status_code == 200 else 'verification_failed'
        elif 'forgot' in path or 'reset' in path:
            return 'password_reset_request' if status_code == 200 else 'password_reset_failed'
        return None
    
    def _extract_safe_request_data(self, request):
        """Extract safe request data (excluding sensitive information)"""
        safe_data = {}
        
        if hasattr(request, 'data'):
            for key, value in request.data.items():
                if key.lower() not in ['password', 'token', 'otp', 'secret']:
                    safe_data[key] = value
        
        safe_data['method'] = request.method
        safe_data['path'] = request.path
        
        return safe_data


class SecurityEventHandler:
    """
    Handler for security events and incidents
    """
    
    @staticmethod
    def handle_failed_login(user_email, ip_address, user_agent=None, reason='invalid_credentials'):
        """Handle failed login attempts with rate limiting"""
        try:
            user = User.objects.get(email=user_email)
            
            # Increment failed attempts
            user.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts for 30 minutes
            if user.failed_login_attempts >= 5:
                user.account_locked_until = timezone.now() + timedelta(minutes=30)
                
                # Create security incident log
                AuditLog.objects.create(
                    user=user,
                    action='account_locked',
                    resource_type='security',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_data={
                        'reason': 'multiple_failed_logins',
                        'failed_attempts': user.failed_login_attempts,
                        'locked_until': user.account_locked_until.isoformat()
                    },
                    response_data={'account_locked': True},
                    status_code=423  # Locked
                )
            
            user.save(update_fields=['failed_login_attempts', 'account_locked_until'])
            
            return {
                'account_locked': user.account_locked_until is not None,
                'failed_attempts': user.failed_login_attempts,
                'locked_until': user.account_locked_until.isoformat() if user.account_locked_until else None
            }
            
        except User.DoesNotExist:
            # Still log the attempt even if user doesn't exist
            AuditLog.objects.create(
                user=None,
                action='login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=user_agent,
                request_data={'email': user_email, 'reason': 'user_not_found'},
                response_data={'error': 'invalid_credentials'},
                status_code=400
            )
            return {'account_locked': False, 'failed_attempts': 0}
    
    @staticmethod
    def handle_successful_login(user, ip_address, user_agent=None):
        """Handle successful login events"""
        # Reset failed login attempts
        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.save(update_fields=['failed_login_attempts', 'account_locked_until'])
        
        # Update last activity
        user.last_activity = timezone.now()
        user.save(update_fields=['last_activity'])
        
        # Create success audit log
        AuditLog.objects.create(
            user=user,
            action='login_success',
            resource_type='authentication',
            resource_id=str(user.user_id) if user.user_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data={'user_type': user.user_type},
            response_data={'success': True},
            status_code=200
        )
    
    @staticmethod
    def handle_suspicious_activity(user, activity_type, details, ip_address, user_agent=None):
        """Handle suspicious activity detection"""
        AuditLog.objects.create(
            user=user,
            action='suspicious_activity',
            resource_type='security',
            resource_id=str(user.user_id) if user.user_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data={
                'activity_type': activity_type,
                'details': details,
                'timestamp': timezone.now().isoformat()
            },
            response_data={'flagged': True},
            status_code=200
        )


def authentication_error_handler(exc, context):
    """
    Custom error handler for authentication failures
    """
    request = context.get('request')
    
    if request:
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Log authentication error
        AuditLog.objects.create(
            user=getattr(request, 'user', None) if hasattr(request, 'user') and not request.user.is_anonymous else None,
            action='authentication_error',
            resource_type='authentication',
            ip_address=ip_address,
            user_agent=user_agent,
            request_data={
                'error_type': exc.__class__.__name__,
                'error_message': str(exc),
                'path': request.path,
                'method': request.method
            },
            response_data={'authentication_failed': True},
            status_code=401
        )
    
    return JsonResponse({
        'message': 'Authentication failed',
        'errors': {'authentication': [str(exc)]},
        'timestamp': timezone.now().isoformat()
    }, status=401)


class SessionSecurityValidator:
    """
    Validator for session security checks
    """
    
    @staticmethod
    def validate_session_integrity(user, request):
        """Validate session integrity and detect anomalies"""
        current_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        current_user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Get recent login from same user
        recent_login = AuditLog.objects.filter(
            user=user,
            action='login_success',
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).order_by('-timestamp').first()
        
        anomalies = []
        
        if recent_login:
            # Check for IP address changes
            if recent_login.ip_address and recent_login.ip_address != current_ip:
                anomalies.append({
                    'type': 'ip_change',
                    'previous_ip': recent_login.ip_address,
                    'current_ip': current_ip
                })
            
            # Check for user agent changes (simplified check)
            if recent_login.user_agent and recent_login.user_agent != current_user_agent:
                anomalies.append({
                    'type': 'user_agent_change',
                    'previous_agent': recent_login.user_agent[:50],  # Truncated for logging
                    'current_agent': current_user_agent[:50]
                })
        
        # Log anomalies if found
        if anomalies:
            SecurityEventHandler.handle_suspicious_activity(
                user=user,
                activity_type='session_anomaly',
                details=anomalies,
                ip_address=current_ip,
                user_agent=current_user_agent
            )
        
        return {
            'valid': True,  # For now, we just log anomalies but don't block
            'anomalies': anomalies,
            'risk_score': len(anomalies)  # Simple risk scoring
        }