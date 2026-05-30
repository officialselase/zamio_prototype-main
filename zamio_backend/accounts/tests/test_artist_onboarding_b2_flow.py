from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from accounts.models import KYCDocument
from artists.models import Artist, ArtistIdentityProfile


class ArtistOnboardingB2FlowTests(APITestCase):
    """Validate the artist onboarding completion endpoints advance progress consistently."""

    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(
            email="b2-artist@example.com",
            password="StrongPass1!",
            first_name="B2",
            last_name="Artist",
        )
        self.user.email_verified = True
        self.user.is_active = True
        self.user.save(update_fields=["email_verified", "is_active"])

        self.artist = Artist.objects.create(
            user=self.user,
            stage_name="B2 Artist",
            artist_id=str(uuid.uuid4()),
        )

        self.complete_profile_url = reverse("accounts:complete_artist_profile_view")
        self.complete_social_url = reverse("accounts:complete_artist_social_view")
        self.complete_payment_url = reverse("accounts:complete_artist_payment_view")
        self.complete_publisher_url = reverse("accounts:complete_artist_publisher_view")
        self.status_url = reverse(
            "accounts:artist_onboarding_status_view",
            kwargs={"artist_id": self.artist.artist_id},
        )
        self.skip_verification_url = reverse("accounts:skip_verification_view")
        self.resume_verification_url = reverse("accounts:resume_verification_view")
        self.upload_kyc_url = reverse("accounts:upload_kyc_documents_view")
        self.complete_onboarding_url = reverse("accounts:complete_artist_onboarding_view")
        self.update_identity_profile_url = reverse("accounts:update_identity_profile_view")

        self.client.force_authenticate(self.user)

    def test_artist_onboarding_advances_through_all_steps(self) -> None:
        profile_response = self.client.post(
            self.complete_profile_url,
            {
                "artist_id": self.artist.artist_id,
                "artistName": "B2 Artist",
                "bio": "Test bio",
                "country": "GH",
                "region": "Greater Accra",
                "location": "Accra",
                "genre": "Afrobeats",
                "style": "Fusion",
                "website": "https://b2.example.com",
                "instagram": "https://instagram.com/b2-artist",
                "twitter": "https://twitter.com/b2-artist",
                "facebook": "https://facebook.com/b2-artist",
                "youtube": "https://youtube.com/@b2-artist",
            },
            format="multipart",
        )
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK, profile_response.data)
        profile_data = profile_response.data["data"]
        self.assertEqual(profile_data["next_step"], "social-media")
        self.assertTrue(profile_data["progress"]["profile_completed"])
        profile_snapshot = profile_data["profile"]
        self.assertEqual(profile_snapshot["stage_name"], "B2 Artist")
        self.assertEqual(profile_snapshot["primary_genre"], "Afrobeats")
        self.assertEqual(profile_snapshot["music_style"], "Fusion")
        self.assertEqual(profile_snapshot["website"], "https://b2.example.com")
        self.assertEqual(profile_data["social_links"]["instagram"], "https://instagram.com/b2-artist")

        social_response = self.client.post(
            self.complete_social_url,
            {
                "artist_id": self.artist.artist_id,
                "instagram": "https://instagram.com/zamio-test",
                "twitter": "https://twitter.com/zamio-test",
                "accounts": [
                    {"platform": "Instagram", "username": "@zamio-test", "followers": 1200},
                    {"platform": "Twitter", "username": "@zamio-gh", "followers": 900},
                ],
            },
            format="json",
        )
        self.assertEqual(social_response.status_code, status.HTTP_200_OK, social_response.data)
        social_data = social_response.data["data"]
        self.assertEqual(social_data["next_step"], "payment")
        self.assertTrue(social_data["progress"]["social_media_added"])
        metrics = social_data["social_metrics"]["accounts"]
        self.assertEqual(metrics[0]["platform"], "Instagram")

        payment_response = self.client.post(
            self.complete_payment_url,
            {
                "artist_id": self.artist.artist_id,
                "preferred_method": "mobile-money",
                "currency": "GHS",
                "mobile_provider": "MTN",
                "mobile_number": "+233555000111",
                "mobile_account_name": "B2 Artist",
            },
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_200_OK, payment_response.data)
        payment_data = payment_response.data["data"]
        self.assertEqual(payment_data["next_step"], "publisher")
        self.assertTrue(payment_data["progress"]["payment_info_added"])
        self.assertEqual(payment_data["payment_preferences"]["preferred_method"], "mobile-money")

        publisher_response = self.client.post(
            self.complete_publisher_url,
            {
                "artist_id": self.artist.artist_id,
                "self_publish": False,
                "publisher_name": "Ghana Music Alliance",
                "publisher_type": "Independent",
                "publisher_location": "Accra, Ghana",
                "publisher_specialties": ["Ghanaian Music"],
                "agreed_to_terms": True,
            },
            format="json",
        )
        self.assertEqual(publisher_response.status_code, status.HTTP_200_OK, publisher_response.data)
        publisher_data = publisher_response.data["data"]
        self.assertEqual(publisher_data["next_step"], "kyc")
        self.assertTrue(publisher_data["progress"]["publisher_added"])
        self.assertFalse(publisher_data["publisher"]["is_self_published"])
        self.assertEqual(
            publisher_data["publisher"]["preferences"].get("publisher_name"),
            "Ghana Music Alliance",
        )

        complete_response = self.client.post(
            reverse("accounts:complete_artist_onboarding_view"),
            {"artist_id": self.artist.artist_id},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK, complete_response.data)
        complete_data = complete_response.data["data"]
        self.assertEqual(complete_data["next_step"], "done")

        self.artist.refresh_from_db()
        self.assertTrue(self.artist.profile_completed)
        self.assertTrue(self.artist.social_media_added)
        self.assertTrue(self.artist.payment_info_added)
        self.assertTrue(self.artist.publisher_added)
        self.assertEqual(self.artist.onboarding_step, "done")
        self.assertEqual(self.artist.payment_preferences["preferred_method"], "mobile-money")
        self.assertEqual(
            self.artist.publisher_preferences.get("publisher_name"),
            "Ghana Music Alliance",
        )

        status_response = self.client.get(self.status_url, format="json")
        self.assertEqual(status_response.status_code, status.HTTP_200_OK, status_response.data)
        status_data = status_response.data["data"]
        self.assertEqual(status_data["onboarding_step"], "done")
        self.assertGreaterEqual(status_data["profile_complete_percentage"], 50)
        self.assertTrue(status_data["required_fields"]["payment_required"] is False)
        self.assertEqual(status_data["profile"]["primary_genre"], "Afrobeats")
        self.assertEqual(status_data["payment_preferences"]["preferred_method"], "mobile-money")
        self.assertEqual(
            status_data["publisher"]["preferences"].get("publisher_name"),
            "Ghana Music Alliance",
        )

    def test_skip_payment_brings_artist_back_to_payment(self) -> None:
        self.client.post(
            self.complete_profile_url,
            {
                "artist_id": self.artist.artist_id,
                "artistName": "B2 Artist",
                "bio": "Test bio",
                "country": "GH",
                "region": "Greater Accra",
                "location": "Accra",
                "genre": "Afrobeats",
                "style": "Fusion",
                "website": "https://b2.example.com",
            },
            format="multipart",
        )

        self.client.post(
            self.complete_social_url,
            {
                "artist_id": self.artist.artist_id,
                "instagram": "https://instagram.com/zamio-test",
                "accounts": [{"platform": "Instagram", "username": "@b2"}],
            },
            format="json",
        )

        skip_response = self.client.post(
            reverse("accounts:skip_artist_onboarding_view"),
            {"artist_id": self.artist.artist_id, "step": "payment"},
            format="json",
        )
        self.assertEqual(skip_response.status_code, status.HTTP_200_OK, skip_response.data)
        skip_data = skip_response.data["data"]
        self.assertEqual(skip_data["next_step"], "payment")
        self.assertFalse(skip_data["progress"]["payment_info_added"])

        publisher_skip = self.client.post(
            self.complete_publisher_url,
            {"artist_id": self.artist.artist_id, "self_publish": True},
            format="json",
        )
        self.assertEqual(publisher_skip.status_code, status.HTTP_200_OK, publisher_skip.data)
        publisher_state = publisher_skip.data["data"]
        self.assertEqual(publisher_state["next_step"], "payment")

        status_after_skip = self.client.get(self.status_url, format="json")
        self.assertEqual(status_after_skip.status_code, status.HTTP_200_OK, status_after_skip.data)
        resume_data = status_after_skip.data["data"]
        self.assertEqual(resume_data["onboarding_step"], "payment")
        self.assertFalse(resume_data["progress"]["payment_info_added"])

    def test_skip_publisher_marks_artist_self_published(self) -> None:
        self.client.post(
            self.complete_profile_url,
            {
                "artist_id": self.artist.artist_id,
                "artistName": "B2 Artist",
                "bio": "Test bio",
                "country": "GH",
                "region": "Greater Accra",
                "location": "Accra",
                "genre": "Afrobeats",
                "style": "Fusion",
                "website": "https://b2.example.com",
            },
            format="multipart",
        )
        self.client.post(
            self.complete_social_url,
            {
                "artist_id": self.artist.artist_id,
                "instagram": "https://instagram.com/zamio-test",
                "accounts": [{"platform": "Instagram", "username": "@b2"}],
            },
            format="json",
        )
        self.client.post(
            self.complete_payment_url,
            {
                "artist_id": self.artist.artist_id,
                "preferred_method": "mobile-money",
                "currency": "GHS",
                "mobile_provider": "MTN",
                "mobile_number": "+233555000111",
                "mobile_account_name": "B2 Artist",
            },
            format="json",
        )

        skip_publisher_response = self.client.post(
            reverse("accounts:skip_artist_onboarding_view"),
            {"artist_id": self.artist.artist_id, "step": "publisher"},
            format="json",
        )
        self.assertEqual(skip_publisher_response.status_code, status.HTTP_200_OK, skip_publisher_response.data)
        skip_publisher_data = skip_publisher_response.data["data"]
        self.assertTrue(skip_publisher_data["progress"]["publisher_added"])
        self.assertTrue(skip_publisher_data["publisher"]["is_self_published"])
        self.assertEqual(skip_publisher_data["publisher"]["preferences"].get("publisher_name"), "Self-published")
        self.assertEqual(skip_publisher_data["next_step"], "kyc")

        self.artist.refresh_from_db()
        self.assertTrue(self.artist.publisher_added)
        self.assertTrue(self.artist.is_self_published)
        self.assertEqual(self.artist.onboarding_step, 'kyc')

    def test_artist_login_surfaces_next_pending_step_and_stage_name(self) -> None:
        """Logging in should surface the earliest incomplete step and stage name for the UI."""

        self.artist.stage_name = "B2 Artist"
        self.artist.profile_completed = True
        self.artist.social_media_added = True
        self.artist.payment_info_added = False
        self.artist.publisher_added = False
        self.artist.onboarding_step = "payment"
        self.artist.save()

        login_client = APIClient()
        response = login_client.post(
            reverse("accounts:login_artist"),
            {
                "email": self.user.email,
                "password": "StrongPass1!",
                "fcm_token": "pytest-device",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payload = response.data["data"]

        self.assertEqual(payload["next_step"], "payment")
        self.assertEqual(payload["onboarding_step"], "payment")
        self.assertEqual(payload["stage_name"], "B2 Artist")
        self.assertEqual(payload["artist_name"], "B2 Artist")
        progress = payload.get("progress", {})
        self.assertTrue(progress.get("profile_completed"))
        self.assertTrue(progress.get("social_media_added"))
        self.assertFalse(progress.get("payment_info_added"))

    def test_resume_verification_when_pending_returns_success(self) -> None:
        """Calling resume while verification is pending should be idempotent."""

        response = self.client.post(self.resume_verification_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        data = response.data["data"]
        self.assertEqual(data["verification_status"], "pending")
        self.assertTrue(data["already_in_progress"])

    def test_resume_verification_after_skip_allows_follow_up_calls(self) -> None:
        """Artists who skipped KYC can resume and immediately submit documents without 400s."""

        skip_response = self.client.post(
            self.skip_verification_url,
            {"artist_id": self.artist.artist_id},
            format="json",
        )
        self.assertEqual(skip_response.status_code, status.HTTP_200_OK, skip_response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_status, "skipped")

        first_resume = self.client.post(self.resume_verification_url, {}, format="json")
        self.assertEqual(first_resume.status_code, status.HTTP_200_OK, first_resume.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_status, "pending")

        second_resume = self.client.post(self.resume_verification_url, {}, format="json")
        self.assertEqual(second_resume.status_code, status.HTTP_200_OK, second_resume.data)
        resume_data = second_resume.data["data"]
        self.assertEqual(resume_data["verification_status"], "pending")
        self.assertTrue(resume_data["already_in_progress"])

    def test_reuploading_same_document_type_is_idempotent(self) -> None:
        """Uploading the same file again for an existing document slot should succeed."""

        initial_file = SimpleUploadedFile(
            "ghana-card.pdf",
            b"%PDF-1.4\nid document",
            content_type="application/pdf",
        )
        first_upload = self.client.post(
            self.upload_kyc_url,
            {"document_type": "id_card", "document_file": initial_file},
            format="multipart",
        )
        self.assertEqual(first_upload.status_code, status.HTTP_201_CREATED, first_upload.data)

        replacement_file = SimpleUploadedFile(
            "ghana-card-updated.pdf",
            b"%PDF-1.4\nid document",
            content_type="application/pdf",
        )
        second_upload = self.client.post(
            self.upload_kyc_url,
            {"document_type": "id_card", "document_file": replacement_file},
            format="multipart",
        )
        self.assertEqual(second_upload.status_code, status.HTTP_201_CREATED, second_upload.data)

        documents = KYCDocument.objects.filter(user=self.user, document_type="id_card")
        self.assertEqual(documents.count(), 1)
        stored_doc = documents.first()
        self.assertEqual(stored_doc.original_filename, "ghana-card-updated.pdf")

    def test_identity_documents_upload_after_skip_persists_metadata(self) -> None:
        """Uploading documents after skipping verification should not raise server errors."""

        # Fast-forward core onboarding steps so KYC is the remaining action.
        self.artist.profile_completed = True
        self.artist.social_media_added = True
        self.artist.payment_info_added = True
        self.artist.publisher_added = True
        self.artist.onboarding_step = "kyc"
        self.artist.save(update_fields=[
            "profile_completed",
            "social_media_added",
            "payment_info_added",
            "publisher_added",
            "onboarding_step",
        ])

        skip_response = self.client.post(
            self.skip_verification_url,
            {"artist_id": self.artist.artist_id},
            format="json",
        )
        self.assertEqual(skip_response.status_code, status.HTTP_200_OK, skip_response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_status, "skipped")

        identity_response = self.client.post(
            self.update_identity_profile_url,
            {
                "artist_id": self.artist.artist_id,
                "full_name": "B2 Artist Legal",
                "date_of_birth": "1990-05-12",
                "nationality": "Ghana",
                "id_type": "ghana_card",
                "id_number": "GC-123456789-0",
                "residential_address": "Accra Central",
            },
            format="json",
        )
        self.assertEqual(identity_response.status_code, status.HTTP_200_OK, identity_response.data)
        identity_payload = identity_response.data["data"]["identity_profile"]
        self.assertEqual(identity_payload["full_name"], "B2 Artist Legal")
        self.assertEqual(identity_payload["id_type"], "ghana_card")
        self.assertTrue(ArtistIdentityProfile.objects.filter(artist=self.artist).exists())

        id_card = SimpleUploadedFile(
            "ghana-card.pdf",
            b"%PDF-1.4\nid document",
            content_type="application/pdf",
        )
        utility_bill = SimpleUploadedFile(
            "utility-bill.pdf",
            b"%PDF-1.4\nutility bill",
            content_type="application/pdf",
        )
        selfie = SimpleUploadedFile(
            "selfie-proof.pdf",
            b"%PDF-1.4\nselfie proof",
            content_type="application/pdf",
        )

        upload_one = self.client.post(
            self.upload_kyc_url,
            {"document_type": "id_card", "document_file": id_card},
            format="multipart",
        )
        self.assertEqual(upload_one.status_code, status.HTTP_201_CREATED, upload_one.data)

        upload_two = self.client.post(
            self.upload_kyc_url,
            {"document_type": "utility_bill", "document_file": utility_bill},
            format="multipart",
        )
        self.assertEqual(upload_two.status_code, status.HTTP_201_CREATED, upload_two.data)

        upload_three = self.client.post(
            self.upload_kyc_url,
            {"document_type": "selfie", "document_file": selfie},
            format="multipart",
        )
        self.assertEqual(upload_three.status_code, status.HTTP_201_CREATED, upload_three.data)

        documents = KYCDocument.objects.filter(user=self.user)
        self.assertEqual(documents.count(), 3)
        stored_selfie = documents.get(document_type="selfie")
        self.assertEqual(stored_selfie.original_filename, "selfie-proof.pdf")
        self.assertGreater(stored_selfie.file_size, 0)

        resume_response = self.client.post(self.resume_verification_url, {}, format="json")
        self.assertEqual(resume_response.status_code, status.HTTP_200_OK, resume_response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_status, "pending")
        self.assertIn("selfie", self.user.kyc_documents)
        resumed_identity = resume_response.data["data"]["identity_profile"]
        self.assertEqual(resumed_identity["full_name"], "B2 Artist Legal")

        finalize_response = self.client.post(
            self.complete_onboarding_url,
            {"artist_id": self.artist.artist_id},
            format="json",
        )
        self.assertEqual(finalize_response.status_code, status.HTTP_200_OK, finalize_response.data)
        finalize_state = finalize_response.data["data"]
        self.assertTrue(finalize_state.get("onboarding_complete"))
        self.assertEqual(finalize_state["next_step"], "done")
        identity_state = finalize_state["identity_profile"]
        self.assertEqual(identity_state["full_name"], "B2 Artist Legal")
        self.assertEqual(identity_state["id_number"], "GC-123456789-0")
