import logging
from datetime import datetime
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.template.loader import get_template
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from accounts.api.custom_jwt import CustomJWTAuthentication

from accounts.api.serializers import UserRegistrationSerializer
from accounts.api.token_utils import get_jwt_tokens_for_user
from accounts.models import AuditLog
from accounts.api.enhanced_auth import SecurityEventHandler
from accounts.services import EmailVerificationService
from activities.models import AllActivity


from rest_framework.views import APIView

from accounts.api.serializers import UserRegistrationSerializer
from activities.models import AllActivity
from artists.models import Artist, ArtistIdentityProfile
from bank_account.models import BankAccount
from core.utils import generate_email_token, is_valid_email, is_valid_password
from publishers.models import PublisherProfile

logger = logging.getLogger(__name__)


User = get_user_model()



def calculate_profile_completion_percentage(artist):
    """Calculate the completion percentage of an artist's profile"""
    total_steps = 6  # profile, social, payment, publisher, kyc, track
    completed_steps = 0
    
    if artist.profile_completed:
        completed_steps += 1
    if artist.social_media_added:
        completed_steps += 1
    if artist.payment_info_added:
        completed_steps += 1
    if artist.publisher_added:
        completed_steps += 1
    if artist.user.verification_status in ['verified', 'skipped']:
        completed_steps += 1
    if getattr(artist, 'track_uploaded', False):
        completed_steps += 1
    
    return round((completed_steps / total_steps) * 100)


def get_next_recommended_step(artist):
    """Get the next recommended onboarding step for an artist"""
    if not artist.profile_completed:
        return 'profile'
    elif not artist.social_media_added:
        return 'social-media'
    elif not artist.payment_info_added:
        return 'payment'
    elif not artist.publisher_added:
        return 'publisher'
    elif artist.user.verification_status == 'pending':
        return 'kyc'
    elif not getattr(artist, 'track_uploaded', False):
        return 'track'
    return 'done'


def get_required_fields_status(artist):
    """Get the status of required fields for an artist"""
    return {
        'profile_required': not artist.profile_completed,
        'kyc_required': artist.user.verification_status == 'pending',
        'payment_required': not artist.payment_info_added,
        'publisher_required': not artist.publisher_added,
        'social_media_optional': not artist.social_media_added,
        'track_optional': not getattr(artist, 'track_uploaded', False),
    }


def get_verification_required_features(user):
    """Get list of features that require verification"""
    if user.verification_status == 'verified':
        return []

    return [
        'royalty_withdrawals',
        'publisher_partnerships',
        'advanced_analytics',
        'priority_support'
    ]


def serialize_artist_onboarding_state(artist):
    """Serialize the artist onboarding state for consistent API responses."""
    user = artist.user

    identity_payload = {
        "full_name": "",
        "date_of_birth": "",
        "nationality": "",
        "id_type": "",
        "id_number": "",
        "residential_address": "",
    }

    try:
        identity_payload = artist.identity_profile.as_payload()
    except ArtistIdentityProfile.DoesNotExist:
        pass

    profile_snapshot = {
        "stage_name": artist.stage_name,
        "bio": artist.bio or "",
        "location": artist.location or getattr(user, 'location', ""),
        "country": artist.country or getattr(user, 'country', ""),
        "region": artist.region or "",
        "primary_genre": artist.primary_genre or "",
        "music_style": artist.music_style or "",
        "website": artist.website or "",
    }

    social_links = {
        "instagram": artist.instagram or "",
        "twitter": artist.twitter or "",
        "facebook": artist.facebook or "",
        "youtube": artist.youtube or "",
        "spotify": artist.spotify or "",
        "website": artist.website or "",
    }

    payment_preferences = dict(getattr(artist, 'payment_preferences', {}) or {})
    # Fall back to legacy storage if JSON field is empty
    if not payment_preferences:
        payment_preferences = dict(getattr(user, 'kyc_documents', {}) or {}).get('payment_preferences', {}) or {}

    publisher_snapshot = {
        "is_self_published": getattr(artist, 'is_self_published', True),
        "publisher_id": artist.publisher.publisher_id if getattr(artist, 'publisher', None) else None,
        "publisher_name": getattr(artist.publisher, 'company_name', None) if getattr(artist, 'publisher', None) else None,
        "preferences": dict(getattr(artist, 'publisher_preferences', {}) or {}),
    }

    if not publisher_snapshot["publisher_name"] and publisher_snapshot["preferences"].get("publisher_name"):
        publisher_snapshot["publisher_name"] = publisher_snapshot["preferences"].get("publisher_name")

    stored_step = artist.onboarding_step
    next_step = artist.get_next_onboarding_step()
    if stored_step == 'done':
        next_step = 'done'
    active_step = stored_step or next_step

    return {
        "artist_id": artist.artist_id,
        "onboarding_step": active_step,
        "next_step": next_step,
        "progress": {
            "profile_completed": bool(getattr(artist, 'profile_completed', False)),
            "social_media_added": bool(getattr(artist, 'social_media_added', False)),
            "payment_info_added": bool(getattr(artist, 'payment_info_added', False)),
            "publisher_added": bool(getattr(artist, 'publisher_added', False)),
            "track_uploaded": bool(getattr(artist, 'track_uploaded', False)),
        },
        "completion_percentage": calculate_profile_completion_percentage(artist),
        "next_recommended_step": get_next_recommended_step(artist),
        "required_fields": get_required_fields_status(artist),
        "profile": profile_snapshot,
        "social_links": social_links,
        "payment_preferences": payment_preferences,
        "publisher": publisher_snapshot,
        "social_metrics": dict(getattr(artist, 'social_metrics', {}) or {}),
        "stage_name": artist.stage_name,
        "artist_name": artist.stage_name,
        "verification_status": getattr(user, 'verification_status', None),
        "kyc_status": getattr(user, 'kyc_status', None),
        "can_resume_verification": getattr(user, 'verification_status', '') in ['skipped', 'incomplete'],
        "can_skip_verification": getattr(user, 'verification_status', '') in ['pending', 'incomplete'],
        "identity_profile": identity_payload,
    }



@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def register_artist_view(request):

    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        email = request.data.get('email', "").lower()
        first_name = request.data.get('first_name', "")
        last_name = request.data.get('last_name', "")
        stage_name = request.data.get('stage_name', "")
        phone = request.data.get('phone', "")
        photo = request.FILES.get('photo')
        country = request.data.get('country', "")
        location = request.data.get('location', "")
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
        if not stage_name:
            errors['stage_name'] = ['Stage Name is required.']

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
        if not serializer.is_valid():
            payload['message'] = "Errors"
            payload['errors'] = serializer.errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        # Populate additional user fields not handled by serializer
        user.user_type = "Artist"
        user.phone = phone
        if country:
            user.country = country
        if location:
            user.location = location
        if photo:
            user.photo = photo
        user.save()

        # Initialize 4-digit verification code flow immediately
        verification_service = EmailVerificationService()
        verification_service.initialize_verification(user, method='code')

        # Create artist profile and wallet
        artist_profile = Artist.objects.create(
            user=user,
            stage_name=stage_name
        )
        BankAccount.objects.get_or_create(
            user=user,
            defaults={
                'balance': Decimal('0.00'),
                'currency': "Ghc",
            }
        )

        # Prepare response data
        data["user_id"] = str(user.user_id)
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data['phone'] = user.phone
        data['country'] = user.country
        data['location'] = user.location
        data['photo'] = user.photo.url if getattr(user.photo, 'url', None) else None

        # Token for client session (email must still be verified to log in)
        token_obj, _ = Token.objects.get_or_create(user=user)
        jwt_tokens = get_jwt_tokens_for_user(user)
        data['token'] = token_obj.key
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
            logger.error(f"Failed to send verification email during artist registration: {str(e)}")
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


