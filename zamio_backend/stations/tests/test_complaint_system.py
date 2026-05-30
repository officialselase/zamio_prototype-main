import json
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from ..models import Station, Complaint, ComplaintUpdate
from ..tasks import (
    send_complaint_notification,
    auto_escalate_old_complaints,
    send_complaint_reminders,
    cleanup_old_complaint_updates,
    generate_complaint_analytics,
    auto_assign_complaints
)

User = get_user_model()


class ComplaintModelTest(TestCase):
    """Test the Complaint model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        self.user.user_type = 'Artist'
        self.user.save()
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            password='adminpass123'
        )
        self.admin_user.user_type = 'Admin'
        self.admin_user.save()
        
        self.station = Station.objects.create(
            name='Test Station',
            user=self.user,
            phone='1234567890',
            city='Test City',
            region='Test Region',
            country='Test Country'
        )

    def test_complaint_creation(self):
        """Test complaint model creation and auto-generated fields"""
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Test Complaint',
            description='This is a test complaint',
            complaint_type='technical',
            priority='medium'
        )
        
        self.assertIsNotNone(complaint.complaint_id)
        self.assertTrue(complaint.complaint_id.startswith('COMP-'))
        self.assertEqual(complaint.status, 'open')
        self.assertFalse(complaint.is_archived)
        self.assertEqual(str(complaint), f"{complaint.complaint_id} - Test Complaint")
    
    def test_complaint_status_colors(self):
        """Test complaint status and priority color methods"""
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Test Complaint',
            description='Test description',
            status='investigating',
            priority='high'
        )
        
        self.assertEqual(complaint.get_status_display_color(), 'text-yellow-600')
        self.assertEqual(complaint.get_priority_display_color(), 'text-orange-600')


class ComplaintAPITest(TestCase):
    """Test the Complaint API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        self.user.user_type = 'Artist'
        self.user.save()
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            password='adminpass123'
        )
        self.admin_user.user_type = 'Admin'
        self.admin_user.save()
        
        self.station = Station.objects.create(
            name='Test Station',
            user=self.user,
            phone='1234567890',
            city='Test City',
            region='Test Region',
            country='Test Country'
        )
    
    def test_create_complaint_authenticated(self):
        """Test creating a complaint with authenticated user"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'station': self.station.id,
            'subject': 'API Test Complaint',
            'description': 'This is a test complaint via API',
            'complaint_type': 'technical',
            'priority': 'medium',
            'contact_email': 'test@example.com'
        }
        
        with patch('stations.tasks.send_complaint_notification.delay') as mock_task:
            response = self.client.post('/api/stations/create-complaint/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Complaint created successfully')
        self.assertIn('data', response.data)
        
        # Verify complaint was created
        complaint = Complaint.objects.get(subject='API Test Complaint')
        self.assertEqual(complaint.complainant, self.user)
        self.assertEqual(complaint.station, self.station)
        
        # Verify notification task was called
        mock_task.assert_called_once()
    
    def test_create_complaint_unauthenticated(self):
        """Test creating a complaint without authentication"""
        data = {
            'station': self.station.id,
            'subject': 'Unauthenticated Test',
            'description': 'This should fail',
        }
        
        response = self.client.post('/api/stations/create-complaint/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_complaints_list(self):
        """Test retrieving complaints list with filtering"""
        self.client.force_authenticate(user=self.user)
        
        # Create test complaints
        complaint1 = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='First Complaint',
            description='First test complaint',
            complaint_type='technical',
            priority='high'
        )
        complaint2 = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Second Complaint',
            description='Second test complaint',
            complaint_type='billing',
            priority='low'
        )
        
        # Test basic list retrieval
        response = self.client.get('/api/stations/get-complaints-list/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['complaints']), 2)
        
        # Test filtering by status
        response = self.client.get('/api/stations/get-complaints-list/?status=open')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['complaints']), 2)
        
        # Test filtering by complaint type
        response = self.client.get('/api/stations/get-complaints-list/?complaint_type=technical')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['complaints']), 1)
        self.assertEqual(response.data['data']['complaints'][0]['subject'], 'First Complaint')
    
    def test_get_complaint_details(self):
        """Test retrieving detailed complaint information"""
        self.client.force_authenticate(user=self.user)
        
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Detail Test Complaint',
            description='Test complaint for details',
            complaint_type='service',
            priority='medium'
        )
        
        # Add an update
        ComplaintUpdate.objects.create(
            complaint=complaint,
            user=self.user,
            update_type='comment',
            message='Test update message'
        )
        
        response = self.client.get(f'/api/stations/get-complaint-details/?complaint_id={complaint.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['subject'], 'Detail Test Complaint')
        self.assertEqual(len(response.data['data']['updates']), 1)
    
    def test_update_complaint_status(self):
        """Test updating complaint status"""
        self.client.force_authenticate(user=self.admin_user)
        
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Status Update Test',
            description='Test complaint for status update',
        )
        
        data = {
            'complaint_id': complaint.id,
            'status': 'investigating',
            'assigned_to': self.admin_user.id
        }
        
        with patch('stations.tasks.send_complaint_notification.delay') as mock_task:
            response = self.client.post('/api/stations/update-complaint-status/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Complaint status updated successfully')
        
        # Verify status was updated
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'investigating')
        self.assertEqual(complaint.assigned_to, self.admin_user)
        
        # Verify notification task was called
        mock_task.assert_called_once()
    
    def test_add_complaint_update(self):
        """Test adding updates to complaints"""
        self.client.force_authenticate(user=self.user)
        
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Update Test Complaint',
            description='Test complaint for updates',
        )
        
        data = {
            'complaint_id': complaint.id,
            'message': 'This is a test update',
            'update_type': 'comment'
        }
        
        with patch('stations.tasks.send_complaint_notification.delay') as mock_task:
            response = self.client.post('/api/stations/add-complaint-update/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Update added successfully')
        
        # Verify update was created
        update = ComplaintUpdate.objects.get(complaint=complaint)
        self.assertEqual(update.message, 'This is a test update')
        self.assertEqual(update.user, self.user)
        
        # Verify notification task was called
        mock_task.assert_called_once()
    
    def test_assign_complaint(self):
        """Test assigning complaints to users"""
        self.client.force_authenticate(user=self.admin_user)
        
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Assignment Test',
            description='Test complaint for assignment',
        )
        
        data = {
            'complaint_id': complaint.id,
            'assigned_to': self.admin_user.id
        }
        
        with patch('stations.tasks.send_complaint_notification.delay') as mock_task:
            response = self.client.post('/api/stations/assign-complaint/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Complaint assigned successfully')
        
        # Verify assignment
        complaint.refresh_from_db()
        self.assertEqual(complaint.assigned_to, self.admin_user)
        
        # Verify notification task was called
        mock_task.assert_called_once()
    
    def test_get_complaint_statistics(self):
        """Test retrieving complaint statistics"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create test complaints with different statuses
        Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Open Complaint',
            description='Open complaint',
            status='open'
        )
        Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Resolved Complaint',
            description='Resolved complaint',
            status='resolved'
        )
        
        response = self.client.get('/api/stations/get-complaint-statistics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['total_complaints'], 2)
        self.assertIn('status_distribution', data)
        self.assertIn('type_distribution', data)
        self.assertIn('priority_distribution', data)


class ComplaintTaskTest(TestCase):
    """Test Celery tasks for complaint management"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        self.user.user_type = 'Artist'
        self.user.save()
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            password='adminpass123'
        )
        self.admin_user.user_type = 'Admin'
        self.admin_user.save()
        
        self.station = Station.objects.create(
            name='Test Station',
            user=self.user,
            phone='1234567890',
            city='Test City',
            region='Test Region',
            country='Test Country'
        )
    
    @patch('stations.tasks.send_mail')
    @patch('notifications.models.Notification.objects.create')
    def test_send_complaint_notification(self, mock_notification, mock_send_mail):
        """Test sending complaint notifications"""
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Notification Test',
            description='Test complaint for notifications',
        )
        
        result = send_complaint_notification(
            complaint_id=complaint.id,
            notification_type='created',
            recipient_type='admin'
        )
        
        self.assertIn('Created', result)
        mock_notification.assert_called()
        mock_send_mail.assert_called()
    
    def test_auto_escalate_old_complaints(self):
        """Test automatic escalation of old complaints"""
        # Create an old complaint
        old_date = timezone.now() - timedelta(days=8)
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Old Complaint',
            description='This complaint is old',
            priority='low'
        )
        complaint.created_at = old_date
        complaint.save()
        
        result = auto_escalate_old_complaints()
        
        complaint.refresh_from_db()
        self.assertEqual(complaint.priority, 'high')
        self.assertIn('Auto-escalated 1 complaints', result)
    
    @patch('stations.tasks.send_mail')
    @patch('notifications.models.Notification.objects.create')
    def test_send_complaint_reminders(self, mock_notification, mock_send_mail):
        """Test sending complaint reminders"""
        # Create a stale assigned complaint
        old_date = timezone.now() - timedelta(days=4)
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Stale Complaint',
            description='This complaint needs attention',
            assigned_to=self.admin_user,
            status='investigating'
        )
        # Update both created_at and updated_at to make it stale
        Complaint.objects.filter(id=complaint.id).update(
            created_at=old_date,
            updated_at=old_date
        )
        
        result = send_complaint_reminders()
        
        self.assertIn('Sent 1 complaint reminders', result)
        mock_notification.assert_called()
        mock_send_mail.assert_called()
    
    def test_cleanup_old_complaint_updates(self):
        """Test cleanup of old complaint updates"""
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Cleanup Test',
            description='Test complaint for cleanup',
        )
        
        # Create many old updates
        old_date = timezone.now() - timedelta(days=400)
        for i in range(60):  # More than the 50 limit
            update = ComplaintUpdate.objects.create(
                complaint=complaint,
                user=self.user,
                update_type='comment',
                message=f'Old update {i}'
            )
            update.created_at = old_date
            update.save()
        
        result = cleanup_old_complaint_updates()
        
        # Should keep only 50 most recent updates
        remaining_updates = ComplaintUpdate.objects.filter(complaint=complaint).count()
        self.assertLessEqual(remaining_updates, 50)
        self.assertIn('Cleaned up', result)
    
    @patch('django.core.cache.cache.set')
    def test_generate_complaint_analytics(self, mock_cache_set):
        """Test generating complaint analytics"""
        # Create test data
        Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Analytics Test 1',
            description='Test complaint 1',
            status='open',
            complaint_type='technical',
            priority='high'
        )
        Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Analytics Test 2',
            description='Test complaint 2',
            status='resolved',
            complaint_type='billing',
            priority='medium'
        )
        
        result = generate_complaint_analytics()
        
        self.assertEqual(result, 'Analytics data generated and cached')
        mock_cache_set.assert_called_once()
    
    def test_auto_assign_complaints(self):
        """Test automatic assignment of unassigned complaints"""
        # Create an old unassigned complaint
        old_date = timezone.now() - timedelta(hours=3)
        complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Unassigned Complaint',
            description='This complaint needs assignment',
            status='open'
        )
        complaint.created_at = old_date
        complaint.save()
        
        result = auto_assign_complaints()
        
        complaint.refresh_from_db()
        self.assertIsNotNone(complaint.assigned_to)
        self.assertIn('Auto-assigned 1 complaints', result)


class ComplaintUpdateModelTest(TestCase):
    """Test the ComplaintUpdate model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        self.user.user_type = 'Artist'
        self.user.save()
        
        self.station = Station.objects.create(
            name='Test Station',
            user=self.user,
            phone='1234567890',
            city='Test City',
            region='Test Region',
            country='Test Country'
        )
        self.complaint = Complaint.objects.create(
            station=self.station,
            complainant=self.user,
            subject='Update Test Complaint',
            description='Test complaint for updates',
        )
    
    def test_complaint_update_creation(self):
        """Test creating complaint updates"""
        update = ComplaintUpdate.objects.create(
            complaint=self.complaint,
            user=self.user,
            update_type='comment',
            message='This is a test update'
        )
        
        self.assertEqual(update.complaint, self.complaint)
        self.assertEqual(update.user, self.user)
        self.assertEqual(update.update_type, 'comment')
        self.assertEqual(update.message, 'This is a test update')
        self.assertEqual(str(update), f"{self.complaint.complaint_id} - comment by {self.user.username}")
    
    def test_status_change_update(self):
        """Test status change updates"""
        update = ComplaintUpdate.objects.create(
            complaint=self.complaint,
            user=self.user,
            update_type='status_change',
            message='Status changed from open to investigating',
            old_status='open',
            new_status='investigating'
        )
        
        self.assertEqual(update.update_type, 'status_change')
        self.assertEqual(update.old_status, 'open')
        self.assertEqual(update.new_status, 'investigating')