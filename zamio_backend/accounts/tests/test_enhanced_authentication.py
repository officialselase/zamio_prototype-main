"""
Test cases for enhanced authentication and session management
"""

import uuid
from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from accounts.models import AuditLog
from accounts.api.enhanced_auth import SecurityEventHandler, SessionSecurityValidator
from artists.models import Artist

User = get_user_model()


class EnhancedLogoutTestCase(APITestCase):
    """Test cases for enhanced logout functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='Artist'
        )
        self.artist = Artist.objects.create(
            user=self.user,
            stage_name='Test Artist'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
    
    def test_successful_logout(self):
        """Test successful logout with session cleanup"""
        url = reverse('accounts:enhanced_logout')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Successful')
        
        # Check that token was deleted
        self.assertFalse(Token.objects.filter(user=self.user).exists())
        
        # Check audit log was created
        audit_log = AuditLog.objects.filter(
            user=self.user,
            action='logout_success'
        ).first()
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.status_code, 200)
    
    def test_logout_with_jwt_token(self):
        """Test logout with JWT token blacklisting"""
        url = reverse('accounts:enhanced_logout')
        response = self.client.post(url, {
            'refresh_token': 'fake_jwt_token'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should still succeed even if JWT blacklisting fails
        self.assertTrue(response.data['data']['session_cleanup']['token_invalidated'])
    
    def test_logout_inactive_user(self):
        """Test logout attempt by inactive user"""
        self.user.is_active = False
        self.user.save()
        
        url = reverse('accounts:enhanced_logout')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Account is deactivated', str(response.data['errors']))


class InvalidateAllSessionsTestCase(APITestCase):
    """Test cases for invalidating all user sessions"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='Artist'
        )
        # Create multiple tokens to simulate multiple sessions
        self.token1 = Token.objects.create(user=self.user)
        self.token2 = Token.objects.create(user=self.user, key='different_key_123')
        
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token1.key)
    
    def test_invalidate_all_sessions(self):
        """Test invalidating all user sessions"""
        url = reverse('accounts:invalidate_all_sessions')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Successful')
        
        # Check that all tokens were deleted
        self.assertEqual(Token.objects.filter(user=self.user).count(), 0)
        
        # Check audit log
        audit_log = AuditLog.objects.filter(
            user=self.user,
            action='invalidate_all_sessions'
        ).first()
        self.assertIsNotNone(audit_log)


class SessionStatusTestCase(APITestCase):
    """Test cases for session status endpoint"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='Artist'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
    
    def test_get_session_status(self):
        """Test retrieving session status"""
        url = reverse('accounts:session_status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Successful')
        
        data = response.data['data']
        self.assertEqual(data['email'], self.user.email)
        self.assertEqual(data['user_type'], self.user.user_type)
        self.assertTrue(data['session_valid'])
        self.assertEqual(data['active_token_sessions'], 1)


class SecurityEventHandlerTestCase(TestCase):
    """Test cases for security event handling"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_handle_failed_login(self):
        """Test failed login handling with rate limiting"""
        ip_address = '192.168.1.1'
        user_agent = 'Test Browser'
        
        # First failed attempt
        result = SecurityEventHandler.handle_failed_login(
            user_email=self.user.email,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 1)
        self.assertFalse(result['account_locked'])
        
        # Simulate 5 failed attempts to trigger lock
        for i in range(4):
            SecurityEventHandler.handle_failed_login(
                user_email=self.user.email,
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 5)
        self.assertIsNotNone(self.user.account_locked_until)
        
        # Check audit log for account lock
        audit_log = AuditLog.objects.filter(
            user=self.user,
            action='account_locked'
        ).first()
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.status_code, 423)
    
    def test_handle_successful_login(self):
        """Test successful login handling"""
        # Set up user with failed attempts
        self.user.failed_login_attempts = 3
        self.user.account_locked_until = timezone.now() + timedelta(minutes=30)
        self.user.save()
        
        ip_address = '192.168.1.1'
        user_agent = 'Test Browser'
        
        SecurityEventHandler.handle_successful_login(
            user=self.user,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.account_locked_until)
        
        # Check audit log
        audit_log = AuditLog.objects.filter(
            user=self.user,
            action='login_success'
        ).first()
        self.assertIsNotNone(audit_log)
    
    def test_handle_nonexistent_user_login(self):
        """Test failed login for non-existent user"""
        result = SecurityEventHandler.handle_failed_login(
            user_email='nonexistent@example.com',
            ip_address='192.168.1.1',
            user_agent='Test Browser'
        )
        
        self.assertFalse(result['account_locked'])
        self.assertEqual(result['failed_attempts'], 0)
        
        # Check audit log was still created
        audit_log = AuditLog.objects.filter(
            user=None,
            action='login_failed'
        ).first()
        self.assertIsNotNone(audit_log)