@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def verify_artist_email(request):
    """
    Verify artist email using verification token (backward compatible).
    
    Requirements: 5.3, 10.1, 10.2 - Token verification with backward compatibility
    """
    payload = {}
    data = {}
    
    email = request.data.get('email', '').lower().strip()
    email_token = (request.data.get('email_token') or '').strip()
    
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
        
        # Get artist profile
        artist = Artist.objects.get(user=user)
        
        # Prepare response data (maintain backward compatibility)
        data["user_id"] = str(user.user_id)
        data["artist_id"] = artist.artist_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if user.photo else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["next_step"] = artist.onboarding_step
        data["profile_completed"] = artist.profile_completed
        
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
    except Artist.DoesNotExist:
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['Artist profile not found']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in verify_artist_email: {str(e)}")
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['An error occurred during verification']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def verify_artist_email_code(request):
    """
    Verify artist email using 4-digit verification code.
    
    Requirements: 3.4, 5.2, 5.3 - Code verification with proper error handling
    """
    payload = {}
    data = {}
    
    email = request.data.get('email', '').lower().strip()
    code = (request.data.get('code') or '').strip()
    
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

        # Get artist profile
        artist = Artist.objects.get(user=user)
        
        onboarding_state = serialize_artist_onboarding_state(artist)
        stage_name_value = (
            onboarding_state.get('stage_name')
            or artist.stage_name
            or f"{user.first_name} {user.last_name}".strip()
            or user.email
        )

        # Prepare response data
        data["user_id"] = str(user.user_id)
        data["artist_id"] = artist.artist_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if user.photo else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data.update(onboarding_state)
        data["profile_completed"] = onboarding_state["progress"].get("profile_completed", False)
        data["stage_name"] = stage_name_value
        data["artist_name"] = stage_name_value
        data["display_name"] = stage_name_value

        payload['message'] = "Successful"
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
    except Artist.DoesNotExist:
        payload['message'] = "Artist profile not found"
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in verify_artist_email_code: {str(e)}")
        payload['message'] = "An error occurred during verification"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)







def check_email_exist(email):

    qs = User.objects.filter(email=email)
    if qs.exists():
        return True
    else:
        return False




