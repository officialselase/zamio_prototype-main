"""Regression tests for the royalty file security helpers."""
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from royalties.services.file_security_service import RoyaltyFileSecurityService


class RoyaltyFileSecurityServiceTests(TestCase):
    def test_financial_csv_passes_validation(self):
        payload = b"isrc,title,work_title\nUS1A23,My Song,My Work\n"
        upload = SimpleUploadedFile(
            "repertoire.csv",
            payload,
            content_type="text/csv",
        )

        result = RoyaltyFileSecurityService.validate_financial_file(upload, file_category="repertoire")
        self.assertTrue(result["valid"])
        self.assertEqual(result["file_category"], "repertoire")
        self.assertEqual(result["extension"], ".csv")

    def test_rejects_malicious_content(self):
        malicious_payload = b"isrc,title,work_title\n<script>alert(1)</script>,Bad Track,Bad Work\n"
        upload = SimpleUploadedFile(
            "royalty_data.csv",
            malicious_payload,
            content_type="text/csv",
        )

        with self.assertRaises(ValidationError):
            RoyaltyFileSecurityService.validate_financial_file(upload, file_category="royalty_data")

    def test_rejects_disallowed_extension(self):
        upload = SimpleUploadedFile(
            "report.exe",
            b"binary",
            content_type="application/octet-stream",
        )

        with self.assertRaises(ValidationError):
            RoyaltyFileSecurityService.validate_financial_file(upload, file_category="usage_report")

