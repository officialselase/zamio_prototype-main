import logging
from celery import chain
from django.core.mail import send_mail
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from django.conf import settings
from django.contrib.auth import get_user_model
from django.template.loader import get_template
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from accounts.api.serializers import UserRegistrationSerializer
from accounts.api.token_utils import get_jwt_tokens_for_user
from accounts.api.custom_jwt import CustomJWTAuthentication
from accounts.models import AuditLog
from accounts.services import EmailVerificationService
from activities.models import AllActivity
from django.core.mail import send_mail
from django.contrib.auth import get_user_model, authenticate

from rest_framework.permissions import AllowAny


from rest_framework.views import APIView

from accounts.api.serializers import UserRegistrationSerializer
from activities.models import AllActivity
from core.tasks import send_generic_email
from core.utils import generate_email_token, is_valid_email, is_valid_password

logger = logging.getLogger(__name__)
from mr_admin.models import MrAdmin


User = get_user_model()



@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def register_admin_view(request):

    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        email = request.data.get('email', "").lower()
        first_name = request.data.get('first_name', "")
        last_name = request.data.get('last_name', "")
        phone = request.data.get('phone', "")
        password = request.data.get('password', "")
        password2 = request.data.get('password2', "")
        organization_name = (
            request.data.get('organization_name', "")
            or request.data.get('organization', "")
            or request.data.get('company_name', "")
            or request.data.get('company', "")
        ).strip()
        role = (request.data.get('role', "") or request.data.get('admin_role', "")).strip()


        if not email:
            errors['email'] = ['User Email is required.']
        elif not is_valid_email(email):
            errors['email'] = ['Valid email required.']
        elif check_email_exist(email):
            errors['email'] = ['Email already exists in our database.']

        if not first_name:
            errors['first_name'] = ['First Name is required.']

        if not last_name:
            errors['last_name'] = ['last Name is required.']

        if not phone:
            errors['phone'] = ['Phone number is required.']

        if not password:
            errors['password'] = ['Password is required.']

        if not password2:
            errors['password2'] = ['Password2 is required.']

        if password != password2:
            errors['password'] = ['Passwords dont match.']

        if not is_valid_password(password):
            errors['password'] = ['Password must be at least 8 characters long\n- Must include at least one uppercase letter,\n- One lowercase letter, one digit,\n- And one special character']

        if not organization_name:
            org_error = ['Organization name is required.']
            errors['organization_name'] = org_error
            errors['company'] = org_error

        if not role:
            errors['role'] = ['Role is required.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.phone = phone
            user.user_type = "Admin"
            user.admin = True  # Set admin flag
            user.staff = True  # Set staff flag
            user.save()

            data["user_id"] = str(user.user_id)
            data["email"] = user.email
            data["first_name"] = user.first_name
            data["last_name"] = user.last_name
            data["photo"] = getattr(user.photo, 'url', None)

            # Initialize admin profile with required non-null fields
            admin_profile = MrAdmin.objects.create(
                user=user,
                city='',
                postal_code='',
                organization_name=organization_name,
                role=role,
            )
            admin_profile.save()

            # Log admin registration
            AuditLog.objects.create(
                user=None,  # System action during registration
                action='admin_registered',
                resource_type='user',
                resource_id=str(user.user_id),
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'phone': phone,
                    'organization_name': organization_name,
                    'role': role,
                },
                response_data={
                    'success': True,
                    'user_id': str(user.user_id),
                    'admin_id': str(admin_profile.admin_id),
                    'user_type': 'Admin',
                    'admin_flag': True,
                    'staff_flag': True,
                    'organization_name': organization_name,
                    'role': role,
                },
                status_code=201
            )

            data['phone'] = user.phone
            data['photo'] = getattr(user.photo, 'url', None)
            data['organization_name'] = admin_profile.organization_name
            data['role'] = admin_profile.role

        token = Token.objects.get(user=user)
        jwt_tokens = get_jwt_tokens_for_user(user)
        data['token'] = token.key
        data['access_token'] = jwt_tokens['access']
        data['refresh_token'] = jwt_tokens['refresh']

        try:
            # Use the new Celery email task system for email verification
            from accounts.email_utils import send_verification_email
            task_id = send_verification_email(user)
            data['email_task_id'] = task_id
            
        except Exception as e:
            # Log the error but don't fail registration
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send verification email during admin registration: {str(e)}")
            # Continue with registration even if email fails


