import json
import logging
from decimal import Decimal
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
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from accounts.api.serializers import UserRegistrationSerializer
from accounts.api.token_utils import get_jwt_tokens_for_user
from accounts.models import AuditLog
from accounts.api.enhanced_auth import SecurityEventHandler
from accounts.services import EmailVerificationService
from activities.models import AllActivity
from django.core.mail import send_mail
from django.contrib.auth import get_user_model, authenticate

from rest_framework.views import APIView

from accounts.api.serializers import UserRegistrationSerializer
from activities.models import AllActivity
from bank_account.models import BankAccount
from stations.models import Station, StationStaff, ROLE_CHOICES
from core.utils import generate_email_token, is_valid_email, is_valid_password

logger = logging.getLogger(__name__)

User = get_user_model()

AUTHENTICATION_CLASSES = [JWTAuthentication, TokenAuthentication]


def serialize_station_onboarding_state(station):
    """Serialize station onboarding progress for consistent responses."""
    next_step = station.get_next_onboarding_step()
    return {
        "station_id": station.station_id,
        "station_name": station.name,
        "onboarding_step": station.onboarding_step,
        "next_step": next_step,
        "progress": {
            "profile_completed": bool(getattr(station, 'profile_completed', False)),
            "stream_setup_completed": bool(getattr(station, 'stream_setup_completed', False)),
            "staff_completed": bool(getattr(station, 'staff_completed', False)),
            "compliance_completed": bool(getattr(station, 'compliance_completed', False)),
            "payment_info_added": bool(getattr(station, 'payment_info_added', False)),
        },
        "stream_status": getattr(station, 'stream_status', None),
        "staff_members": get_station_staff_summary(station),
        "stream_validation_errors": getattr(station, 'stream_validation_errors', None),
        "profile": {
            "name": station.name,
            "photo": station.photo.url if station.photo else None,
            "cover_image": station.cover_image.url if station.cover_image else None,
            "phone": station.phone,
            "country": station.country,
            "region": station.region,
            "city": station.city,
            "coverage_area": station.coverage_area,
            "estimated_listeners": station.estimated_listeners,
            "license_number": station.license_number,
            "license_expiry_date": station.license_expiry_date,
            "website_url": station.website_url,
            "about": station.about,
            "station_type": station.station_type,
            "station_class": station.station_class,
            "station_category": station.station_category,
            "location_name": station.location_name,
            "tagline": station.tagline,
            "founded_year": station.founded_year,
            "primary_contact_name": station.primary_contact_name,
            "primary_contact_title": station.primary_contact_title,
            "primary_contact_email": station.primary_contact_email,
            "primary_contact_phone": station.primary_contact_phone,
            "social_media_links": station.social_media_links,
        },
        "stream_configuration": {
            "stream_url": station.stream_url,
            "backup_stream_url": station.backup_stream_url,
            "stream_type": station.stream_type,
            "stream_bitrate": station.stream_bitrate,
            "stream_format": station.stream_format,
            "stream_mount_point": station.stream_mount_point,
            "stream_username": station.stream_username,
            "monitoring_enabled": station.monitoring_enabled,
            "monitoring_interval_seconds": station.monitoring_interval_seconds,
            "stream_auto_restart": station.stream_auto_restart,
            "stream_quality_check_enabled": station.stream_quality_check_enabled,
        },
        "compliance": {
            "license_number": station.license_number,
            "license_issuing_authority": station.license_issuing_authority,
            "license_issue_date": station.license_issue_date,
            "license_expiry_date": station.license_expiry_date,
            "broadcast_frequency": station.broadcast_frequency,
            "transmission_power": station.transmission_power,
            "regulatory_body": station.regulatory_body,
            "coverage_area": station.coverage_area,
            "estimated_listeners": station.estimated_listeners,
            "compliance_contact_name": station.compliance_contact_name,
            "compliance_contact_email": station.compliance_contact_email,
            "compliance_contact_phone": station.compliance_contact_phone,
            "emergency_contact_phone": station.emergency_contact_phone,
        },
        "payment_preferences": {
            "preferred_payout_method": station.preferred_payout_method,
            "preferred_currency": station.preferred_currency,
            "payout_frequency": station.payout_frequency,
            "minimum_payout_amount": station.minimum_payout_amount,
            "tax_identification_number": station.tax_identification_number,
            "business_registration_number": station.business_registration_number,
            "momo_account": station.momo_account,
            "momo_provider": station.momo_provider,
            "momo_account_name": station.momo_account_name,
            "bank_account": station.bank_account,
            "bank_name": station.bank_name,
            "bank_account_number": station.bank_account_number,
            "bank_account_name": station.bank_account_name,
            "bank_branch_code": station.bank_branch_code,
            "bank_swift_code": station.bank_swift_code,
        }
    }


def check_email_exist(email: str) -> bool:
    return User.objects.filter(email=email).exists()