class ArtistLogin(APIView):
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
                action='artist_login_failed',
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
            artist = Artist.objects.get(user=user)
        except Artist.DoesNotExist:
            # Log failed login attempt - user exists but not an artist
            AuditLog.objects.create(
                user=user,
                action='artist_login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={'email': email},
                response_data={'error': 'not_artist'},
                status_code=400
            )
            return Response({'message': 'Errors', 'errors': {'email': ['User is not an artist']}}, status=status.HTTP_400_BAD_REQUEST)

        if not user.email_verified:
            # Log failed login attempt due to unverified email
            AuditLog.objects.create(
                user=user,
                action='artist_login_failed',
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

        # Do not override stored onboarding_step here.
        # It is updated by completion endpoints or explicit skip actions.
        artist.save()

        data = {
            "user_id": str(user.user_id),
            "artist_id": artist.artist_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo": user.photo.url if getattr(user.photo, 'url', None) else None,
            "country": user.country,
            "phone": user.phone,
            "token": token.key,
            "access_token": jwt_tokens['access'],
            "refresh_token": jwt_tokens['refresh'],
            "onboarding_step": artist.onboarding_step,
        }

        onboarding_state = serialize_artist_onboarding_state(artist)
        data.update(onboarding_state)
        stage_name_value = (
            onboarding_state.get('stage_name')
            or artist.stage_name
            or f"{user.first_name} {user.last_name}".strip()
            or user.email
        )
        data["stage_name"] = stage_name_value
        data["artist_name"] = stage_name_value
        data.setdefault("display_name", stage_name_value)

        # Create activity log
        AllActivity.objects.create(user=user, subject="Artist Login", body=f"{user.email} just logged in.")

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




from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status
import json


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_artist_profile_view(request):
    payload = {}
    errors = {}

    def get_client_ip(req):
        x_forwarded_for = req.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return req.META.get('REMOTE_ADDR')

    ip_address = get_client_ip(request)

    artist_id = request.data.get('artist_id', "")
    stage_name = (
        request.data.get('artist_name')
        or request.data.get('artistName')
        or request.data.get('stage_name')
        or request.data.get('stageName')
    )
    bio = request.data.get('bio', "").strip()
    location = request.data.get('location', "").strip()
    country = request.data.get('country', "").strip()
    region = request.data.get('region', "").strip()
    primary_genre = request.data.get('primary_genre') or request.data.get('genre')
    music_style = request.data.get('music_style') or request.data.get('style')
    website = request.data.get('website')
    instagram = request.data.get('instagram')
    twitter = request.data.get('twitter')
    facebook = request.data.get('facebook')
    youtube = request.data.get('youtube')
    spotify = (
        request.data.get('spotify')
        or request.data.get('spotify_url')
        or request.data.get('spotifyUrl')
    )
    photo = (
        request.FILES.get('profile_image')
        or request.FILES.get('profileImage')
        or request.FILES.get('photo')
    )

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    artist = None
    try:
        artist = Artist.objects.get(artist_id=artist_id)
        if artist.user != request.user:
            errors['permission'] = ['You can only update your own profile.']
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']

    if artist and not stage_name:
        errors['artist_name'] = ['Artist name is required.']
    if artist and not bio:
        errors['bio'] = ['Artist bio is required.']
    if artist and not primary_genre:
        errors['genre'] = ['Primary genre is required.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        AuditLog.objects.create(
            user=request.user,
            action='artist_profile_update_failed',
            resource_type='artist_profile',
            resource_id=artist_id,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'artist_id': artist_id, 'errors': list(errors.keys())},
            response_data={'error': 'validation_failed'},
            status_code=400,
        )
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    old_values = {
        'stage_name': artist.stage_name,
        'bio': artist.bio or '',
        'location': artist.location or '',
        'country': artist.country or getattr(artist.user, 'country', ''),
        'region': artist.region or '',
        'primary_genre': artist.primary_genre or '',
        'music_style': artist.music_style or '',
        'website': artist.website or '',
        'instagram': artist.instagram or '',
        'twitter': artist.twitter or '',
        'facebook': artist.facebook or '',
        'youtube': artist.youtube or '',
        'spotify': artist.spotify or '',
        'photo': artist.user.photo.name if artist.user.photo else None,
    }

    changes_made = {}
    user_update_fields = set()

    if stage_name and stage_name != old_values['stage_name']:
        artist.stage_name = stage_name
        changes_made['stage_name'] = {'old': old_values['stage_name'], 'new': stage_name}
    if bio and bio != old_values['bio']:
        artist.bio = bio
        changes_made['bio'] = {'old': old_values['bio'], 'new': bio}
    if location and location != old_values['location']:
        artist.location = location
        artist.user.location = location
        changes_made['location'] = {'old': old_values['location'], 'new': location}
        user_update_fields.add('location')
    if country and country != old_values['country']:
        artist.country = country
        artist.user.country = country
        changes_made['country'] = {'old': old_values['country'], 'new': country}
        user_update_fields.add('country')
    if region and region != old_values['region']:
        artist.region = region
        changes_made['region'] = {'old': old_values['region'], 'new': region}
    if primary_genre and primary_genre != old_values['primary_genre']:
        artist.primary_genre = primary_genre
        changes_made['primary_genre'] = {'old': old_values['primary_genre'], 'new': primary_genre}
    if music_style and music_style != old_values['music_style']:
        artist.music_style = music_style
        changes_made['music_style'] = {'old': old_values['music_style'], 'new': music_style}
    if website and website != old_values['website']:
        artist.website = website
        changes_made['website'] = {'old': old_values['website'], 'new': website}
    if instagram and instagram != old_values['instagram']:
        artist.instagram = instagram
        changes_made['instagram'] = {'old': old_values['instagram'], 'new': instagram}
    if twitter and twitter != old_values['twitter']:
        artist.twitter = twitter
        changes_made['twitter'] = {'old': old_values['twitter'], 'new': twitter}
    if facebook and facebook != old_values['facebook']:
        artist.facebook = facebook
        changes_made['facebook'] = {'old': old_values['facebook'], 'new': facebook}
    if youtube and youtube != old_values['youtube']:
        artist.youtube = youtube
        changes_made['youtube'] = {'old': old_values['youtube'], 'new': youtube}
    if spotify and spotify != old_values['spotify']:
        artist.spotify = spotify
        changes_made['spotify'] = {'old': old_values['spotify'], 'new': spotify}

    if photo:
        if artist.user.photo and 'default' not in artist.user.photo.name:
            artist.user.photo.delete(save=False)
        artist.user.photo = photo
        user_update_fields.add('photo')
        changes_made['photo'] = {'old': old_values['photo'], 'new': artist.user.photo.name}

    artist.profile_completed = all([
        artist.stage_name,
        artist.bio,
        artist.primary_genre,
    ])
    artist.onboarding_step = artist.get_next_onboarding_step()
    artist.save()

    if user_update_fields:
        artist.user.save(update_fields=list(user_update_fields))

    photo_url = artist.user.photo.url if artist.user.photo else None

    serialized = serialize_artist_onboarding_state(artist)
    if photo_url:
        serialized['profile'] = {
            **serialized.get('profile', {}),
            'photo': photo_url,
        }

    AuditLog.objects.create(
        user=request.user,
        action='artist_profile_updated',
        resource_type='artist_profile',
        resource_id=str(artist.artist_id),
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        request_data={'artist_id': artist_id, 'fields_updated': list(changes_made.keys())},
        response_data={'success': True, 'profile_completed': artist.profile_completed},
        status_code=200,
    )

    payload['message'] = "Successful"
    payload['data'] = serialized
    return Response(payload, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def skip_artist_onboarding_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")
    step = request.data.get('step', "")

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']
    if not step:
        errors['step'] = ['Target step is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']
        artist = None

    normalized_step = step.replace('_', '-') if isinstance(step, str) else step
    valid_steps = {choice[0] for choice in Artist.ONBOARDING_STEPS}
    if artist and normalized_step not in valid_steps:
        errors['step'] = ['Invalid onboarding step.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    user = artist.user

    # Reset completion flags when a user decides to revisit an earlier required step.
    if normalized_step == 'profile':
        artist.profile_completed = False
    elif normalized_step == 'social-media':
        artist.social_media_added = False
    elif normalized_step == 'payment':
        artist.payment_info_added = False
    elif normalized_step == 'publisher':
        artist.publisher_added = True
        artist.is_self_published = True
        artist.publisher = None
        artist.publisher_preferences = {
            'publisher_name': 'Self-published',
            'relationship_notes': 'Marked as self-published during onboarding skip.',
        }
    elif normalized_step == 'kyc':
        if user.verification_status in ['pending', 'incomplete']:
            user.verification_status = 'skipped'
            user.verification_skipped_at = timezone.now()
            user.verification_reminder_sent = False
            user.save(update_fields=['verification_status', 'verification_skipped_at', 'verification_reminder_sent'])
        artist.onboarding_step = 'done'
        artist.save()
        payload['message'] = "Successful"
        payload['data'] = serialize_artist_onboarding_state(artist)
        return Response(payload, status=status.HTTP_200_OK)

    if normalized_step == 'publisher':
        artist.onboarding_step = artist.get_next_onboarding_step()
    else:
        artist.onboarding_step = normalized_step

    artist.save()

    data.update(serialize_artist_onboarding_state(artist))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def skip_verification_view(request):
    """
    Skip identity verification during onboarding
    Allows artists to continue onboarding without completing KYC
    """
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
    
    artist_id = request.data.get('artist_id', "")
    reason = request.data.get('reason', "")  # Optional reason for skipping

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id, user=request.user)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found or access denied.']
        artist = None

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        
        # Log failed skip attempt
        AuditLog.objects.create(
            user=request.user,
            action='skip_verification_failed',
            resource_type='verification',
            resource_id=artist_id,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'artist_id': artist_id, 'errors': list(errors.keys())},
            response_data={'error': 'validation_failed'},
            status_code=400
        )
        
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    user = artist.user
    
    # Enhanced verification skip validation with better error handling
    if user.verification_status not in ['pending', 'incomplete']:
        error_messages = {
            'verified': {
                'message': 'Verification is already completed and cannot be skipped.',
                'help_text': 'Your account is fully verified. All platform features are available.',
                'suggested_actions': ['Continue using the platform', 'Contact support if you have questions']
            },
            'skipped': {
                'message': 'Verification has already been skipped.',
                'help_text': 'You can resume verification anytime from your profile settings.',
                'suggested_actions': ['Resume verification process', 'Continue with limited features', 'Contact support for help']
            }
        }
        
        error_info = error_messages.get(user.verification_status, {
            'message': f'Verification cannot be skipped. Current status: {user.verification_status}',
            'help_text': 'Please check your verification status and try again.',
            'suggested_actions': ['Check verification status', 'Contact support']
        })
        
        errors['verification'] = [error_info['message']]
        payload['message'] = "Errors"
        payload['errors'] = errors
        payload['error_details'] = {
            'current_status': user.verification_status,
            'help_text': error_info['help_text'],
            'suggested_actions': error_info['suggested_actions'],
            'can_resume': user.verification_status == 'skipped',
            'features_available': user.verification_status == 'verified'
        }
        
        # Log the failed skip attempt with enhanced context
        AuditLog.objects.create(
            user=user,
            action='skip_verification_rejected',
            resource_type='verification',
            resource_id=str(artist.artist_id),
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={
                'artist_id': artist_id,
                'reason': reason,
                'current_status': user.verification_status,
                'onboarding_context': True
            },
            response_data={
                'error': 'invalid_status',
                'current_status': user.verification_status,
                'allowed_statuses': ['pending', 'incomplete'],
                'error_details': error_info,
                'user_guidance_provided': True
            },
            status_code=400
        )
        
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Store previous status for audit trail
    previous_status = user.verification_status
    
    # Update verification status to skipped
    user.verification_status = 'skipped'
    user.verification_skipped_at = timezone.now()
    user.verification_reminder_sent = False  # Reset reminder flag
    user.save(update_fields=['verification_status', 'verification_skipped_at', 'verification_reminder_sent'])

    # Create activity log
    AllActivity.objects.create(
        user=user,
        subject="Verification Skipped",
        body=f"{user.email} skipped identity verification during onboarding. Reason: {reason or 'Not provided'}"
    )

    # Create audit log with enhanced details
    AuditLog.objects.create(
        user=user,
        action='verification_skipped',
        resource_type='verification',
        resource_id=str(artist.artist_id),
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        request_data={
            'artist_id': artist_id,
            'reason': reason or 'No reason provided',
            'skipped_at': user.verification_skipped_at.isoformat(),
            'previous_status': previous_status,
            'onboarding_context': True
        },
        response_data={
            'success': True,
            'verification_status': user.verification_status,
            'can_verify_later': True,
            'features_requiring_verification': get_verification_required_features(user),
            'next_recommended_step': get_next_recommended_step(artist)
        },
        status_code=200
    )

    data = {
        "artist_id": artist.artist_id,
        "verification_status": user.verification_status,
        "verification_skipped_at": user.verification_skipped_at.isoformat(),
        "next_recommended_step": get_next_recommended_step(artist),
        "can_verify_later": True,
        "can_resume_verification": True,
        "verification_required_for_features": get_verification_required_features(user),
        "profile_completion_percentage": calculate_profile_completion_percentage(artist),
        "onboarding_progress": {
            **serialize_artist_onboarding_state(artist)["progress"],
            "verification_skipped": True,
        },
        "skip_details": {
            "reason": reason or "No reason provided",
            "skipped_during_onboarding": True,
            "can_continue_onboarding": True,
            "verification_reminder_available": True
        },
        "feature_limitations": {
            "royalty_withdrawals": "Disabled - Verification required",
            "publisher_partnerships": "Limited - Self-publishing only",
            "advanced_analytics": "Disabled - Basic analytics available",
            "priority_support": "Disabled - Standard support available",
            "dispute_resolution": "Disabled - Verification required"
        },
        "resume_instructions": {
            "methods": [
                "Go to Profile Settings > Verification",
                "Use the 'Resume Verification' API endpoint",
                "Click verification reminder email link"
            ],
            "required_documents": ["National ID Card", "Utility Bill"],
            "estimated_time": "1-2 business days for review"
        },
        "message": "Verification skipped successfully. You can complete verification later from your profile settings.",
        "help_text": "Some features like royalty withdrawals and publisher partnerships require identity verification. You can complete this process anytime from your profile settings.",
        "support_resources": {
            "verification_guide": "/help/verification-guide",
            "faq": "/help/verification-faq",
            "support_email": "support@zamio.com"
        }
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def resume_verification_view(request):
    """
    Resume identity verification process for users who previously skipped it
    """
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
    user = request.user

    try:
        artist = Artist.objects.get(user=user)
    except Artist.DoesNotExist:
        artist = None

    serialized_state = serialize_artist_onboarding_state(artist) if artist else {}
    current_status = user.verification_status

    if current_status == 'pending':
        data = {
            **serialized_state,
            "verification_status": current_status,
            "kyc_status": user.kyc_status,
            "already_in_progress": True,
            "already_verified": False,
            "can_resume_verification": current_status in ['skipped', 'incomplete'],
            "can_skip_verification": current_status in ['pending', 'incomplete'],
        }

        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)

    if current_status == 'verified':
        data = {
            **serialized_state,
            "verification_status": current_status,
            "kyc_status": user.kyc_status,
            "already_in_progress": False,
            "already_verified": True,
            "can_resume_verification": current_status in ['skipped', 'incomplete'],
            "can_skip_verification": current_status in ['pending', 'incomplete'],
        }

        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)

    # Enhanced verification resume validation with better error handling
    if current_status not in ['skipped', 'incomplete']:
        error_messages = {
            'pending': {
                'message': 'Verification is already in progress.',
                'help_text': 'Your verification documents are being processed. Please wait for review completion.',
                'suggested_actions': ['Check verification status', 'Wait for review completion', 'Contact support if urgent']
            },
            'verified': {
                'message': 'Verification is already completed.',
                'help_text': 'Your account is fully verified and all features are available.',
                'suggested_actions': ['Continue using the platform', 'Explore all available features']
            }
        }
        
        error_info = error_messages.get(current_status, {
            'message': f'Verification cannot be resumed. Current status: {current_status}',
            'help_text': 'Please check your verification status and contact support if needed.',
            'suggested_actions': ['Check verification status', 'Contact support']
        })

        errors['verification'] = [error_info['message']]
        payload['message'] = "Errors"
        payload['errors'] = errors
        payload['error_details'] = {
            'current_status': current_status,
            'help_text': error_info['help_text'],
            'suggested_actions': error_info['suggested_actions'],
            'can_skip': False,
            'already_completed': current_status == 'verified'
        }

        # Log the failed resume attempt with enhanced context
        AuditLog.objects.create(
            user=user,
            action='resume_verification_rejected',
            resource_type='verification',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={
                'current_status': current_status,
                'attempted_at': timezone.now().isoformat(),
                'user_guidance_needed': True
            },
            response_data={
                'error': 'invalid_status',
                'current_status': current_status,
                'allowed_statuses': ['skipped', 'incomplete'],
                'error_details': error_info,
                'user_guidance_provided': True
            },
            status_code=400
        )

        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Reset verification status to pending
    user.verification_status = 'pending'
    user.verification_skipped_at = None
    user.verification_reminder_sent = False
    user.save(update_fields=['verification_status', 'verification_skipped_at', 'verification_reminder_sent'])

    # Create activity log
    AllActivity.objects.create(
        user=user,
        subject="Verification Resumed",
        body=f"{user.email} resumed identity verification process"
    )

    # Create audit log
    AuditLog.objects.create(
        user=user,
        action='verification_resumed',
        resource_type='verification',
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        request_data={'resumed_at': timezone.now().isoformat()},
        response_data={
            'success': True,
            'verification_status': user.verification_status,
            'previous_status': 'skipped'
        },
        status_code=200
    )

    data = {
        **serialized_state,
        "verification_status": user.verification_status,
        "kyc_status": user.kyc_status,
        "can_resume_verification": user.verification_status in ['skipped', 'incomplete'],
        "can_skip_verification": user.verification_status in ['pending', 'incomplete'],
        "kyc_documents": user.kyc_documents,
        "verification_resumed_at": timezone.now().isoformat(),
        "next_steps": [
            "Upload required identity documents",
            "Wait for document review (1-2 business days)",
            "Receive verification confirmation email"
        ],
        "required_documents": [
            {
                "type": "id_card",
                "name": "National ID Card",
                "description": "Government-issued identification"
            },
            {
                "type": "utility_bill", 
                "name": "Utility Bill",
                "description": "Recent utility bill for address verification"
            }
        ],
        "upload_guidelines": {
            "accepted_formats": ["PDF", "JPG", "PNG"],
            "max_file_size": "10MB per document",
            "quality_requirements": [
                "Clear, high-resolution images",
                "All text must be readable",
                "Full document visible (no cropping)",
                "Documents must be valid and not expired"
            ]
        },
        "estimated_processing_time": "1-2 business days",
        "features_to_unlock": [
            "Royalty withdrawals",
            "Publisher partnerships",
            "Advanced analytics",
            "Priority support",
            "Dispute resolution"
        ],
        "support_resources": {
            "verification_guide": "/help/verification-guide",
            "document_requirements": "/help/document-requirements",
            "support_email": "support@zamio.com",
            "faq": "/help/verification-faq"
        },
        "message": "Verification process resumed successfully. Please upload your identity documents to complete verification.",
        "already_resumed": True,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def verification_status_view(request):
    """
    Get current verification status and available actions for the user
    """
    payload = {}
    data = {}
    
    user = request.user
    
    # Get artist profile if exists
    artist = None
    try:
        artist = Artist.objects.get(user=user)
    except Artist.DoesNotExist:
        pass

    # Calculate verification progress
    verification_progress = {
        'documents_uploaded': bool(user.kyc_documents),
        'documents_count': len(user.kyc_documents) if user.kyc_documents else 0,
        'required_documents': ['id_card', 'utility_bill'],
        'optional_documents': ['passport', 'bank_statement'],
        'completion_percentage': 0
    }
    
    if user.kyc_documents:
        required_uploaded = sum(1 for doc in verification_progress['required_documents'] 
                              if doc in user.kyc_documents)
        verification_progress['completion_percentage'] = (required_uploaded / len(verification_progress['required_documents'])) * 100

    # Get verification workflow status
    workflow_status = {
        'current_step': 'not_started',
        'available_actions': [],
        'next_steps': []
    }
    
    if user.verification_status == 'pending':
        workflow_status['current_step'] = 'document_upload'
        workflow_status['available_actions'] = ['upload_documents', 'skip_verification']
        workflow_status['next_steps'] = ['Upload required identity documents', 'Or skip for now and verify later']
    elif user.verification_status == 'skipped':
        workflow_status['current_step'] = 'skipped'
        workflow_status['available_actions'] = ['resume_verification']
        workflow_status['next_steps'] = ['Resume verification process anytime from profile settings']
    elif user.verification_status == 'incomplete':
        workflow_status['current_step'] = 'under_review'
        workflow_status['available_actions'] = ['check_status']
        workflow_status['next_steps'] = ['Documents are being reviewed (1-2 business days)']
    elif user.verification_status == 'verified':
        workflow_status['current_step'] = 'completed'
        workflow_status['available_actions'] = []
        workflow_status['next_steps'] = ['Verification complete - all features unlocked']

    data = {
        "verification_status": user.verification_status,
        "kyc_status": user.kyc_status,
        "verification_skipped_at": user.verification_skipped_at.isoformat() if user.verification_skipped_at else None,
        "verification_reminder_sent": user.verification_reminder_sent,
        "can_skip_verification": user.verification_status in ['pending', 'incomplete'],
        "can_resume_verification": user.verification_status in ['skipped', 'incomplete'],
        "verification_required_for_features": get_verification_required_features(user),
        "verification_progress": verification_progress,
        "workflow_status": workflow_status,
        "profile_completion_percentage": calculate_profile_completion_percentage(artist) if artist else 0,
        "estimated_review_time": "1-2 business days" if user.verification_status == 'incomplete' else None,
        "help_resources": {
            "faq_url": "/help/verification-faq",
            "support_email": "support@zamio.com",
            "document_requirements": "https://zamio.com/help/kyc-requirements"
        }
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def send_verification_reminder_view(request):
    """
    Send verification reminder to users who have skipped verification
    """
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
    user = request.user
    
    # Check if user has skipped verification
    if user.verification_status != 'skipped':
        errors['verification'] = ['Verification reminders can only be sent to users who have skipped verification.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        
        # Log failed reminder attempt
        AuditLog.objects.create(
            user=user,
            action='verification_reminder_rejected',
            resource_type='verification',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'current_status': user.verification_status},
            response_data={
                'error': 'invalid_status',
                'current_status': user.verification_status,
                'required_status': 'skipped'
            },
            status_code=400
        )
        
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if reminder was already sent recently (prevent spam)
    if user.verification_reminder_sent:
        errors['reminder'] = ['Verification reminder has already been sent. Please check your email.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Send verification reminder email using Celery
        from accounts.email_utils import send_verification_reminder_email
        task_id = send_verification_reminder_email(user)
        
        # Mark reminder as sent
        user.verification_reminder_sent = True
        user.save(update_fields=['verification_reminder_sent'])
        
        # Create activity log
        AllActivity.objects.create(
            user=user,
            subject="Verification Reminder Sent",
            body=f"Verification reminder email sent to {user.email}"
        )
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            action='verification_reminder_sent',
            resource_type='verification',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'email': user.email},
            response_data={
                'success': True,
                'task_id': task_id,
                'reminder_sent': True
            },
            status_code=200
        )
        
        data = {
            "message": "Verification reminder sent successfully",
            "email": user.email,
            "task_id": task_id,
            "reminder_sent": True,
            "next_steps": [
                "Check your email for verification instructions",
                "Click the verification link or use the resume verification endpoint"
            ]
        }
        
        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Failed to send verification reminder: {str(e)}")
        
        # Log failed reminder attempt
        AuditLog.objects.create(
            user=user,
            action='verification_reminder_failed',
            resource_type='verification',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_data={'email': user.email},
            response_data={
                'error': 'email_send_failed',
                'error_message': str(e)
            },
            status_code=500
        )
        
        errors['email'] = ['Failed to send verification reminder. Please try again later.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def verification_requirements_view(request):
    """
    Get detailed verification requirements and guidelines for the user
    """
    payload = {}
    data = {}
    
    user = request.user
    
    # Get artist profile if exists
    artist = None
    try:
        artist = Artist.objects.get(user=user)
    except Artist.DoesNotExist:
        pass
    
    # Define verification requirements
    requirements = {
        "required_documents": [
            {
                "type": "id_card",
                "name": "National ID Card",
                "description": "Government-issued national identification card",
                "accepted_formats": ["PDF", "JPG", "PNG"],
                "max_size_mb": 10,
                "requirements": [
                    "Clear, high-resolution image",
                    "All text must be readable",
                    "Full document visible (no cropping)",
                    "Valid and not expired"
                ]
            },
            {
                "type": "utility_bill",
                "name": "Utility Bill",
                "description": "Recent utility bill for address verification",
                "accepted_formats": ["PDF", "JPG", "PNG"],
                "max_size_mb": 10,
                "requirements": [
                    "Issued within the last 3 months",
                    "Shows full name and address",
                    "From recognized utility provider",
                    "All text clearly visible"
                ]
            }
        ],
        "optional_documents": [
            {
                "type": "passport",
                "name": "Passport",
                "description": "International passport (alternative to national ID)",
                "accepted_formats": ["PDF", "JPG", "PNG"],
                "max_size_mb": 10,
                "requirements": [
                    "Valid and not expired",
                    "Photo page clearly visible",
                    "All text readable"
                ]
            },
            {
                "type": "bank_statement",
                "name": "Bank Statement",
                "description": "Recent bank statement for additional verification",
                "accepted_formats": ["PDF"],
                "max_size_mb": 10,
                "requirements": [
                    "Issued within the last 3 months",
                    "Shows account holder name",
                    "From recognized financial institution"
                ]
            }
        ]
    }
    
    # Get current verification status
    current_status = {
        "verification_status": user.verification_status,
        "kyc_status": user.kyc_status,
        "documents_uploaded": bool(user.kyc_documents),
        "uploaded_documents": list(user.kyc_documents.keys()) if user.kyc_documents else [],
        "verification_skipped_at": user.verification_skipped_at.isoformat() if user.verification_skipped_at else None
    }
    
    # Define features requiring verification
    restricted_features = {
        "royalty_withdrawals": {
            "name": "Royalty Withdrawals",
            "description": "Request withdrawal of earned royalties to your bank account",
            "impact": "Cannot withdraw earnings until verified"
        },
        "publisher_partnerships": {
            "name": "Publisher Partnerships",
            "description": "Enter into publishing agreements with music publishers",
            "impact": "Limited to self-publishing only"
        },
        "advanced_analytics": {
            "name": "Advanced Analytics",
            "description": "Access detailed play analytics and revenue reports",
            "impact": "Basic analytics only"
        },
        "priority_support": {
            "name": "Priority Support",
            "description": "Get priority customer support and faster response times",
            "impact": "Standard support queue"
        },
        "dispute_resolution": {
            "name": "Dispute Resolution",
            "description": "File and manage copyright disputes",
            "impact": "Cannot file disputes"
        }
    }
    
    # Verification process steps
    process_steps = [
        {
            "step": 1,
            "title": "Document Preparation",
            "description": "Gather required identity documents",
            "estimated_time": "5 minutes",
            "tips": [
                "Ensure documents are clear and readable",
                "Use good lighting when taking photos",
                "Avoid shadows or glare"
            ]
        },
        {
            "step": 2,
            "title": "Document Upload",
            "description": "Upload documents through the verification portal",
            "estimated_time": "10 minutes",
            "tips": [
                "Upload one document at a time",
                "Check file size limits",
                "Verify document type is correct"
            ]
        },
        {
            "step": 3,
            "title": "Review Process",
            "description": "Our team reviews your submitted documents",
            "estimated_time": "1-2 business days",
            "tips": [
                "You'll receive email updates on progress",
                "Additional documents may be requested",
                "Check your email regularly"
            ]
        },
        {
            "step": 4,
            "title": "Verification Complete",
            "description": "Account verified and all features unlocked",
            "estimated_time": "Immediate",
            "tips": [
                "All platform features now available",
                "You can now withdraw royalties",
                "Publisher partnerships enabled"
            ]
        }
    ]
    
    # Skip verification information
    skip_information = {
        "can_skip": user.verification_status in ['pending', 'incomplete'],
        "skip_consequences": [
            "Limited access to platform features",
            "Cannot withdraw earned royalties",
            "Restricted to self-publishing only",
            "Basic analytics and support only"
        ],
        "resume_anytime": True,
        "resume_instructions": [
            "Go to Profile Settings > Verification",
            "Click 'Resume Verification Process'",
            "Upload required documents",
            "Wait for review completion"
        ]
    }
    
    data = {
        "requirements": requirements,
        "current_status": current_status,
        "restricted_features": restricted_features,
        "process_steps": process_steps,
        "skip_information": skip_information,
        "estimated_total_time": "1-3 business days",
        "support_contact": {
            "email": "support@zamio.com",
            "help_center": "/help/verification",
            "faq": "/help/verification-faq"
        },
        "profile_completion_percentage": calculate_profile_completion_percentage(artist) if artist else 0
    }
    
    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_artist_social_view(request):
    payload = {}
    data = {}
    errors = {}

    truthy = {True, 'true', 'True', '1', 1, 'on', 'yes', 'Yes'}

    artist_id = request.data.get('artist_id', "")
    facebook = request.data.get('facebook', "")
    twitter = request.data.get('twitter', "")
    instagram = request.data.get('instagram', "")
    youtube = request.data.get('youtube', "")
    raw_accounts = request.data.get('accounts') or request.data.get('social_accounts')
    skip_requested = request.data.get('skip') or request.data.get('skip_step')

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']
        artist = None

    if skip_requested in truthy and artist:
        social_metrics = dict(getattr(artist, 'social_metrics', {}) or {})
        social_metrics['skipped'] = True
        artist.social_metrics = social_metrics
        artist.social_media_added = True
        artist.onboarding_step = artist.get_next_onboarding_step()
        artist.save()

        data.update(serialize_artist_onboarding_state(artist))
        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)

    accounts_data = []
    if raw_accounts:
        parsed_accounts = raw_accounts
        if isinstance(raw_accounts, str):
            try:
                parsed_accounts = json.loads(raw_accounts)
            except (TypeError, json.JSONDecodeError):
                errors['accounts'] = ['Invalid social accounts payload.']
                parsed_accounts = []

        if isinstance(parsed_accounts, dict):
            accounts_data = [parsed_accounts]
        elif isinstance(parsed_accounts, list):
            accounts_data = parsed_accounts
        elif parsed_accounts:
            errors['accounts'] = ['Social accounts payload must be a list or object.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Apply changes if provided
    if facebook:
        artist.facebook = facebook
    if twitter:
        artist.twitter = twitter
    if instagram:
        artist.instagram = instagram
    if youtube:
        artist.youtube = youtube

    if accounts_data:
        artist.social_metrics = {
            'accounts': accounts_data,
        }

    # Mark this step as complete
    has_linked_account = any([
        facebook,
        twitter,
        instagram,
        youtube,
        bool(accounts_data),
    ])
    if not has_linked_account:
        payload['message'] = "Errors"
        payload['errors'] = {
            'social_accounts': ['Provide at least one social media link or connection.']
        }
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    artist.social_media_added = True

    # Move to next onboarding step
    artist.onboarding_step = artist.get_next_onboarding_step()
    artist.save()

    data.update(serialize_artist_onboarding_state(artist))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_artist_payment_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")
    preferred_method = request.data.get('preferred_method') or request.data.get('preferredMethod')
    currency = request.data.get('currency', 'GHS')

    mobile_provider = request.data.get('mobile_provider') or request.data.get('mobileProvider')
    mobile_number = request.data.get('mobile_number') or request.data.get('mobileNumber')
    mobile_account_name = request.data.get('mobile_account_name') or request.data.get('mobileAccountName')

    bank_name = request.data.get('bank_name') or request.data.get('bankName')
    account_number = request.data.get('account_number') or request.data.get('accountNumber')
    account_holder_name = request.data.get('account_holder_name') or request.data.get('accountHolderName')
    routing_number = request.data.get('routing_number') or request.data.get('routingNumber')

    international_instructions = request.data.get('international_instructions') or request.data.get('internationalInstructions')

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']
        artist = None

    if artist and not preferred_method:
        errors['preferred_method'] = ['Preferred payment method is required.']

    method = (preferred_method or '').lower() if preferred_method else ''
    if method == 'mobile-money':
        if not mobile_provider:
            errors['mobile_provider'] = ['Mobile money provider is required.']
        if not mobile_number:
            errors['mobile_number'] = ['Mobile money number is required.']
    elif method == 'bank-transfer':
        if not bank_name:
            errors['bank_name'] = ['Bank name is required.']
        if not account_number:
            errors['account_number'] = ['Bank account number is required.']
        if not account_holder_name:
            errors['account_holder_name'] = ['Account holder name is required.']
    elif method == 'international':
        if not international_instructions:
            errors['international_instructions'] = ['Provide instructions for international transfers.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    payment_preferences = {
        'preferred_method': preferred_method,
        'currency': currency,
    }

    if method == 'mobile-money':
        payment_preferences['mobile_money'] = {
            'provider': mobile_provider,
            'number': mobile_number,
            'account_name': mobile_account_name,
        }
    elif method == 'bank-transfer':
        payment_preferences['bank_transfer'] = {
            'bank_name': bank_name,
            'account_number': account_number,
            'account_holder_name': account_holder_name,
            'routing_number': routing_number,
        }
    elif method == 'international':
        payment_preferences['international'] = {
            'instructions': international_instructions,
        }

    # Persist payment preferences on both artist and user for compatibility
    artist.payment_preferences = payment_preferences

    user_documents = dict(getattr(artist.user, 'kyc_documents', {}) or {})
    user_documents['payment_preferences'] = payment_preferences
    artist.user.kyc_documents = user_documents
    artist.user.save(update_fields=['kyc_documents'])

    # Mark this step as complete
    artist.payment_info_added = True

    # Move to next onboarding step
    artist.onboarding_step = artist.get_next_onboarding_step()
    artist.save()

    data.update(serialize_artist_onboarding_state(artist))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_artist_publisher_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")
    publisher_id = request.data.get('publisher_id', "")
    self_publish_raw = request.data.get('self_publish', "")
    publisher_name = request.data.get('publisher_name') or request.data.get('publisherName')
    publisher_type = request.data.get('publisher_type') or request.data.get('publisherType')
    publisher_location = request.data.get('publisher_location') or request.data.get('publisherLocation')
    publisher_specialties = request.data.get('publisher_specialties') or request.data.get('publisherSpecialties')
    relationship_notes = request.data.get('relationship_notes') or request.data.get('relationshipNotes')
    agreed_to_terms = request.data.get('agreed_to_terms') or request.data.get('agreedToTerms')
    selected_publisher = request.data.get('publisher_details') or request.data.get('selected_publisher')

    truthy = {True, 'true', 'True', '1', 1, 'on', 'yes', 'Yes'}
    falsy = {False, 'false', 'False', '0', 0, 'off', 'no', 'No', None, ''}
    self_publish = True if self_publish_raw in truthy else False if self_publish_raw in falsy else bool(self_publish_raw)

    parsed_selected = None
    if selected_publisher:
        parsed_selected = selected_publisher
        if isinstance(selected_publisher, str):
            try:
                parsed_selected = json.loads(selected_publisher)
            except (TypeError, json.JSONDecodeError):
                errors['publisher_details'] = ['Invalid publisher details payload.']
        if isinstance(parsed_selected, dict):
            publisher_name = publisher_name or parsed_selected.get('name')
            publisher_type = publisher_type or parsed_selected.get('type')
            publisher_location = publisher_location or parsed_selected.get('location')
            publisher_specialties = publisher_specialties or parsed_selected.get('specialties')
            agreed_to_terms = agreed_to_terms or parsed_selected.get('agreed_to_terms')

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Apply changes
    preferences = {
        'publisher_name': publisher_name,
        'publisher_type': publisher_type,
        'publisher_location': publisher_location,
        'publisher_specialties': publisher_specialties,
        'relationship_notes': relationship_notes,
        'agreed_to_terms': bool(agreed_to_terms in truthy) if agreed_to_terms not in (None, '') else None,
        'selected_publisher': parsed_selected if isinstance(parsed_selected, dict) else None,
    }

    if self_publish is True:
        artist.is_self_published = True
        # Clear any previously set publisher if switching to self-publish
        artist.publisher = None
        preferences['publisher_name'] = publisher_name or 'Self-published'
        setattr(artist, 'publisher_relationship_status', 'independent')
        setattr(artist, 'royalty_collection_method', 'direct')
    else:
        artist.is_self_published = False
        if publisher_id:
            try:
                publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
                artist.publisher = publisher
                preferences['publisher_name'] = preferences.get('publisher_name') or getattr(publisher, 'company_name', None)
                preferences['publisher_type'] = preferences.get('publisher_type') or getattr(publisher, 'publisher_type', None)
                preferences['publisher_location'] = preferences.get('publisher_location') or getattr(publisher, 'country', None)
                
                # Send notification to publisher about new artist
                try:
                    from notifications.models import Notification
                    Notification.objects.create(
                        user=publisher.user,
                        type='Update',
                        title='New Artist Joined',
                        message=f'{artist.stage_name} has selected you as their publisher and would like to work with you.',
                        priority='high',
                        action_required=True,
                        action_label='View Artist Profile',
                        action_type='view_artist',
                        metadata={
                            'artist_id': artist.artist_id,
                            'artist_name': artist.stage_name,
                            'timestamp': timezone.now().isoformat(),
                            'notification_type': 'artist_joined'
                        }
                    )
                    logger.info(f"Notification sent to publisher {publisher.publisher_id} for artist {artist.artist_id}")
                except Exception as notif_error:
                    # Log error but don't fail the request
                    logger.error(f"Failed to send notification to publisher: {str(notif_error)}")
                    
            except PublisherProfile.DoesNotExist:
                errors['publisher_id'] = ['Publisher not found.']

        if not publisher_id and not publisher_name:
            errors['publisher'] = ['Provide publisher details or choose self-published.']
        setattr(artist, 'publisher_relationship_status', 'pending')
        if not getattr(artist, 'royalty_collection_method', None):
            setattr(artist, 'royalty_collection_method', 'publisher')

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Persist publisher preferences snapshot for UI consumption
    artist.publisher_preferences = {k: v for k, v in preferences.items() if v not in (None, '')}

    # Mark this step as complete
    artist.publisher_added = True

    # Move to next onboarding step
    artist.onboarding_step = artist.get_next_onboarding_step()
    artist.save()

    data.update(serialize_artist_onboarding_state(artist))

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)








@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def onboard_artist_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")
    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']

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
            setattr(artist, field, value)

    artist.save()


    # Check if fields are not null to complete profile
    if not artist.name or not artist.stage_name or not artist.bio or not artist.profile_image:
        errors['profile'] = ['Please complete your profile.']
    if not artist.spotify_url or not artist.shazam_url:
        errors['links'] = ['Please provide your Spotify and Shazam links.'] 
    if not artist.instagram or not artist.twitter:
        errors['social'] = ['Please provide your Instagram and Twitter links.']
    if not artist.contact_email:
        errors['contact_email'] = ['Contact email is required.']
    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    artist.profile_completed = True
    artist.save()

    
    data["user_id"] = str(artist.user.user_id)
    data["email"] = artist.user.email
    data["artist_id"] = artist.artist_id
    data["name"] = artist.stage_name

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)





