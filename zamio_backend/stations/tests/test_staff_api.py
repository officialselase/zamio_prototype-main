from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from stations.models import Station, StationStaff


@override_settings(SECURE_SSL_REDIRECT=False)
class StationStaffAPITestCase(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()

        self.station_user = user_model.objects.create_user(
            email='station@example.com',
            password='strong-password',
            first_name='Station',
            last_name='Owner',
        )
        self.station_user.user_type = 'Station'
        self.station_user.save(update_fields=['user_type'])

        self.station = Station.objects.create(
            user=self.station_user,
            name='Pulse FM',
            station_id='ST-STAFF-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        self.token, _ = Token.objects.get_or_create(user=self.station_user)

        self.staff_member = StationStaff.objects.create(
            station=self.station,
            first_name='Ama',
            last_name='Mensah',
            email='ama@pulsefm.com',
            role='manager',
            permission_level='edit',
            active=True,
        )
        self.staff_member.apply_permissions(['reports', 'staff', 'monitoring'])
        self.staff_member.save()

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.station_user)
        access_token['user_id'] = str(self.station_user.user_id)
        access_token['user_type'] = self.station_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_station_staff_list_returns_data_with_token(self) -> None:
        url = reverse('stations:get_station_staff_list')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        staff_data = data.get('staff') or {}
        results = staff_data.get('results') or []

        self.assertGreaterEqual(len(results), 1)
        first_entry = results[0]
        self.assertIn('firstName', first_entry)
        self.assertIn('permissions', first_entry)
        self.assertIn('role', first_entry)
        self.assertIsInstance(data.get('summary') or {}, dict)
        self.assertIn('roleDefaults', (data.get('filters') or {}))

    def test_station_staff_list_allows_jwt_authentication(self) -> None:
        url = reverse('stations:get_station_staff_list')
        response = self.jwt_client.get(
            url,
            {
                'station_id': self.station.station_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_station_staff_create_assigns_default_permissions(self) -> None:
        url = reverse('stations:add_station_staff')
        response = self.client.post(
            url,
            {
                'station_id': self.station.station_id,
                'first_name': 'Michael',
                'last_name': 'Asare',
                'email': 'michael@pulsefm.com',
                'phone': '+233200000000',
                'role': 'admin',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Staff member added successfully')

        created = StationStaff.objects.get(email='michael@pulsefm.com')
        self.assertEqual(created.first_name, 'Michael')
        self.assertEqual(created.permission_level, 'admin')
        permissions = set(created.get_permission_ids())
        self.assertIn('reports', permissions)
        self.assertIn('payments', permissions)
        self.assertTrue(created.active)

    def test_station_staff_update_changes_permissions(self) -> None:
        url = reverse('stations:edit_station_staff')
        response = self.client.post(
            url,
            {
                'staff_id': self.staff_member.id,
                'first_name': 'Ama',
                'last_name': 'Mensah',
                'email': 'ama@pulsefm.com',
                'role': 'manager',
                'permissions': ['reports', 'compliance'],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Staff member updated successfully')

        self.staff_member.refresh_from_db()
        permissions = set(self.staff_member.get_permission_ids())
        self.assertIn('compliance', permissions)
        self.assertNotIn('monitoring', permissions)

    def test_station_staff_activate_and_archive(self) -> None:
        toggle_url = reverse('stations:activate_station_staff')
        deactivate_response = self.client.post(
            toggle_url,
            {
                'staff_id': self.staff_member.id,
                'active': False,
            },
            format='json',
        )

        self.assertEqual(deactivate_response.status_code, 200)
        self.staff_member.refresh_from_db()
        self.assertFalse(self.staff_member.active)

        archive_url = reverse('stations:archive_station_staff')
        archive_response = self.client.post(
            archive_url,
            {
                'staff_id': self.staff_member.id,
            },
            format='json',
        )

        self.assertEqual(archive_response.status_code, 200)
        self.staff_member.refresh_from_db()
        self.assertTrue(self.staff_member.is_archived)
        self.assertFalse(self.staff_member.active)

    def test_station_staff_requires_authentication(self) -> None:
        unauthenticated = APIClient()
        url = reverse('stations:get_station_staff_list')
        response = unauthenticated.get(
            url,
            {
                'station_id': self.station.station_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 401)
