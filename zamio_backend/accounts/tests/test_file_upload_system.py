"""
Tests for the enhanced file upload system
"""
import os
import tempfile
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model
from django.http import Http404
from accounts.models import KYCDocument
from accounts.services.file_upload_service import FileUploadService
from accounts.services.file_access_service import FileAccessService

User = get_user_model()


class FileUploadSystemTest(TestCase):
    """Test cases for the file upload system"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            password='adminpass123',
            is_staff=True
        )
    
    def create_test_file(self, filename='test.pdf', content=b'%PDF-1.4 test content', content_type='application/pdf'):
        """Create a test file for upload"""
        return SimpleUploadedFile(filename, content, content_type=content_type)
    
    def test_valid_file_upload(self):
        """Test uploading a valid KYC document"""
        test_file = self.create_test_file()
        
        document = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file
        )
        
        self.assertIsInstance(document, KYCDocument)
        self.assertEqual(document.user, self.user)
        self.assertEqual(document.document_type, 'id_card')
        self.assertEqual(document.status, 'uploaded')
        self.assertTrue(document.file_hash)
        self.assertEqual(document.original_filename, 'test.pdf')
    
    def test_file_size_validation(self):
        """Test file size validation"""
        # Create a file that's too large (over 10MB)
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        large_file = self.create_test_file('large.pdf', large_content)
        
        with self.assertRaises(ValidationError):
            FileUploadService.upload_kyc_document(
                user=self.user,
                document_type='id_card',
                file=large_file
            )
    
    def test_file_type_validation(self):
        """Test file type validation"""
        # Try to upload an executable file
        exe_file = self.create_test_file('malware.exe', b'MZ\x90\x00', 'application/octet-stream')
        
        with self.assertRaises(ValidationError):
            FileUploadService.upload_kyc_document(
                user=self.user,
                document_type='id_card',
                file=exe_file
            )
    
    def test_malware_detection(self):
        """Test basic malware detection"""
        # Create a file with suspicious content
        malicious_content = b'%PDF-1.4\n<script>alert("xss")</script>'
        malicious_file = self.create_test_file('malicious.pdf', malicious_content)
        
        with self.assertRaises(ValidationError):
            FileUploadService.upload_kyc_document(
                user=self.user,
                document_type='id_card',
                file=malicious_file
            )
    
    def test_duplicate_file_detection(self):
        """Test duplicate file detection"""
        test_file1 = self.create_test_file('test1.pdf')
        test_file2 = self.create_test_file('test2.pdf')  # Same content, different name
        
        # Upload first file
        FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file1
        )
        
        # Try to upload duplicate content
        with self.assertRaises(ValidationError):
            FileUploadService.upload_kyc_document(
                user=self.user,
                document_type='passport',
                file=test_file2
            )
    
    def test_file_access_permissions(self):
        """Test file access permissions"""
        # Upload a document
        test_file = self.create_test_file()
        document = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file
        )
        
        # Owner should have access
        self.assertTrue(
            FileAccessService.check_file_access_permission(self.user, document)
        )
        
        # Admin should have access
        self.assertTrue(
            FileAccessService.check_file_access_permission(self.admin_user, document)
        )
        
        # Other user should not have access
        other_user = User.objects.create_user(
            email='other@example.com',
            password='otherpass123'
        )
        self.assertFalse(
            FileAccessService.check_file_access_permission(other_user, document)
        )
    
    def test_secure_token_generation_and_verification(self):
        """Test secure token generation and verification"""
        document_id = 1
        user_id = self.user.id
        
        # Generate token
        token = FileAccessService.generate_secure_token(document_id, user_id)
        self.assertIsInstance(token, str)
        self.assertIn('.', token)  # Should contain timestamp and signature
        
        # Verify valid token
        self.assertTrue(
            FileAccessService.verify_secure_token(token, document_id, user_id)
        )
        
        # Verify invalid token
        self.assertFalse(
            FileAccessService.verify_secure_token('invalid.token', document_id, user_id)
        )
        
        # Verify token with wrong user
        self.assertFalse(
            FileAccessService.verify_secure_token(token, document_id, 999)
        )
    
    def test_file_integrity_verification(self):
        """Test file integrity verification"""
        test_file = self.create_test_file()
        document = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file
        )
        
        # File should pass integrity check
        self.assertTrue(document.verify_file_integrity())
    
    def test_get_user_documents(self):
        """Test getting user documents"""
        # Upload multiple documents
        test_file1 = self.create_test_file('id.pdf')
        test_file2 = self.create_test_file('passport.pdf', b'%PDF-1.4 passport content')
        
        FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file1
        )
        
        FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='passport',
            file=test_file2
        )
        
        # Get documents
        result = FileUploadService.get_user_documents(self.user)
        
        self.assertEqual(result['total_documents'], 2)
        self.assertEqual(len(result['documents']), 2)
        self.assertIn('kyc_status', result)
    
    def test_document_deletion(self):
        """Test document deletion"""
        test_file = self.create_test_file()
        document = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file
        )
        
        # Should be able to delete uploaded document
        self.assertTrue(
            FileUploadService.delete_document(self.user, document.id)
        )
        
        # Document should no longer exist
        self.assertFalse(
            KYCDocument.objects.filter(id=document.id).exists()
        )
    
    def test_cannot_delete_approved_document(self):
        """Test that approved documents cannot be deleted"""
        test_file = self.create_test_file()
        document = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file
        )
        
        # Approve the document
        document.status = 'approved'
        document.save()
        
        # Should not be able to delete approved document
        self.assertFalse(
            FileUploadService.delete_document(self.user, document.id)
        )
        
        # Document should still exist
        self.assertTrue(
            KYCDocument.objects.filter(id=document.id).exists()
        )


class FileAccessServiceTest(TestCase):
    """Test cases for the file access service"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='otherpass123'
        )
        
        # Create a test document
        test_file = SimpleUploadedFile('test.pdf', b'%PDF-1.4 test content', 'application/pdf')
        self.document = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file
        )
    
    def test_secure_download_url_generation(self):
        """Test secure download URL generation"""
        download_info = FileAccessService.get_secure_download_url(self.user, self.document.id)
        
        self.assertIn('download_url', download_info)
        self.assertIn('token', download_info)
        self.assertIn('expires_in', download_info)
        self.assertIn('filename', download_info)
        self.assertEqual(download_info['filename'], self.document.original_filename)
    
    def test_unauthorized_access_denied(self):
        """Test that unauthorized users cannot access files"""
        with self.assertRaises(PermissionDenied):
            FileAccessService.get_secure_download_url(self.other_user, self.document.id)
    
    def test_nonexistent_document_raises_404(self):
        """Test that accessing nonexistent document raises 404"""
        with self.assertRaises(Http404):
            FileAccessService.get_secure_download_url(self.user, 99999)