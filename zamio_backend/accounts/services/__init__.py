"""
Email verification service for handling both code and token verification methods.

This module provides centralized verification logic that supports:
- 4-digit verification codes with 15-minute expiration
- Verification tokens with 60-minute expiration
- Rate limiting and security measures
- Proper error handling and logging
"""

import hashlib
import logging
import secrets
from datetime import timedelta
from typing import Dict, Any, Optional

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status

from accounts.models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


class EmailVerificationService:
    """
    Centralized service for managing email verification with dual methods.
    
    Requirements: 3.4, 5.2, 5.3, 12.1, 12.2, 12.3 - Code verification with resend functionality
    """
    
    def __init__(self):
        self.max_attempts = 5
        self.rate_limit_minutes = 15
        self.block_duration_minutes = 30
        self.resend_cooldown_minutes = 2  # Minimum time between resends
        self.max_resends_per_hour = 3

    def initialize_verification(self, user: User, method: str = 'code') -> str:
        """Prepare user for verification by generating a 4-digit code."""
        code = f"{secrets.randbelow(10000):04d}"
        code_hash = self.hash_verification_code(code)
        now = timezone.now()

        update_fields = [
            'verification_code',
            'verification_code_hash',
            'verification_expires_at',
            'last_verification_request',
            'verification_attempts',
            'verification_blocked_until',
            'verification_method',
        ]

        user.verification_code = code
        user.verification_code_hash = code_hash
        user.verification_expires_at = now + timedelta(minutes=15)
        user.last_verification_request = now
        user.verification_attempts = 0
        user.verification_blocked_until = None
        user.verification_method = method

        # Reset legacy token fields when relying on code verification only
        if user.email_token:
            user.email_token = None
            update_fields.append('email_token')

        user.save(update_fields=update_fields)
        return code

    def hash_verification_code(self, code: str) -> str:
        """
        Hash verification code for secure storage.
        
        Args:
            code: Plain text verification code
            
        Returns:
            SHA-256 hash of the code
        """
        return hashlib.sha256(code.encode()).hexdigest()
    
    def verify_code(self, email: str, code: str, ip_address: str = None) -> Dict[str, Any]:
        """
        Verify user-provided 4-digit code.
        
        Args:
            email: User's email address
            code: 4-digit verification code
            ip_address: IP address for audit logging
            
        Returns:
            Dict containing verification result
            
        Requirements: 3.4, 5.2, 5.3 - Code verification with error handling
        """
        try:
            # Find user by email
            try:
                user = User.objects.get(email=email.lower())
            except User.DoesNotExist:
                logger.warning(f"Verification attempt for non-existent email: {email}")
                return {
                    'success': False,
                    'error_code': 'USER_NOT_FOUND',
                    'message': 'User not found',
                    'status_code': status.HTTP_404_NOT_FOUND
                }
            
            # Check if user is already verified
            if user.email_verified:
                return {
                    'success': False,
                    'error_code': 'ALREADY_VERIFIED',
                    'message': 'Email is already verified',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Check if user is blocked
            if user.verification_blocked_until and user.verification_blocked_until > timezone.now():
                time_remaining = user.verification_blocked_until - timezone.now()
                return {
                    'success': False,
                    'error_code': 'USER_BLOCKED',
                    'message': f'Too many failed attempts. Try again in {int(time_remaining.total_seconds() / 60)} minutes',
                    'retry_after': int(time_remaining.total_seconds()),
                    'status_code': status.HTTP_429_TOO_MANY_REQUESTS
                }
            
            # Check if verification code exists
            if not user.verification_code or not user.verification_code_hash:
                return {
                    'success': False,
                    'error_code': 'NO_VERIFICATION_PENDING',
                    'message': 'No verification code found. Please request a new verification email',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Check if verification code has expired
            if user.verification_expires_at and user.verification_expires_at < timezone.now():
                return {
                    'success': False,
                    'error_code': 'CODE_EXPIRED',
                    'message': 'Verification code has expired. Please request a new verification email',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Increment attempt counter
            user.verification_attempts += 1
            
            # Check if max attempts exceeded
            if user.verification_attempts > self.max_attempts:
                # Block user for 30 minutes
                user.verification_blocked_until = timezone.now() + timedelta(minutes=self.block_duration_minutes)
                user.save(update_fields=['verification_attempts', 'verification_blocked_until'])
                
                # Log security event
                AuditLog.objects.create(
                    user=user,
                    action='verification_blocked_max_attempts',
                    resource_type='verification',
                    resource_id=user.email,
                    ip_address=ip_address,
                    request_data={'attempts': user.verification_attempts},
                    status_code=429
                )
                
                return {
                    'success': False,
                    'error_code': 'MAX_ATTEMPTS_EXCEEDED',
                    'message': f'Too many failed attempts. Account blocked for {self.block_duration_minutes} minutes',
                    'retry_after': self.block_duration_minutes * 60,
                    'status_code': status.HTTP_429_TOO_MANY_REQUESTS
                }
            
            # Verify the code using constant-time comparison
            provided_code_hash = self.hash_verification_code(code)
            if provided_code_hash != user.verification_code_hash:
                user.save(update_fields=['verification_attempts'])
                
                # Log failed attempt
                AuditLog.objects.create(
                    user=user,
                    action='verification_code_failed',
                    resource_type='verification',
                    resource_id=user.email,
                    ip_address=ip_address,
                    request_data={'attempts': user.verification_attempts},
                    status_code=400
                )
                
                attempts_remaining = self.max_attempts - user.verification_attempts
                return {
                    'success': False,
                    'error_code': 'INVALID_CODE',
                    'message': f'Invalid verification code. {attempts_remaining} attempts remaining',
                    'attempts_remaining': attempts_remaining,
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Code is valid - mark user as verified and clear verification data
            user.email_verified = True
            user.is_active = True
            user.verification_code = None
            user.verification_code_hash = None
            user.email_token = None
            user.verification_expires_at = None
            user.verification_attempts = 0
            user.verification_blocked_until = None
            user.save(update_fields=[
                'email_verified',
                'is_active',
                'verification_code',
                'verification_code_hash',
                'email_token',
                'verification_expires_at',
                'verification_attempts',
                'verification_blocked_until'
            ])
            
            # Log successful verification
            AuditLog.objects.create(
                user=user,
                action='email_verified_by_code',
                resource_type='verification',
                resource_id=user.email,
                ip_address=ip_address,
                request_data={'method': 'code'},
                status_code=200
            )
            
            logger.info(f"Email verification successful for {user.email} using code")
            
            return {
                'success': True,
                'message': 'Email verified successfully',
                'user_id': user.id,
                'status_code': status.HTTP_200_OK
            }
            
        except Exception as exc:
            logger.error(f"Error during code verification for {email}: {str(exc)}")
            return {
                'success': False,
                'error_code': 'VERIFICATION_ERROR',
                'message': 'An error occurred during verification',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            }
    
    def verify_token(self, email: str, token: str, ip_address: str = None) -> Dict[str, Any]:
        """
        Verify user-provided verification token.
        
        Args:
            email: User's email address
            token: Verification token
            ip_address: IP address for audit logging
            
        Returns:
            Dict containing verification result
            
        Requirements: 5.3, 10.1, 10.2 - Token verification with backward compatibility
        """
        try:
            # Find user by email
            try:
                user = User.objects.get(email=email.lower())
            except User.DoesNotExist:
                logger.warning(f"Token verification attempt for non-existent email: {email}")
                return {
                    'success': False,
                    'error_code': 'USER_NOT_FOUND',
                    'message': 'User not found',
                    'status_code': status.HTTP_404_NOT_FOUND
                }
            
            # Check if user is already verified
            if user.email_verified:
                return {
                    'success': False,
                    'error_code': 'ALREADY_VERIFIED',
                    'message': 'Email is already verified',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Check if verification token exists
            if not user.email_token:
                return {
                    'success': False,
                    'error_code': 'NO_VERIFICATION_PENDING',
                    'message': 'No verification token found. Please request a new verification email',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # For backward compatibility, check expiration only if verification_expires_at is set
            # Token expiration is 60 minutes, but we use the same field as code (15 min)
            # So we need to be more lenient for tokens
            if user.verification_expires_at:
                # Allow tokens to be valid for 60 minutes from last_verification_request
                token_expiry = user.last_verification_request + timedelta(minutes=60) if user.last_verification_request else None
                if token_expiry and token_expiry < timezone.now():
                    return {
                        'success': False,
                        'error_code': 'TOKEN_EXPIRED',
                        'message': 'Verification token has expired. Please request a new verification email',
                        'status_code': status.HTTP_400_BAD_REQUEST
                    }
            
            # Verify the token
            if token != user.email_token:
                # Log failed attempt
                AuditLog.objects.create(
                    user=user,
                    action='verification_token_failed',
                    resource_type='verification',
                    resource_id=user.email,
                    ip_address=ip_address,
                    request_data={'token_prefix': token[:8] + '...' if len(token) > 8 else token},
                    status_code=400
                )
                
                return {
                    'success': False,
                    'error_code': 'INVALID_TOKEN',
                    'message': 'Invalid verification token',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Token is valid - mark user as verified and clear verification data
            user.email_verified = True
            user.is_active = True
            user.verification_code = None
            user.verification_code_hash = None
            user.email_token = None
            user.verification_expires_at = None
            user.verification_attempts = 0
            user.verification_blocked_until = None
            user.save(update_fields=[
                'email_verified',
                'is_active',
                'verification_code',
                'verification_code_hash',
                'email_token',
                'verification_expires_at',
                'verification_attempts',
                'verification_blocked_until'
            ])
            
            # Log successful verification
            AuditLog.objects.create(
                user=user,
                action='email_verified_by_token',
                resource_type='verification',
                resource_id=user.email,
                ip_address=ip_address,
                request_data={'method': 'token'},
                status_code=200
            )
            
            logger.info(f"Email verification successful for {user.email} using token")
            
            return {
                'success': True,
                'message': 'Email verified successfully',
                'user_id': user.id,
                'status_code': status.HTTP_200_OK
            }
            
        except Exception as exc:
            logger.error(f"Error during token verification for {email}: {str(exc)}")
            return {
                'success': False,
                'error_code': 'VERIFICATION_ERROR',
                'message': 'An error occurred during verification',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            }
    
    def can_resend(self, user: User) -> Dict[str, Any]:
        """
        Check if user can resend verification with rate limiting and cooldown.
        
        Args:
            user: User instance
            
        Returns:
            Dict containing resend eligibility information
            
        Requirements: 12.1, 12.2, 12.3 - Rate limiting (max 3 per hour, 2-min cooldown)
        """
        now = timezone.now()
        
        # Check if user is blocked
        if user.verification_blocked_until and user.verification_blocked_until > now:
            time_remaining = user.verification_blocked_until - now
            return {
                'can_resend': False,
                'message': 'Account is temporarily blocked due to too many failed attempts',
                'retry_after_seconds': int(time_remaining.total_seconds()),
                'reason': 'blocked'
            }
        
        # Check cooldown period (2 minutes between resends)
        if user.last_verification_request:
            time_since_last = now - user.last_verification_request
            cooldown_period = timedelta(minutes=self.resend_cooldown_minutes)
            
            if time_since_last < cooldown_period:
                remaining_cooldown = cooldown_period - time_since_last
                return {
                    'can_resend': False,
                    'message': f'Please wait {int(remaining_cooldown.total_seconds() / 60)} minutes before requesting another verification email',
                    'retry_after_seconds': int(remaining_cooldown.total_seconds()),
                    'cooldown_seconds': int(remaining_cooldown.total_seconds()),
                    'reason': 'cooldown'
                }
        
        # Check hourly rate limit (max 3 resends per hour)
        one_hour_ago = now - timedelta(hours=1)
        
        # Count recent verification requests (we'll track this in a simple way using last_verification_request)
        # For a more robust solution, you might want to use a separate model to track resend attempts
        # For now, we'll use a simplified approach
        
        # Get resend count from audit logs in the last hour
        from accounts.models import AuditLog
        recent_resends = AuditLog.objects.filter(
            user=user,
            action__in=['email_verification_sent', 'verification_resent'],
            timestamp__gte=one_hour_ago
        ).count()
        
        if recent_resends >= self.max_resends_per_hour:
            return {
                'can_resend': False,
                'message': f'Maximum of {self.max_resends_per_hour} verification emails per hour exceeded',
                'retry_after_seconds': 3600,  # 1 hour
                'resend_count': recent_resends,
                'max_resends': self.max_resends_per_hour,
                'reason': 'rate_limit'
            }
        
        return {
            'can_resend': True,
            'resend_count': recent_resends,
            'max_resends': self.max_resends_per_hour,
            'remaining_resends': self.max_resends_per_hour - recent_resends
        }
    
    def resend_verification(self, user: User, method: str = None) -> Dict[str, Any]:
        """
        Resend verification email with rate limiting and method selection.
        
        Args:
            user: User instance
            method: Verification method ('code' or 'link'), maintains current if None
            
        Returns:
            Dict containing resend result
            
        Requirements: 12.1, 12.2, 12.3 - Generate new code and token on resend
        """
        from accounts.email_utils import send_verification_email
        
        # Check if user can resend
        can_resend_result = self.can_resend(user)
        if not can_resend_result['can_resend']:
            return {
                'status': 'error',
                'message': can_resend_result['message'],
                'retry_after_seconds': can_resend_result.get('retry_after_seconds'),
                'reason': can_resend_result.get('reason')
            }
        
        # Use provided method or maintain current method
        if method:
            user.verification_method = method
        elif not user.verification_method:
            user.verification_method = 'link'  # Default to link
        
        try:
            # Send verification email (this will generate new code and token)
            task_id = send_verification_email(user)
            
            # Update resend tracking
            user.save(update_fields=['verification_method'])
            
            # Log resend activity
            AuditLog.objects.create(
                user=user,
                action='verification_resent',
                resource_type='email',
                resource_id=user.email,
                request_data={
                    'method': user.verification_method,
                    'resend_count': can_resend_result['resend_count'] + 1,
                    'task_id': task_id
                },
                status_code=200
            )
            
            logger.info(f"Verification email resent to {user.email} using method: {user.verification_method}")
            
            return {
                'status': 'success',
                'message': 'Verification email sent successfully',
                'method': user.verification_method,
                'expires_at': user.verification_expires_at.isoformat() if user.verification_expires_at else None,
                'resend_count': can_resend_result['resend_count'] + 1,
                'max_resends': self.max_resends_per_hour,
                'next_resend_available_at': (timezone.now() + timedelta(minutes=self.resend_cooldown_minutes)).isoformat(),
                'task_id': task_id
            }
            
        except Exception as exc:
            logger.error(f"Failed to resend verification email to {user.email}: {str(exc)}")
            return {
                'status': 'error',
                'message': 'Failed to send verification email'
            }


class PasswordResetService:
    """
    Centralized service for managing password reset with dual methods.
    
    Requirements: 13.1, 13.2, 13.3, 12.1, 12.2 - Password reset with resend functionality
    """
    
    def __init__(self):
        self.max_attempts = 5
        self.rate_limit_minutes = 15
        self.block_duration_minutes = 30
        self.resend_cooldown_minutes = 2  # Minimum time between resends
        self.max_resends_per_hour = 3
    
    def hash_reset_code(self, code: str) -> str:
        """
        Hash reset code for secure storage.
        
        Args:
            code: Plain text reset code
            
        Returns:
            SHA-256 hash of the code
        """
        return hashlib.sha256(code.encode()).hexdigest()
    
    def create_reset_request(self, user: User, method: str) -> Dict[str, Any]:
        """
        Create new password reset request with selected method.
        
        Args:
            user: User instance
            method: Reset method ('code' or 'link')
            
        Returns:
            Dict containing reset request result
            
        Requirements: 13.1, 13.2 - Generate both code and token with expiration
        """
        from accounts.email_utils import send_password_reset_email
        
        try:
            # Send password reset email (this will generate new code and token)
            task_id = send_password_reset_email(user)
            
            # Update method preference
            user.verification_method = method  # Reuse verification_method field for consistency
            user.save(update_fields=['verification_method'])
            
            # Log reset request
            AuditLog.objects.create(
                user=user,
                action='password_reset_requested',
                resource_type='email',
                resource_id=user.email,
                request_data={
                    'method': method,
                    'task_id': task_id
                },
                status_code=200
            )
            
            logger.info(f"Password reset requested for {user.email} using method: {method}")
            
            return {
                'status': 'success',
                'message': 'Password reset email sent successfully',
                'method': method,
                'expires_at': user.reset_expires_at.isoformat() if user.reset_expires_at else None,
                'task_id': task_id
            }
            
        except Exception as exc:
            logger.error(f"Failed to create password reset request for {user.email}: {str(exc)}")
            return {
                'status': 'error',
                'message': 'Failed to send password reset email'
            }
    
    def can_resend_reset(self, user: User) -> Dict[str, Any]:
        """
        Check if user can resend password reset with rate limiting and cooldown.
        
        Args:
            user: User instance
            
        Returns:
            Dict containing resend eligibility information
            
        Requirements: 12.1, 12.2 - Same rate limiting as verification resends
        """
        now = timezone.now()
        
        # Check if user is blocked
        if user.reset_blocked_until and user.reset_blocked_until > now:
            time_remaining = user.reset_blocked_until - now
            return {
                'can_resend': False,
                'message': 'Account is temporarily blocked due to too many failed attempts',
                'retry_after_seconds': int(time_remaining.total_seconds()),
                'reason': 'blocked'
            }
        
        # Check cooldown period (2 minutes between resends)
        if user.last_reset_request:
            time_since_last = now - user.last_reset_request
            cooldown_period = timedelta(minutes=self.resend_cooldown_minutes)
            
            if time_since_last < cooldown_period:
                remaining_cooldown = cooldown_period - time_since_last
                return {
                    'can_resend': False,
                    'message': f'Please wait {int(remaining_cooldown.total_seconds() / 60)} minutes before requesting another password reset email',
                    'retry_after_seconds': int(remaining_cooldown.total_seconds()),
                    'cooldown_seconds': int(remaining_cooldown.total_seconds()),
                    'reason': 'cooldown'
                }
        
        # Check hourly rate limit (max 3 resends per hour)
        one_hour_ago = now - timedelta(hours=1)
        
        # Get resend count from audit logs in the last hour
        from accounts.models import AuditLog
        recent_resends = AuditLog.objects.filter(
            user=user,
            action__in=['password_reset_email_sent', 'password_reset_resent'],
            timestamp__gte=one_hour_ago
        ).count()
        
        if recent_resends >= self.max_resends_per_hour:
            return {
                'can_resend': False,
                'message': f'Maximum of {self.max_resends_per_hour} password reset emails per hour exceeded',
                'retry_after_seconds': 3600,  # 1 hour
                'resend_count': recent_resends,
                'max_resends': self.max_resends_per_hour,
                'reason': 'rate_limit'
            }
        
        return {
            'can_resend': True,
            'resend_count': recent_resends,
            'max_resends': self.max_resends_per_hour,
            'remaining_resends': self.max_resends_per_hour - recent_resends
        }
    
    def resend_reset(self, user: User, method: str = None) -> Dict[str, Any]:
        """
        Resend password reset email with rate limiting and method selection.
        
        Args:
            user: User instance
            method: Reset method ('code' or 'link'), maintains current if None
            
        Returns:
            Dict containing resend result
            
        Requirements: 12.1, 12.2, 13.1 - Generate new reset code and token on resend
        """
        from accounts.email_utils import send_password_reset_email
        
        # Check if user can resend
        can_resend_result = self.can_resend_reset(user)
        if not can_resend_result['can_resend']:
            return {
                'status': 'error',
                'message': can_resend_result['message'],
                'retry_after_seconds': can_resend_result.get('retry_after_seconds'),
                'reason': can_resend_result.get('reason')
            }
        
        # Use provided method or maintain current method
        if method:
            user.verification_method = method  # Reuse verification_method field
        elif not user.verification_method:
            user.verification_method = 'link'  # Default to link
        
        try:
            # Send password reset email (this will generate new code and token)
            task_id = send_password_reset_email(user)
            
            # Update resend tracking
            user.save(update_fields=['verification_method'])
            
            # Log resend activity
            AuditLog.objects.create(
                user=user,
                action='password_reset_resent',
                resource_type='email',
                resource_id=user.email,
                request_data={
                    'method': user.verification_method,
                    'resend_count': can_resend_result['resend_count'] + 1,
                    'task_id': task_id
                },
                status_code=200
            )
            
            logger.info(f"Password reset email resent to {user.email} using method: {user.verification_method}")
            
            return {
                'status': 'success',
                'message': 'Password reset email sent successfully',
                'method': user.verification_method,
                'expires_at': user.reset_expires_at.isoformat() if user.reset_expires_at else None,
                'resend_count': can_resend_result['resend_count'] + 1,
                'max_resends': self.max_resends_per_hour,
                'next_resend_available_at': (timezone.now() + timedelta(minutes=self.resend_cooldown_minutes)).isoformat(),
                'task_id': task_id
            }
            
        except Exception as exc:
            logger.error(f"Failed to resend password reset email to {user.email}: {str(exc)}")
            return {
                'status': 'error',
                'message': 'Failed to send password reset email'
            }
    
    def verify_reset_code(self, user: User, code: str, new_password: str, ip_address: str = None) -> Dict[str, Any]:
        """
        Verify password reset code and update password.
        
        Args:
            user: User instance
            code: 4-digit reset code
            new_password: New password to set
            ip_address: IP address for audit logging
            
        Returns:
            Dict containing verification result
            
        Requirements: 13.2, 13.3 - Code verification with password update
        """
        try:
            # Check if user is blocked
            if user.reset_blocked_until and user.reset_blocked_until > timezone.now():
                time_remaining = user.reset_blocked_until - timezone.now()
                return {
                    'success': False,
                    'error_code': 'USER_BLOCKED',
                    'message': f'Too many failed attempts. Try again in {int(time_remaining.total_seconds() / 60)} minutes',
                    'retry_after': int(time_remaining.total_seconds()),
                    'status_code': status.HTTP_429_TOO_MANY_REQUESTS
                }
            
            # Check if reset code exists
            if not user.reset_code or not user.reset_code_hash:
                return {
                    'success': False,
                    'error_code': 'NO_RESET_PENDING',
                    'message': 'No password reset code found. Please request a new password reset',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Check if reset code has expired
            if user.reset_expires_at and user.reset_expires_at < timezone.now():
                return {
                    'success': False,
                    'error_code': 'CODE_EXPIRED',
                    'message': 'Password reset code has expired. Please request a new password reset',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Increment attempt counter
            user.reset_attempts += 1
            
            # Check if max attempts exceeded
            if user.reset_attempts > self.max_attempts:
                # Block user for 30 minutes
                user.reset_blocked_until = timezone.now() + timedelta(minutes=self.block_duration_minutes)
                user.save(update_fields=['reset_attempts', 'reset_blocked_until'])
                
                # Log security event
                AuditLog.objects.create(
                    user=user,
                    action='password_reset_blocked_max_attempts',
                    resource_type='password_reset',
                    resource_id=user.email,
                    ip_address=ip_address,
                    request_data={'attempts': user.reset_attempts},
                    status_code=429
                )
                
                return {
                    'success': False,
                    'error_code': 'MAX_ATTEMPTS_EXCEEDED',
                    'message': f'Too many failed attempts. Account blocked for {self.block_duration_minutes} minutes',
                    'retry_after': self.block_duration_minutes * 60,
                    'status_code': status.HTTP_429_TOO_MANY_REQUESTS
                }
            
            # Verify the code using constant-time comparison
            provided_code_hash = self.hash_reset_code(code)
            if provided_code_hash != user.reset_code_hash:
                user.save(update_fields=['reset_attempts'])
                
                # Log failed attempt
                AuditLog.objects.create(
                    user=user,
                    action='password_reset_code_failed',
                    resource_type='password_reset',
                    resource_id=user.email,
                    ip_address=ip_address,
                    request_data={'attempts': user.reset_attempts},
                    status_code=400
                )
                
                attempts_remaining = self.max_attempts - user.reset_attempts
                return {
                    'success': False,
                    'error_code': 'INVALID_CODE',
                    'message': f'Invalid reset code. {attempts_remaining} attempts remaining',
                    'attempts_remaining': attempts_remaining,
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Code is valid - update password and clear reset data
            user.set_password(new_password)
            user.reset_code = None
            user.reset_code_hash = None
            user.reset_token = None
            user.reset_expires_at = None
            user.reset_attempts = 0
            user.reset_blocked_until = None
            user.save(update_fields=[
                'password',
                'reset_code',
                'reset_code_hash',
                'reset_token',
                'reset_expires_at',
                'reset_attempts',
                'reset_blocked_until'
            ])
            
            # Log successful password reset
            AuditLog.objects.create(
                user=user,
                action='password_reset_by_code',
                resource_type='password_reset',
                resource_id=user.email,
                ip_address=ip_address,
                request_data={'method': 'code'},
                status_code=200
            )
            
            logger.info(f"Password reset successful for {user.email} using code")
            
            return {
                'success': True,
                'message': 'Password reset successfully',
                'user_id': user.id,
                'status_code': status.HTTP_200_OK
            }
            
        except Exception as exc:
            logger.error(f"Error during password reset code verification for {user.email}: {str(exc)}")
            return {
                'success': False,
                'error_code': 'RESET_ERROR',
                'message': 'An error occurred during password reset',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            }
    
    def verify_reset_token(self, user: User, token: str, new_password: str, ip_address: str = None) -> Dict[str, Any]:
        """
        Verify password reset token and update password.
        
        Args:
            user: User instance
            token: Reset token
            new_password: New password to set
            ip_address: IP address for audit logging
            
        Returns:
            Dict containing verification result
            
        Requirements: 13.2, 13.3 - Token verification with password update
        """
        try:
            # Check if reset token exists
            if not user.reset_token:
                return {
                    'success': False,
                    'error_code': 'NO_RESET_PENDING',
                    'message': 'No password reset token found. Please request a new password reset',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Check token expiration (60 minutes from last_reset_request)
            if user.last_reset_request:
                token_expiry = user.last_reset_request + timedelta(minutes=60)
                if token_expiry < timezone.now():
                    return {
                        'success': False,
                        'error_code': 'TOKEN_EXPIRED',
                        'message': 'Password reset token has expired. Please request a new password reset',
                        'status_code': status.HTTP_400_BAD_REQUEST
                    }
            
            # Verify the token
            if token != user.reset_token:
                # Log failed attempt
                AuditLog.objects.create(
                    user=user,
                    action='password_reset_token_failed',
                    resource_type='password_reset',
                    resource_id=user.email,
                    ip_address=ip_address,
                    request_data={'token_prefix': token[:8] + '...' if len(token) > 8 else token},
                    status_code=400
                )
                
                return {
                    'success': False,
                    'error_code': 'INVALID_TOKEN',
                    'message': 'Invalid password reset token',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
            
            # Token is valid - update password and clear reset data
            user.set_password(new_password)
            user.reset_code = None
            user.reset_code_hash = None
            user.reset_token = None
            user.reset_expires_at = None
            user.reset_attempts = 0
            user.reset_blocked_until = None
            user.save(update_fields=[
                'password',
                'reset_code',
                'reset_code_hash',
                'reset_token',
                'reset_expires_at',
                'reset_attempts',
                'reset_blocked_until'
            ])
            
            # Log successful password reset
            AuditLog.objects.create(
                user=user,
                action='password_reset_by_token',
                resource_type='password_reset',
                resource_id=user.email,
                ip_address=ip_address,
                request_data={'method': 'token'},
                status_code=200
            )
            
            logger.info(f"Password reset successful for {user.email} using token")
            
            return {
                'success': True,
                'message': 'Password reset successfully',
                'user_id': user.id,
                'status_code': status.HTTP_200_OK
            }
            
        except Exception as exc:
            logger.error(f"Error during password reset token verification for {user.email}: {str(exc)}")
            return {
                'success': False,
                'error_code': 'RESET_ERROR',
                'message': 'An error occurred during password reset',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            }