@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def register_station_view(request):

    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        email = request.data.get('email', "").lower()
        first_name = request.data.get('first_name', "")
        last_name = request.data.get('last_name', "")
        station_name = request.data.get('station_name', "")
        phone = request.data.get('phone', "")
        photo = request.FILES.get('photo')
        country = request.data.get('country', "")
        password = request.data.get('password', "")
        password2 = request.data.get('password2', "")

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

        if not station_name:
            errors['station_name'] = ['Staion Name is required.']

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

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.user_type = "Station"
            user.phone = phone
            if country:
                user.country = country
            if photo:
                user.photo = photo
            user.save()

            station_profile = Station.objects.create(
                user=user,
                name=station_name,
                phone=phone,
                country=country or None,
            )

            BankAccount.objects.get_or_create(
                user=user,
                defaults={
                    'balance': Decimal('0.00'),
                    'currency': "Ghc",
                }
            )

            data["user_id"] = str(user.user_id)
            data["email"] = user.email
            data["first_name"] = user.first_name
            data["last_name"] = user.last_name
            data["phone"] = user.phone
            data["country"] = user.country
            data["station_id"] = station_profile.station_id

            if user.photo:
                try:
                    data["photo"] = user.photo.url
                except Exception:
                    data["photo"] = None
            else:
                data["photo"] = None

            token, _ = Token.objects.get_or_create(user=user)
            jwt_tokens = get_jwt_tokens_for_user(user)
            onboarding_snapshot = serialize_station_onboarding_state(station_profile)

            data['token'] = token.key
            data['access_token'] = jwt_tokens['access']
            data['refresh_token'] = jwt_tokens['refresh']
            data.update(onboarding_snapshot)

            try:
                # Use the new Celery email task system for email verification
                from accounts.email_utils import send_verification_email
                task_id = send_verification_email(user)
                data['email_task_id'] = task_id

            except Exception as e:
                # Log the error but don't fail registration
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send verification email during station registration: {str(e)}")
                # Continue with registration even if email fails

            AllActivity.objects.create(
                user=user,
                subject="User Registration",
                body=f"{user.email} just created a station account.",
            )

            payload['message'] = "Successful"
            payload['data'] = data

            return Response(payload, status=status.HTTP_201_CREATED)

        payload['message'] = "Errors"
        payload['errors'] = serializer.errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    return Response(payload)

