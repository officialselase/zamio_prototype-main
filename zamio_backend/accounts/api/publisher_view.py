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
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response

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
from core.utils import generate_email_token, is_valid_email, is_valid_password
from publishers.models import PublisherProfile, PublisherArtistRelationship

from accounts.api.custom_jwt import CustomJWTAuthentication

logger = logging.getLogger(__name__)
from django.db.models import Q


User = get_user_model()



@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def register_publisher_view(request):

    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        email = request.data.get('email', "").lower()
        first_name = request.data.get('first_name', "")
        last_name = request.data.get('last_name', "")
        company_name = request.data.get('publisher_name', "") or request.data.get('company_name', "")
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
        if not company_name:
            errors['company_name'] = ['Company Name is required.']

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
            data["user_id"] = str(user.user_id)
            data["email"] = user.email
            data["first_name"] = user.first_name
            data["last_name"] = user.last_name
            data["photo"] = user.photo

            if country:
                data["country"] = user.country


            user.user_type = "Publisher"
            user.phone = phone
            if country:
                try:
                    setattr(user, 'country', country)
                except Exception:
                    pass

            user.save()


            publisher_profile = PublisherProfile.objects.create(
                user=user,
                company_name=company_name,
                country=country or None

            )
            publisher_profile.save()

            account = BankAccount.objects.get_or_create(
                user=user, 
                balance=Decimal('0.00'),
                currency="Ghc"
            )



       

            data['phone'] = user.phone
            data['country'] = user.country
            data['photo'] = user.photo.url

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
            logger.error(f"Failed to send verification email during publisher registration: {str(e)}")
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
def verify_publisher_email(request):
    """
    Verify publisher email using verification token (backward compatible).
    
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
        
        # Get publisher profile
        publisher = PublisherProfile.objects.get(user=user)
        
        # Prepare response data (maintain backward compatibility)
        data["user_id"] = str(user.user_id)
        data["publisher_id"] = publisher.publisher_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if user.photo else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["next_step"] = publisher.onboarding_step
        data["profile_completed"] = publisher.profile_completed
        
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
    except PublisherProfile.DoesNotExist:
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['Publisher profile not found']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in verify_publisher_email: {str(e)}")
        payload['message'] = "Errors"
        payload['errors'] = {'general': ['An error occurred during verification']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def verify_publisher_email_code(request):
    """
    Verify publisher email using 4-digit verification code.
    
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
        
        # Get publisher profile
        publisher = PublisherProfile.objects.get(user=user)
        
        # Prepare response data
        data["user_id"] = str(user.user_id)
        data["publisher_id"] = publisher.publisher_id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["photo"] = user.photo.url if user.photo else None
        data["token"] = token.key
        data["access_token"] = jwt_tokens['access']
        data["refresh_token"] = jwt_tokens['refresh']
        data["country"] = user.country
        data["phone"] = user.phone
        data["next_step"] = publisher.onboarding_step
        data["profile_completed"] = publisher.profile_completed
        
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
    except PublisherProfile.DoesNotExist:
        payload['message'] = "Publisher profile not found"
        return Response(payload, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in verify_publisher_email_code: {str(e)}")
        payload['message'] = "An error occurred during verification"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





def check_email_exist(email):

    qs = User.objects.filter(email=email)
    if qs.exists():
        return True
    else:
        return False


class PublisherLogin(APIView):
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
                action='publisher_login_failed',
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
            publisher = PublisherProfile.objects.get(user=user)
        except PublisherProfile.DoesNotExist:
            # Log failed login attempt - user exists but not a publisher
            AuditLog.objects.create(
                user=user,
                action='publisher_login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_data={'email': email},
                response_data={'error': 'not_publisher'},
                status_code=400
            )
            return Response({'message': 'Errors', 'errors': {'email': ['User is not a publisher']}}, status=status.HTTP_400_BAD_REQUEST)

        if not user.email_verified:
            # Log failed login attempt due to unverified email
            AuditLog.objects.create(
                user=user,
                action='publisher_login_failed',
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
        publisher.save()

        data = {
            "user_id": str(user.user_id),
            "publisher_id": publisher.publisher_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo": user.photo.url if user.photo else None,
            "country": user.country,
            "phone": user.phone,
            "token": token.key,
            "access_token": jwt_tokens['access'],
            "refresh_token": jwt_tokens['refresh'],
            "onboarding_step": publisher.onboarding_step,
        }

        # Create activity log
        AllActivity.objects.create(user=user, subject="Publisher Login", body=f"{user.email} just logged in.")

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


from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def complete_publisher_profile_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    def pick_value(*keys):
        for key in keys:
            if key in request.data:
                value = request.data.get(key)
                if isinstance(value, str):
                    trimmed = value.strip()
                    if trimmed:
                        return trimmed
                elif value not in (None, ''):
                    return value
        return None

    country = pick_value('country')
    region = pick_value('region')
    city = pick_value('city')
    address = pick_value('address')
    postal_code = pick_value('postal_code', 'postalCode')
    location_name = pick_value('location_name', 'locationName')
    lat = pick_value('lat', 'latitude')
    lng = pick_value('lng', 'longitude')
    website_url = pick_value('website_url', 'website')
    description = pick_value('description', 'bio')
    company_name = pick_value('company_name', 'companyName', 'publisher_name')
    company_type = pick_value('company_type', 'companyType')
    industry = pick_value('industry')
    founded_year_raw = pick_value('founded_year', 'foundedYear')
    employee_count_raw = pick_value('employee_count', 'employeeCount')
    business_registration = pick_value('business_registration_number', 'businessRegistration')
    license_number = pick_value('license_number', 'licenseNumber')
    tax_id = pick_value('tax_id', 'taxId')
    primary_contact_name = pick_value('primary_contact_name', 'primaryContact')
    primary_contact_email = pick_value('primary_contact_email', 'contactEmail')
    primary_contact_phone = pick_value('primary_contact_phone', 'contactPhone')
    compliance_officer_name = pick_value('compliance_officer_name', 'complianceOfficer')
    compliance_officer_email = pick_value('compliance_officer_email', 'officerEmail')
    compliance_officer_phone = pick_value('compliance_officer_phone', 'officerPhone')
    compliance_officer_title = pick_value('compliance_officer_title', 'officerTitle')
    # Accept file uploads via multipart
    photo = request.FILES.get('photo') or pick_value('photo', 'logo')

    if not publisher_id:
        errors['publisher_id'] = ['PublisherProfile ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['PublisherProfile not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Apply changes if provided
    if company_name:
        publisher.company_name = company_name
    if company_type:
        publisher.company_type = company_type
    if industry:
        publisher.industry = industry
    if description:
        publisher.description = description
    if country:
        publisher.country = country
    if region:
        publisher.region = region
    if city:
        publisher.city = city
    if address is not None:
        publisher.address = address or ''
    if postal_code is not None:
        publisher.postal_code = postal_code or ''
    if location_name:
        publisher.location_name = location_name
    if lat is not None:
        publisher.lat = lat
    if lng is not None:
        publisher.lng = lng
    if website_url:
        publisher.website_url = website_url
    if business_registration is not None:
        publisher.business_registration_number = business_registration or ''
    if license_number is not None:
        publisher.license_number = license_number or ''
    if tax_id is not None:
        publisher.tax_id = tax_id or ''
    if primary_contact_name is not None:
        publisher.primary_contact_name = primary_contact_name or ''
    if primary_contact_email is not None:
        publisher.primary_contact_email = primary_contact_email or ''
    if primary_contact_phone is not None:
        publisher.primary_contact_phone = primary_contact_phone or ''
    if compliance_officer_name is not None:
        publisher.compliance_officer_name = compliance_officer_name or ''
    if compliance_officer_email is not None:
        publisher.compliance_officer_email = compliance_officer_email or ''
    if compliance_officer_phone is not None:
        publisher.compliance_officer_phone = compliance_officer_phone or ''
    if compliance_officer_title is not None:
        publisher.compliance_officer_title = compliance_officer_title or ''

    founded_year = None
    if founded_year_raw is not None:
        try:
            founded_year = int(str(founded_year_raw))
        except (TypeError, ValueError):
            founded_year = None
    if founded_year is not None:
        publisher.founded_year = founded_year

    employee_count = None
    if employee_count_raw is not None:
        try:
            employee_count = int(str(employee_count_raw))
        except (TypeError, ValueError):
            employee_count = None
    if employee_count is not None:
        publisher.employee_count = employee_count

    if photo:
        # Align with artist flow: store photo on the user model
        publisher.user.photo = photo
        publisher.user.save()

    # Mark this step as complete (profile)
    publisher.profile_completed = True

    # Move to next onboarding step
    publisher.onboarding_step = publisher.get_next_onboarding_step()
    publisher.save()

    data["publisher_id"] = publisher.publisher_id
    data["next_step"] = publisher.onboarding_step

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def complete_revenue_split_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    writer_split_raw = request.data.get('writer_split', "")
    publisher_split_raw = request.data.get('publisher_split', "")
    mechanical_share_raw = request.data.get('mechanical_share', request.data.get('mechanicalShare', ""))
    performance_share_raw = request.data.get('performance_share', request.data.get('performanceShare', ""))
    sync_share_raw = request.data.get('sync_share', request.data.get('syncShare', ""))
    admin_fee_raw = request.data.get(
        'administrative_fee_percentage',
        request.data.get('administrative_fee', request.data.get('admin_fee', ""))
    )
    notes = request.data.get('revenue_split_notes', request.data.get('notes', ""))

    if not publisher_id:
        errors['publisher_id'] = ['PublisherProfile ID is required.']
    if not writer_split_raw:
        errors['writer_split'] = ['Writer Split is required.']
    if not publisher_split_raw:
        errors['publisher_split'] = ['Publisher Split is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['PublisherProfile not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        w = Decimal(str(writer_split_raw))
        p = Decimal(str(publisher_split_raw))
    except Exception:
        payload['message'] = 'Errors'
        payload['errors'] = {
            'writer_split': ['Writer split must be a number.'],
            'publisher_split': ['Publisher split must be a number.'],
        }
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if w < 0 or p < 0:
        payload['message'] = 'Errors'
        payload['errors'] = {
            'writer_split': ['Must be >= 0.'],
            'publisher_split': ['Must be >= 0.'],
        }
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if w > 100 or p > 100:
        payload['message'] = 'Errors'
        payload['errors'] = {
            'writer_split': ['Must be <= 100.'],
            'publisher_split': ['Must be <= 100.'],
        }
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if (w + p) != Decimal('100'):
        payload['message'] = 'Errors'
        payload['errors'] = {
            'writer_split': ['Writer + Publisher must equal 100%.'],
            'publisher_split': ['Writer + Publisher must equal 100%.'],
        }
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    optional_errors = {}

    def parse_optional_decimal(raw_value, field_name):
        if raw_value in (None, '', 'null'):
            return None
        try:
            return Decimal(str(raw_value))
        except Exception:
            optional_errors[field_name] = [f'{field_name.replace("_", " ").title()} must be a number.']
            return None

    mechanical_share = parse_optional_decimal(mechanical_share_raw, 'mechanical_share')
    performance_share = parse_optional_decimal(performance_share_raw, 'performance_share')
    sync_share = parse_optional_decimal(sync_share_raw, 'sync_share')
    administrative_fee = parse_optional_decimal(admin_fee_raw, 'administrative_fee_percentage')

    if optional_errors:
        payload['message'] = 'Errors'
        errors.update(optional_errors)
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    publisher.writer_split = w
    publisher.publisher_split = p
    publisher.mechanical_share = mechanical_share
    publisher.performance_share = performance_share
    publisher.sync_share = sync_share
    publisher.administrative_fee_percentage = administrative_fee
    if notes is not None:
        publisher.revenue_split_notes = notes

    publisher.revenue_split_completed = True

    publisher.onboarding_step = publisher.get_next_onboarding_step()
    publisher.save()

    data["publisher_id"] = publisher.publisher_id
    data["next_step"] = publisher.onboarding_step

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def complete_link_artist_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    artist_id = request.data.get('artist_id', "")

    if not publisher_id:
        errors['publisher_id'] = ['PublisherProfile ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['PublisherProfile not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # If an artist_id is provided, link the artist to this publisher
    if artist_id:
        from artists.models import Artist
        try:
            artist = Artist.objects.get(artist_id=artist_id)
        except Artist.DoesNotExist:
            payload['message'] = 'Errors'
            payload['errors'] = {'artist_id': ['Artist not found.']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        # Link: set publisher on artist and clear self_publish
        artist.publisher = publisher
        try:
            setattr(artist, 'self_publish', False)
        except Exception:
            pass
        artist.save()

    # Mark this step as complete
    publisher.link_artist_completed = True

    # Move to next onboarding step
    publisher.onboarding_step = publisher.get_next_onboarding_step()
    publisher.save()

    data["publisher_id"] = publisher.publisher_id
    data["next_step"] = publisher.onboarding_step

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def complete_publisher_payment_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    def pick_value(*keys):
        for key in keys:
            if key in request.data:
                value = request.data.get(key)
                if isinstance(value, str):
                    trimmed = value.strip()
                    if trimmed:
                        return trimmed
                elif value not in (None, ''):
                    return value
        return None

    payment_method = pick_value('payment_method', 'paymentMethod')
    momo_provider = pick_value('momo_provider', 'momoProvider')
    momo_number = pick_value('momo_account', 'momoNumber', 'momo')
    momo_name = pick_value('momo_account_name', 'momoName')
    bank_name = pick_value('bank_name', 'bankName')
    bank_account_number = pick_value('bank_account', 'bankAccount', 'bank_account_number', 'accountNumber')
    bank_account_name = pick_value('bank_account_name', 'accountName')
    bank_branch_code = pick_value('bank_branch_code', 'branchCode')
    bank_swift_code = pick_value('bank_swift_code', 'swiftCode')
    currency = pick_value('payout_currency', 'currency')
    payout_frequency = pick_value('payout_frequency', 'payoutFrequency')
    minimum_payout_raw = pick_value('minimum_payout_amount', 'minimumPayout')
    withholding_tax_raw = pick_value('withholding_tax_rate', 'withholdingTax')
    vat_registration = pick_value('vat_registration_number', 'vatRegistration')
    tax_id = pick_value('tax_id', 'taxId')
    business_registration = pick_value('business_registration_number', 'businessRegistration')

    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found.']

    if payment_method == 'momo' and not momo_number:
        errors['momo_account'] = ['Mobile money number is required for mobile money payouts.']
    if payment_method == 'bank' and not bank_account_number:
        errors['bank_account'] = ['Bank account number is required for bank payouts.']

    optional_errors = {}

    def parse_optional_decimal(raw_value, field_name):
        if raw_value in (None, '', 'null'):
            return None
        try:
            return Decimal(str(raw_value))
        except Exception:
            optional_errors[field_name] = [f'{field_name.replace("_", " ").title()} must be a number.']
            return None

    minimum_payout = parse_optional_decimal(minimum_payout_raw, 'minimum_payout_amount')
    withholding_tax = parse_optional_decimal(withholding_tax_raw, 'withholding_tax_rate')

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if optional_errors:
        payload['message'] = 'Errors'
        payload['errors'] = optional_errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if payment_method:
        publisher.preferred_payment_method = payment_method
    if currency:
        publisher.payout_currency = currency
    if payout_frequency:
        publisher.payout_frequency = payout_frequency
    if minimum_payout is not None:
        publisher.minimum_payout_amount = minimum_payout
    if withholding_tax is not None:
        publisher.withholding_tax_rate = withholding_tax
    if vat_registration is not None:
        publisher.vat_registration_number = vat_registration or ''
    if tax_id is not None:
        publisher.tax_id = tax_id or ''
    if business_registration is not None:
        publisher.business_registration_number = business_registration or ''

    if momo_number is not None:
        publisher.momo_account = momo_number or ''
    if momo_name is not None:
        publisher.momo_account_name = momo_name or ''
    if momo_provider is not None:
        publisher.momo_provider = momo_provider or ''

    if bank_account_number is not None:
        publisher.bank_account = bank_account_number or ''
    if bank_account_name is not None:
        publisher.bank_account_name = bank_account_name or ''
    if bank_name is not None:
        publisher.bank_name = bank_name or ''
    if bank_branch_code is not None:
        publisher.bank_branch_code = bank_branch_code or ''
    if bank_swift_code is not None:
        publisher.bank_swift_code = bank_swift_code or ''

    publisher.payment_info_added = True

    publisher.onboarding_step = publisher.get_next_onboarding_step()
    publisher.save()

    data["publisher_id"] = publisher.publisher_id
    data["next_step"] = publisher.onboarding_step

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def onboard_publisher_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found.']

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
            setattr(publisher, field, value)

    publisher.save()

    # Check Profile complete
    ##


    data["publisher_id"] = publisher.id
    data["name"] = publisher.name

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def list_publishers_view(request):
    """Paginated, searchable list of publishers for admin/frontend use."""
    payload = {}
    data = {}

    search_query = request.query_params.get('search', '').strip()
    page_number = request.query_params.get('page', 1)
    page_size = int(request.query_params.get('page_size', 10))

    qs = PublisherProfile.objects.filter(is_archived=False)
    if search_query:
        qs = qs.filter(
            Q(company_name__icontains=search_query) |
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query) |
            Q(country__icontains=search_query)
        )

    # Order newest first
    qs = qs.order_by('-created_at')

    from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
    paginator = Paginator(qs, page_size)
    try:
        paginated = paginator.page(page_number)
    except PageNotAnInteger:
        paginated = paginator.page(1)
    except EmptyPage:
        paginated = paginator.page(paginator.num_pages)

    publishers = []
    for p in paginated:
        photo = None
        try:
            if getattr(p.user, 'photo', None):
                photo = p.user.photo.url
        except Exception:
            photo = None
        publishers.append({
            'publisher_id': p.publisher_id,
            'company_name': p.company_name,
            'country': getattr(p, 'country', None),
            'verified': getattr(p, 'verified', False),
            'photo': photo,
            'registered_on': getattr(p.user, 'timestamp', None)
        })

    data['publishers'] = publishers
    data['pagination'] = {
        'page_number': paginated.number,
        'total_pages': paginator.num_pages,
        'next': paginated.next_page_number() if paginated.has_next() else None,
        'previous': paginated.previous_page_number() if paginated.has_previous() else None,
        'count': paginator.count,
        'page_size': page_size,
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def skip_publisher_onboarding_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    step = request.data.get('step', "")

    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']
    if not step:
        errors['step'] = ['Target step is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found.']
        publisher = None

    # Validate requested step (allow 'done' as terminal step)
    valid_steps = set(dict(PublisherProfile.ONBOARDING_STEPS).keys())
    if publisher and step not in valid_steps and step != 'done':
        errors['step'] = ['Invalid onboarding step.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Always persist the earliest required step so the user returns there next login
    next_required_step = publisher.get_next_onboarding_step()
    publisher.onboarding_step = next_required_step
    publisher.save(update_fields=['onboarding_step'])

    redirect_step = step if (step in valid_steps or step == 'done') else next_required_step

    data['publisher_id'] = publisher.publisher_id
    data['next_step'] = next_required_step
    data['redirect_step'] = redirect_step
    if redirect_step != next_required_step:
        data['skipped_step'] = next_required_step

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def invite_artist_view(request):
    """Send an invite email to an artist to join/link with this publisher."""
    payload = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    email = request.data.get('email', "").strip().lower()
    message = request.data.get('message', "").strip()

    if not publisher_id:
        errors['publisher_id'] = ['PublisherProfile ID is required.']
    if not email:
        errors['email'] = ['Artist email is required.']
    elif not is_valid_email(email):
        errors['email'] = ['Valid email required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['PublisherProfile not found.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        subject = f"Invitation to join ZamIO from {publisher.company_name}"
        default_msg = (
            f"Hello,\n\n{publisher.company_name} invites you to join ZamIO to manage your royalties and link your catalog.\n"
            f"Create your artist account here: {settings.BASE_URL}/sign-up?as=artist&email={email}\n\n"
            f"Message: {message or '—'}\n\nRegards,\nZamIO Team"
        )
        send_mail(
            subject,
            default_msg,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
    except Exception as e:
        payload['message'] = 'Errors'
        payload['errors'] = {'email': [f'Failed to send invite: {e}']}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    payload['message'] = 'Successful'
    payload['data'] = {'invited_email': email}
    return Response(payload, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def search_publisher_artists_view(request):
    payload = {}
    errors = {}

    publisher_id = request.query_params.get('publisher_id', '').strip()
    query = request.query_params.get('query', '').strip()

    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id, user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found or access denied.']
        publisher = None

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if not query:
        payload['message'] = 'Successful'
        payload['data'] = {'results': [], 'query': query}
        return Response(payload, status=status.HTTP_200_OK)

    from artists.models import Artist

    artist_queryset = Artist.objects.filter(
        Q(stage_name__icontains=query)
        | Q(user__email__icontains=query)
        | Q(user__first_name__icontains=query)
        | Q(user__last_name__icontains=query)
    ).select_related('user').order_by('stage_name')[:20]

    relationships = {
        rel.artist_id: rel
        for rel in PublisherArtistRelationship.objects.filter(
            publisher=publisher,
            artist__in=artist_queryset,
            is_archived=False,
        )
    }

    results = []
    for artist in artist_queryset:
        relationship = relationships.get(artist.id)
        user = artist.user
        legal_name = ' '.join(filter(None, [getattr(user, 'first_name', ''), getattr(user, 'last_name', '')])).strip() or None
        try:
            catalog_size = artist.track_set.count()
        except Exception:
            catalog_size = None

        results.append({
            'artist_id': artist.artist_id,
            'stage_name': artist.stage_name,
            'legal_name': legal_name,
            'email': getattr(user, 'email', None),
            'phone': getattr(user, 'phone', None),
            'status': relationship.status if relationship else 'unlinked',
            'relationship_type': relationship.relationship_type if relationship else None,
            'relationship_id': relationship.id if relationship else None,
            'linked_date': relationship.created_at if relationship else None,
            'catalog_size': catalog_size,
            'last_activity': relationship.updated_at if relationship else getattr(artist, 'updated_at', None),
        })

    payload['message'] = 'Successful'
    payload['data'] = {
        'query': query,
        'results': results,
    }
    return Response(payload, status=status.HTTP_200_OK)






@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@csrf_exempt
def logout_publisher_view(request):
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
        # Get the publisher associated with the authenticated user
        publisher = PublisherProfile.objects.get(user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['user'] = ['User is not a publisher.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        
        # Log failed logout attempt
        AuditLog.objects.create(
            user=request.user,
            action='publisher_logout_failed',
            resource_type='authentication',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            response_data={'error': 'not_publisher'},
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
        subject="Publisher Log out",
        body=f"{request.user.email} just logged out of the account."
    )

    # Log successful logout
    AuditLog.objects.create(
        user=request.user,
        action='publisher_logout_success',
        resource_type='authentication',
        resource_id=str(publisher.publisher_id),
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


# Enhanced Publisher Onboarding API Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def publisher_onboarding_status_view(request, publisher_id):
    """Get current onboarding status for a publisher"""
    payload = {}
    data = {}
    errors = {}

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id, user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found or access denied.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    # Get user KYC status
    user = publisher.user
    
    next_step = publisher.get_next_onboarding_step()

    progress = {
        'profile_completed': publisher.profile_completed,
        'revenue_split_completed': publisher.revenue_split_completed,
        'link_artist_completed': publisher.link_artist_completed,
        'payment_info_added': publisher.payment_info_added,
    }

    company_profile = {
        'company_name': publisher.company_name,
        'company_type': publisher.company_type,
        'industry': publisher.industry,
        'founded_year': publisher.founded_year,
        'employee_count': publisher.employee_count,
        'country': publisher.country,
        'region': publisher.region,
        'city': publisher.city,
        'address': publisher.address,
        'postal_code': publisher.postal_code,
        'location_name': publisher.location_name,
        'latitude': publisher.lat,
        'longitude': publisher.lng,
        'website_url': publisher.website_url,
        'description': publisher.description,
        'business_registration_number': publisher.business_registration_number,
        'license_number': publisher.license_number,
        'tax_id': publisher.tax_id,
        'primary_contact_name': publisher.primary_contact_name,
        'primary_contact_email': publisher.primary_contact_email,
        'primary_contact_phone': publisher.primary_contact_phone,
        'compliance_officer_name': publisher.compliance_officer_name,
        'compliance_officer_email': publisher.compliance_officer_email,
        'compliance_officer_phone': publisher.compliance_officer_phone,
        'compliance_officer_title': publisher.compliance_officer_title,
        'logo_url': publisher.user.photo.url if getattr(publisher.user, 'photo', None) else None,
        'contact_phone': publisher.user.phone,
        'contact_email': publisher.user.email,
    }

    revenue_split = {
        'writer_split': publisher.writer_split,
        'publisher_split': publisher.publisher_split,
        'mechanical_share': publisher.mechanical_share,
        'performance_share': publisher.performance_share,
        'sync_share': publisher.sync_share,
        'administrative_fee_percentage': publisher.administrative_fee_percentage,
        'notes': publisher.revenue_split_notes,
    }

    payment_preferences = {
        'preferred_method': publisher.preferred_payment_method,
        'payout_currency': publisher.payout_currency,
        'payout_frequency': publisher.payout_frequency,
        'minimum_payout_amount': publisher.minimum_payout_amount,
        'withholding_tax_rate': publisher.withholding_tax_rate,
        'vat_registration_number': publisher.vat_registration_number,
        'tax_id': publisher.tax_id,
        'business_registration_number': publisher.business_registration_number,
        'momo_provider': publisher.momo_provider,
        'momo_account': publisher.momo_account,
        'momo_account_name': publisher.momo_account_name,
        'bank_name': publisher.bank_name,
        'bank_account_number': publisher.bank_account,
        'bank_account_name': publisher.bank_account_name,
        'bank_branch_code': publisher.bank_branch_code,
        'bank_swift_code': publisher.bank_swift_code,
    }

    linked_relationships = PublisherArtistRelationship.objects.filter(
        publisher=publisher,
        is_archived=False,
    ).select_related('artist')

    linked_artists = []
    for relationship in linked_relationships:
        artist = relationship.artist
        linked_artists.append({
            'artist_id': getattr(artist, 'artist_id', None),
            'stage_name': getattr(artist, 'stage_name', None),
            'status': relationship.status,
            'relationship_type': relationship.relationship_type,
            'royalty_split_percentage': relationship.royalty_split_percentage,
            'territory': relationship.territory,
            'start_date': relationship.start_date,
        })

    data = {
        "publisher_id": publisher.publisher_id,
        "onboarding_step": publisher.onboarding_step,
        "next_step": next_step,
        "progress": progress,
        "company_profile": company_profile,
        "revenue_split": revenue_split,
        "payment_preferences": payment_preferences,
        "linked_artists": linked_artists,
        "kyc_status": getattr(user, 'kyc_status', None),
        "kyc_documents": getattr(user, 'kyc_documents', None),
        "profile_complete_percentage": calculate_publisher_completion_percentage(publisher),
        "next_recommended_step": get_publisher_next_recommended_step(publisher),
        "required_fields": get_publisher_required_fields_status(publisher),
        "admin_approval_required": True,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def update_publisher_onboarding_status_view(request):
    """Update specific publisher onboarding step status"""
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    step = request.data.get('step', "")
    completed = request.data.get('completed', False)

    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']
    if not step:
        errors['step'] = ['Step is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id, user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Update the specific step status
    step_mapping = {
        'profile': 'profile_completed',
        'revenue-split': 'revenue_split_completed',
        'link-artist': 'link_artist_completed',
        'payment': 'payment_info_added',
    }

    if step in step_mapping:
        setattr(publisher, step_mapping[step], completed)
        if completed:
            publisher.onboarding_step = publisher.get_next_onboarding_step()
        publisher.save()

    data = {
        "publisher_id": publisher.publisher_id,
        "step": step,
        "completed": completed,
        "next_step": publisher.onboarding_step,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def complete_publisher_onboarding_view(request):
    """Mark publisher onboarding as complete (requires admin approval)"""
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")

    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id, user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found or access denied.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Mark onboarding as complete (pending admin approval)
    publisher.onboarding_step = 'done'
    publisher.save()

    # Update user profile completion status
    user = publisher.user
    user.profile_complete = True
    user.save()

    # Create admin notification for approval
    AllActivity.objects.create(
        user=user,
        subject="Publisher Onboarding Complete",
        body=f"Publisher {publisher.company_name} has completed onboarding and requires admin approval."
    )

    data = {
        "publisher_id": publisher.publisher_id,
        "onboarding_complete": True,
        "admin_approval_required": True,
        "status": "pending_approval",
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def create_artist_relationship_view(request):
    """Create a publisher-artist relationship"""
    from publishers.models import PublisherArtistRelationship
    from artists.models import Artist
    from django.utils import timezone
    
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.data.get('publisher_id', "")
    artist_id = request.data.get('artist_id', "")
    relationship_type = request.data.get('relationship_type', 'exclusive')
    royalty_split_percentage = request.data.get('royalty_split_percentage', 50)
    territory = request.data.get('territory', 'Ghana')
    start_date = request.data.get('start_date', timezone.now().date())

    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']
    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id, user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher not found or access denied.']

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Check if relationship already exists
    existing_relationship = PublisherArtistRelationship.objects.filter(
        publisher=publisher,
        artist=artist,
        territory=territory,
        status__in=['active', 'pending']
    ).first()

    if existing_relationship:
        errors['relationship'] = ['A relationship already exists between this publisher and artist in this territory.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Create the relationship
    relationship = PublisherArtistRelationship.objects.create(
        publisher=publisher,
        artist=artist,
        relationship_type=relationship_type,
        royalty_split_percentage=royalty_split_percentage,
        territory=territory,
        start_date=start_date,
        created_by=request.user,
        status='pending'
    )

    data = {
        "relationship_id": relationship.id,
        "publisher_id": publisher.publisher_id,
        "artist_id": artist.artist_id,
        "relationship_type": relationship_type,
        "royalty_split_percentage": royalty_split_percentage,
        "territory": territory,
        "status": "pending",
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


def calculate_publisher_completion_percentage(publisher):
    """Calculate publisher profile completion percentage"""
    total_fields = 4  # profile, revenue-split, link-artist, payment
    completed_fields = 0

    if publisher.profile_completed:
        completed_fields += 1
    if publisher.revenue_split_completed:
        completed_fields += 1
    if publisher.link_artist_completed:
        completed_fields += 1
    if publisher.payment_info_added:
        completed_fields += 1

    return round((completed_fields / total_fields) * 100)


def get_publisher_next_recommended_step(publisher):
    """Get the next recommended step for the publisher"""
    if not publisher.profile_completed:
        return 'profile'
    elif not publisher.revenue_split_completed:
        return 'revenue-split'
    elif not publisher.link_artist_completed:
        return 'link-artist'
    elif not publisher.payment_info_added:
        return 'payment'
    return 'done'


def get_publisher_required_fields_status(publisher):
    """Get status of required fields for publisher profile completion"""
    user = publisher.user
    
    return {
        'basic_info': {
            'completed': bool(user.first_name and user.last_name and publisher.company_name),
            'fields': ['first_name', 'last_name', 'company_name']
        },
        'company_details': {
            'completed': bool(publisher.country and user.photo),
            'fields': ['country', 'photo']
        },
        'contact_info': {
            'completed': bool(user.email and user.phone),
            'fields': ['email', 'phone']
        },
        'revenue_split': {
            'completed': bool(publisher.writer_split and publisher.publisher_split),
            'fields': ['writer_split', 'publisher_split']
        },
        'payment_info': {
            'completed': bool(publisher.momo_account or publisher.bank_account),
            'fields': ['momo_account', 'bank_account']
        }
    }