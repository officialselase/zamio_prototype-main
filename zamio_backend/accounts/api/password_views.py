import re
from django.core.mail import EmailMessage, send_mail

from celery import chain
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.core.files.base import ContentFile
from django.shortcuts import render
from django.template.loader import get_template
import requests
from rest_framework import status, generics
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.api.serializers import UserRegistrationSerializer, PasswordResetSerializer
from activities.models import AllActivity
from bank_account.models import BankAccount
from core.utils import generate_random_otp_code

User = get_user_model()




class PasswordResetView(generics.GenericAPIView):
    serializer_class = PasswordResetSerializer



    def post(self, request, *args, **kwargs):
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
        
        try:
            # Generate new OTP code
            otp_code = generate_random_otp_code()
            user.otp_code = otp_code
            user.save()

            # Use the new Celery email task system for password reset
            from accounts.email_utils import send_password_reset_email
            task_id = send_password_reset_email(user)

            data["email"] = user.email
            data["user_id"] = str(user.user_id)
            data["task_id"] = task_id

            # Create activity log
            new_activity = AllActivity.objects.create(
                user=user,
                subject="Reset Password",
                body="Password reset OTP sent to " + user.email,
            )
            new_activity.save()
            
        except Exception as e:
            errors['system'] = [f'Failed to send password reset email: {str(e)}']
            payload['message'] = "Error"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payload['message'] = "Successful"
        payload['data'] = data

        return Response(payload, status=status.HTTP_200_OK)



@api_view(['POST', ])
@permission_classes([])
@authentication_classes([])
def confirm_otp_password_view(request):
    payload = {}
    data = {}
    errors = {}

    email_errors = []
    otp_errors = []

    email = request.data.get('email', '').lower()
    otp_code = request.data.get('otp_code', '')

    if not email:
        email_errors.append('Email is required.')

    if not otp_code:
        otp_errors.append('OTP code is required.')

    user = User.objects.filter(email=email).first()

    if user is None:
        email_errors.append('Email does not exist.')

    client_otp = user.otp_code if user else ''

    if client_otp != otp_code:
        otp_errors.append('Invalid Code.')

    if email_errors or otp_errors:
        errors['email'] = email_errors
        errors['otp_code'] = otp_errors
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    data['email'] = user.email if user else ''
    data['user_id'] = str(user.user_id) if user else ''

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)



