from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.api.token_utils import get_jwt_tokens_for_user
from artists.models import Artist
from publishers.models import (
    PublisherAccountSettings,
    PublisherArtistRelationship,
    PublisherProfile,
)


class PublisherProfileApiTests(APITestCase):
    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(
            email='publisher-api@example.com',
            password='StrongPass1!',
            first_name='Api',
            last_name='Tester',
        )
        self.user.user_type = 'Publisher'
        self.user.save(update_fields=['user_type'])

        self.profile = PublisherProfile.objects.create(
            user=self.user,
            company_name='Acme Music Publishing',
            country='Ghana',
            region='Greater Accra',
            city='Accra',
            writer_split=Decimal('60'),
            publisher_split=Decimal('40'),
            performance_share=Decimal('35'),
        )

        artist_user = get_user_model().objects.create_user(
            email='artist-for-publisher@example.com',
            password='StrongPass1!',
            first_name='Artist',
            last_name='Example',
        )
        self.artist = Artist.objects.create(
            user=artist_user,
            stage_name='Example Artist',
            country='Ghana',
        )
        PublisherArtistRelationship.objects.create(
            publisher=self.profile,
            artist=self.artist,
            relationship_type='exclusive',
            royalty_split_percentage=Decimal('40'),
            start_date=date.today(),
        )

        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        self.profile_url = reverse('publishers:publisher-profile')
        self.settings_url = reverse('publishers:publisher-account-settings')

    def test_get_profile_returns_expected_payload(self) -> None:
        response = self.client.get(
            self.profile_url,
            {'publisher_id': str(self.profile.publisher_id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payload = response.data['data']
        self.assertEqual(payload['publisher']['companyName'], 'Acme Music Publishing')
        self.assertTrue(payload['revenueSplits'])
        self.assertIn('accountSettings', payload)
        self.assertEqual(payload['linkedArtists'][0]['name'], 'Example Artist')

    def test_profile_endpoint_accepts_jwt_tokens(self) -> None:
        tokens = get_jwt_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.get(
            self.profile_url,
            {'publisher_id': str(self.profile.publisher_id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_account_settings_update_persists_preferences(self) -> None:
        payload = {
            'publisher_id': str(self.profile.publisher_id),
            'email_notifications': False,
            'royalty_alerts': False,
            'weekly_reports': True,
            'two_factor_auth': True,
            'language': 'en-gb',
            'timezone': 'Africa/Accra',
            'currency': 'USD',
        }

        response = self.client.post(self.settings_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        settings = PublisherAccountSettings.objects.get(publisher=self.profile)
        self.assertFalse(settings.email_notifications)
        self.assertFalse(settings.royalty_alerts)
        self.assertTrue(settings.weekly_reports)
        self.assertTrue(settings.two_factor_auth)
        self.assertEqual(settings.preferred_language, 'en-gb')
        self.assertEqual(settings.timezone, 'Africa/Accra')
        self.assertEqual(settings.currency, 'USD')

    def test_requires_authentication(self) -> None:
        self.client.credentials()
        response = self.client.get(
            self.profile_url,
            {'publisher_id': str(self.profile.publisher_id)},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
