"""
Tests for publisher contract file security features
"""
import os
import tempfile
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from publishers.models import PublisherProfile, PublishingAgreement, PublisherArtistRelationship
from publishers.services.contract_security_service import (
    ContractFileValidator, 
    ContractAccessService,
    ContractRetentionService
)
from artists.models import Artist

User = get_user_model()


class ContractSecurityTestCase(TestCase):
    """Test case for contract file security features"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.publisher_user = User.objects.create_user(
            email='publisher@test.com',
            first_name='Test',
            last_name='Publisher',
            password='testpass123',
            is_staff=False,
            is_admin=False
        )
        self.publisher_user.user_type = 'Publisher'
        self.publisher_user.save()
        
        self.artist_user = User.objects.create_user(
            email='artist@test.com',
            first_name='Test',
            last_name='Artist',
            password='testpass123',
            is_staff=False,
            is_admin=False
        )
        self.artist_user.user_type = 'Artist'
        self.artist_user.save()
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            password='testpass123',
            is_staff=True,
            is_admin=True
        )
        
        # Create publisher profile
        self.publisher = PublisherProfile.objects.create(
            user=self.publisher_user,
            company_name='Test Publisher Inc.',
            verified=True
        )
        
        # Create artist
        self.artist = Artist.objects.create(
            user=self.artist_user,
            stage_name='Test Artist',
            verified=True
        )
    
    def test_contract_file_validator_valid_pdf(self):
        """Test contract file validator with valid PDF"""
        # Create a simple PDF-like file
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(pdf_content)
            tmp_file.flush()
            
            uploaded_file = SimpleUploadedFile(
                name='test_contract.pdf',
                content=pdf_content,
                content_type='application/pdf'
            )
            
            try:
                result = ContractFileValidator.validate_contract_file(uploaded_file, self.publisher.id)
                self.assertTrue(result['is_valid'])
                self.assertEqual(result['mime_type'], 'application/pdf')
                self.assertIsNotNone(result['sha256_hash'])
            finally:
                os.unlink(tmp_file.name)
    
    def test_contract_file_validator_invalid_extension(self):
        """Test contract file validator with invalid file extension"""
        exe_content = b'MZ\x90\x00'  # PE executable header
        
        uploaded_file = SimpleUploadedFile(
            name='malicious.exe',
            content=exe_content,
            content_type='application/octet-stream'
        )
        
        with self.assertRaises(ValidationError):
            ContractFileValidator.validate_contract_file(uploaded_file, self.publisher.id)
    
    def test_contract_file_validator_oversized_file(self):
        """Test contract file validator with oversized file"""
        # Create a file larger than the maximum allowed size
        large_content = b'A' * (51 * 1024 * 1024)  # 51MB
        
        uploaded_file = SimpleUploadedFile(
            name='large_contract.pdf',
            content=large_content,
            content_type='application/pdf'
        )
        
        with self.assertRaises(ValidationError):
            ContractFileValidator.validate_contract_file(uploaded_file, self.publisher.id)
    
    def test_publishing_agreement_file_security(self):
        """Test file security features in PublishingAgreement model"""
        # Create a test track first
        from artists.models import Track
        track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            status='Approved'
        )
        
        # Create agreement with contract file
        pdf_content = b'%PDF-1.4\nTest contract content'
        contract_file = SimpleUploadedFile(
            name='agreement.pdf',
            content=pdf_content,
            content_type='application/pdf'
        )
        
        agreement = PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.artist,
            track=track,
            writer_share=50.00,
            publisher_share=50.00,
            contract_file=contract_file,
            status='pending'
        )
        
        # Check that security metadata was generated
        self.assertIsNotNone(agreement.file_hash)
        self.assertGreater(agreement.file_size, 0)
        self.assertEqual(agreement.file_type, 'application/pdf')
        self.assertEqual(agreement.original_filename, 'agreement.pdf')
        self.assertEqual(agreement.version, 1)
        self.assertFalse(agreement.is_quarantined)
    
    def test_contract_access_permission_publisher(self):
        """Test contract access permission for publisher"""
        # Create a relationship
        relationship = PublisherArtistRelationship.objects.create(
            publisher=self.publisher,
            artist=self.artist,
            relationship_type='exclusive',
            start_date='2024-01-01',
            royalty_split_percentage=30.00,
            status='active',
            created_by=self.publisher_user
        )
        
        # Publisher should have access to their own contract
        has_access = ContractAccessService.check_contract_access_permission(
            self.publisher_user, relationship.id
        )
        self.assertTrue(has_access)
        
        # Artist should have access to contracts they're party to
        has_access = ContractAccessService.check_contract_access_permission(
            self.artist_user, relationship.id
        )
        self.assertTrue(has_access)
        
        # Admin should have access to all contracts
        has_access = ContractAccessService.check_contract_access_permission(
            self.admin_user, relationship.id
        )
        self.assertTrue(has_access)
    
    def test_contract_access_permission_denied(self):
        """Test contract access permission denial"""
        # Create another user who shouldn't have access
        other_user = User.objects.create_user(
            email='other@test.com',
            first_name='Other',
            last_name='User',
            password='testpass123'
        )
        
        # Create a relationship
        relationship = PublisherArtistRelationship.objects.create(
            publisher=self.publisher,
            artist=self.artist,
            relationship_type='exclusive',
            start_date='2024-01-01',
            royalty_split_percentage=30.00,
            status='active',
            created_by=self.publisher_user
        )
        
        # Other user should not have access
        has_access = ContractAccessService.check_contract_access_permission(
            other_user, relationship.id
        )
        self.assertFalse(has_access)
    
    def test_contract_quarantine_functionality(self):
        """Test contract quarantine functionality"""
        # Create agreement with contract file
        from artists.models import Track
        track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            status='Approved'
        )
        
        pdf_content = b'%PDF-1.4\nTest contract content'
        contract_file = SimpleUploadedFile(
            name='agreement.pdf',
            content=pdf_content,
            content_type='application/pdf'
        )
        
        agreement = PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.artist,
            track=track,
            writer_share=50.00,
            publisher_share=50.00,
            contract_file=contract_file,
            status='pending'
        )
        
        # Quarantine the file
        quarantine_reason = "Security concern detected"
        agreement.quarantine_file(quarantine_reason, self.admin_user)
        
        # Check quarantine status
        agreement.refresh_from_db()
        self.assertTrue(agreement.is_quarantined)
        self.assertEqual(agreement.quarantine_reason, quarantine_reason)
        self.assertEqual(agreement.quarantined_by, self.admin_user)
        self.assertIsNotNone(agreement.quarantined_at)
        
        # Unquarantine the file
        agreement.unquarantine_file()
        
        # Check unquarantine status
        agreement.refresh_from_db()
        self.assertFalse(agreement.is_quarantined)
        self.assertEqual(agreement.quarantine_reason, '')
        self.assertIsNone(agreement.quarantined_by)
        self.assertIsNone(agreement.quarantined_at)
    
    def test_contract_version_tracking(self):
        """Test contract version tracking functionality"""
        # Create agreement with contract file
        from artists.models import Track
        track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            status='Approved'
        )
        
        pdf_content_v1 = b'%PDF-1.4\nTest contract content v1'
        contract_file_v1 = SimpleUploadedFile(
            name='agreement_v1.pdf',
            content=pdf_content_v1,
            content_type='application/pdf'
        )
        
        agreement_v1 = PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.artist,
            track=track,
            writer_share=50.00,
            publisher_share=50.00,
            contract_file=contract_file_v1,
            status='pending'
        )
        
        # Create new version
        pdf_content_v2 = b'%PDF-1.4\nTest contract content v2 - updated'
        contract_file_v2 = SimpleUploadedFile(
            name='agreement_v2.pdf',
            content=pdf_content_v2,
            content_type='application/pdf'
        )
        
        agreement_v2 = agreement_v1.create_new_version(contract_file_v2, self.publisher_user)
        
        # Check version tracking
        self.assertEqual(agreement_v1.version, 1)
        self.assertEqual(agreement_v2.version, 2)
        self.assertEqual(agreement_v2.previous_version, agreement_v1)
        
        # Check version history
        version_history = agreement_v2.get_version_history()
        self.assertEqual(len(version_history), 2)
        self.assertEqual(version_history[0], agreement_v1)
        self.assertEqual(version_history[1], agreement_v2)
    
    def test_file_integrity_verification(self):
        """Test file integrity verification"""
        # Create agreement with contract file
        from artists.models import Track
        track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            status='Approved'
        )
        
        pdf_content = b'%PDF-1.4\nTest contract content'
        contract_file = SimpleUploadedFile(
            name='agreement.pdf',
            content=pdf_content,
            content_type='application/pdf'
        )
        
        agreement = PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.artist,
            track=track,
            writer_share=50.00,
            publisher_share=50.00,
            contract_file=contract_file,
            status='pending'
        )
        
        # File should pass integrity check
        self.assertTrue(agreement.verify_file_integrity())
        
        # Simulate file corruption by changing the hash
        original_hash = agreement.file_hash
        agreement.file_hash = 'corrupted_hash'
        agreement.save()
        
        # File should fail integrity check
        self.assertFalse(agreement.verify_file_integrity())
        
        # Restore original hash
        agreement.file_hash = original_hash
        agreement.save()
        
        # File should pass integrity check again
        self.assertTrue(agreement.verify_file_integrity())
    
    def test_secure_token_generation_and_verification(self):
        """Test secure token generation and verification"""
        contract_id = 123
        user_id = self.publisher_user.id
        
        # Generate token
        token = ContractAccessService.generate_contract_access_token(user_id, contract_id)
        self.assertIsNotNone(token)
        self.assertIn('.', token)  # Should contain timestamp and signature
        
        # Verify valid token
        is_valid = ContractAccessService.verify_contract_access_token(token, user_id, contract_id)
        self.assertTrue(is_valid)
        
        # Verify token with wrong user ID
        is_valid = ContractAccessService.verify_contract_access_token(token, user_id + 1, contract_id)
        self.assertFalse(is_valid)
        
        # Verify token with wrong contract ID
        is_valid = ContractAccessService.verify_contract_access_token(token, user_id, contract_id + 1)
        self.assertFalse(is_valid)
        
        # Verify malformed token
        is_valid = ContractAccessService.verify_contract_access_token('invalid_token', user_id, contract_id)
        self.assertFalse(is_valid)