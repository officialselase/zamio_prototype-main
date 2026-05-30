from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class ArtistAuthenticationB1FlowTests(APITestCase):
    """Smoke tests exercising the artist registration, verification, and login endpoints."""

    def setUp(self) -> None:
        self.register_url = reverse("accounts:register_artist")
        self.verify_code_url = reverse("accounts:verify_artist_email_code")
        self.login_url = reverse("accounts:login_artist")
        self.token_url = reverse("token_obtain_pair")
        self.token_refresh_url = reverse("token_refresh")
        self.payload = {
            "email": "artist-flow@example.com",
            "first_name": "Flow",
            "last_name": "Tester",
            "stage_name": "Flow Tester",
            "phone": "+233555000999",
            "country": "GH",
            "password": "StrongPass1!",
            "password2": "StrongPass1!",
        }

    def _register_artist(self):
        response = self.client.post(self.register_url, self.payload, format="multipart")
        assert response.status_code == status.HTTP_200_OK, response.data
        user = get_user_model().objects.get(email=self.payload["email"])
        return user

    def test_artist_can_register_verify_and_login(self):
        user = self._register_artist()

        verify_payload = {"email": user.email, "code": user.verification_code}
        verify_response = self.client.post(self.verify_code_url, verify_payload, format="json")
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK, verify_response.data)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertTrue(user.is_active)

        login_payload = {
            "email": user.email,
            "password": self.payload["password"],
            "fcm_token": "unit-test-device",
        }
        login_response = self.client.post(self.login_url, login_payload, format="json")
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)
        data = login_response.data.get("data", {})
        self.assertIn("token", data)
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertIn("onboarding_step", data)

    def test_jwt_token_issue_and_refresh(self):
        user = self._register_artist()
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=["email_verified", "is_active"])

        token_response = self.client.post(
            self.token_url,
            {"email": user.email, "password": self.payload["password"]},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK, token_response.data)
        self.assertIn("access", token_response.data)
        self.assertIn("refresh", token_response.data)

        refresh_response = self.client.post(
            self.token_refresh_url,
            {"refresh": token_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK, refresh_response.data)
        self.assertIn("access", refresh_response.data)

