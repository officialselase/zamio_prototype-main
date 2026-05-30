"""
Unit tests for enhanced file upload system
"""
import os
import tempfile
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from accounts.models import User, KYCDocument, validate_file_size, validate_file_type
from accounts.services.file_upload_service import FileUploadService
from accounts.services.file_access_service import FileAccessService


class FileValidationTestCase(TestCase):
    """Test file validation functions"""
    
    def test_valid_pdf_file(self):
        """Test that valid PDF files pass validation"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        valid_pdf = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        # Should not raise ValidationError
        validate_file_size(valid_pdf)
        validate_file_type(valid_pdf)
    
    def test_oversized_file_rejection(self):
        """Test that oversized files are rejected"""
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        large_file = SimpleUploadedFile("large.pdf", large_content, content_type="application/pdf")
        
        with self.assertRaises(ValidationError):
            validate_file_size(large_file)
    
    def test_dangerous_file_type_rejection(self):
        """Test that dangerous file types are rejected"""
        exe_content = b'MZ\x90\x00'  # PE executable header
        exe_file = SimpleUploadedFile("malware.exe", exe_content, content_type="application/octet-stream")
        
        with self.assertRaises(ValidationError):
            validate_file_type(exe_file)
    
    def test_script_file_rejection(self):
        """Test that script files are rejected"""
        script_content = b'#!/bin/bash\necho "malicious script"'
        script_file = SimpleUploadedFile("script.sh", script_content, content_type="text/plain")
        
        with self.assertRaises(ValidationError):
            validate_file_type(script_file)


class FileUploadServiceTestCase(TestCase):
    """Test FileUploadService functionality"""
    
    def setUp(self):
        """Set up test user"""
        self.user = User.objects.create_user(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
    
    def test_file_validation(self):
        """Test file validation through service"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        result = FileUploadService.validate_file(test_file)
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['content_type'], 'application/pdf')
        self.assertEqual(result['category'], 'document')
    
    def test_file_hash_calculation(self):
        """Test file hash calculation"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        hash1 = FileUploadService.calculate_file_hash(test_file)
        hash2 = FileUploadService.calculate_file_hash(test_file)
        
        self.assertEqual(hash1, hash2)  # Same file should produce same hash
        self.assertEqual(len(hash1), 64)  # SHA-256 produces 64-character hex string
    
    def test_kyc_document_upload(self):
        """Test KYC document upload through service"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file = SimpleUploadedFile("passport.pdf", pdf_content, content_type="application/pdf")
        
        kyc_doc = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='passport',
            file=test_file,
            notes='Test upload'
        )
        
        self.assertEqual(kyc_doc.user, self.user)
        self.assertEqual(kyc_doc.document_type, 'passport')
        self.assertEqual(kyc_doc.status, 'uploaded')
        self.assertEqual(kyc_doc.notes, 'Test upload')
        self.assertTrue(kyc_doc.file_hash)
    
    def test_duplicate_file_allowed_for_same_user(self):
        """Uploading the same file for a different slot on the same account succeeds"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file1 = SimpleUploadedFile("passport1.pdf", pdf_content, content_type="application/pdf")
        test_file2 = SimpleUploadedFile("passport2.pdf", pdf_content, content_type="application/pdf")

        # First upload should succeed
        FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='passport',
            file=test_file1
        )

        # Second upload of same content for a different slot on the same user should
        # now be treated as a separate document.
        second_doc = FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='id_card',
            file=test_file2
        )
        self.assertEqual(second_doc.document_type, 'id_card')
        self.assertEqual(KYCDocument.objects.filter(user=self.user).count(), 2)

    def test_duplicate_file_allowed_for_other_users(self):
        """The same file hash can be reused by a different account without errors."""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file1 = SimpleUploadedFile("passport1.pdf", pdf_content, content_type="application/pdf")
        test_file2 = SimpleUploadedFile("passport2.pdf", pdf_content, content_type="application/pdf")

        other_user = User.objects.create_user(
            email="duplicate@example.com",
            first_name="Dupe",
            last_name="User",
            password="duplicatepass123"
        )

        FileUploadService.upload_kyc_document(
            user=self.user,
            document_type='passport',
            file=test_file1
        )

        second_doc = FileUploadService.upload_kyc_document(
            user=other_user,
            document_type='passport',
            file=test_file2
        )

        self.assertEqual(second_doc.user, other_user)
        self.assertEqual(KYCDocument.objects.filter(file_hash=second_doc.file_hash).count(), 2)


class FileAccessServiceTestCase(TestCase):
    """Test FileAccessService functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
        
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            password="adminpass123",
            is_staff=True
        )
    
    def test_secure_token_generation_and_verification(self):
        """Test secure token generation and verification"""
        document_id = 1
        user_id = self.user.id
        
        # Generate token
        token = FileAccessService.generate_secure_token(document_id, user_id)
        self.assertIsInstance(token, str)
        self.assertIn('.', token)  # Should contain timestamp.signature format
        
        # Verify valid token
        is_valid = FileAccessService.verify_secure_token(token, document_id, user_id)
        self.assertTrue(is_valid)
        
        # Verify invalid token
        is_invalid = FileAccessService.verify_secure_token("invalid.token", document_id, user_id)
        self.assertFalse(is_invalid)
        
        # Verify token with wrong document_id
        is_wrong_doc = FileAccessService.verify_secure_token(token, 999, user_id)
        self.assertFalse(is_wrong_doc)
    
    def test_file_access_permissions(self):
        """Test file access permission checking"""
        # Create a KYC document
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        kyc_doc = KYCDocument.objects.create(
            user=self.user,
            document_type='passport',
            file=test_file
        )
        
        # Owner should have access
        has_access = FileAccessService.check_file_access_permission(self.user, kyc_doc)
        self.assertTrue(has_access)
        
        # Admin should have access
        admin_access = FileAccessService.check_file_access_permission(self.admin_user, kyc_doc)
        self.assertTrue(admin_access)
        
        # Other user should not have access
        other_user = User.objects.create_user(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            password="otherpass123"
        )
        no_access = FileAccessService.check_file_access_permission(other_user, kyc_doc)
        self.assertFalse(no_access)


