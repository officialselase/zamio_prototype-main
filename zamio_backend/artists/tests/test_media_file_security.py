"""
Unit tests for enhanced media file security system
"""
import os
import tempfile
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model
from artists.models import Track, Album, Artist, Genre
from artists.services.media_file_service import MediaFileService
from artists.services.media_access_service import MediaAccessService

User = get_user_model()


class MediaFileValidationTestCase(TestCase):
    """Test media file validation functions"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="artist@example.com",
            first_name="Test",
            last_name="Artist",
            password="testpass123"
        )
        self.artist = Artist.objects.create(
            user=self.user,
            stage_name="Test Artist",
            bio="Test bio"
        )
        self.genre = Genre.objects.create(name="Test Genre", color="#FF0000")
    
    def test_valid_audio_file(self):
        """Test that valid audio files pass validation"""
        # Create a mock MP3 file with ID3 header
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'\x00' * 1000
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")
        
        result = MediaFileService.validate_media_file(audio_file, 'audio')
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['file_type'], 'audio')
        self.assertEqual(result['content_type'], 'audio/mpeg')
    
    def test_valid_image_file(self):
        """Test that valid image files pass validation"""
        # Create a minimal JPEG file
        jpeg_content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00' + b'\x00' * 100 + b'\xff\xd9'
        image_file = SimpleUploadedFile("test.jpg", jpeg_content, content_type="image/jpeg")
        
        result = MediaFileService.validate_media_file(image_file, 'image')
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['file_type'], 'image')
        self.assertEqual(result['content_type'], 'image/jpeg')
    
    def test_oversized_audio_file_rejection(self):
        """Test that oversized audio files are rejected"""
        large_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'x' * (101 * 1024 * 1024)  # 101MB
        large_file = SimpleUploadedFile("large.mp3", large_content, content_type="audio/mpeg")
        
        with self.assertRaises(ValidationError):
            MediaFileService.validate_media_file(large_file, 'audio')
    
    def test_dangerous_file_type_rejection(self):
        """Test that dangerous file types are rejected"""
        exe_content = b'MZ\x90\x00' + b'\x00' * 100
        exe_file = SimpleUploadedFile("malware.exe", exe_content, content_type="application/octet-stream")
        
        with self.assertRaises(ValidationError):
            MediaFileService.validate_media_file(exe_file, 'audio')
    
    def test_malicious_content_detection(self):
        """Test that files with malicious content are rejected"""
        malicious_content = b'ID3\x03\x00\x00\x00\x00\x00\x00<script>alert("xss")</script>' + b'\x00' * 100
        malicious_file = SimpleUploadedFile("malicious.mp3", malicious_content, content_type="audio/mpeg")
        
        with self.assertRaises(ValidationError):
            MediaFileService.validate_media_file(malicious_file, 'audio')


class MediaFileServiceTestCase(TestCase):
    """Test MediaFileService functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="artist@example.com",
            first_name="Test",
            last_name="Artist",
            password="testpass123"
        )
        self.artist = Artist.objects.create(
            user=self.user,
            stage_name="Test Artist",
            bio="Test bio"
        )
        self.genre = Genre.objects.create(name="Test Genre", color="#FF0000")
    
    def test_file_hash_calculation(self):
        """Test file hash calculation"""
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'test content'
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")
        
        hash1 = MediaFileService.calculate_file_hash(audio_file)
        hash2 = MediaFileService.calculate_file_hash(audio_file)
        
        self.assertEqual(hash1, hash2)  # Same file should produce same hash
        self.assertEqual(len(hash1), 64)  # SHA-256 produces 64-character hex string
    
    def test_track_upload_processing(self):
        """Test track upload processing"""
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'test audio content' * 100
        audio_file = SimpleUploadedFile("test_track.mp3", audio_content, content_type="audio/mpeg")
        
        track_data = {
            'title': 'Test Track',
            'genre_id': self.genre.id,
            'explicit': False
        }
        
        result = MediaFileService.process_track_upload(
            user=self.user,
            track_data=track_data,
            audio_file=audio_file,
            process_async=False  # Process synchronously for testing
        )
        
        self.assertIn('track_id', result)
        self.assertEqual(result['processing_status'], 'completed')
        self.assertIsNotNone(result['audio_hash'])
        
        # Verify track was created
        track = Track.objects.get(id=result['track_id'])
        self.assertEqual(track.title, 'Test Track')
        self.assertEqual(track.artist, self.artist)
        self.assertEqual(track.processing_status, 'completed')
        self.assertIsNotNone(track.audio_file_hash)
    
    def test_duplicate_file_rejection(self):
        """Test that duplicate files are rejected"""
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'unique content'
        audio_file1 = SimpleUploadedFile("track1.mp3", audio_content, content_type="audio/mpeg")
        audio_file2 = SimpleUploadedFile("track2.mp3", audio_content, content_type="audio/mpeg")
        
        track_data = {'title': 'Test Track', 'explicit': False}
        
        # First upload should succeed
        MediaFileService.process_track_upload(
            user=self.user,
            track_data=track_data,
            audio_file=audio_file1,
            process_async=False
        )
        
        # Second upload of same content should fail
        with self.assertRaises(ValidationError):
            MediaFileService.process_track_upload(
                user=self.user,
                track_data=track_data,
                audio_file=audio_file2,
                process_async=False
            )
    
    def test_malware_scanning(self):
        """Test malware scanning functionality"""
        # Create a temporary file for testing
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'clean content')
            temp_file_path = temp_file.name
        
        try:
            scan_result = MediaFileService.scan_media_file_for_malware(temp_file_path)
            
            self.assertTrue(scan_result['is_safe'])
            self.assertEqual(len(scan_result['threats_found']), 0)
            self.assertIn('scan_time', scan_result)
        finally:
            os.unlink(temp_file_path)
    
    def test_malware_detection(self):
        """Test malware detection in files"""
        # Create a temporary file with malicious content
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b'<script>alert("malicious")</script>' + b'some content')
            temp_file_path = temp_file.name
        
        try:
            scan_result = MediaFileService.scan_media_file_for_malware(temp_file_path)
            
            self.assertFalse(scan_result['is_safe'])
            self.assertGreater(len(scan_result['threats_found']), 0)
        finally:
            os.unlink(temp_file_path)