@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def logout_artist_view(request):
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
        # Get the artist associated with the authenticated user
        artist = Artist.objects.get(user=request.user)
    except Artist.DoesNotExist:
        errors['user'] = ['User is not an artist.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        
        # Log failed logout attempt
        AuditLog.objects.create(
            user=request.user,
            action='artist_logout_failed',
            resource_type='authentication',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            response_data={'error': 'not_artist'},
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
        subject="Artist Log out",
        body=f"{request.user.email} just logged out of the account."
    )

    # Log successful logout
    AuditLog.objects.create(
        user=request.user,
        action='artist_logout_success',
        resource_type='authentication',
        resource_id=str(artist.artist_id),
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

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)





# Enhanced Artist Onboarding API Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def artist_onboarding_status_view(request, artist_id):
    """Get current onboarding status for an artist"""
    payload = {}
    data = {}
    errors = {}

    try:
        artist = Artist.objects.get(artist_id=artist_id, user=request.user)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found or access denied.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    # Get user KYC status
    user = artist.user
    
    onboarding_state = serialize_artist_onboarding_state(artist)
    data = {
        **onboarding_state,
        "profile_completed": onboarding_state["progress"].get("profile_completed", False),
        "social_media_added": onboarding_state["progress"].get("social_media_added", False),
        "payment_info_added": onboarding_state["progress"].get("payment_info_added", False),
        "publisher_added": onboarding_state["progress"].get("publisher_added", False),
        "track_uploaded": onboarding_state["progress"].get("track_uploaded", False),
        "kyc_status": user.kyc_status,
        "kyc_documents": user.kyc_documents,
        "verification_status": user.verification_status,
        "verification_skipped_at": user.verification_skipped_at.isoformat() if user.verification_skipped_at else None,
        "verification_reminder_sent": user.verification_reminder_sent,
        "self_published": getattr(artist, 'is_self_published', True),
        "publisher_relationship_status": getattr(artist, 'publisher_relationship_status', None),
        "royalty_collection_method": getattr(artist, 'royalty_collection_method', None),
        "profile_complete_percentage": onboarding_state["completion_percentage"],
        "required_fields": onboarding_state["required_fields"],
        "next_recommended_step": onboarding_state["next_recommended_step"],
        "can_skip_verification": user.verification_status == 'pending',
        "verification_required_for_features": get_verification_required_features(user),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def update_onboarding_status_view(request):
    """Update specific onboarding step status"""
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")
    step = request.data.get('step', "")
    completed = request.data.get('completed', False)

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']
    if not step:
        errors['step'] = ['Step is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id, user=request.user)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Update the specific step status
    step_mapping = {
        'profile': 'profile_completed',
        'social-media': 'social_media_added',
        'payment': 'payment_info_added',
        'publisher': 'publisher_added',
        'track': 'track_uploaded',
    }

    if step in step_mapping:
        setattr(artist, step_mapping[step], completed)
        if completed:
            artist.onboarding_step = artist.get_next_onboarding_step()
        artist.save()

    data = {
        "step": step,
        "completed": completed,
        **serialize_artist_onboarding_state(artist),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_artist_onboarding_view(request):
    """Mark artist onboarding as complete and set self-published status"""
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id, user=request.user)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Mark onboarding as complete
    artist.onboarding_step = 'done'
    
    # Ensure self-published status is set correctly
    if not artist.publisher:
        setattr(artist, 'is_self_published', True)
        setattr(artist, 'royalty_collection_method', 'direct')
        setattr(artist, 'publisher_relationship_status', 'independent')
    
    artist.save()

    # Update user profile completion status
    user = artist.user
    user.profile_complete = True
    user.save()

    data = {
        "onboarding_complete": True,
        "self_published": getattr(artist, 'is_self_published', True),
        "royalty_collection_method": getattr(artist, 'royalty_collection_method', None),
        "publisher_relationship_status": getattr(artist, 'publisher_relationship_status', None),
        **serialize_artist_onboarding_state(artist),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def set_self_published_status_view(request):
    """Explicitly set artist self-published status"""
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', "")
    self_published = request.data.get('self_published', True)

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id, user=request.user)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Update self-published status and related fields
    artist.update_publisher_relationship(
        publisher=None if self_published else artist.publisher,
        relationship_type='independent' if self_published else 'signed'
    )

    data = {
        "artist_id": artist.artist_id,
        "self_published": getattr(artist, 'is_self_published', True),
        "royalty_collection_method": getattr(artist, 'royalty_collection_method', None),
        "publisher_relationship_status": getattr(artist, 'publisher_relationship_status', None),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def update_identity_profile_view(request):
    """Store the artist's personal details required for identity verification."""

    payload = {}
    errors = {}

    artist_id = request.data.get('artist_id')
    full_name = (request.data.get('full_name') or '').strip()
    date_of_birth_raw = (request.data.get('date_of_birth') or '').strip()
    nationality = (request.data.get('nationality') or '').strip()
    id_type = (request.data.get('id_type') or '').strip()
    id_number = (request.data.get('id_number') or '').strip()
    residential_address = (request.data.get('residential_address') or '').strip()

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        artist = Artist.objects.get(artist_id=artist_id, user=request.user)
    except Artist.DoesNotExist:
        artist = None
        errors['artist_id'] = ['Artist not found or access denied.']

    if not full_name:
        errors['full_name'] = ['Full legal name is required.']
    if not id_number:
        errors['id_number'] = ['Identification number is required.']
    if not residential_address:
        errors['residential_address'] = ['Residential address is required.']

    allowed_id_types = {choice[0] for choice in ArtistIdentityProfile.ID_TYPE_CHOICES}
    if not id_type:
        errors['id_type'] = ['Identification document type is required.']
    elif id_type not in allowed_id_types:
        errors['id_type'] = ['Unsupported identification document type.']

    parsed_date = None
    if date_of_birth_raw:
        try:
            parsed_date = datetime.fromisoformat(date_of_birth_raw).date()
        except ValueError:
            errors['date_of_birth'] = ['Date of birth must be provided in ISO format (YYYY-MM-DD).']

    if errors:
        payload['message'] = 'Validation errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    identity_profile, _created = ArtistIdentityProfile.objects.get_or_create(artist=artist)
    identity_profile.full_legal_name = full_name
    identity_profile.date_of_birth = parsed_date
    identity_profile.nationality = nationality
    identity_profile.id_type = id_type
    identity_profile.id_number = id_number
    identity_profile.residential_address = residential_address
    identity_profile.save()

    updated_state = serialize_artist_onboarding_state(artist)

    payload['message'] = 'Identity profile saved successfully'
    payload['data'] = updated_state
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def upload_kyc_documents_view(request):
    """Enhanced KYC document upload with proper file handling and security"""
    from accounts.services.file_upload_service import FileUploadService
    from accounts.models import AuditLog
    
    payload = {}
    data = {}
    errors = {}

    user = request.user
    document_type = request.data.get('document_type', '')
    document_file = request.FILES.get('document_file')
    notes = request.data.get('notes', '')

    # Validate required fields
    if not document_type:
        errors['document_type'] = ['Document type is required.']
    if not document_file:
        errors['document_file'] = ['Document file is required.']

    if errors:
        payload['message'] = "Validation errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Upload document using the service
        kyc_document = FileUploadService.upload_kyc_document(
            user=user,
            document_type=document_type,
            file=document_file,
            notes=notes
        )
        
        # Log the upload action
        AuditLog.objects.create(
            user=user,
            action='kyc_document_upload',
            resource_type='KYCDocument',
            resource_id=str(kyc_document.id),
            request_data={
                'document_type': document_type,
                'filename': kyc_document.original_filename,
                'file_size': kyc_document.file_size
            }
        )
        
        data = {
            "document_id": kyc_document.id,
            "document_type": document_type,
            "document_type_display": kyc_document.get_document_type_display(),
            "status": kyc_document.status,
            "original_filename": kyc_document.original_filename,
            "file_size": kyc_document.file_size,
            "uploaded_at": kyc_document.uploaded_at,
            "kyc_status": user.kyc_status,
        }

        payload['message'] = "Document uploaded successfully"
        payload['data'] = data
        return Response(payload, status=status.HTTP_201_CREATED)
        
    except ValidationError as e:
        errors['file'] = e.messages if hasattr(e, 'messages') else [str(e)]
        payload['message'] = "File validation failed"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        payload['message'] = "Upload failed"
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_kyc_documents_view(request):
    """Get all KYC documents for the authenticated user"""
    from accounts.services.file_upload_service import FileUploadService
    
    try:
        user = request.user
        documents_data = FileUploadService.get_user_documents(user)
        
        payload = {
            'message': 'Documents retrieved successfully',
            'data': documents_data
        }
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        payload = {
            'message': 'Failed to retrieve documents',
            'errors': {'general': [str(e)]}
        }
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_kyc_document_view(request, document_id):
    """Delete a KYC document (only if not approved)"""
    from accounts.services.file_upload_service import FileUploadService
    
    try:
        user = request.user
        success = FileUploadService.delete_document(user, document_id)
        
        if success:
            # Log the deletion
            AuditLog.objects.create(
                user=user,
                action='kyc_document_delete',
                resource_type='KYCDocument',
                resource_id=str(document_id)
            )
            
            payload = {
                'message': 'Document deleted successfully'
            }
            return Response(payload, status=status.HTTP_200_OK)
        else:
            payload = {
                'message': 'Document not found or cannot be deleted',
                'errors': {'document': ['Document not found or already approved']}
            }
            return Response(payload, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        payload = {
            'message': 'Failed to delete document',
            'errors': {'general': [str(e)]}
        }
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def download_kyc_document_view(request, document_id):
    """Download a KYC document with enhanced access control"""
    from accounts.services.file_access_service import FileAccessService
    from django.core.exceptions import PermissionDenied
    from django.http import Http404
    
    try:
        user = request.user
        token = request.GET.get('token')  # Optional secure token
        
        # Use the secure file access service
        response = FileAccessService.serve_secure_file(user, document_id, token)
        return response
        
    except Http404 as e:
        payload = {
            'message': 'Document not found',
            'errors': {'document': [str(e)]}
        }
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
    except PermissionDenied as e:
        payload = {
            'message': 'Access denied',
            'errors': {'permission': [str(e)]}
        }
        return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
    except Exception as e:
        payload = {
            'message': 'Failed to download document',
            'errors': {'general': [str(e)]}
        }
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_secure_download_url_view(request, document_id):
    """Get a secure download URL for a KYC document"""
    from accounts.services.file_access_service import FileAccessService
    from django.core.exceptions import PermissionDenied
    from django.http import Http404
    
    try:
        user = request.user
        
        # Generate secure download URL
        download_info = FileAccessService.get_secure_download_url(user, document_id)
        
        payload = {
            'message': 'Secure download URL generated successfully',
            'data': download_info
        }
        return Response(payload, status=status.HTTP_200_OK)
        
    except Http404 as e:
        payload = {
            'message': 'Document not found',
            'errors': {'document': [str(e)]}
        }
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
    except PermissionDenied as e:
        payload = {
            'message': 'Access denied',
            'errors': {'permission': [str(e)]}
        }
        return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
    except Exception as e:
        payload = {
            'message': 'Failed to generate download URL',
            'errors': {'general': [str(e)]}
        }
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def secure_download_view(request, document_id):
    """Secure file download with token verification"""
    from accounts.services.file_access_service import FileAccessService
    from django.core.exceptions import PermissionDenied
    from django.http import Http404
    
    try:
        user = request.user
        token = request.GET.get('token')
        
        if not token:
            payload = {
                'message': 'Access token required',
                'errors': {'token': ['Token parameter is required']}
            }
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        
        # Use the secure file access service with token verification
        response = FileAccessService.serve_secure_file(user, document_id, token)
        return response
        
    except Http404 as e:
        payload = {
            'message': 'Document not found',
            'errors': {'document': [str(e)]}
        }
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
        
    except PermissionDenied as e:
        payload = {
            'message': 'Access denied',
            'errors': {'permission': [str(e)]}
        }
        return Response(payload, status=status.HTTP_403_FORBIDDEN)
        
    except Exception as e:
        payload = {
            'message': 'Failed to download file',
            'errors': {'general': [str(e)]}
        }
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publishers_list_view(request):
    """
    Get list of active publishers for artist selection during onboarding.
    
    Returns publishers that are:
    - Active (active=True)
    - Have completed their profile
    - Optionally accepting new artists
    """
    payload = {}
    
    try:
        # Fetch active publishers with completed profiles
        publishers = PublisherProfile.objects.filter(
            active=True,
            profile_completed=True
        ).select_related('user').order_by('company_name')
        
        # Build publisher list for frontend
        data = []
        for p in publishers:
            publisher_data = {
                'id': p.publisher_id,
                'name': p.company_name or 'Unknown Publisher',
                'type': p.publisher_type or 'Independent',
                'description': p.description or '',
                'specialties': [],
            }
            
            # Build location string
            location_parts = []
            if p.city:
                location_parts.append(p.city)
            if p.region:
                location_parts.append(p.region)
            if p.country:
                location_parts.append(p.country)
            publisher_data['location'] = ', '.join(location_parts) if location_parts else 'Not specified'
            
            # Parse specialties if stored as JSON or comma-separated
            if p.specialties:
                if isinstance(p.specialties, list):
                    publisher_data['specialties'] = p.specialties
                elif isinstance(p.specialties, str):
                    # Try to parse as JSON first, then fall back to comma-separated
                    try:
                        import json
                        publisher_data['specialties'] = json.loads(p.specialties)
                    except (json.JSONDecodeError, TypeError):
                        publisher_data['specialties'] = [s.strip() for s in p.specialties.split(',') if s.strip()]
            
            # Add default specialty if none provided
            if not publisher_data['specialties']:
                publisher_data['specialties'] = [publisher_data['type']]
            
            data.append(publisher_data)
        
        payload['message'] = 'Successful'
        payload['data'] = data
        payload['count'] = len(data)
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching publishers list: {str(e)}")
        payload['message'] = 'Failed to fetch publishers'
        payload['errors'] = {'general': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
