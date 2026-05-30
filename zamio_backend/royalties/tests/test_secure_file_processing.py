"""
Tests for secure royalty file processing functionality
"""
import os
import tempfile
import csv
from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from royalties.models import PartnerPRO
from royalties.services.file_security_service import RoyaltyFileSecurityService
from accounts.models import AuditLog

User = get_user_model()


class SecureFileProcessingTestCase(TestCase):
    """Test cases for secure financial file processing"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        
        self.partner = PartnerPRO.objects.create(
            user=self.user,
            company_name='Test PRO',
            display_name='Test PRO',
            pro_code='TEST',
            country_code='GH',
            contact_email='test@testpro.com'
        )
    
    def create_test_csv_file(self, content_rows):
        """Create a test CSV file with given content"""
        content = "isrc,title,work_title,duration_seconds\n"
        for row in content_rows:
            content += f"{row['isrc']},{row['title']},{row['work_title']},{row['duration_seconds']}\n"
        
        return SimpleUploadedFile(
            "test_repertoire.csv",
            content.encode('utf-8'),
            content_type="text/csv"
        )
    
    def test_validate_financial_file_success(self):
        """Test successful financial file validation"""
        test_data = [
            {'isrc': 'USRC17607839', 'title': 'Test Song', 'work_title': 'Test Work', 'duration_seconds': '180'},
            {'isrc': 'GBUM71505078', 'title': 'Another Song', 'work_title': 'Another Work', 'duration_seconds': '240'}
        ]
        
        test_file = self.create_test_csv_file(test_data)
        
        # Test validation
        result = RoyaltyFileSecurityService.validate_financial_file(test_file, 'repertoire')
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['file_category'], 'repertoire')
        self.assertEqual(result['file_type'], 'csv')
        self.assertIn('text/csv', result['content_type'])
    
    def test_validate_financial_file_malicious_content(self):
        """Test rejection of files with malicious content"""
        malicious_content = "isrc,title,work_title,duration_seconds\n"
        malicious_content += "USRC17607839,<script>alert('xss')</script>,Test Work,180\n"
        
        test_file = SimpleUploadedFile(
            "malicious.csv",
            malicious_content.encode('utf-8'),
            content_type="text/csv"
        )
        
        # Test validation should fail
        with self.assertRaises(ValidationError) as context:
            RoyaltyFileSecurityService.validate_financial_file(test_file, 'repertoire')
        
        self.assertIn('malicious content', str(context.exception))
    
    def test_validate_financial_file_invalid_size(self):
        """Test rejection of oversized files"""
        # Create a large content string
        large_content = "isrc,title,work_title,duration_seconds\n"
        large_content += "USRC17607839,Test Song,Test Work,180\n" * 100000  # Very large file
        
        test_file = SimpleUploadedFile(
            "large_file.csv",
            large_content.encode('utf-8'),
            content_type="text/csv"
        )
        
        # Test validation should fail for size
        with self.assertRaises(ValidationError) as context:
            RoyaltyFileSecurityService.validate_financial_file(test_file, 'repertoire')
        
        self.assertIn('exceeds maximum allowed size', str(context.exception))
    
    def test_validate_financial_file_missing_columns(self):
        """Test rejection of files with missing required columns"""
        # Create CSV without required columns
        content = "song_name,artist_name\n"
        content += "Test Song,Test Artist\n"
        
        test_file = SimpleUploadedFile(
            "invalid_columns.csv",
            content.encode('utf-8'),
            content_type="text/csv"
        )
        
        # Test validation should fail
        with self.assertRaises(ValidationError) as context:
            RoyaltyFileSecurityService.validate_financial_file(test_file, 'repertoire')
        
        self.assertIn('Missing required columns', str(context.exception))
    
    def test_calculate_file_hash(self):
        """Test file hash calculation"""
        test_content = "test content for hashing"
        test_file = SimpleUploadedFile(
            "test.txt",
            test_content.encode('utf-8'),
            content_type="text/plain"
        )
        
        hash_result = RoyaltyFileSecurityService.calculate_file_hash(test_file)
        
        # Verify hash is SHA-256 (64 characters)
        self.assertEqual(len(hash_result), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in hash_result))
    
    def test_malware_scan_safe_file(self):
        """Test malware scanning of safe file"""
        test_data = [
            {'isrc': 'USRC17607839', 'title': 'Test Song', 'work_title': 'Test Work', 'duration_seconds': '180'}
        ]
        
        test_file = self.create_test_csv_file(test_data)
        
        # Create temporary file for scanning
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            test_file.seek(0)
            temp_file.write(test_file.read())
            temp_file_path = temp_file.name
        
        try:
            scan_result = RoyaltyFileSecurityService.scan_financial_file_for_malware(temp_file_path)
            
            self.assertTrue(scan_result['is_safe'])
            self.assertEqual(len(scan_result['threats_found']), 0)
            self.assertEqual(scan_result['scan_details']['file_type'], 'CSV')
            self.assertTrue(scan_result['scan_details']['financial_validation'])
            
        finally:
            os.unlink(temp_file_path)
    
    def test_malware_scan_malicious_file(self):
        """Test malware scanning of malicious file"""
        malicious_content = b"isrc,title\nUSRC17607839,<script>alert('xss')</script>"
        
        # Create temporary file for scanning
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(malicious_content)
            temp_file_path = temp_file.name
        
        try:
            scan_result = RoyaltyFileSecurityService.scan_financial_file_for_malware(temp_file_path)
            
            self.assertFalse(scan_result['is_safe'])
            self.assertGreater(len(scan_result['threats_found']), 0)
            self.assertIn('script injection', scan_result['threats_found'][0])
            
        finally:
            os.unlink(temp_file_path)
    
    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_process_secure_financial_upload(self):
        """Test complete secure financial upload process"""
        test_data = [
            {'isrc': 'USRC17607839', 'title': 'Test Song', 'work_title': 'Test Work', 'duration_seconds': '180'},
            {'isrc': 'GBUM71505078', 'title': 'Another Song', 'work_title': 'Another Work', 'duration_seconds': '240'}
        ]
        
        test_file = self.create_test_csv_file(test_data)
        
        # Process the upload
        result = RoyaltyFileSecurityService.process_secure_financial_upload(
            user=self.user,
            partner_id=self.partner.id,
            file=test_file,
            file_category='repertoire',
            encrypt_storage=False,  # Disable encryption for testing
            process_async=False     # Process synchronously for testing
        )
        
        # Verify result
        self.assertIn('upload_id', result)
        self.assertEqual(result['partner_id'], self.partner.id)
        self.assertEqual(result['filename'], 'test_repertoire.csv')
        self.assertEqual(result['file_category'], 'repertoire')
        self.assertFalse(result['encrypted'])
        self.assertTrue(result['scan_result']['is_safe'])
        
        # Verify audit log was created
        audit_logs = AuditLog.objects.filter(
            user=self.user,
            action='financial_file_uploaded',
            resource_id=result['upload_id']
        )
        self.assertEqual(audit_logs.count(), 1)
        
        audit_log = audit_logs.first()
        self.assertEqual(audit_log.request_data['partner_id'], self.partner.id)
        self.assertEqual(audit_log.request_data['filename'], 'test_repertoire.csv')
    
    def test_detect_file_category(self):
        """Test automatic file category detection"""
        # Test repertoire detection
        repertoire_file = SimpleUploadedFile("catalog_data.csv", b"test", content_type="text/csv")
        category = RoyaltyFileSecurityService._detect_file_category(repertoire_file)
        self.assertEqual(category, 'repertoire')
        
        # Test usage report detection
        usage_file = SimpleUploadedFile("usage_report.csv", b"test", content_type="text/csv")
        category = RoyaltyFileSecurityService._detect_file_category(usage_file)
        self.assertEqual(category, 'usage_report')
        
        # Test royalty data detection
        royalty_file = SimpleUploadedFile("royalty_payments.csv", b"test", content_type="text/csv")
        category = RoyaltyFileSecurityService._detect_file_category(royalty_file)
        self.assertEqual(category, 'royalty_data')
        
        # Test partner data detection
        partner_file = SimpleUploadedFile("partner_info.csv", b"test", content_type="text/csv")
        category = RoyaltyFileSecurityService._detect_file_category(partner_file)
        self.assertEqual(category, 'partner_data')
        
        # Test default detection
        unknown_file = SimpleUploadedFile("unknown.csv", b"test", content_type="text/csv")
        category = RoyaltyFileSecurityService._detect_file_category(unknown_file)
        self.assertEqual(category, 'repertoire')  # Default
    
    def test_financial_integrity_scan(self):
        """Test financial data integrity scanning"""
        # Test with suspicious patterns
        suspicious_content = b"isrc,gross_amount\nUSRC17607839,999999999.99\nGBUM71505078,null"
        
        scan_result = {'threats_found': [], 'scan_details': {'data_integrity_check': True}}
        RoyaltyFileSecurityService._perform_financial_integrity_scan(suspicious_content, scan_result)
        
        # Should detect suspicious patterns
        self.assertGreater(len(scan_result['threats_found']), 0)
        self.assertFalse(scan_result['scan_details']['data_integrity_check'])
        
        # Check for specific threats
        threat_messages = ' '.join(scan_result['threats_found'])
        self.assertIn('large amount pattern', threat_messages)
        self.assertIn('Null value', threat_messages)