class MediaAccessServiceTestCase(TestCase):
    """Test MediaAccessService functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="artist@example.com",
            first_name="Test",
            last_name="Artist",
            password="testpass123"
        )
        self.artist = Artist.objects.create(
            user=self.user,
            stage_name="Test Artist",
            bio="Test bio"
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            password="otherpass123"
        )
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            password="adminpass123",
            is_staff=True
        )
        
        # Create a test track
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'test content'
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")
        
        self.track = Track.objects.create(
            artist=self.artist,
            title="Test Track",
            audio_file=audio_file,
            status="Approved",
            processing_status="completed",
            active=True
        )
    
    def test_secure_token_generation_and_verification(self):
        """Test secure token generation and verification"""
        resource_type = 'track'
        resource_id = self.track.id
        user_id = self.user.id
        
        # Generate token
        token = MediaAccessService.generate_secure_token(resource_type, resource_id, user_id)
        self.assertIsInstance(token, str)
        self.assertIn('.', token)  # Should contain timestamp.signature format
        
        # Verify valid token
        is_valid = MediaAccessService.verify_secure_token(token, resource_type, resource_id, user_id)
        self.assertTrue(is_valid)
        
        # Verify invalid token
        is_invalid = MediaAccessService.verify_secure_token("invalid.token", resource_type, resource_id, user_id)
        self.assertFalse(is_invalid)
        
        # Verify token with wrong resource_id
        is_wrong = MediaAccessService.verify_secure_token(token, resource_type, 999, user_id)
        self.assertFalse(is_wrong)
    
    def test_media_access_permissions(self):
        """Test media access permission checking"""
        # Owner should have access
        has_access = MediaAccessService.check_media_access_permission(self.user, 'track', self.track.id)
        self.assertTrue(has_access)
        
        # Admin should have access
        admin_access = MediaAccessService.check_media_access_permission(self.admin_user, 'track', self.track.id)
        self.assertTrue(admin_access)
        
        # Public should have access to approved, active tracks
        public_access = MediaAccessService.check_media_access_permission(self.other_user, 'track', self.track.id)
        self.assertTrue(public_access)
        
        # Test quarantined track access
        self.track.is_quarantined = True
        self.track.save()
        
        # Owner should still have access
        owner_access = MediaAccessService.check_media_access_permission(self.user, 'track', self.track.id)
        self.assertTrue(owner_access)
        
        # Public should not have access to quarantined tracks
        public_quarantine_access = MediaAccessService.check_media_access_permission(self.other_user, 'track', self.track.id)
        self.assertFalse(public_quarantine_access)
    
    def test_secure_media_url_generation(self):
        """Test secure media URL generation"""
        url_info = MediaAccessService.get_secure_media_url(
            user=self.user,
            resource_type='track',
            resource_id=self.track.id,
            file_type='audio'
        )
        
        self.assertIn('media_url', url_info)
        self.assertIn('token', url_info)
        self.assertIn('expires_in', url_info)
        self.assertEqual(url_info['resource_type'], 'track')
        self.assertEqual(url_info['resource_id'], self.track.id)
        self.assertEqual(url_info['file_type'], 'audio')
    
    def test_public_media_url_generation(self):
        """Test public media URL generation"""
        # Should return URL for approved, active track
        public_url = MediaAccessService.get_public_media_url('track', self.track.id, 'audio')
        self.assertIsNotNone(public_url)
        self.assertIn('public', public_url)
        
        # Should return None for quarantined track
        self.track.is_quarantined = True
        self.track.save()
        
        quarantine_url = MediaAccessService.get_public_media_url('track', self.track.id, 'audio')
        self.assertIsNone(quarantine_url)


class TrackModelTestCase(TestCase):
    """Test enhanced Track model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="artist@example.com",
            first_name="Test",
            last_name="Artist",
            password="testpass123"
        )
        self.artist = Artist.objects.create(
            user=self.user,
            stage_name="Test Artist",
            bio="Test bio"
        )
    
    def test_track_creation_with_hashing(self):
        """Test track creation with automatic file hashing"""
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'test content'
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")
        
        track = Track.objects.create(
            artist=self.artist,
            title="Test Track",
            audio_file=audio_file
        )
        
        self.assertIsNotNone(track.audio_file_hash)
        self.assertEqual(len(track.audio_file_hash), 64)  # SHA-256 hash length
    
    def test_file_integrity_verification(self):
        """Test file integrity verification"""
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'test content'
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")
        
        track = Track.objects.create(
            artist=self.artist,
            title="Test Track",
            audio_file=audio_file
        )
        
        # File integrity should pass for newly created track
        integrity_check = track.verify_audio_integrity()
        self.assertTrue(integrity_check)
    
    def test_can_be_published_with_security_checks(self):
        """Test that security checks are included in publication readiness"""
        audio_content = b'ID3\x03\x00\x00\x00\x00\x00\x00' + b'test content'
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")
        
        track = Track.objects.create(
            artist=self.artist,
            title="Test Track",
            audio_file=audio_file,
            processing_status='completed'
        )
        
        # Should be publishable when not quarantined and processing complete
        self.assertTrue(track.can_be_published())
        
        # Should not be publishable when quarantined
        track.is_quarantined = True
        track.save()
        self.assertFalse(track.can_be_published())
        
        # Should not be publishable when processing incomplete
        track.is_quarantined = False
        track.processing_status = 'pending'
        track.save()
        self.assertFalse(track.can_be_published())