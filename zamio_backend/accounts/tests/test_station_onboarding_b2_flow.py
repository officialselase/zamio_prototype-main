from __future__ import annotations

import uuid

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from stations.models import Station


class StationOnboardingB2FlowTests(APITestCase):
    """Ensure station onboarding endpoints mark steps and expose progress metadata."""

    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(
            email="b2-station@example.com",
            password="StrongPass1!",
            first_name="Station",
            last_name="Tester",
        )
        self.user.user_type = "Station"
        self.user.save(update_fields=["user_type"])
        self.user.email_verified = True
        self.user.is_active = True
        self.user.save(update_fields=["email_verified", "is_active"])

        self.station = Station.objects.create(
            user=self.user,
            name="B2 Station",
            station_id=str(uuid.uuid4()),
        )

        self.complete_profile_url = reverse("accounts:complete_station_profile_view")
        self.complete_stream_url = reverse("accounts:complete_station_stream_setup_view")
        self.complete_staff_url = reverse("accounts:complete_add_staff_view")
        self.complete_compliance_url = reverse("accounts:update_station_compliance_setup_view")
        self.complete_payment_url = reverse("accounts:complete_station_payment_view")
        self.status_url = reverse("accounts:station_onboarding_status_view")

        self.client.force_authenticate(self.user)

    def test_station_onboarding_progress_state(self) -> None:
        profile_response = self.client.post(
            self.complete_profile_url,
            {
                "station_id": self.station.station_id,
                "bio": "Community radio",
                "country": "GH",
                "region": "Ashanti",
                "location_name": "Kumasi",
            },
            format="json",
        )
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK, profile_response.data)
        profile_data = profile_response.data["data"]
        self.assertEqual(profile_data["next_step"], "stream")
        self.assertTrue(profile_data["progress"]["profile_completed"])

        stream_response = self.client.post(
            self.complete_stream_url,
            {
                "station_id": self.station.station_id,
                "primary_stream_url": "https://radio.example.com/stream",
                "stream_type": "icecast",
                "stream_username": "demo",
                "stream_password": "demo-pass-123",
            },
            format="json",
        )
        self.assertEqual(stream_response.status_code, status.HTTP_200_OK, stream_response.data)
        stream_data = stream_response.data["data"]
        self.assertEqual(stream_data["next_step"], "staff")
        self.assertTrue(stream_data["progress"]["stream_setup_completed"])

        staff_payload = [
            {"name": "Station Manager", "role": "producer", "email": "manager@example.com"},
        ]
        staff_response = self.client.post(
            self.complete_staff_url,
            {"station_id": self.station.station_id, "staff": staff_payload},
            format="json",
        )
        self.assertEqual(staff_response.status_code, status.HTTP_200_OK, staff_response.data)
        staff_data = staff_response.data["data"]
        self.assertEqual(staff_data["next_step"], "compliance")
        self.assertTrue(staff_data["progress"]["staff_completed"])

        compliance_payload = {
            "station_id": self.station.station_id,
            "license_number": "NCA-2024-001",
            "license_authority": "NCA",
            "license_issue_date": "2024-01-01",
            "license_expiry_date": "2025-12-31",
            "station_class": "class_a",
            "station_type": "commercial",
            "compliance_officer": "Sarah Johnson",
            "officer_email": "sarah@example.com",
            "officer_phone": "+233241234567",
            "emergency_contact": "+233201112222",
            "coverage_area": "Greater Accra",
            "estimated_listeners": 40000,
            "regulatory_body": "National Communications Authority",
        }
        compliance_response = self.client.post(
            self.complete_compliance_url,
            compliance_payload,
            format="json",
        )
        self.assertEqual(compliance_response.status_code, status.HTTP_200_OK, compliance_response.data)
        compliance_data = compliance_response.data["data"]
        self.assertEqual(compliance_data["next_step"], "payment")
        self.assertTrue(compliance_data["progress"]["compliance_completed"])

        self.station.refresh_from_db()
        self.assertEqual(self.station.license_number, "NCA-2024-001")
        self.assertEqual(self.station.license_issuing_authority, "NCA")
        self.assertEqual(self.station.station_class, "class_a")
        self.assertEqual(self.station.station_type, "commercial")
        self.assertEqual(self.station.compliance_contact_name, "Sarah Johnson")
        self.assertEqual(self.station.compliance_contact_email, "sarah@example.com")
        self.assertEqual(self.station.emergency_contact_phone, "+233201112222")
        self.assertEqual(self.station.coverage_area, "Greater Accra")
        self.assertEqual(self.station.estimated_listeners, 40000)

        payment_payload = {
            "station_id": self.station.station_id,
            "preferred_method": "momo",
            "currency": "GHS",
            "payout_frequency": "monthly",
            "minimum_payout": "150.50",
            "tax_id": "C123456789",
            "momo": "+233555000222",
            "momo_provider": "MTN Mobile Money",
            "momo_name": "Station Manager",
        }
        payment_response = self.client.post(
            self.complete_payment_url,
            payment_payload,
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_200_OK, payment_response.data)
        payment_data = payment_response.data["data"]
        self.assertEqual(payment_data["next_step"], "done")
        self.assertTrue(payment_data["progress"]["payment_info_added"])

        self.station.refresh_from_db()
        self.assertTrue(self.station.profile_completed)
        self.assertTrue(self.station.stream_setup_completed)
        self.assertTrue(self.station.staff_completed)
        self.assertTrue(self.station.compliance_completed)
        self.assertTrue(self.station.payment_info_added)
        self.assertEqual(self.station.onboarding_step, "done")
        self.assertEqual(self.station.preferred_payout_method, "momo")
        self.assertEqual(self.station.momo_account, "+233555000222")
        self.assertEqual(self.station.momo_provider, "MTN Mobile Money")
        self.assertEqual(self.station.minimum_payout_amount, Decimal("150.50"))
        self.assertEqual(self.station.tax_identification_number, "C123456789")

        status_response = self.client.get(self.status_url, {"station_id": self.station.station_id}, format="json")
        self.assertEqual(status_response.status_code, status.HTTP_200_OK, status_response.data)
        status_data = status_response.data["data"]
        self.assertEqual(status_data["onboarding_step"], "done")
        self.assertTrue(status_data["progress"]["stream_setup_completed"])
        self.assertTrue(status_data["progress"]["compliance_completed"])
        self.assertTrue(status_data["progress"]["payment_info_added"])

    def test_station_skip_step_requires_completion_before_dashboard(self) -> None:
        # Complete initial profile step to advance flow
        profile_response = self.client.post(
            self.complete_profile_url,
            {
                "station_id": self.station.station_id,
                "bio": "Community radio",
                "country": "GH",
                "region": "Ashanti",
                "location_name": "Kumasi",
            },
            format="json",
        )
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK, profile_response.data)

        # Skip the stream setup step
        skip_url = reverse('accounts:skip_station_onboarding_view')
        skip_response = self.client.post(
            skip_url,
            {"station_id": self.station.station_id, "step": "stream"},
            format="json",
        )
        self.assertEqual(skip_response.status_code, status.HTTP_200_OK, skip_response.data)
        self.station.refresh_from_db()
        self.assertEqual(self.station.onboarding_step, 'stream')
        self.assertFalse(self.station.stream_setup_completed)

        # Login using a fresh client to simulate next session
        login_client = APIClient()
        login_response = login_client.post(
            reverse('accounts:login_station'),
            {
                'email': self.user.email,
                'password': 'StrongPass1!',
                'fcm_token': 'test-web-client',
            },
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)
        login_data = login_response.data['data']
        self.assertEqual(login_data['next_step'], 'stream')
        self.assertEqual(login_data['onboarding_step'], 'stream')

        # Complete the stream setup and ensure next login advances
        stream_response = self.client.post(
            self.complete_stream_url,
            {
                "station_id": self.station.station_id,
                "primary_stream_url": "https://radio.example.com/live",
                "stream_type": "icecast",
                "stream_username": "demo",
                "stream_password": "demo-pass-123",
            },
            format="json",
        )
        self.assertEqual(stream_response.status_code, status.HTTP_200_OK, stream_response.data)

        self.station.refresh_from_db()
        self.assertTrue(self.station.stream_setup_completed)
        self.assertEqual(self.station.onboarding_step, 'staff')

        follow_up_login = login_client.post(
            reverse('accounts:login_station'),
            {
                'email': self.user.email,
                'password': 'StrongPass1!',
                'fcm_token': 'test-web-client',
            },
            format='json',
        )
        self.assertEqual(follow_up_login.status_code, status.HTTP_200_OK, follow_up_login.data)
        follow_up_data = follow_up_login.data['data']
        self.assertEqual(follow_up_data['next_step'], 'staff')