class SessionSecurityValidatorTestCase(TestCase):
    """Test cases for session security validation"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create a mock request object
        class MockRequest:
            def __init__(self, ip='192.168.1.1', user_agent='Test Browser'):
                self.META = {
                    'REMOTE_ADDR': ip,
                    'HTTP_USER_AGENT': user_agent
                }
        
        self.mock_request = MockRequest()
    
    def test_validate_session_integrity_no_anomalies(self):
        """Test session validation with no anomalies"""
        # Create recent login log
        AuditLog.objects.create(
            user=self.user,
            action='login_success',
            ip_address='192.168.1.1',
            user_agent='Test Browser',
            timestamp=timezone.now() - timedelta(hours=1)
        )
        
        result = SessionSecurityValidator.validate_session_integrity(
            user=self.user,
            request=self.mock_request
        )
        
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['anomalies']), 0)
        self.assertEqual(result['risk_score'], 0)
    
    def test_validate_session_integrity_with_ip_change(self):
        """Test session validation with IP address change"""
        # Create recent login log with different IP
        AuditLog.objects.create(
            user=self.user,
            action='login_success',
            ip_address='10.0.0.1',  # Different IP
            user_agent='Test Browser',
            timestamp=timezone.now() - timedelta(hours=1)
        )
        
        result = SessionSecurityValidator.validate_session_integrity(
            user=self.user,
            request=self.mock_request
        )
        
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['anomalies']), 1)
        self.assertEqual(result['anomalies'][0]['type'], 'ip_change')
        self.assertEqual(result['risk_score'], 1)
        
        # Check that suspicious activity was logged
        suspicious_log = AuditLog.objects.filter(
            user=self.user,
            action='suspicious_activity'
        ).first()
        self.assertIsNotNone(suspicious_log)


class AuthenticationAuditLogsTestCase(APITestCase):
    """Test cases for authentication audit logs endpoint"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        
        # Create some audit logs
        for i in range(5):
            AuditLog.objects.create(
                user=self.user,
                action='login_success',
                resource_type='authentication',
                ip_address='192.168.1.1',
                status_code=200,
                timestamp=timezone.now() - timedelta(hours=i)
            )
    
    def test_get_authentication_audit_logs(self):
        """Test retrieving authentication audit logs"""
        url = reverse('accounts:auth_audit_logs')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Successful')
        
        data = response.data['data']
        self.assertEqual(len(data['logs']), 5)
        self.assertEqual(data['pagination']['total_count'], 5)
        
        # Check log format
        log = data['logs'][0]
        self.assertIn('action', log)
        self.assertIn('timestamp', log)
        self.assertIn('ip_address', log)
        self.assertIn('success', log)
    
    def test_get_audit_logs_with_pagination(self):
        """Test audit logs with pagination"""
        url = reverse('accounts:auth_audit_logs')
        response = self.client.get(url, {'page': 1, 'per_page': 2})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(len(data['logs']), 2)
        self.assertEqual(data['pagination']['per_page'], 2)
        self.assertTrue(data['pagination']['has_next'])
        self.assertFalse(data['pagination']['has_previous'])