#
        new_activity = AllActivity.objects.create(
            user=user,
            subject="User Registration",
            body=user.email + " Just created an account."
        )
        new_activity.save()

        payload['message'] = "Successful"
        payload['data'] = data

    return Response(payload)





def check_email_exist(email):

    qs = User.objects.filter(email=email)
    if qs.exists():
        return True
    else:
        return False


class AdminLogin(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = {}
        data = {}
        errors = {}

        # Get client IP for audit logging
        ip_address = self.get_client_ip(request)

        email = request.data.get('email', '').lower()
        password = request.data.get('password', '')
        fcm_token = request.data.get('fcm_token', '')

        if not email:
            errors['email'] = ['Email is required.']

        if not password:
            errors['password'] = ['Password is required.']

        if not fcm_token:
            errors['fcm_token'] = ['FCM device token is required.']

        try:
            qs = User.objects.filter(email=email)
        except User.DoesNotExist:
            errors['email'] = ['User does not exist.']

        if qs.exists():
            not_active = qs.filter(email_verified=False)
            if not_active:
                errors['email'] = ["Please check your email to confirm your account or resend confirmation email."]

        try:
            admin = MrAdmin.objects.get(user__email=email)
        except:
            errors['email'] = ['User is not an Admin']

        if not check_password(email, password):
            errors['password'] = ['Invalid Credentials']

        user = authenticate(email=email, password=password)

        if not user:
            errors['email'] = ['Invalid Credentials']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            
            # Log failed admin login attempt
            AuditLog.objects.create(
                user=user if user else None,
                action='admin_login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={'email': email, 'errors': list(errors.keys())},
                response_data={'error': 'authentication_failed'},
                status_code=400
            )
            
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = Token.objects.get(user=user)
        except Token.DoesNotExist:
            token = Token.objects.create(user=user)
        jwt_tokens = get_jwt_tokens_for_user(user)

        user.fcm_token = fcm_token
        user.last_activity = timezone.now()
        user.failed_login_attempts = 0  # Reset failed attempts on successful login
        user.save()

        data["user_id"] = str(user.user_id)
        data["admin_id"] = admin.admin_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = getattr(user.photo, 'url', None)
        data["country"] = user.country
        data["phone"] = user.phone
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["organization_name"] = admin.organization_name
        data["role"] = admin.role
        needs_profile = not (admin.city and admin.postal_code)
        data["next_step"] = 'profile' if needs_profile else 'done'
        data["onboarding_step"] = data["next_step"]
        data["progress"] = {
            'profile_completed': not needs_profile,
        }
        data["profile"] = {
            'address': admin.address,
            'city': admin.city,
            'postal_code': admin.postal_code,
            'active': admin.active,
            'organization_name': admin.organization_name,
            'role': admin.role,
        }

        payload['message'] = "Successful"
        payload['data'] = data

        # Create activity log
        new_activity = AllActivity.objects.create(
            user=user,
            subject="Admin Login",
            body=user.email + " Just logged in."
        )

        # Log successful admin login
        AuditLog.objects.create(
            user=user,
            action='admin_login_success',
            resource_type='authentication',
            resource_id=str(admin.admin_id),
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'email': email},
            response_data={'success': True, 'admin_id': str(admin.admin_id)},
            status_code=200
        )

        return Response(payload, status=status.HTTP_200_OK)

    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip




def check_password(email, password):

    try:
        user = User.objects.get(email=email)
        return user.check_password(password)
    except User.DoesNotExist:
        return False





