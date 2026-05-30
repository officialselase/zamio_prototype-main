"""
Email utility functions for the accounts app.

This module provides convenient wrapper functions for queuing email tasks
and managing email-related operations.
"""

import secrets
import string
from typing import List, Optional, Dict, Any
from django.contrib.auth import get_user_model
from django.conf import settings

from .tasks import (
    queue_email_verification,
    queue_password_reset_email,
    queue_user_invitation,
    queue_notification_email
)

User = get_user_model()


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.
    
    Args:
        length: Length of the token to generate
        
    Returns:
        Secure random token string
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def send_verification_email(user: User, base_url: Optional[str] = None) -> str:
    """
    Send email verification to a user.
    
    Args:
        user: User instance to send verification email to
        base_url: Optional base URL for verification link
        
    Returns:
        Task ID for tracking the email task
        
    Requirements: 1.1 - Email verification queued using Celery
    """
    # Generate verification token
    verification_token = generate_secure_token()
    
    # Queue the email task
    task_id = queue_email_verification(
        user_id=user.id,
        verification_token=verification_token,
        base_url=base_url
    )
    
    return task_id


def send_password_reset_email(user: User, base_url: Optional[str] = None) -> str:
    """
    Send password reset email to a user.
    
    Args:
        user: User instance to send password reset email to
        base_url: Optional base URL for reset link
        
    Returns:
        Task ID for tracking the email task
        
    Requirements: 1.2 - Password reset tokens processed as background tasks
    """
    # Generate reset token
    reset_token = generate_secure_token()
    
    # Queue the email task
    task_id = queue_password_reset_email(
        user_id=user.id,
        reset_token=reset_token,
        base_url=base_url
    )
    
    return task_id


def send_invitation_email(inviter: User, invitee_email: str, user_type: str = 'Artist',
                         base_url: Optional[str] = None) -> str:
    """
    Send user invitation email.
    
    Args:
        inviter: User instance sending the invitation
        invitee_email: Email address of the person being invited
        user_type: Type of user being invited (Artist, Station, Publisher, etc.)
        base_url: Optional base URL for invitation link
        
    Returns:
        Task ID for tracking the email task
        
    Requirements: 1.3 - User invites handled asynchronously via Celery
    """
    # Generate invitation token
    invitation_token = generate_secure_token()
    
    # Queue the email task
    task_id = queue_user_invitation(
        inviter_user_id=inviter.id,
        invitee_email=invitee_email,
        invitation_token=invitation_token,
        user_type=user_type,
        base_url=base_url
    )
    
    return task_id


