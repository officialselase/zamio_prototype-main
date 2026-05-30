from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.api.token_utils import get_jwt_tokens_for_user

from publishers.models import PublisherProfile


class PublisherOnboardingFlowTests(APITestCase):
    """Exercise the publisher onboarding endpoints end-to-end."""

    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(
            email="publisher-flow@example.com",
            password="StrongPass1!",
            first_name="Publisher",
            last_name="Tester",
        )
        self.user.user_type = "Publisher"
        self.user.is_active = True
        self.user.email_verified = True
        self.user.save(update_fields=["user_type", "is_active", "email_verified"])

        self.profile = PublisherProfile.objects.create(user=self.user)
        token, _ = Token.objects.get_or_create(user=self.user)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        self.profile_url = reverse("accounts:complete_publisher_profile_view")
        self.revenue_url = reverse("accounts:complete_revenue_split_view")
        self.payment_url = reverse("accounts:complete_publisher_payment_view")

    def test_complete_profile_advances_to_revenue_split(self) -> None:
        payload = {
            "publisher_id": str(self.profile.publisher_id),
            "company_name": "Acme Publishing",
            "country": "GH",
            "city": "Accra",
            "primary_contact_name": "Jane Manager",
        }

        response = self.client.post(self.profile_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.profile_completed)
        self.assertEqual(self.profile.onboarding_step, "revenue-split")
        self.assertEqual(response.data["data"]["next_step"], "revenue-split")
        self.assertEqual(self.profile.onboarding_step, "revenue-split")
        self.assertEqual(response.data["data"]["next_step"], "revenue-split")
        self.assertEqual(self.profile.company_name, "Acme Publishing")

    def test_complete_profile_accepts_jwt_token(self) -> None:
        tokens = get_jwt_tokens_for_user(self.user)
        self.client.credentials()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        payload = {
            "publisher_id": str(self.profile.publisher_id),
            "company_name": "Acme Publishing",
            "country": "GH",
            "city": "Accra",
            "primary_contact_name": "Jane Manager",
        }

        response = self.client.post(self.profile_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.profile_completed)

    def test_revenue_split_requires_balanced_percentages(self) -> None:
        payload = {
            "publisher_id": str(self.profile.publisher_id),
            "writer_split": "60",
            "publisher_split": "30",
        }

        response = self.client.post(self.revenue_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("writer_split", response.data["errors"])
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.revenue_split_completed)

    def test_complete_revenue_split_advances_to_link_artist(self) -> None:
        self.profile.profile_completed = True
        self.profile.save(update_fields=["profile_completed"])

        payload = {
            "publisher_id": str(self.profile.publisher_id),
            "writer_split": "60",
            "publisher_split": "40",
            "mechanical_share": "10",
            "performance_share": "20",
            "sync_share": "5",
            "administrative_fee_percentage": "15",
            "revenue_split_notes": "Standard deal",
        }

        response = self.client.post(self.revenue_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.revenue_split_completed)
        self.assertEqual(self.profile.onboarding_step, "link-artist")
        self.assertEqual(response.data["data"]["next_step"], "link-artist")
        self.assertEqual(self.profile.writer_split, Decimal("60"))
        self.assertEqual(self.profile.publisher_split, Decimal("40"))

    def test_complete_payment_marks_onboarding_done(self) -> None:
        self.profile.profile_completed = True
        self.profile.revenue_split_completed = True
        self.profile.link_artist_completed = True
        self.profile.onboarding_step = "payment"
        self.profile.save(update_fields=[
            "profile_completed",
            "revenue_split_completed",
            "link_artist_completed",
            "onboarding_step",
        ])

        payload = {
            "publisher_id": str(self.profile.publisher_id),
            "payment_method": "momo",
            "momo_account": "+233201234567",
            "momo_account_name": "Acme Publishing",
            "momo_provider": "MTN",
            "payout_currency": "GHS",
            "payout_frequency": "monthly",
            "minimum_payout_amount": "200.00",
            "withholding_tax_rate": "5",
            "vat_registration_number": "VAT-12345",
        }

        response = self.client.post(self.payment_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.payment_info_added)
        self.assertEqual(self.profile.onboarding_step, "done")
        self.assertEqual(response.data["data"]["next_step"], "done")
        self.assertEqual(self.profile.preferred_payment_method, "momo")
        self.assertEqual(self.profile.momo_account, "+233201234567")
        self.assertEqual(self.profile.momo_provider, "MTN")
        self.assertEqual(self.profile.minimum_payout_amount, Decimal("200.00"))
        self.assertEqual(self.profile.withholding_tax_rate, Decimal("5"))
        self.assertEqual(self.profile.vat_registration_number, "VAT-12345")