@api_view(['POST', ])
@permission_classes([AllowAny])
@authentication_classes([])
def resend_email_verification(request):
    """
    Resend email verification using the new Celery email task system.
    
    Requirements: 1.1 - Email verification queued using Celery
    """
    payload = {}
    data = {}
    errors = {}
    email_errors = []

    email = request.data.get('email', '').lower()

    if not email:
        email_errors.append('Email is required.')
    if email_errors:
        errors['email'] = email_errors
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    qs = User.objects.filter(email=email)
    if not qs.exists():
        email_errors.append('Email does not exist.')
        if email_errors:
            errors['email'] = email_errors
            payload['message'] = "Error"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_404_NOT_FOUND)

    user = User.objects.filter(email=email).first()
    
    # Check if email is already verified
    if user.email_verified:
        payload['message'] = "Email is already verified"
        payload['data'] = {"email": user.email, "user_id": str(user.user_id)}
        return Response(payload, status=status.HTTP_200_OK)

    try:
        # Use the new Celery email task system
        from accounts.email_utils import send_verification_email
        task_id = send_verification_email(user)
        
        data["email"] = user.email
        data["user_id"] = str(user.user_id)
        data["task_id"] = task_id

        # Create activity log
        new_activity = AllActivity.objects.create(
            user=user,
            subject="Email verification resent",
            body="Email verification resent to " + user.email,
        )
        new_activity.save()

        payload['message'] = "Email verification sent successfully"
        payload['data'] = data

        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        errors['system'] = [f'Failed to send verification email: {str(e)}']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------- Admin Email Verification ----------
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import TokenAuthentication


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_admin_email(request):
    """
    Verify admin email using verification token (backward compatible).
    
    Requirements: 5.3, 10.1, 10.2 - Token verification with backward compatibility
    """
    payload = {}
    data = {}
    
    email = request.data.get('email', '').lower().strip()
    email_token = request.data.get('email_token', '').strip()
    
    # Get client IP for audit logging
    ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    
    # Validate input
    if not email:
        payload['message'] = "Errors"
        payload['errors'] = {'email': ['Email is required.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    if not email_token:
        payload['message'] = "Errors"
        payload['errors'] = {'email_token': ['Token is required.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Use verification service for consistent handling
    verification_service = EmailVerificationService()
    result = verification_service.verify_token(email, email_token, ip_address)
    
    if not result['success']:
        # Maintain backward compatibility with old error format
        errors = {}
        if result['error_code'] == 'USER_NOT_FOUND':
            errors['email'] = ['Email does not exist.']
        elif result['error_code'] == 'INVALID_TOKEN':
            errors['email_token'] = ['Invalid Token.']
        elif result['error_code'] == 'ALREADY_VERIFIED':
            errors['email'] = ['Email is already verified.']
        else:
            errors['general'] = [result['message']]
        
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Verification successful - get user and prepare response
    try:
        user = User.objects.get(email=email)
        
        # Get or create auth token
        try:
            token = Token.objects.get(user=user)
        except Token.DoesNotExist:
            token = Token.objects.create(user=user)
        
        # Get admin profile
        admin = MrAdmin.objects.filter(user=user).first()
        jwt_tokens = get_jwt_tokens_for_user(user)

        needs_profile = True
        admin_id = None
        progress = {'profile_completed': False}
        organization_name = ''
        admin_role = ''
        if admin:
            admin_id = admin.admin_id
            needs_profile = not (admin.city and admin.postal_code)
            progress['profile_completed'] = not needs_profile
            organization_name = admin.organization_name
            admin_role = admin.role

        # Prepare response data (maintain backward compatibility)
        data["user_id"] = str(user.user_id)
        data["admin_id"] = admin_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if getattr(user.photo, 'url', None) else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["organization_name"] = organization_name
        data["role"] = admin_role
        data["next_step"] = 'profile' if needs_profile else 'done'
        data["onboarding_step"] = data["next_step"]
        data["progress"] = progress
        data["profile"] = {
            'address': getattr(admin, 'address', ''),
            'city': getattr(admin, 'city', ''),
            'postal_code': getattr(admin, 'postal_code', ''),
            'active': getattr(admin, 'active', False),
            'organization_name': organization_name,
            'role': admin_role,
        }
        
        payload['message'] = "Successful"
        payload['data'] = data
        
        # Create activity log (maintain backward compatibility)
        new_activity = AllActivity.objects.create(
            user=user,
            subject="Verify Email",
            body=user.email + " just verified their email",
        )
        new_activity.save()
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        payload['message'] = "Errors"
        payload['errors'] = {'email': ['Email does not exist.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in verify_admin_email: {str(e)}")
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['An error occurred during verification']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_admin_email_code(request):
    """
    Verify admin email using 4-digit verification code.
    
    Requirements: 3.4, 5.2, 5.3 - Code verification with proper error handling
    """
    payload = {}
    data = {}
    
    email = request.data.get('email', '').lower().strip()
    code = request.data.get('code', '').strip()
    
    # Get client IP for audit logging
    ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    
    # Validate input
    if not email:
        payload['message'] = "Email is required"
        payload['errors'] = {'email': ['Email is required']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    if not code:
        payload['message'] = "Verification code is required"
        payload['errors'] = {'code': ['Verification code is required']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate code format (4 digits)
    if not code.isdigit() or len(code) != 4:
        payload['message'] = "Invalid code format"
        payload['errors'] = {'code': ['Verification code must be 4 digits']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Use verification service
    verification_service = EmailVerificationService()
    result = verification_service.verify_code(email, code, ip_address)
    
    if not result['success']:
        payload['message'] = result['message']
        payload['error_code'] = result['error_code']
        
        # Add specific error details for client handling
        if 'attempts_remaining' in result:
            payload['attempts_remaining'] = result['attempts_remaining']
        if 'retry_after' in result:
            payload['retry_after'] = result['retry_after']
        
        return Response(payload, status=result['status_code'])
    
    # Verification successful - get user and prepare response
    try:
        user = User.objects.get(email=email)
        
        # Get or create auth token
        try:
            token = Token.objects.get(user=user)
        except Token.DoesNotExist:
            token = Token.objects.create(user=user)
        jwt_tokens = get_jwt_tokens_for_user(user)

        admin = MrAdmin.objects.filter(user=user).first()
        needs_profile = True
        admin_id = None
        progress = {'profile_completed': False}
        organization_name = ''
        admin_role = ''
        if admin:
            admin_id = admin.admin_id
            needs_profile = not (admin.city and admin.postal_code)
            progress['profile_completed'] = not needs_profile
            organization_name = admin.organization_name
            admin_role = admin.role

        # Prepare response data
        data["user_id"] = str(user.user_id)
        data["admin_id"] = admin_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if getattr(user.photo, 'url', None) else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["organization_name"] = organization_name
        data["role"] = admin_role
        data["next_step"] = 'profile' if needs_profile else 'done'
        data["onboarding_step"] = data["next_step"]
        data["progress"] = progress
        data["profile"] = {
            'address': getattr(admin, 'address', ''),
            'city': getattr(admin, 'city', ''),
            'postal_code': getattr(admin, 'postal_code', ''),
            'active': getattr(admin, 'active', False),
            'organization_name': organization_name,
            'role': admin_role,
        }

        payload['message'] = "Email verified successfully"
        payload['data'] = data
        
        # Create activity log
        AllActivity.objects.create(
            user=user,
            subject="Verify Email",
            body=f"{user.email} verified their email using verification code",
        )
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        payload['message'] = "User not found"
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in verify_admin_email_code: {str(e)}")
        payload['message'] = "An error occurred during verification"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------- Admin Onboarding ----------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def admin_onboarding_status_view(request):
    payload = {}
    data = {}

    user = request.user
    admin = MrAdmin.objects.filter(user=user).first()
    if not admin:
        return Response({
            'message': 'Errors',
            'errors': {'admin': ['Admin profile not found.']}
        }, status=status.HTTP_404_NOT_FOUND)

    # Determine next step: require city and postal_code at minimum
    needs_profile = not (admin.city and admin.postal_code)
    next_step = 'profile' if needs_profile else 'done'

    data["user_id"] = str(user.user_id)
    data["admin_id"] = admin.admin_id
    data["next_step"] = next_step
    data["onboarding_step"] = next_step
    data["progress"] = {
        'profile_completed': not needs_profile,
    }
    data["profile"] = {
        'address': admin.address,
        'city': admin.city,
        'postal_code': admin.postal_code,
        'active': admin.active,
        'organization_name': admin.organization_name,
        'role': admin.role,
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_admin_profile_view(request):
    payload = {}
    data = {}
    errors = {}

    address = request.data.get('address', '')
    city = request.data.get('city', '')
    postal_code = request.data.get('postal_code', '')

    if not city:
        errors['city'] = ['City is required.']
    if not postal_code:
        errors['postal_code'] = ['Postal code is required.']

    admin = MrAdmin.objects.filter(user=request.user).first()
    if not admin:
        errors['admin'] = ['Admin profile not found.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if address:
        admin.address = address
    admin.city = city
    admin.postal_code = postal_code
    admin.active = True
    admin.save()

    data['admin_id'] = admin.admin_id
    data['next_step'] = 'done'
    data['onboarding_step'] = 'done'
    data['progress'] = {
        'profile_completed': True,
    }
    data['profile'] = {
        'address': admin.address,
        'city': admin.city,
        'postal_code': admin.postal_code,
        'active': admin.active,
        'organization_name': admin.organization_name,
        'role': admin.role,
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
