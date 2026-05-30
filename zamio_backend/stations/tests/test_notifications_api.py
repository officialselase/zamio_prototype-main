from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from notifications.models import Notification
from stations.models import Station


class StationNotificationsAPITestCase(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()

        self.station_user = user_model.objects.create_user(
            email='station.notifications@example.com',
            password='strong-password',
            first_name='Station',
            last_name='Notifier',
        )
        self.station_user.user_type = 'Station'
        self.station_user.save(update_fields=['user_type'])

        self.station = Station.objects.create(
            user=self.station_user,
            name='Signal FM',
            station_id='ST-NOTIFY-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        self.token, _ = Token.objects.get_or_create(user=self.station_user)

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.station_user)
        access_token['user_id'] = str(self.station_user.user_id)
        access_token['user_type'] = self.station_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

        self.high_priority_notification = Notification.objects.create(
            user=self.station_user,
            station=self.station,
            title='Broadcast System Alert',
            message='Audio fingerprinting anomaly detected.',
            type='system',
            priority='high',
            action_required=True,
            action_label='View Details',
            action_type='view_system_alert',
            metadata={
                'alert_level': 'critical',
                'listeners': 12000,
                'milestone': True,
                'tracks_detected': 3,
                'days_until_expiry': 14,
                'license_type': 'Broadcasting License',
                'amount': 45230,
                'growth': 12,
                'platform': 'Twitter',
                'username': 'ghanamusiclover',
                'playlist': 'Morning Show',
            },
        )

        self.medium_priority_notification = Notification.objects.create(
            user=self.station_user,
            station=self.station,
            title='Audience Milestone Reached',
            message='You reached 100,000 listeners this month.',
            type='performance',
            priority='medium',
        )

    def test_station_notifications_requires_authentication(self) -> None:
        url = reverse('notifications:get_station_notifications')
        response = self.client.__class__().get(url, {'station_id': self.station.station_id})
        self.assertEqual(response.status_code, 401)

    def test_station_notifications_returns_payload_with_token(self) -> None:
        url = reverse('notifications:get_station_notifications')
        response = self.client.get(url, {'station_id': self.station.station_id})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        notifications = data.get('notifications') or []
        self.assertGreaterEqual(len(notifications), 2)

        first = notifications[0]
        self.assertIn('priority', first)
        self.assertIn('timestamp', first)
        self.assertIn('time_ago', first)
        self.assertIn('actionable', first)
        self.assertIn('station_name', first)

        stats = data.get('stats') or {}
        self.assertEqual(stats.get('total_count'), 2)
        self.assertEqual(stats.get('unread_count'), 2)
        self.assertEqual(stats.get('high_priority_count'), 1)

        filters = data.get('filters') or {}
        self.assertIn('available_types', filters)
        self.assertIn('available_priorities', filters)

        pagination = data.get('pagination') or {}
        self.assertEqual(pagination.get('page_number'), 1)
        self.assertEqual(pagination.get('count'), 2)

    def test_station_notifications_supports_jwt_authentication(self) -> None:
        url = reverse('notifications:get_station_notifications')
        response = self.jwt_client.get(url, {'station_id': self.station.station_id})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_station_notifications_filtering(self) -> None:
        url = reverse('notifications:get_station_notifications')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
                'filter_priority': 'high',
            },
        )
        self.assertEqual(response.status_code, 200)
        notifications = (response.json().get('data') or {}).get('notifications') or []
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0].get('priority'), 'high')

    def test_mark_station_notification_read(self) -> None:
        url = reverse('notifications:mark_station_notification_read')
        response = self.client.post(
            url,
            {
                'station_id': self.station.station_id,
                'notification_id': self.high_priority_notification.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.high_priority_notification.refresh_from_db()
        self.assertTrue(self.high_priority_notification.read)

    def test_mark_all_station_notifications_read(self) -> None:
        url = reverse('notifications:mark_all_station_notifications_read')
        response = self.client.post(
            url,
            {
                'station_id': self.station.station_id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data') or {}
        self.assertEqual(data.get('updated_count'), 2)
        self.assertEqual(
            Notification.objects.filter(
                station=self.station,
                is_archived=False,
                read=False,
            ).count(),
            0,
        )

    def test_delete_station_notification(self) -> None:
        url = reverse('notifications:delete_station_notification')
        response = self.client.delete(
            url,
            {
                'station_id': self.station.station_id,
                'notification_id': self.medium_priority_notification.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.medium_priority_notification.refresh_from_db()
        self.assertTrue(self.medium_priority_notification.is_archived)

    def test_station_notifications_station_namespace_alias(self) -> None:
        url = reverse('stations:get_station_notifications_view')
        response = self.client.get(url, {'station_id': self.station.station_id})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_mark_read_station_namespace_alias(self) -> None:
        url = reverse('stations:mark_station_notification_read_view')
        response = self.client.post(
            url,
            {
                'station_id': self.station.station_id,
                'notification_id': self.high_priority_notification.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)

    def test_mark_all_read_station_namespace_alias(self) -> None:
        url = reverse('stations:mark_all_station_notifications_read_view')
        response = self.client.post(
            url,
            {
                'station_id': self.station.station_id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_station_notification_station_namespace_alias(self) -> None:
        url = reverse('stations:delete_station_notification_view')
        response = self.client.delete(
            url,
            {
                'station_id': self.station.station_id,
                'notification_id': self.medium_priority_notification.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
