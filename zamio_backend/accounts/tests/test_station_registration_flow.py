from unittest import mock

from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from stations.models import Station


User = get_user_model()


class StationRegistrationFlowTests(APITestCase):
    def setUp(self) -> None:
        self.url = reverse('accounts:register_station')

    def test_station_registration_creates_profile_and_returns_tokens(self) -> None:
        payload = {
            'email': 'fresh-station@example.com',
            'first_name': 'Fresh',
            'last_name': 'Station',
            'station_name': 'Fresh FM',
            'phone': '+233200000000',
            'country': 'Ghana',
            'password': 'Str0ng!Pass',
            'password2': 'Str0ng!Pass',
        }

        with mock.patch('accounts.email_utils.send_verification_email', return_value='task-123') as mocked_task:
            response = self.client.post(self.url, payload, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body.get('message'), 'Successful')
        data = body.get('data') or {}

        self.assertIn('user_id', data)
        self.assertIn('station_id', data)
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)
        self.assertIn('next_step', data)
        self.assertEqual(data.get('onboarding_step'), 'profile')
        self.assertEqual(data.get('next_step'), 'profile')

        mocked_task.assert_called_once()

        user = User.objects.get(email=payload['email'])
        self.assertEqual(user.first_name, payload['first_name'])
        self.assertEqual(user.last_name, payload['last_name'])
        self.assertEqual(user.phone, payload['phone'])
        self.assertEqual(user.country, payload['country'])

        station = Station.objects.get(user=user)
        self.assertEqual(station.name, payload['station_name'])
        self.assertEqual(station.phone, payload['phone'])
        self.assertEqual(station.country, payload['country'])
        self.assertTrue(station.station_id)
        self.assertEqual(station.get_next_onboarding_step(), 'profile')

    def test_registration_validation_errors_bubble_up(self) -> None:
        response = self.client.post(self.url, {
            'email': 'invalid',
            'first_name': '',
            'last_name': '',
            'station_name': '',
            'phone': '',
            'password': 'weak',
            'password2': 'mismatch',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = response.json()
        self.assertEqual(body.get('message'), 'Errors')
        errors = body.get('errors') or {}

        self.assertIn('email', errors)
        self.assertIn('first_name', errors)
        self.assertIn('last_name', errors)
        self.assertIn('station_name', errors)
        self.assertIn('phone', errors)
        self.assertIn('password', errors)