@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def verify_station_email(request):
    """
    Verify station email using verification token (backward compatible).
    
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
        jwt_tokens = get_jwt_tokens_for_user(user)
        
        # Get station profile
        station = Station.objects.get(user=user)
        
        # Prepare response data (maintain backward compatibility)
        data["user_id"] = str(user.user_id)
        data["station_id"] = station.station_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if user.photo else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["next_step"] = station.onboarding_step
        data["profile_completed"] = station.profile_completed
        
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
    except Station.DoesNotExist:
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['Station profile not found']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in verify_station_email: {str(e)}")
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['An error occurred during verification']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def verify_station_email_code(request):
    """
    Verify station email using 4-digit verification code.
    
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
        
        # Get station profile
        station = Station.objects.get(user=user)
        
        # Prepare response data
        data["user_id"] = str(user.user_id)
        data["station_id"] = station.station_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if user.photo else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["next_step"] = station.onboarding_step
        data["profile_completed"] = station.profile_completed
        
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
    except Station.DoesNotExist:
        payload['message'] = "Station profile not found"
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in verify_station_email_code: {str(e)}")
        payload['message'] = "An error occurred during verification"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StationLogin(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').lower()
        password = request.data.get('password', '')
        fcm_token = request.data.get('fcm_token', '')
        payload = {}
        errors = {}

        # Get client IP for audit logging
        ip_address = self.get_client_ip(request)

        if not email:
            errors['email'] = ['Email is required.']
        if not password:
            errors['password'] = ['Password is required.']
        if not fcm_token:
            errors['fcm_token'] = ['FCM token is required.']

        if errors:
            # Log failed login attempt due to missing fields
            AuditLog.objects.create(
                user=None,
                action='station_login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={'email': email, 'errors': list(errors.keys())},
                response_data={'error': 'validation_failed'},
                status_code=400
            )
            return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(email=email, password=password)

        if not user:
            # Handle failed login with security measures
            security_result = SecurityEventHandler.handle_failed_login(
                user_email=email,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                reason='invalid_credentials'
            )
            
            error_message = 'Invalid credentials'
            if security_result.get('account_locked'):
                error_message = f'Account locked due to multiple failed attempts. Try again after {security_result.get("locked_until")}'
            
            return Response({
                'message': 'Errors', 
                'errors': {'email': [error_message]},
                'security_info': {
                    'failed_attempts': security_result.get('failed_attempts', 0),
                    'account_locked': security_result.get('account_locked', False)
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            station = Station.objects.get(user=user)
        except Station.DoesNotExist:
            # Log failed login attempt - user exists but not a station
            AuditLog.objects.create(
                user=user,
                action='station_login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={'email': email},
                response_data={'error': 'not_station'},
                status_code=400
            )
            return Response({'message': 'Errors', 'errors': {'email': ['User is not a station']}}, status=status.HTTP_400_BAD_REQUEST)

        if not user.email_verified:
            # Log failed login attempt due to unverified email
            AuditLog.objects.create(
                user=user,
                action='station_login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={'email': email},
                response_data={'error': 'email_not_verified'},
                status_code=400
            )
            return Response({'message': 'Errors', 'errors': {'email': ['Please check your email to confirm your account or resend confirmation email.']}}, status=status.HTTP_400_BAD_REQUEST)

        # Handle successful login with security measures
        SecurityEventHandler.handle_successful_login(
            user=user,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        # Token and FCM token
        token, _ = Token.objects.get_or_create(user=user)
        jwt_tokens = get_jwt_tokens_for_user(user)
        user.fcm_token = fcm_token
        user.save(update_fields=['fcm_token'])

        # Align stored onboarding_step with computed next step, but never regress.
        try:
            step_order = ['profile', 'stream', 'staff', 'compliance', 'payment', 'report', 'done']
            computed = station.get_next_onboarding_step()
            cur_idx = step_order.index(station.onboarding_step) if station.onboarding_step in step_order else 0
            cmp_idx = step_order.index(computed) if computed in step_order else 0
            new_step = step_order[max(cur_idx, cmp_idx)]
            if new_step != station.onboarding_step:
                station.onboarding_step = new_step
                station.save()
        except Exception:
            station.save()

        onboarding_snapshot = serialize_station_onboarding_state(station)
        data = {
            "user_id": str(user.user_id),
            "station_id": station.station_id,
            "station_name": station.name,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo": station.photo.url if station.photo else (user.photo.url if user.photo else None),
            "country": user.country,
            "phone": user.phone,
            "token": token.key,
            "access_token": jwt_tokens['access'],
            "refresh_token": jwt_tokens['refresh'],
        }
        data.update(onboarding_snapshot)

        # Create activity log
        AllActivity.objects.create(user=user, subject="Station Login", body=f"{user.email} just logged in.")

        return Response({'message': 'Successful', 'data': data}, status=status.HTTP_200_OK)

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def complete_station_profile_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    bio = request.data.get('bio', "")
    about = request.data.get('about', "")
    country = request.data.get('country', "")
    region = request.data.get('region', "")
    city = request.data.get('city', "") or request.data.get('location', "")
    location_name = request.data.get('location_name', "") or request.data.get('locationName', "")
    coverage_area = request.data.get('coverage_area', "") or request.data.get('coverageArea', "")
    license_number = request.data.get('license_number', "") or request.data.get('licenseNumber', "")
    license_expiry = request.data.get('license_expiry_date', "") or request.data.get('licenseExpiry', "")
    station_type_display = request.data.get('station_type', "") or request.data.get('stationType', "")
    station_category = request.data.get('station_category', "") or request.data.get('stationCategory', "")
    contact_name = request.data.get('contact_name', "") or request.data.get('contactName', "")
    contact_email = request.data.get('contact_email', "") or request.data.get('contactEmail', "")
    contact_phone = request.data.get('contact_phone', "") or request.data.get('contactPhone', "")
    contact_title = request.data.get('contact_title', "") or request.data.get('contactTitle', "")
    phone = request.data.get('phone', "") or request.data.get('station_phone', "")
    website_url = request.data.get('website_url', "") or request.data.get('website', "")
    station_name = request.data.get('station_name', "") or request.data.get('stationName', "")
    lat = request.data.get('lat', None)
    lng = request.data.get('lng', None)
    photo = request.FILES.get('photo') or request.data.get('photo')
    cover_image = request.FILES.get('cover_image') or request.FILES.get('coverImage')
    tagline = request.data.get('tagline', "") or request.data.get('stationTagline', "")
    founded_year_raw = (
        request.data.get('founded_year')
        or request.data.get('foundedYear')
        or request.data.get('established_year')
        or request.data.get('established')
        or ""
    )
    social_media_links = request.data.get('social_media') or request.data.get('socialMedia') or {}
    primary_contact_email = request.data.get('primary_contact_email') or request.data.get('primaryContactEmail') or contact_email
    primary_contact_phone = request.data.get('primary_contact_phone') or request.data.get('primaryContactPhone') or contact_phone
    stream_url = request.data.get('stream_url', "").strip() or request.data.get('primaryStreamUrl', "").strip()

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Apply changes if provided
    if station_name:
        station.name = station_name
    if phone:
        station.phone = phone
        station.user.phone = phone
        station.user.save(update_fields=['phone'])
    if bio:
        station.bio = bio
    if about:
        station.about = about
    if country:
        station.country = country
    if region:
        station.region = region
    if city:
        station.city = city
    if location_name:
        station.location_name = location_name
    if lat is not None:
        station.lat = lat
    if lng is not None:
        station.lng = lng
    if coverage_area:
        station.coverage_area = coverage_area
    if license_number:
        station.license_number = license_number
    if license_expiry:
        try:
            station.license_expiry_date = timezone.datetime.fromisoformat(str(license_expiry)).date()
        except Exception:
            pass
    if station_category:
        station.station_category = station_category
    if station_type_display:
        normalized_type = station_type_display.lower().replace(' ', '_')
        valid_types = {choice[0] for choice in Station.STATION_TYPES}
        if normalized_type in valid_types:
            station.station_type = normalized_type
        else:
            # Fallback to category storage if not a valid choice
            station.station_category = station_type_display
    if website_url:
        station.website_url = website_url
    if contact_name:
        station.primary_contact_name = contact_name
        station.compliance_contact_name = contact_name
    if contact_title:
        station.primary_contact_title = contact_title
    if contact_email:
        station.compliance_contact_email = contact_email
    if primary_contact_email:
        station.primary_contact_email = primary_contact_email
    if contact_phone:
        station.compliance_contact_phone = contact_phone
    if primary_contact_phone:
        station.primary_contact_phone = primary_contact_phone
    if tagline:
        station.tagline = tagline
    if founded_year_raw:
        try:
            station.founded_year = int(str(founded_year_raw))
        except (TypeError, ValueError):
            pass
    if social_media_links:
        parsed_links = social_media_links
        if isinstance(parsed_links, str):
            try:
                parsed_links = json.loads(parsed_links)
            except (ValueError, TypeError):
                parsed_links = None
        if isinstance(parsed_links, dict):
            station.social_media_links = parsed_links
    
    # Handle stream URL with validation
    if stream_url:
        try:
            # Validate stream URL format using model validation
            from stations.models import validate_stream_url
            validate_stream_url(stream_url)
            station.stream_url = stream_url
            
            # Test the stream URL and update status
            station.stream_status = 'testing'
            is_accessible, message = station.test_stream_url()
            
            # If stream is accessible, trigger a test scan using Celery
            if is_accessible:
                try:
                    from music_monitor.tasks import scan_single_station_stream
                    # Trigger async test scan (non-blocking)
                    scan_single_station_stream.delay(station.id, stream_url, 10)
                except Exception as scan_error:
                    # Don't fail the profile completion if scan fails
                    pass
            
            # Add stream test results to response data
            data["stream_test_result"] = {
                "accessible": is_accessible,
                "message": message,
                "status": station.stream_status
            }
            
        except Exception as e:
            errors['stream_url'] = [str(e)]
    elif stream_url == "":  # Explicitly clearing stream URL
        station.stream_url = None
        station.stream_status = 'inactive'
        station.stream_validation_errors = None

    # Check for stream URL validation errors before proceeding
    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Handle photo upload
    photo_url = None
    if photo:
        if station.photo and station.photo.name and 'default' not in station.photo.name:
            station.photo.delete(save=False)
        station.photo = photo
        station.save(update_fields=['photo'])
        photo_url = station.photo.url if station.photo else None

    cover_image_url = None
    if cover_image:
        if station.cover_image and station.cover_image.name:
            station.cover_image.delete(save=False)
        station.cover_image = cover_image
        station.save(update_fields=['cover_image'])
        cover_image_url = station.cover_image.url if station.cover_image else None

    # Mark this step as complete (profile)
    station.profile_completed = True
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))
    if photo_url:
        data["photo"] = photo_url
    if cover_image_url:
        data["cover_image"] = cover_image_url

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def complete_station_stream_setup_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    primary_stream_url = (request.data.get('primary_stream_url') or request.data.get('primaryStreamUrl') or "").strip()
    backup_stream_url = (request.data.get('backup_stream_url') or request.data.get('backupStreamUrl') or "").strip()
    stream_type = request.data.get('stream_type') or request.data.get('streamType')
    stream_bitrate = request.data.get('stream_bitrate') or request.data.get('bitrate')
    stream_format = request.data.get('stream_format') or request.data.get('format')
    stream_mount_point = request.data.get('stream_mount_point') or request.data.get('mountPoint')
    stream_username = request.data.get('stream_username') or request.data.get('username')
    stream_password = request.data.get('stream_password') or request.data.get('password')
    enable_monitoring = request.data.get('enable_monitoring', request.data.get('enableMonitoring', True))
    monitoring_interval = request.data.get('monitoring_interval', request.data.get('monitoringInterval'))
    auto_restart = request.data.get('auto_restart', request.data.get('autoRestart', True))
    quality_check = request.data.get('quality_check', request.data.get('qualityCheck', True))

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        station = None
        errors['station_id'] = ['Station not found.']

    if station is None:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if not primary_stream_url:
        errors['primary_stream_url'] = ['Primary stream URL is required.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Validate and assign stream urls
    stream_test_result = None
    if primary_stream_url:
        try:
            from stations.models import validate_stream_url
            validate_stream_url(primary_stream_url)
            station.stream_url = primary_stream_url
            station.stream_status = 'testing'
            accessible, message = station.test_stream_url()
            stream_test_result = {
                "accessible": accessible,
                "message": message,
                "status": station.stream_status,
            }
        except Exception as exc:
            payload['message'] = "Errors"
            payload['errors'] = {'primary_stream_url': [str(exc)]}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if backup_stream_url:
        station.backup_stream_url = backup_stream_url

    if stream_type:
        station.stream_type = stream_type
    if stream_bitrate:
        station.stream_bitrate = stream_bitrate
    if stream_format:
        station.stream_format = stream_format
    if stream_mount_point:
        station.stream_mount_point = stream_mount_point
    if stream_username:
        station.stream_username = stream_username
    if stream_password:
        station.stream_password = stream_password

    station.monitoring_enabled = bool(str(enable_monitoring).lower() in ['1', 'true', 'yes', 'on'])
    if monitoring_interval:
        try:
            station.monitoring_interval_seconds = int(monitoring_interval)
        except (ValueError, TypeError):
            pass
    station.stream_auto_restart = bool(str(auto_restart).lower() in ['1', 'true', 'yes', 'on'])
    station.stream_quality_check_enabled = bool(str(quality_check).lower() in ['1', 'true', 'yes', 'on'])

    station.stream_setup_completed = True
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))
    if stream_test_result:
        data['stream_test_result'] = stream_test_result

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def complete_add_staff_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    staff_payload = request.data.get('staff', [])

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Normalize staff payload (allow JSON string or list)
    import json
    if isinstance(staff_payload, str):
        try:
            staff_payload = json.loads(staff_payload)
        except Exception:
            staff_payload = []

    if not isinstance(staff_payload, list):
        staff_payload = []

    # Validate and collect staff entries
    valid_roles = [c[0] for c in StationStaff.STAFF_ROLES]
    role_defaults = StationStaff.role_defaults()
    created_staff = []
    for item in staff_payload:
        try:
            name = (item.get('name') or '').strip()
            email = (item.get('email') or '').strip() or None
            role = (item.get('role') or '').strip()
        except AttributeError:
            continue
        if not name or role not in valid_roles:
            continue
        first_name, last_name = '', ''
        parts = name.split(' ', 1)
        if parts:
            first_name = parts[0]
            if len(parts) > 1:
                last_name = parts[1]

        staff = StationStaff(
            station=station,
            first_name=first_name,
            last_name=last_name,
            email=email,
            role=role,
            permission_level=StationStaff.resolve_permission_level(role),
            active=True,
        )
        default_permissions = role_defaults.get(
            StationStaff.resolve_role_key(staff.permission_level),
            role_defaults.get('reporter', []),
        )
        staff.apply_permissions(default_permissions)
        staff.save()
        created_staff.append(staff)

    # Mark this step as complete when at least one entry is present; otherwise keep current state
    if created_staff:
        station.staff_completed = True

    # Move to next onboarding step
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def complete_report_method_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    bio = request.data.get('bio', "")
    country = request.data.get('country', "")
    region = request.data.get('region', "")
    photo = request.data.get('photo', "")

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Apply changes if provided
    if bio:
        station.bio = bio
    if country:
        station.country = country
    if region:
        station.region = region
    if photo:
        station.photo = photo

    # Mark this step as complete (report method)
    station.report_completed = True

    # Move to next onboarding step
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def onboard_station_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station'] = ['Station not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    fields_to_update = [
        'name', 'stage_name', 'bio', 'profile_image', 'spotify_url',
        'shazam_url', 'instagram', 'twitter', 'website', 'contact_email', 'active'
    ]
    for field in fields_to_update:
        value = request.data.get(field)
        if value is not None:
            setattr(station, field, value)

    station.save()

    # Check if fields are not null to complete profile
    profile_fields = [
        'name', 'photo', 'phone', 'country', 'region',
        'location_name', 'lat', 'lng', 'about'
    ]
    profile_complete = all(getattr(station, field) is not None for field in profile_fields)
    station.profile_completed = profile_complete
    station.save()

    data["station_id"] = station.id
    data["name"] = station.name

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def complete_station_payment_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    momo = request.data.get('momo', "") or request.data.get('momoNumber', "")
    momo_provider = request.data.get('momo_provider', "") or request.data.get('momoProvider', "")
    momo_name = request.data.get('momo_name', "") or request.data.get('momoName', "")
    bank_account_number = request.data.get('bank_account_number', "") or request.data.get('accountNumber', "")
    bank_account_name = request.data.get('bank_account_name', "") or request.data.get('accountName', "")
    bank_name = request.data.get('bank_name', "") or request.data.get('bankName', "")
    bank_branch_code = request.data.get('bank_branch_code', "") or request.data.get('branchCode', "")
    bank_swift_code = request.data.get('bank_swift_code', "") or request.data.get('swiftCode', "")
    currency = request.data.get('currency', "") or request.data.get('preferredCurrency', "")
    payout_frequency = request.data.get('payout_frequency', "") or request.data.get('payoutFrequency', "")
    minimum_payout = request.data.get('minimum_payout', "") or request.data.get('minimumPayout', "")
    tax_id = request.data.get('tax_id', "") or request.data.get('taxId', "")
    business_registration = request.data.get('business_registration', "") or request.data.get('businessRegistration', "")
    preferred_method = request.data.get('preferred_method', "") or request.data.get('paymentMethod', "")

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Apply changes if provided
    if momo:
        station.momo_account = momo
    if momo_provider:
        station.momo_provider = momo_provider
    if momo_name:
        station.momo_account_name = momo_name
    if bank_account_number:
        station.bank_account = bank_account_number
        station.bank_account_number = bank_account_number
    if bank_account_name:
        station.bank_account_name = bank_account_name
    if bank_name:
        station.bank_name = bank_name
    if bank_branch_code:
        station.bank_branch_code = bank_branch_code
    if bank_swift_code:
        station.bank_swift_code = bank_swift_code
    if currency:
        station.preferred_currency = currency
    if payout_frequency:
        station.payout_frequency = payout_frequency
    if minimum_payout:
        try:
            station.minimum_payout_amount = Decimal(str(minimum_payout))
        except Exception:
            pass
    if tax_id:
        station.tax_identification_number = tax_id
    if business_registration:
        station.business_registration_number = business_registration
    if preferred_method:
        station.preferred_payout_method = preferred_method

    # Mark this step as complete
    station.payment_info_added = True

    # Move to next onboarding step
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
@api_view(['POST'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
@csrf_exempt
def logout_station_view(request):
    payload = {}
    data = {}
    errors = {}

    # Get client IP for audit logging
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    ip_address = get_client_ip(request)

    try:
        # Get the station associated with the authenticated user
        station = Station.objects.get(user=request.user)
    except Station.DoesNotExist:
        errors['user'] = ['User is not a station.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        
        # Log failed logout attempt
        AuditLog.objects.create(
            user=request.user,
            action='station_logout_failed',
            resource_type='authentication',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            response_data={'error': 'not_station'},
            status_code=400
        )
        
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Clear FCM token for security
    request.user.fcm_token = None
    request.user.save()

    # Delete the authentication token to invalidate the session
    try:
        token = Token.objects.get(user=request.user)
        token.delete()
    except Token.DoesNotExist:
        pass  # Token already deleted or doesn't exist

    # Create activity log
    new_activity = AllActivity.objects.create(
        user=request.user,
        type="Authentication",
        subject="Station Log out",
        body=f"{request.user.email} just logged out of the account."
    )

    # Log successful logout
    AuditLog.objects.create(
        user=request.user,
        action='station_logout_success',
        resource_type='authentication',
        resource_id=str(station.station_id),
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        response_data={'success': True, 'session_invalidated': True},
        status_code=200
    )

    data = {
        'message': 'Successfully logged out',
        'session_invalidated': True,
        'timestamp': timezone.now().isoformat()
    }

    payload['message'] = "Successfully logged out"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def skip_station_onboarding_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    step = request.data.get('step', "")

    if not station_id:
        errors['station_id'] = ['Station ID is required.']
    if not step:
        errors['step'] = ['Target step is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found.']
        station = None

    normalized_step = step.replace('-', '_') if isinstance(step, str) else step
    if normalized_step == 'stream_setup':
        normalized_step = 'stream'

    valid_steps = {choice[0] for choice in Station.ONBOARDING_STEPS}
    if station and normalized_step not in valid_steps:
        errors['step'] = ['Invalid onboarding step.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Mark the skipped step as completed so it doesn't block forward progress
    if normalized_step == 'profile':
        station.profile_completed = True
    elif normalized_step == 'stream':
        station.stream_setup_completed = True
    elif normalized_step == 'staff':
        station.staff_completed = True
    elif normalized_step == 'compliance':
        station.compliance_completed = True
    elif normalized_step == 'payment':
        station.payment_info_added = True

    # Move to the next step after skipping
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def station_onboarding_status_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.query_params.get('station_id', "")
    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        payload['message'] = 'Errors'
        payload['errors'] = {'station_id': ['Station not found.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    data.update(serialize_station_onboarding_state(station))

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)

# Enhanced Station Onboarding API Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def enhanced_station_onboarding_status_view(request, station_id):
    """Get enhanced onboarding status for a station"""
    payload = {}
    data = {}
    errors = {}

    try:
        station = Station.objects.get(station_id=station_id, user=request.user)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found or access denied.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    # Get user KYC status
    user = station.user
    
    onboarding_state = serialize_station_onboarding_state(station)
    data = {
        **onboarding_state,
        "profile_completed": onboarding_state["progress"].get("profile_completed", False),
        "stream_setup_completed": onboarding_state["progress"].get("stream_setup_completed", False),
        "staff_completed": onboarding_state["progress"].get("staff_completed", False),
        "compliance_completed": onboarding_state["progress"].get("compliance_completed", False),
        "payment_info_added": onboarding_state["progress"].get("payment_info_added", False),
        "kyc_status": user.kyc_status,
        "kyc_documents": user.kyc_documents,
        "station_name": station.name,
        "station_class": station.station_class,
        "station_type": station.station_type,
        "license_number": station.license_number,
        "coverage_area": station.coverage_area,
        "estimated_listeners": station.estimated_listeners,
        "country": station.country,
        "region": station.region,
        "profile_complete_percentage": calculate_station_completion_percentage(station),
        "next_recommended_step": get_station_next_recommended_step(station),
        "required_fields": get_station_required_fields_status(station),
        "compliance_setup": get_station_compliance_status(station),
        "stream_links": get_station_stream_links(station),
        "staff_members": get_station_staff_summary(station),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def update_station_onboarding_status_view(request):
    """Update specific station onboarding step status"""
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    step = request.data.get('step', "")
    completed = request.data.get('completed', False)

    if not station_id:
        errors['station_id'] = ['Station ID is required.']
    if not step:
        errors['step'] = ['Step is required.']

    try:
        station = Station.objects.get(station_id=station_id, user=request.user)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Update the specific step status
    step_mapping = {
        'profile': 'profile_completed',
        'stream': 'stream_setup_completed',
        'staff': 'staff_completed',
        'compliance': 'compliance_completed',
        'payment': 'payment_info_added',
    }

    normalized_step = step.replace('-', '_') if isinstance(step, str) else step
    if normalized_step == 'stream_setup':
        normalized_step = 'stream'

    if normalized_step in step_mapping:
        setattr(station, step_mapping[normalized_step], completed)
        if completed:
            station.onboarding_step = station.get_next_onboarding_step()
        station.save()

    data = {
        "step": normalized_step,
        "completed": completed,
        **serialize_station_onboarding_state(station),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def complete_station_onboarding_view(request):
    """Mark station onboarding as complete"""
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id, user=request.user)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Mark onboarding as complete
    station.onboarding_step = 'done'
    station.active = True  # Activate the station
    station.save()

    # Update user profile completion status
    user = station.user
    user.profile_complete = True
    user.save()

    # Create admin notification
    AllActivity.objects.create(
        user=user,
        subject="Station Onboarding Complete",
        body=f"Station {station.name} has completed onboarding and is now active."
    )

    data.update(serialize_station_onboarding_state(station))
    data["onboarding_complete"] = True
    data["station_active"] = station.active

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def update_station_stream_links_view(request):
    """Update station stream links with validation"""
    from stations.models import StationStreamLink
    import requests
    
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    stream_links = request.data.get('stream_links', [])

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id, user=request.user)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Validate and create stream links
    validated_links = []
    for link_data in stream_links:
        link_url = link_data.get('link', '').strip()
        if not link_url:
            continue
            
        # Basic URL validation
        if not (link_url.startswith('http://') or link_url.startswith('https://')):
            errors.setdefault('stream_links', []).append(f'Invalid URL format: {link_url}')
            continue
        
        # Optional: Test connectivity (can be disabled for performance)
        is_active = True
        try:
            response = requests.head(link_url, timeout=5)
            is_active = response.status_code < 400
        except:
            is_active = False
        
        validated_links.append({
            'link': link_url,
            'active': is_active
        })

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Clear existing links and create new ones
    StationStreamLink.objects.filter(station=station).delete()
    
    for link_data in validated_links:
        StationStreamLink.objects.create(
            station=station,
            link=link_data['link'],
            active=link_data['active']
        )

    data = {
        "station_id": station.station_id,
        "stream_links_updated": len(validated_links),
        "stream_links": validated_links,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def update_station_compliance_setup_view(request):
    """Update station compliance and regulatory setup"""
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', "")
    license_number = request.data.get('license_number', "") or request.data.get('licenseNumber', "")
    license_authority = request.data.get('license_authority', "") or request.data.get('licenseAuthority', "")
    license_issue_date = request.data.get('license_issue_date', "") or request.data.get('licenseIssueDate', "")
    license_expiry_date = request.data.get('license_expiry_date', "") or request.data.get('licenseExpiryDate', "")
    station_class = request.data.get('station_class', "") or request.data.get('stationClass', "")
    station_type = request.data.get('station_type', "") or request.data.get('stationType', "")
    coverage_area = request.data.get('coverage_area', "") or request.data.get('coverageArea', "")
    estimated_listeners = request.data.get('estimated_listeners', None)
    compliance_officer = request.data.get('compliance_officer', "") or request.data.get('complianceOfficer', "")
    officer_email = request.data.get('officer_email', "") or request.data.get('officerEmail', "")
    officer_phone = request.data.get('officer_phone', "") or request.data.get('officerPhone', "")
    emergency_contact = request.data.get('emergency_contact', "") or request.data.get('emergencyContact', "")
    regulatory_body = request.data.get('regulatory_body', "") or request.data.get('regulatoryBody', "")

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id, user=request.user)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found or access denied.']

    # Validate station class and type
    valid_classes = [choice[0] for choice in Station.STATION_CLASSES]
    valid_types = [choice[0] for choice in Station.STATION_TYPES]
    
    if station_class and station_class not in valid_classes:
        errors['station_class'] = [f'Invalid station class. Must be one of: {", ".join(valid_classes)}']
    
    if station_type and station_type not in valid_types:
        errors['station_type'] = [f'Invalid station type. Must be one of: {", ".join(valid_types)}']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Update station fields
    if license_number:
        station.license_number = license_number
    if license_authority:
        station.license_issuing_authority = license_authority
    if license_issue_date:
        try:
            station.license_issue_date = timezone.datetime.fromisoformat(str(license_issue_date)).date()
        except Exception:
            pass
    if license_expiry_date:
        try:
            station.license_expiry_date = timezone.datetime.fromisoformat(str(license_expiry_date)).date()
        except Exception:
            pass
    if station_class:
        station.station_class = station_class
    if station_type:
        station.station_type = station_type
    if coverage_area:
        station.coverage_area = coverage_area
    if estimated_listeners is not None:
        try:
            station.estimated_listeners = int(estimated_listeners)
        except (ValueError, TypeError):
            pass
    if compliance_officer:
        station.compliance_contact_name = compliance_officer
    if officer_email:
        station.compliance_contact_email = officer_email
    if officer_phone:
        station.compliance_contact_phone = officer_phone
    if emergency_contact:
        station.emergency_contact_phone = emergency_contact
    if regulatory_body:
        station.regulatory_body = regulatory_body

    station.compliance_completed = True
    station.onboarding_step = station.get_next_onboarding_step()
    station.save()

    data.update(serialize_station_onboarding_state(station))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


def calculate_station_completion_percentage(station):
    """Calculate station profile completion percentage"""
    total_fields = 5  # profile, stream, staff, compliance, payment
    completed_fields = 0

    if station.profile_completed:
        completed_fields += 1
    if station.stream_setup_completed:
        completed_fields += 1
    if station.staff_completed:
        completed_fields += 1
    if station.compliance_completed:
        completed_fields += 1
    if station.payment_info_added:
        completed_fields += 1

    return round((completed_fields / total_fields) * 100)


def get_station_next_recommended_step(station):
    """Get the next recommended step for the station"""
    if not station.profile_completed:
        return 'profile'
    elif not station.staff_completed:
        return 'staff'
    elif not station.payment_info_added:
        return 'payment'
    return 'done'


def get_station_required_fields_status(station):
    """Get status of required fields for station profile completion"""
    user = station.user
    
    return {
        'basic_info': {
            'completed': bool(user.first_name and user.last_name and station.name),
            'fields': ['first_name', 'last_name', 'station_name']
        },
        'station_details': {
            'completed': bool(station.country and station.region and station.photo),
            'fields': ['country', 'region', 'photo']
        },
        'contact_info': {
            'completed': bool(user.email and user.phone),
            'fields': ['email', 'phone']
        },
        'stream_setup': {
            'completed': bool(station.stream_url and station.stream_username),
            'fields': ['stream_url', 'stream_username']
        },
        'compliance_info': {
            'completed': bool(
                station.license_number and
                station.license_issuing_authority and
                station.license_expiry_date and
                station.compliance_contact_name
            ),
            'fields': ['license_number', 'license_issuing_authority', 'license_expiry_date', 'compliance_contact_name']
        },
        'payment_info': {
            'completed': bool(
                station.momo_account or
                station.bank_account or
                station.bank_account_number
            ),
            'fields': ['momo_account', 'bank_account', 'bank_account_number']
        }
    }


def get_station_compliance_status(station):
    """Get station compliance setup status"""
    return {
        'license_number': station.license_number,
        'license_issuing_authority': station.license_issuing_authority,
        'license_issue_date': station.license_issue_date,
        'license_expiry_date': station.license_expiry_date,
        'station_class': station.station_class,
        'station_type': station.station_type,
        'coverage_area': station.coverage_area,
        'estimated_listeners': station.estimated_listeners,
        'compliance_contact_name': station.compliance_contact_name,
        'compliance_contact_email': station.compliance_contact_email,
        'compliance_contact_phone': station.compliance_contact_phone,
        'emergency_contact_phone': station.emergency_contact_phone,
        'compliance_complete': bool(
            station.license_number and
            station.license_issuing_authority and
            station.compliance_contact_name
        )
    }


def get_station_stream_links(station):
    """Get station stream links with status"""
    from stations.models import StationStreamLink
    
    links = StationStreamLink.objects.filter(station=station, is_archived=False)
    return [
        {
            'id': link.id,
            'link': link.link,
            'active': link.active,
            'created_at': link.created_at
        }
        for link in links
    ]


def get_station_staff_summary(station):
    """Get station staff summary"""
    staff_members = StationStaff.objects.filter(station=station, is_archived=False, active=True)
    return [
        {
            'id': staff.id,
            'name': staff.name,
            'email': staff.email,
            'role': staff.role,
            'created_at': staff.created_at
        }
        for staff in staff_members
    ]