"""
Test cases for Station Stream URL Management functionality
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from stations.models import Station, validate_stream_url, test_stream_connectivity

User = get_user_model()


class StreamURLTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='teststation',
            email='test@station.com',
            password='testpass123'
        )
        
        self.station = Station.objects.create(
            user=self.user,
            name='Test Radio Station',
            city='Test City',
            country='Test Country'
        )

    def test_validate_stream_url_valid_http(self):
        """Test validation of valid HTTP stream URL"""
        url = 'http://stream.example.com:8000/live'
        try:
            validate_stream_url(url)
        except ValidationError:
            self.fail("validate_stream_url raised ValidationError for valid HTTP URL")

    def test_validate_stream_url_valid_https(self):
        """Test validation of valid HTTPS stream URL"""
        url = 'https://stream.example.com/live'
        try:
            validate_stream_url(url)
        except ValidationError:
            self.fail("validate_stream_url raised ValidationError for valid HTTPS URL")

    def test_validate_stream_url_invalid_protocol(self):
        """Test validation rejects invalid protocols"""
        url = 'ftp://stream.example.com/live'
        with self.assertRaises(ValidationError):
            validate_stream_url(url)

    def test_validate_stream_url_malformed(self):
        """Test validation rejects malformed URLs"""
        url = 'not-a-url'
        with self.assertRaises(ValidationError):
            validate_stream_url(url)

    def test_validate_stream_url_empty(self):
        """Test validation allows empty URLs"""
        try:
            validate_stream_url('')
            validate_stream_url(None)
        except ValidationError:
            self.fail("validate_stream_url should allow empty URLs")

    def test_station_stream_url_field(self):
        """Test setting stream URL on station model"""
        test_url = 'https://stream.example.com/live'
        self.station.stream_url = test_url
        self.station.save()
        
        # Reload from database
        station = Station.objects.get(id=self.station.id)
        self.assertEqual(station.stream_url, test_url)
        self.assertEqual(station.stream_status, 'inactive')  # Default status

    def test_station_test_stream_url_no_url(self):
        """Test stream URL testing with no URL set"""
        is_accessible, message = self.station.test_stream_url()
        self.assertFalse(is_accessible)
        self.assertEqual(message, 'No stream URL provided')
        self.assertEqual(self.station.stream_status, 'inactive')

    def test_station_test_stream_url_invalid_url(self):
        """Test stream URL testing with invalid URL"""
        self.station.stream_url = 'not-a-url'
        is_accessible, message = self.station.test_stream_url()
        self.assertFalse(is_accessible)
        self.assertIn('Invalid URL format', message)
        self.assertEqual(self.station.stream_status, 'error')

    def test_stream_connectivity_invalid_url(self):
        """Test stream connectivity check with invalid URL"""
        is_accessible, message = test_stream_connectivity('not-a-url')
        self.assertFalse(is_accessible)
        self.assertIn('Could not connect', message)

    def test_stream_connectivity_no_url(self):
        """Test stream connectivity check with no URL"""
        is_accessible, message = test_stream_connectivity('')
        self.assertFalse(is_accessible)
        self.assertEqual(message, 'No URL provided')

    def test_station_get_stream_status_display(self):
        """Test stream status display method"""
        self.station.stream_status = 'active'
        self.assertEqual(self.station.get_stream_status_display(), 'Active')
        
        self.station.stream_status = 'error'
        self.assertEqual(self.station.get_stream_status_display(), 'Error')
        
        self.station.stream_status = 'testing'
        self.assertEqual(self.station.get_stream_status_display(), 'Testing')

    def test_station_clean_method(self):
        """Test station model clean method validates stream URL"""
        self.station.stream_url = 'invalid-url'
        with self.assertRaises(ValidationError):
            self.station.clean()
        
        self.station.stream_url = 'https://valid.example.com/stream'
        try:
            self.station.clean()
        except ValidationError:
            self.fail("Station.clean() raised ValidationError for valid stream URL")