class KYCDocumentModelTestCase(TestCase):
    """Test KYCDocument model functionality"""
    
    def setUp(self):
        """Set up test user"""
        self.user = User.objects.create_user(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
    
    def test_kyc_document_creation(self):
        """Test KYC document model creation"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file = SimpleUploadedFile("passport.pdf", pdf_content, content_type="application/pdf")
        
        kyc_doc = KYCDocument.objects.create(
            user=self.user,
            document_type='passport',
            file=test_file
        )
        
        self.assertEqual(kyc_doc.user, self.user)
        self.assertEqual(kyc_doc.document_type, 'passport')
        self.assertEqual(kyc_doc.status, 'uploaded')
        self.assertTrue(kyc_doc.file_hash)
        self.assertEqual(kyc_doc.original_filename, 'passport.pdf')
        self.assertEqual(kyc_doc.file_size, len(pdf_content))
    
    def test_file_integrity_verification(self):
        """Test file integrity verification"""
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        test_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        kyc_doc = KYCDocument.objects.create(
            user=self.user,
            document_type='passport',
            file=test_file
        )
        
        # File integrity should pass for newly created document
        integrity_check = kyc_doc.verify_file_integrity()
        self.assertTrue(integrity_check)
    
    def test_document_type_choices(self):
        """Test that document type choices are properly defined"""
        valid_types = [choice[0] for choice in KYCDocument.DOCUMENT_TYPES]
        
        self.assertIn('passport', valid_types)
        self.assertIn('id_card', valid_types)
        self.assertIn('drivers_license', valid_types)
        self.assertIn('utility_bill', valid_types)
    
    def test_status_choices(self):
        """Test that status choices are properly defined"""
        valid_statuses = [choice[0] for choice in KYCDocument.STATUS_CHOICES]
        
        self.assertIn('uploaded', valid_statuses)
        self.assertIn('pending_review', valid_statuses)
        self.assertIn('approved', valid_statuses)
        self.assertIn('rejected', valid_statuses)