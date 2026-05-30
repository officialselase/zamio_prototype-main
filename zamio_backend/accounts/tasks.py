"""
Celery tasks for email management and user account operations.

This module implements background tasks for:
- Email verification
- Password reset emails
- User invitation emails
- General notification emails

All tasks are designed to be queued and processed asynchronously to improve
user experience and system performance.
"""

import logging
import uuid
import secrets
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from accounts.models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


def generate_verification_code() -> str:
    """
    Generate a secure 4-digit verification code.
    
    Returns:
        4-digit numeric string
    """
    return f"{secrets.randbelow(10000):04d}"


def generate_verification_token() -> str:
    """
    Generate a secure verification token.
    
    Returns:
        64-character hexadecimal token
    """
    return secrets.token_hex(32)


def hash_verification_code(code: str) -> str:
    """
    Hash verification code for secure storage.
    
    Args:
        code: Plain text verification code
        
    Returns:
        SHA-256 hash of the code
    """
    return hashlib.sha256(code.encode()).hexdigest()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_verification_task(self, user_id: int, verification_token: str = None, 
                                base_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Send email verification email to user with both code and token methods.
    
    Args:
        user_id: ID of the user to send verification email to
        verification_token: Token for email verification (optional, will generate if not provided)
        base_url: Base URL for verification link (optional)
        
    Returns:
        Dict containing task result information
        
    Requirements: 2.1, 2.2, 2.3, 2.4 - Generate both 4-digit code and token with expiration
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Generate verification code and token if not provided
        verification_code = generate_verification_code()
        if not verification_token:
            verification_token = generate_verification_token()
        
        # Hash the verification code for secure storage
        verification_code_hash = hash_verification_code(verification_code)
        
        # Set expiration times (15 min for code, 60 min for token)
        code_expires_at = timezone.now() + timedelta(minutes=15)
        token_expires_at = timezone.now() + timedelta(minutes=60)
        
        # Use provided base_url or fall back to settings
        if not base_url:
            base_url = getattr(settings, 'BASE_URL', 'localhost:9001')
        
        # Generate verification URL
        verification_url = f"http://{base_url}/verify-email?token={verification_token}&email={user.email}"
        
        # Prepare email context with both methods
        context = {
            'user': user,
            'verification_url': verification_url,
            'verification_token': verification_token,
            'verification_code': verification_code,
            'code_expires_minutes': 15,
            'link_expires_minutes': 60,
            'site_name': 'ZamIO',
            'current_year': datetime.now().year,
        }
        
        # Render email templates
        subject = f"Verify your ZamIO account - {user.first_name or user.email}"
        html_message = render_to_string('emails/email_verification.html', context)
        plain_message = render_to_string('emails/email_verification.txt', context)
        
        # Create and send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        
        # Update user's verification data
        user.email_token = verification_token
        user.verification_code = verification_code
        user.verification_code_hash = verification_code_hash
        user.verification_expires_at = code_expires_at  # Use shorter expiration for primary field
        user.last_verification_request = timezone.now()
        user.verification_attempts = 0  # Reset attempts on new verification
        user.save(update_fields=[
            'email_token', 
            'verification_code', 
            'verification_code_hash',
            'verification_expires_at',
            'last_verification_request',
            'verification_attempts'
        ])
        
        # Log the activity
        AuditLog.objects.create(
            user=user,
            action='email_verification_sent',
            resource_type='email',
            resource_id=user.email,
            request_data={
                'verification_token': verification_token[:8] + '...',
                'has_code': True,
                'code_expires_at': code_expires_at.isoformat(),
                'token_expires_at': token_expires_at.isoformat()
            },
            status_code=200,
            trace_id=uuid.uuid4()
        )
        
        logger.info(f"Email verification sent successfully to {user.email} with both code and token")
        
        return {
            'status': 'success',
            'message': f'Email verification sent to {user.email}',
            'user_id': user_id,
            'verification_methods': ['code', 'link'],
            'code_expires_at': code_expires_at.isoformat(),
            'token_expires_at': token_expires_at.isoformat(),
            'timestamp': timezone.now().isoformat()
        }
        
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found for email verification")
        return {
            'status': 'error',
            'message': f'User with ID {user_id} not found',
            'user_id': user_id,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to send email verification to user {user_id}: {str(exc)}")
        
        # Retry the task with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)  # Exponential backoff
            raise self.retry(exc=exc, countdown=retry_delay)
        
        return {
            'status': 'error',
            'message': f'Failed to send email verification: {str(exc)}',
            'user_id': user_id,
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, user_id: int, reset_token: str = None, 
                                  base_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Send password reset email to user with both code and token methods.
    
    Args:
        user_id: ID of the user requesting password reset
        reset_token: Token for password reset (optional, will generate if not provided)
        base_url: Base URL for reset link (optional)
        
    Returns:
        Dict containing task result information
        
    Requirements: 13.1, 13.2 - Generate both 4-digit code and token with expiration
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Generate reset code and token if not provided
        reset_code = generate_verification_code()  # Reuse the 4-digit code generator
        if not reset_token:
            reset_token = generate_verification_token()
        
        # Hash the reset code for secure storage
        reset_code_hash = hash_verification_code(reset_code)
        
        # Set expiration times (15 min for code, 60 min for token)
        code_expires_at = timezone.now() + timedelta(minutes=15)
        token_expires_at = timezone.now() + timedelta(minutes=60)
        
        # Use provided base_url or fall back to settings
        if not base_url:
            base_url = getattr(settings, 'BASE_URL', 'localhost:9001')
        
        # Generate reset URL
        reset_url = f"http://{base_url}/reset-password?token={reset_token}&email={user.email}"
        
        # Prepare email context with both methods
        context = {
            'user': user,
            'reset_url': reset_url,
            'reset_token': reset_token,
            'reset_code': reset_code,
            'code_expires_minutes': 15,
            'link_expires_minutes': 60,
            'site_name': 'ZamIO',
            'current_year': datetime.now().year,
        }
        
        # Render email templates
        subject = "Reset your ZamIO password"
        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = render_to_string('emails/password_reset.txt', context)
        
        # Create and send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        
        # Store reset data in user record (we'll need to add these fields to User model)
        user.reset_token = reset_token
        user.reset_code = reset_code
        user.reset_code_hash = reset_code_hash
        user.reset_expires_at = code_expires_at  # Use shorter expiration for primary field
        user.last_reset_request = timezone.now()
        user.reset_attempts = 0  # Reset attempts on new reset request
        user.save(update_fields=[
            'reset_token', 
            'reset_code', 
            'reset_code_hash',
            'reset_expires_at',
            'last_reset_request',
            'reset_attempts'
        ])
        
        # Log the activity
        AuditLog.objects.create(
            user=user,
            action='password_reset_email_sent',
            resource_type='email',
            resource_id=user.email,
            request_data={
                'reset_token': reset_token[:8] + '...',
                'has_code': True,
                'code_expires_at': code_expires_at.isoformat(),
                'token_expires_at': token_expires_at.isoformat()
            },
            status_code=200,
            trace_id=uuid.uuid4()
        )
        
        logger.info(f"Password reset email sent successfully to {user.email} with both code and token")
        
        return {
            'status': 'success',
            'message': f'Password reset email sent to {user.email}',
            'user_id': user_id,
            'reset_methods': ['code', 'link'],
            'code_expires_at': code_expires_at.isoformat(),
            'token_expires_at': token_expires_at.isoformat(),
            'timestamp': timezone.now().isoformat()
        }
        
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found for password reset")
        return {
            'status': 'error',
            'message': f'User with ID {user_id} not found',
            'user_id': user_id,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to send password reset email to user {user_id}: {str(exc)}")
        
        # Retry the task with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=retry_delay)
        
        return {
            'status': 'error',
            'message': f'Failed to send password reset email: {str(exc)}',
            'user_id': user_id,
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_user_invitation_email_task(self, inviter_user_id: int, invitee_email: str, 
                                   invitation_token: str, user_type: str = 'Artist',
                                   base_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Send user invitation email.
    
    Args:
        inviter_user_id: ID of the user sending the invitation
        invitee_email: Email address of the person being invited
        invitation_token: Token for invitation acceptance
        user_type: Type of user being invited (Artist, Station, Publisher, etc.)
        base_url: Base URL for invitation link (optional)
        
    Returns:
        Dict containing task result information
        
    Requirements: 1.3 - User invites handled asynchronously via Celery
    """
    try:
        inviter = User.objects.get(id=inviter_user_id)
        
        # Use provided base_url or fall back to settings
        if not base_url:
            base_url = getattr(settings, 'BASE_URL', 'localhost:9001')
        
        # Generate invitation URL
        invitation_url = f"http://{base_url}/accept-invitation?token={invitation_token}&email={invitee_email}&type={user_type}"
        
        # Prepare email context
        context = {
            'inviter': inviter,
            'invitee_email': invitee_email,
            'invitation_url': invitation_url,
            'invitation_token': invitation_token,
            'user_type': user_type,
            'site_name': 'ZamIO',
            'current_year': datetime.now().year,
        }
        
        # Render email templates
        subject = f"You're invited to join ZamIO as a {user_type}"
        html_message = render_to_string('emails/user_invitation.html', context)
        plain_message = render_to_string('emails/user_invitation.txt', context)
        
        # Create and send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[invitee_email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        
        # Log the activity
        AuditLog.objects.create(
            user=inviter,
            action='user_invitation_sent',
            resource_type='invitation',
            resource_id=invitee_email,
            request_data={
                'invitee_email': invitee_email,
                'user_type': user_type,
                'invitation_token': invitation_token[:8] + '...'
            },
            status_code=200,
            trace_id=uuid.uuid4()
        )
        
        logger.info(f"User invitation sent successfully from {inviter.email} to {invitee_email}")
        
        return {
            'status': 'success',
            'message': f'Invitation sent to {invitee_email}',
            'inviter_user_id': inviter_user_id,
            'invitee_email': invitee_email,
            'user_type': user_type,
            'timestamp': timezone.now().isoformat()
        }
        
    except User.DoesNotExist:
        logger.error(f"Inviter user with ID {inviter_user_id} not found")
        return {
            'status': 'error',
            'message': f'Inviter user with ID {inviter_user_id} not found',
            'inviter_user_id': inviter_user_id,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to send invitation from user {inviter_user_id} to {invitee_email}: {str(exc)}")
        
        # Retry the task with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=retry_delay)
        
        return {
            'status': 'error',
            'message': f'Failed to send invitation: {str(exc)}',
            'inviter_user_id': inviter_user_id,
            'invitee_email': invitee_email,
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email_task(self, user_ids: List[int], subject: str, 
                                message: str, email_type: str = 'notification',
                                template_name: Optional[str] = None,
                                context_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Send notification emails to multiple users.
    
    Args:
        user_ids: List of user IDs to send notifications to
        subject: Email subject line
        message: Email message content
        email_type: Type of notification (notification, alert, update, etc.)
        template_name: Optional custom template name
        context_data: Additional context data for template rendering
        
    Returns:
        Dict containing task result information
        
    Requirements: 1.4 - Email notifications queued for background processing
    """
    try:
        users = User.objects.filter(id__in=user_ids, is_active=True)
        
        if not users.exists():
            return {
                'status': 'error',
                'message': 'No active users found for the provided IDs',
                'user_ids': user_ids,
                'timestamp': timezone.now().isoformat()
            }
        
        # Prepare base context
        base_context = {
            'subject': subject,
            'message': message,
            'email_type': email_type,
            'site_name': 'ZamIO',
            'current_year': datetime.now().year,
        }
        
        # Add any additional context data
        if context_data:
            base_context.update(context_data)
        
        # Determine template to use
        if template_name:
            html_template = f'emails/{template_name}.html'
            text_template = f'emails/{template_name}.txt'
        else:
            html_template = 'emails/notification.html'
            text_template = 'emails/notification.txt'
        
        successful_sends = []
        failed_sends = []
        
        for user in users:
            try:
                # Personalize context for each user
                user_context = base_context.copy()
                user_context['user'] = user
                
                # Render email templates
                html_message = render_to_string(html_template, user_context)
                plain_message = render_to_string(text_template, user_context)
                
                # Create and send email
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email.attach_alternative(html_message, "text/html")
                email.send()
                
                successful_sends.append(user.id)
                
                # Log the activity
                AuditLog.objects.create(
                    user=user,
                    action='notification_email_sent',
                    resource_type='email',
                    resource_id=user.email,
                    request_data={
                        'subject': subject,
                        'email_type': email_type,
                        'template_name': template_name
                    },
                    status_code=200,
                    trace_id=uuid.uuid4()
                )
                
            except Exception as user_exc:
                logger.error(f"Failed to send notification email to user {user.id}: {str(user_exc)}")
                failed_sends.append({'user_id': user.id, 'error': str(user_exc)})
        
        logger.info(f"Notification emails sent: {len(successful_sends)} successful, {len(failed_sends)} failed")
        
        return {
            'status': 'success' if successful_sends else 'error',
            'message': f'Sent {len(successful_sends)} emails, {len(failed_sends)} failed',
            'successful_sends': successful_sends,
            'failed_sends': failed_sends,
            'total_users': len(user_ids),
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to send notification emails: {str(exc)}")
        
        # Retry the task with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=retry_delay)
        
        return {
            'status': 'error',
            'message': f'Failed to send notification emails: {str(exc)}',
            'user_ids': user_ids,
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def send_bulk_notification_email_task(self, user_type_filter: Optional[str] = None,
                                     subject: str = '', message: str = '',
                                     email_type: str = 'bulk_notification',
                                     template_name: Optional[str] = None,
                                     context_data: Optional[Dict[str, Any]] = None,
                                     batch_size: int = 50) -> Dict[str, Any]:
    """
    Send bulk notification emails to users based on filters.
    
    Args:
        user_type_filter: Filter users by type (Artist, Station, Publisher, etc.)
        subject: Email subject line
        message: Email message content
        email_type: Type of notification
        template_name: Optional custom template name
        context_data: Additional context data for template rendering
        batch_size: Number of emails to send per batch
        
    Returns:
        Dict containing task result information
        
    Requirements: 1.5 - Proper queuing for notification email tasks
    """
    try:
        # Build user queryset based on filters
        users_query = User.objects.filter(is_active=True, email_verified=True)
        
        if user_type_filter:
            users_query = users_query.filter(user_type=user_type_filter)
        
        total_users = users_query.count()
        
        if total_users == 0:
            return {
                'status': 'success',
                'message': 'No users match the filter criteria',
                'total_users': 0,
                'timestamp': timezone.now().isoformat()
            }
        
        # Process users in batches to avoid overwhelming the email system
        successful_sends = 0
        failed_sends = 0
        
        for offset in range(0, total_users, batch_size):
            batch_users = users_query[offset:offset + batch_size]
            user_ids = list(batch_users.values_list('id', flat=True))
            
            # Queue individual notification task for this batch
            result = send_notification_email_task.delay(
                user_ids=user_ids,
                subject=subject,
                message=message,
                email_type=email_type,
                template_name=template_name,
                context_data=context_data
            )
            
            # Note: In a real implementation, you might want to track these task IDs
            # and wait for completion to get accurate counts
            successful_sends += len(user_ids)
        
        logger.info(f"Bulk notification queued for {total_users} users in {(total_users + batch_size - 1) // batch_size} batches")
        
        return {
            'status': 'success',
            'message': f'Bulk notification queued for {total_users} users',
            'total_users': total_users,
            'batch_count': (total_users + batch_size - 1) // batch_size,
            'user_type_filter': user_type_filter,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to queue bulk notification emails: {str(exc)}")
        
        # Retry the task with longer delay for bulk operations
        if self.request.retries < self.max_retries:
            retry_delay = 300 * (2 ** self.request.retries)  # 5 minutes base delay
            raise self.retry(exc=exc, countdown=retry_delay)
        
        return {
            'status': 'error',
            'message': f'Failed to queue bulk notification emails: {str(exc)}',
            'timestamp': timezone.now().isoformat()
        }


# Utility functions for task management

def queue_email_verification(user_id: int, verification_token: str, 
                           base_url: Optional[str] = None) -> str:
    """
    Queue email verification task.
    
    Args:
        user_id: ID of the user
        verification_token: Verification token
        base_url: Optional base URL
        
    Returns:
        Task ID for tracking
    """
    task = send_email_verification_task.delay(user_id, verification_token, base_url)
    return task.id


def queue_password_reset_email(user_id: int, reset_token: str, 
                              base_url: Optional[str] = None) -> str:
    """
    Queue password reset email task.
    
    Args:
        user_id: ID of the user
        reset_token: Reset token
        base_url: Optional base URL
        
    Returns:
        Task ID for tracking
    """
    task = send_password_reset_email_task.delay(user_id, reset_token, base_url)
    return task.id


def queue_user_invitation(inviter_user_id: int, invitee_email: str, 
                         invitation_token: str, user_type: str = 'Artist',
                         base_url: Optional[str] = None) -> str:
    """
    Queue user invitation email task.
    
    Args:
        inviter_user_id: ID of the inviting user
        invitee_email: Email of the invitee
        invitation_token: Invitation token
        user_type: Type of user being invited
        base_url: Optional base URL
        
    Returns:
        Task ID for tracking
    """
    task = send_user_invitation_email_task.delay(
        inviter_user_id, invitee_email, invitation_token, user_type, base_url
    )
    return task.id


def queue_notification_email(user_ids: List[int], subject: str, message: str,
                           email_type: str = 'notification',
                           template_name: Optional[str] = None,
                           context_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Queue notification email task.
    
    Args:
        user_ids: List of user IDs
        subject: Email subject
        message: Email message
        email_type: Type of notification
        template_name: Optional template name
        context_data: Optional context data
        
    Returns:
        Task ID for tracking
    """
    task = send_notification_email_task.delay(
        user_ids, subject, message, email_type, template_name, context_data
    )
    return task.id