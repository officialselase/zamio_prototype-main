from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.api.token_utils import get_jwt_tokens_for_user
from mr_admin.models import MrAdmin


class AdminOnboardingFlowTests(APITestCase):
    """Validate admin onboarding endpoints and email verification responses."""

    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(
            email="admin-flow@example.com",
            password="StrongPass1!",
            first_name="Admin",
            last_name="Tester",
        )
        self.user.user_type = "Admin"
        self.user.admin = True
        self.user.staff = True
        self.user.is_active = True
        self.user.email_verified = True
        self.user.save(update_fields=[
            "user_type",
            "admin",
            "staff",
            "is_active",
            "email_verified",
        ])

        self.admin_profile = MrAdmin.objects.create(
            user=self.user,
            city="",
            postal_code="",
            organization_name="Zamio HQ",
            role="Operations Lead",
        )

        self.status_url = reverse("accounts:admin_onboarding_status_view")
        self.complete_url = reverse("accounts:complete_admin_profile_view")
        self.verify_code_url = reverse("accounts:verify_admin_email_code")

        # ensure DRF token exists for completeness
        Token.objects.get_or_create(user=self.user)

    def test_register_admin_captures_organization_and_role(self) -> None:
        payload = {
            "first_name": "Amina",
            "last_name": "Mensah",
            "email": "new-admin@example.com",
            "phone": "+233200000000",
            "password": "Passw0rd!",
            "password2": "Passw0rd!",
            "organization_name": "Accra HQ",
            "role": "Head of Operations",
        }

        with patch("accounts.email_utils.send_verification_email", return_value="mock-task"):
            response = self.client.post(
                reverse("accounts:register_admin_view"),
                payload,
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        admin = MrAdmin.objects.get(user__email=payload["email"])
        self.assertEqual(admin.organization_name, "Accra HQ")
        self.assertEqual(admin.role, "Head of Operations")
        data = response.data.get("data", {})
        self.assertEqual(data.get("organization_name"), "Accra HQ")
        self.assertEqual(data.get("role"), "Head of Operations")

    def test_admin_onboarding_status_with_jwt(self) -> None:
        tokens = get_jwt_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.get(self.status_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payload = response.data.get("data", {})
        self.assertEqual(payload.get("admin_id"), self.admin_profile.admin_id)
        self.assertEqual(payload.get("next_step"), "profile")
        self.assertEqual(payload.get("onboarding_step"), "profile")
        progress = payload.get("progress", {})
        self.assertFalse(progress.get("profile_completed", True))
        profile = payload.get("profile", {})
        self.assertEqual(profile.get("organization_name"), "Zamio HQ")
        self.assertEqual(profile.get("role"), "Operations Lead")

    def test_complete_admin_profile_with_jwt(self) -> None:
        tokens = get_jwt_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        payload = {
            "address": "15 Aviation Road",
            "city": "Accra",
            "postal_code": "GA-123-4567",
        }

        response = self.client.post(self.complete_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.admin_profile.refresh_from_db()
        self.assertTrue(self.admin_profile.active)
        self.assertEqual(self.admin_profile.city, "Accra")
        self.assertEqual(self.admin_profile.postal_code, "GA-123-4567")

        payload = response.data.get("data", {})
        self.assertEqual(payload.get("next_step"), "done")
        self.assertEqual(payload.get("onboarding_step"), "done")
        progress = payload.get("progress", {})
        self.assertTrue(progress.get("profile_completed"))
        profile = payload.get("profile", {})
        self.assertEqual(profile.get("organization_name"), "Zamio HQ")
        self.assertEqual(profile.get("role"), "Operations Lead")

    def test_verify_admin_email_code_includes_jwt_tokens(self) -> None:
        with patch(
            "accounts.api.admin_view.EmailVerificationService.verify_code",
            return_value={"success": True},
        ):
            response = self.client.post(
                self.verify_code_url,
                {"email": self.user.email, "code": "1234"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        data = response.data.get("data", {})
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data.get("admin_id"), self.admin_profile.admin_id)
        self.assertIn(data.get("next_step"), {"profile", "done"})
        self.assertEqual(data.get("onboarding_step"), data.get("next_step"))
        self.assertIn("progress", data)
        self.assertEqual(data.get("organization_name"), "Zamio HQ")
        self.assertEqual(data.get("role"), "Operations Lead")
        profile = data.get("profile", {})
        self.assertEqual(profile.get("organization_name"), "Zamio HQ")
        self.assertEqual(profile.get("role"), "Operations Lead")