@api_view(['POST', ])
@permission_classes([AllowAny])
@authentication_classes([])
def resend_password_otp(request):
    """
    Resend password reset OTP using the new Celery email task system.
    
    Requirements: 1.2 - Password reset tokens processed as background tasks
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
    
    try:
        # Generate new OTP code
        otp_code = generate_random_otp_code()
        user.otp_code = otp_code
        user.save()

        # Use the new Celery email task system for password reset
        from accounts.email_utils import send_password_reset_email
        task_id = send_password_reset_email(user)

        data["email"] = user.email
        data["user_id"] = str(user.user_id)
        data["task_id"] = task_id

        # Create activity log
        new_activity = AllActivity.objects.create(
            user=user,
            subject="Password OTP resent",
            body="Password OTP resent to " + user.email,
        )
        new_activity.save()

        payload['message'] = "Password reset OTP sent successfully"
        payload['data'] = data

        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        errors['system'] = [f'Failed to send password reset OTP: {str(e)}']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST', ])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_password_reset_code(request):
    """
    Verify password reset using 4-digit code and update password.
    
    Requirements: 13.2, 13.3 - Verify reset codes and clear reset data after successful password change
    """
    payload = {}
    data = {}
    errors = {}
    email_errors = []
    code_errors = []
    password_errors = []

    email = request.data.get('email', '').lower()
    reset_code = request.data.get('code', '')
    new_password = request.data.get('new_password', '')
    new_password2 = request.data.get('new_password2', '')

    # Validation
    if not email:
        email_errors.append('Email is required.')
    
    if not reset_code:
        code_errors.append('Reset code is required.')
    elif len(reset_code) != 4 or not reset_code.isdigit():
        code_errors.append('Reset code must be a 4-digit number.')
    
    if not new_password:
        password_errors.append('New password is required.')
    elif not is_valid_password(new_password):
        password_errors.append('Password must be at least 8 characters with uppercase, lowercase, number, and special character.')
    
    if new_password != new_password2:
        password_errors.append('Passwords do not match.')

    # Check if user exists
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        email_errors.append('Email does not exist.')
        user = None

    # Collect all validation errors
    if email_errors or code_errors or password_errors:
        errors['email'] = email_errors
        errors['code'] = code_errors
        errors['password'] = password_errors
        payload['message'] = "Validation errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Check if user has reset data and it's not expired
    from django.utils import timezone
    import hashlib
    
    if not user.reset_code_hash or not user.reset_expires_at:
        errors['code'] = ['No active password reset request found.']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if reset request has expired
    if timezone.now() > user.reset_expires_at:
        errors['code'] = ['Reset code has expired. Please request a new one.']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user is blocked due to too many attempts
    if user.reset_blocked_until and timezone.now() < user.reset_blocked_until:
        errors['code'] = ['Too many failed attempts. Please try again later.']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Verify the reset code
    code_hash = hashlib.sha256(reset_code.encode()).hexdigest()
    if code_hash != user.reset_code_hash:
        # Increment attempts
        user.reset_attempts += 1
        
        # Block user if too many attempts (5 attempts)
        if user.reset_attempts >= 5:
            user.reset_blocked_until = timezone.now() + timezone.timedelta(minutes=30)
            user.save(update_fields=['reset_attempts', 'reset_blocked_until'])
            errors['code'] = ['Too many failed attempts. Account blocked for 30 minutes.']
        else:
            user.save(update_fields=['reset_attempts'])
            remaining_attempts = 5 - user.reset_attempts
            errors['code'] = [f'Invalid reset code. {remaining_attempts} attempts remaining.']
        
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Code is valid, update password and clear reset data
    try:
        user.set_password(new_password)
        
        # Clear all reset-related fields
        user.reset_token = None
        user.reset_code = None
        user.reset_code_hash = None
        user.reset_expires_at = None
        user.reset_attempts = 0
        user.reset_blocked_until = None
        user.last_reset_request = None
        
        user.save()
        
        # Log the activity
        from activities.models import AllActivity
        new_activity = AllActivity.objects.create(
            user=user,
            subject="Password Reset Complete",
            body=f"Password successfully reset using verification code for {user.email}",
        )
        new_activity.save()
        
        data['email'] = user.email
        data['user_id'] = str(user.user_id) if user.user_id else str(user.id)
        data['message'] = 'Password reset successfully using verification code'
        
        payload['message'] = "Success"
        payload['data'] = data
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        errors['system'] = [f'Failed to reset password: {str(e)}']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', ])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_password_reset_token(request):
    """
    Verify password reset using token from email link and update password.
    
    Requirements: 13.2, 13.3 - Verify reset tokens and clear reset data after successful password change
    """
    payload = {}
    data = {}
    errors = {}
    email_errors = []
    token_errors = []
    password_errors = []

    email = request.data.get('email', '').lower()
    reset_token = request.data.get('token', '')
    new_password = request.data.get('new_password', '')
    new_password2 = request.data.get('new_password2', '')

    # Validation
    if not email:
        email_errors.append('Email is required.')
    
    if not reset_token:
        token_errors.append('Reset token is required.')
    
    if not new_password:
        password_errors.append('New password is required.')
    elif not is_valid_password(new_password):
        password_errors.append('Password must be at least 8 characters with uppercase, lowercase, number, and special character.')
    
    if new_password != new_password2:
        password_errors.append('Passwords do not match.')

    # Check if user exists
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        email_errors.append('Email does not exist.')
        user = None

    # Collect all validation errors
    if email_errors or token_errors or password_errors:
        errors['email'] = email_errors
        errors['token'] = token_errors
        errors['password'] = password_errors
        payload['message'] = "Validation errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Check if user has reset token and it's not expired
    from django.utils import timezone
    
    if not user.reset_token or not user.reset_expires_at:
        errors['token'] = ['No active password reset request found.']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if reset request has expired (tokens have 60 min expiry)
    token_expires_at = user.reset_expires_at + timezone.timedelta(minutes=45)  # Add 45 min to code expiry for token
    if timezone.now() > token_expires_at:
        errors['token'] = ['Reset token has expired. Please request a new one.']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify the reset token
    if reset_token != user.reset_token:
        errors['token'] = ['Invalid reset token.']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Token is valid, update password and clear reset data
    try:
        user.set_password(new_password)
        
        # Clear all reset-related fields
        user.reset_token = None
        user.reset_code = None
        user.reset_code_hash = None
        user.reset_expires_at = None
        user.reset_attempts = 0
        user.reset_blocked_until = None
        user.last_reset_request = None
        
        user.save()
        
        # Log the activity
        from activities.models import AllActivity
        new_activity = AllActivity.objects.create(
            user=user,
            subject="Password Reset Complete",
            body=f"Password successfully reset using reset link for {user.email}",
        )
        new_activity.save()
        
        data['email'] = user.email
        data['user_id'] = str(user.user_id) if user.user_id else str(user.id)
        data['message'] = 'Password reset successfully using reset link'
        
        payload['message'] = "Success"
        payload['data'] = data
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        errors['system'] = [f'Failed to reset password: {str(e)}']
        payload['message'] = "Error"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', ])
@permission_classes([AllowAny])
@authentication_classes([])
def new_password_reset_view(request):
    payload = {}
    data = {}
    errors = {}
    email_errors = []
    password_errors = []

    email = request.data.get('email', '0').lower()
    new_password = request.data.get('new_password')
    new_password2 = request.data.get('new_password2')



    if not email:
        email_errors.append('Email is required.')
        if email_errors:
            errors['email'] = email_errors
            payload['message'] = "Error"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_404_NOT_FOUND)

    qs = User.objects.filter(email=email)
    if not qs.exists():
        email_errors.append('Email does not exists.')
        if email_errors:
            errors['email'] = email_errors
            payload['message'] = "Error"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_404_NOT_FOUND)


    if not new_password:
        password_errors.append('Password required.')
        if password_errors:
            errors['password'] = password_errors
            payload['message'] = "Error"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_404_NOT_FOUND)


    if new_password != new_password2:
        password_errors.append('Password don\'t match.')
        if password_errors:
            errors['password'] = password_errors
            payload['message'] = "Error"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_404_NOT_FOUND)

    user = User.objects.filter(email=email).first()
    user.set_password(new_password)
    user.save()

    data['email'] = user.email
    data['user_id'] = str(user.user_id)


    payload['message'] = "Successful, Password reset successfully."
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)





def is_valid_email(email):
    # Regular expression pattern for basic email validation
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'

    # Using re.match to check if the email matches the pattern
    if re.match(pattern, email):
        return True
    else:
        return False


def is_valid_password(password):
    # Check for at least 8 characters
    if len(password) < 8:
        return False

    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False

    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False

    # Check for at least one digit
    if not re.search(r'[0-9]', password):
        return False

    # Check for at least one special character
    if not re.search(r'[-!@#\$%^&*_()-+=/.,<>?"~`£{}|:;]', password):
        return False

    return True




