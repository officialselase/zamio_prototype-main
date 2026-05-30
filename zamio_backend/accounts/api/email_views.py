"""
API views for email-related operations.

This module demonstrates how to use the email task system in API endpoints.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from accounts.email_utils import (
    send_verification_email,
    send_password_reset_email,
    send_invitation_email,
    send_notification_to_users,
    send_notification_to_user_types,
    send_welcome_email,
    send_account_verification_complete_email
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_verification_email(request):
    """
    Resend email verification to the current user with rate limiting.
    
    Requirements: 12.1, 12.2, 12.3 - Resend with rate limiting (max 3 per hour, 2-min cooldown)
    """
    from accounts.services import EmailVerificationService
    
    user = request.user
    verification_service = EmailVerificationService()
    
    if user.email_verified:
        return Response({
            'error': 'Email is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user can resend (rate limiting and cooldown)
    can_resend_result = verification_service.can_resend(user)
    
    if not can_resend_result['can_resend']:
        return Response({
            'error': can_resend_result['message'],
            'retry_after': can_resend_result.get('retry_after_seconds', 0),
            'resend_count': can_resend_result.get('resend_count', 0),
            'max_resends': can_resend_result.get('max_resends', 3),
            'cooldown_seconds': can_resend_result.get('cooldown_seconds', 0)
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Get method preference from request or use existing method
    method = request.data.get('method', user.verification_method or 'link')
    
    if method not in ['code', 'link']:
        return Response({
            'error': 'Invalid verification method. Must be "code" or "link"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = verification_service.resend_verification(user, method)
        
        if result['status'] == 'success':
            return Response({
                'message': 'Verification email sent successfully',
                'method': result['method'],
                'expires_at': result['expires_at'],
                'resend_count': result['resend_count'],
                'max_resends': result['max_resends'],
                'next_resend_available_at': result.get('next_resend_available_at'),
                'task_id': result.get('task_id')
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            'error': f'Failed to send verification email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([])
def resend_verification_email_by_email(request):
    """
    Resend email verification by email address (for users not logged in) with rate limiting.
    
    Requirements: 12.1, 12.2, 12.3 - Resend with rate limiting (max 3 per hour, 2-min cooldown)
    """
    from accounts.services import EmailVerificationService
    
    email = request.data.get('email', '').lower()
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email, is_active=True)
        verification_service = EmailVerificationService()
        
        if user.email_verified:
            return Response({
                'message': 'Email is already verified'
            }, status=status.HTTP_200_OK)
        
        # Check if user can resend (rate limiting and cooldown)
        can_resend_result = verification_service.can_resend(user)
        
        if not can_resend_result['can_resend']:
            # Return generic message to prevent email enumeration, but still respect rate limits
            return Response({
                'message': 'If an account with this email exists, please wait before requesting another verification email',
                'retry_after': can_resend_result.get('retry_after_seconds', 120)
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Get method preference from request or use existing method
        method = request.data.get('method', user.verification_method or 'link')
        
        if method not in ['code', 'link']:
            method = 'link'  # Default to link for invalid methods
        
        result = verification_service.resend_verification(user, method)
        
        # Always return success message to prevent email enumeration
        return Response({
            'message': 'If an account with this email exists, a verification email has been sent'
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        # Return success to prevent email enumeration
        return Response({
            'message': 'If an account with this email exists, a verification email has been sent'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to send verification email'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def request_password_reset(request):
    """
    Request password reset email with method selection.
    
    Requirements: 13.1, 13.2 - Password reset with dual method support
    """
    from accounts.services import PasswordResetService
    
    email = request.data.get('email')
    method = request.data.get('method', 'link')  # Default to link method
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if method not in ['code', 'link']:
        return Response({
            'error': 'Invalid method. Must be "code" or "link"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email, is_active=True)
        reset_service = PasswordResetService()
        
        result = reset_service.create_reset_request(user, method)
        
        # Always return success to prevent email enumeration
        return Response({
            'message': 'If an account with this email exists, a password reset email has been sent',
            'method': method
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        # Return the same message to prevent email enumeration
        return Response({
            'message': 'If an account with this email exists, a password reset email has been sent'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to process password reset request'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def resend_password_reset(request):
    """
    Resend password reset email with rate limiting.
    
    Requirements: 12.1, 12.2, 13.1 - Resend password reset with same rate limiting as verification
    """
    from accounts.services import PasswordResetService
    
    email = request.data.get('email')
    method = request.data.get('method')  # Optional, will maintain current method if not specified
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if method and method not in ['code', 'link']:
        return Response({
            'error': 'Invalid method. Must be "code" or "link"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email, is_active=True)
        reset_service = PasswordResetService()
        
        # Check if user can resend (rate limiting and cooldown)
        can_resend_result = reset_service.can_resend_reset(user)
        
        if not can_resend_result['can_resend']:
            # Return generic message to prevent email enumeration, but still respect rate limits
            return Response({
                'message': 'If an account with this email exists, please wait before requesting another password reset email',
                'retry_after': can_resend_result.get('retry_after_seconds', 120)
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        result = reset_service.resend_reset(user, method)
        
        # Always return success message to prevent email enumeration
        return Response({
            'message': 'If an account with this email exists, a password reset email has been sent'
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        # Return success to prevent email enumeration
        return Response({
            'message': 'If an account with this email exists, a password reset email has been sent'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to send password reset email'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_user_invitation(request):
    """
    Send invitation email to a new user.
    
    Requirements: 1.3 - User invites handled asynchronously via Celery
    """
    invitee_email = request.data.get('email')
    user_type = request.data.get('user_type', 'Artist')
    
    if not invitee_email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(email=invitee_email).exists():
        return Response({
            'error': 'User with this email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate user type
    valid_user_types = ['Artist', 'Station', 'Publisher', 'Admin']
    if user_type not in valid_user_types:
        return Response({
            'error': f'Invalid user type. Must be one of: {", ".join(valid_user_types)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        task_id = send_invitation_email(
            inviter=request.user,
            invitee_email=invitee_email,
            user_type=user_type
        )
        
        return Response({
            'message': f'Invitation sent to {invitee_email}',
            'task_id': task_id,
            'user_type': user_type
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to send invitation: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_notification_to_specific_users(request):
    """
    Send notification email to specific users.
    
    Requirements: 1.4 - Email notifications queued for background processing
    """
    user_ids = request.data.get('user_ids', [])
    subject = request.data.get('subject', '')
    message = request.data.get('message', '')
    email_type = request.data.get('email_type', 'notification')
    
    if not user_ids:
        return Response({
            'error': 'user_ids is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not subject or not message:
        return Response({
            'error': 'subject and message are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        task_id = send_notification_to_users(
            user_ids=user_ids,
            subject=subject,
            message=message,
            email_type=email_type
        )
        
        return Response({
            'message': f'Notification queued for {len(user_ids)} users',
            'task_id': task_id,
            'user_count': len(user_ids)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to queue notification: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_notification_to_user_type(request):
    """
    Send notification email to users of specific types.
    
    Requirements: 1.5 - Proper queuing for notification email tasks
    """
    user_types = request.data.get('user_types', [])
    subject = request.data.get('subject', '')
    message = request.data.get('message', '')
    email_type = request.data.get('email_type', 'notification')
    
    if not user_types:
        return Response({
            'error': 'user_types is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not subject or not message:
        return Response({
            'error': 'subject and message are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate user types
    valid_user_types = ['Artist', 'Station', 'Publisher', 'Admin']
    invalid_types = [ut for ut in user_types if ut not in valid_user_types]
    if invalid_types:
        return Response({
            'error': f'Invalid user types: {", ".join(invalid_types)}. Valid types: {", ".join(valid_user_types)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        task_ids = send_notification_to_user_types(
            user_types=user_types,
            subject=subject,
            message=message,
            email_type=email_type
        )
        
        return Response({
            'message': f'Notifications queued for user types: {", ".join(user_types)}',
            'task_ids': task_ids,
            'user_types': user_types
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to queue notifications: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_welcome_email_to_user(request):
    """
    Send welcome email to a user (typically called after successful registration).
    """
    user_id = request.data.get('user_id')
    
    if not user_id:
        # Send to current user if no user_id provided
        user = request.user
    else:
        # Only admins can send welcome emails to other users
        if not request.user.is_staff:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user = get_object_or_404(User, id=user_id)
    
    try:
        task_id = send_welcome_email(user)
        
        return Response({
            'message': f'Welcome email sent to {user.email}',
            'task_id': task_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to send welcome email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_email_verified(request):
    """
    Mark user's email as verified and send confirmation email.
    """
    user = request.user
    verification_token = request.data.get('token')
    
    if not verification_token:
        return Response({
            'error': 'Verification token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # In a real implementation, you would validate the token here
    # For this example, we'll just check if it matches the stored token
    if user.email_token != verification_token:
        return Response({
            'error': 'Invalid verification token'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Mark email as verified
        user.email_verified = True
        user.email_token = None  # Clear the token
        user.save(update_fields=['email_verified', 'email_token'])
        
        # Send confirmation email
        task_id = send_account_verification_complete_email(user)
        
        return Response({
            'message': 'Email verified successfully',
            'task_id': task_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to verify email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def email_system_status(request):
    """
    Get email system configuration status.
    """
    from accounts.email_utils import validate_email_configuration
    
    try:
        config_status = validate_email_configuration()
        
        return Response({
            'email_system_status': config_status,
            'message': 'Email system status retrieved successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to get email system status: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)