def send_notification_to_users(user_ids: List[int], subject: str, message: str,
                              email_type: str = 'notification',
                              template_name: Optional[str] = None,
                              context_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Send notification email to specific users.
    
    Args:
        user_ids: List of user IDs to send notifications to
        subject: Email subject line
        message: Email message content
        email_type: Type of notification (notification, alert, update, etc.)
        template_name: Optional custom template name
        context_data: Additional context data for template rendering
        
    Returns:
        Task ID for tracking the email task
        
    Requirements: 1.4 - Email notifications queued for background processing
    """
    task_id = queue_notification_email(
        user_ids=user_ids,
        subject=subject,
        message=message,
        email_type=email_type,
        template_name=template_name,
        context_data=context_data
    )
    
    return task_id


def send_notification_to_user_types(user_types: List[str], subject: str, message: str,
                                   email_type: str = 'notification',
                                   template_name: Optional[str] = None,
                                   context_data: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Send notification email to users of specific types.
    
    Args:
        user_types: List of user types to send notifications to
        subject: Email subject line
        message: Email message content
        email_type: Type of notification
        template_name: Optional custom template name
        context_data: Additional context data for template rendering
        
    Returns:
        List of task IDs for tracking the email tasks
        
    Requirements: 1.5 - Proper queuing for notification email tasks
    """
    task_ids = []
    
    for user_type in user_types:
        # Get users of this type
        users = User.objects.filter(
            user_type=user_type,
            is_active=True,
            email_verified=True
        )
        
        if users.exists():
            user_ids = list(users.values_list('id', flat=True))
            task_id = send_notification_to_users(
                user_ids=user_ids,
                subject=subject,
                message=message,
                email_type=email_type,
                template_name=template_name,
                context_data=context_data
            )
            task_ids.append(task_id)
    
    return task_ids


def send_welcome_email(user: User, base_url: Optional[str] = None) -> str:
    """
    Send welcome email to a newly registered user.
    
    Args:
        user: User instance to send welcome email to
        base_url: Optional base URL for any links
        
    Returns:
        Task ID for tracking the email task
    """
    subject = f"Welcome to ZamIO, {user.first_name or 'there'}!"
    
    message = f"""
    Welcome to ZamIO! We're excited to have you join our music royalty management platform.
    
    Your account has been successfully created and you can now:
    - Upload and manage your music catalog
    - Track your music plays across radio stations
    - Monitor your royalty earnings
    - Connect with other music industry professionals
    
    If you have any questions, our support team is here to help.
    """
    
    context_data = {
        'user_type': user.user_type,
        'platform_features': get_platform_features_for_user_type(user.user_type)
    }
    
    return send_notification_to_users(
        user_ids=[user.id],
        subject=subject,
        message=message,
        email_type='welcome',
        template_name='welcome',
        context_data=context_data
    )


def send_verification_reminder_email(user: User, base_url: Optional[str] = None) -> str:
    """
    Send verification reminder email to users who have skipped verification.
    
    Args:
        user: User instance to send verification reminder to
        base_url: Optional base URL for verification links
        
    Returns:
        Task ID for tracking the email task
        
    Requirements: 20.1, 20.4 - Later verification process workflow
    """
    subject = "Complete your ZamIO account verification"
    
    message = f"""
    Hi {user.first_name or 'there'},
    
    We noticed you skipped the identity verification step during your ZamIO account setup.
    
    While you can continue using basic features, completing verification unlocks:
    • Royalty withdrawals to your bank account
    • Publisher partnership opportunities
    • Advanced analytics and reporting
    • Priority customer support
    • Dispute resolution capabilities
    
    Verification is quick and secure - it typically takes just 1-2 business days.
    
    Ready to complete verification? You can:
    1. Log into your account and go to Profile Settings > Verification
    2. Upload your identity documents (National ID + Utility Bill)
    3. Wait for our team to review (1-2 business days)
    
    Questions? Our support team is here to help at support@zamio.com
    
    Thanks for being part of ZamIO!
    """
    
    context_data = {
        'user_type': user.user_type,
        'verification_status': user.verification_status,
        'skipped_at': user.verification_skipped_at.isoformat() if user.verification_skipped_at else None,
        'features_locked': [
            'Royalty withdrawals',
            'Publisher partnerships', 
            'Advanced analytics',
            'Priority support',
            'Dispute resolution'
        ],
        'verification_url': f"{base_url}/profile/verification" if base_url else None
    }
    
    return send_notification_to_users(
        user_ids=[user.id],
        subject=subject,
        message=message,
        email_type='verification_reminder',
        template_name='verification_reminder',
        context_data=context_data
    )


def send_account_verification_complete_email(user: User) -> str:
    """
    Send email confirmation when account verification is complete.
    
    Args:
        user: User instance whose verification is complete
        
    Returns:
        Task ID for tracking the email task
    """
    subject = "Your ZamIO account is now verified!"
    
    message = f"""
    Great news! Your ZamIO account has been successfully verified.
    
    You now have full access to all platform features. You can start uploading your music,
    tracking plays, and managing your royalties right away.
    
    Thank you for completing the verification process.
    """
    
    return send_notification_to_users(
        user_ids=[user.id],
        subject=subject,
        message=message,
        email_type='verification_complete'
    )


def get_platform_features_for_user_type(user_type: str) -> List[str]:
    """
    Get platform features available for a specific user type.
    
    Args:
        user_type: Type of user (Artist, Station, Publisher, etc.)
        
    Returns:
        List of features available for the user type
    """
    features_map = {
        'Artist': [
            'Upload and manage your music catalog',
            'Track your music plays across radio stations',
            'Monitor your royalty earnings in real-time',
            'Manage your profile and music metadata',
            'Connect with publishers and stations'
        ],
        'Station': [
            'Report your playlogs and manage content',
            'Monitor compliance with music licensing',
            'Access analytics and reporting tools',
            'Manage your station profile and stream information',
            'Connect with artists and publishers'
        ],
        'Publisher': [
            'Manage your music catalog and artist relationships',
            'Track royalties across your entire portfolio',
            'Access comprehensive analytics and reports',
            'Manage artist contracts and agreements',
            'Monitor performance across all stations'
        ],
        'Admin': [
            'Manage all platform users and content',
            'Access system analytics and reports',
            'Handle disputes and compliance issues',
            'Configure platform settings',
            'Monitor system health and performance'
        ]
    }
    
    return features_map.get(user_type, [
        'Access platform features based on your role',
        'Collaborate with other music industry professionals',
        'Track and manage music-related activities'
    ])


# Email template validation
def validate_email_template_exists(template_name: str) -> bool:
    """
    Check if email template exists.
    
    Args:
        template_name: Name of the template to check
        
    Returns:
        True if template exists, False otherwise
    """
    from django.template.loader import get_template
    from django.template import TemplateDoesNotExist
    
    try:
        get_template(f'emails/{template_name}.html')
        get_template(f'emails/{template_name}.txt')
        return True
    except TemplateDoesNotExist:
        return False


# Email configuration validation
def validate_email_configuration() -> Dict[str, Any]:
    """
    Validate email configuration settings.
    
    Returns:
        Dict with validation results
    """
    config_status = {
        'email_backend_configured': bool(getattr(settings, 'EMAIL_BACKEND', None)),
        'default_from_email_set': bool(getattr(settings, 'DEFAULT_FROM_EMAIL', None)),
        'smtp_configured': False,
        'file_backend_configured': False
    }
    
    email_backend = getattr(settings, 'EMAIL_BACKEND', '')
    
    if 'smtp' in email_backend.lower():
        config_status['smtp_configured'] = all([
            getattr(settings, 'EMAIL_HOST', None),
            getattr(settings, 'EMAIL_HOST_USER', None),
            getattr(settings, 'EMAIL_HOST_PASSWORD', None),
        ])
    elif 'filebased' in email_backend.lower():
        config_status['file_backend_configured'] = bool(
            getattr(settings, 'EMAIL_FILE_PATH', None)
        )
    
    return config_status