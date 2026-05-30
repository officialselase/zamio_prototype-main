from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from artists.models import Artist, Genre, Track
from music_monitor.models import Dispute, PlayLog
from stations.models import Station


@override_settings(SECURE_SSL_REDIRECT=False)
class StationDisputesAPITestCase(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()

        self.station_user = user_model.objects.create_user(
            email='station-dispute@example.com',
            password='strong-password',
            first_name='Dispute',
            last_name='Tester',
        )
        self.station_user.user_type = 'Station'
        self.station_user.save(update_fields=['user_type'])

        self.station = Station.objects.create(
            user=self.station_user,
            name='Insight FM',
            station_id='ST-DISP-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        self.token, _ = Token.objects.get_or_create(user=self.station_user)

        genre = Genre.objects.create(name='Highlife')

        artist_user = user_model.objects.create_user(
            email='artist-dispute@example.com',
            password='strong-password',
            first_name='Artist',
            last_name='Dispute',
        )
        artist_user.user_type = 'Artist'
        artist_user.save(update_fields=['user_type'])

        self.artist = Artist.objects.create(
            user=artist_user,
            stage_name='Dispute Artist',
            country='Ghana',
            region='Ashanti',
        )

        audio_file = SimpleUploadedFile('track-dispute.mp3', b'fake-mp3-data', content_type='audio/mpeg')
        self.track = Track.objects.create(
            artist=self.artist,
            title='Dispute Track',
            audio_file=audio_file,
            audio_file_mp3=audio_file,
            genre=genre,
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('15.25'),
        )

        now = timezone.now()
        self.playlog_recent = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(minutes=10),
            start_time=now - timedelta(minutes=11),
            stop_time=now - timedelta(minutes=7),
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('3.25'),
            avg_confidence_score=Decimal('0.89'),
            claimed=True,
        )

        self.playlog_flagged = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=2),
            start_time=now - timedelta(days=2, minutes=6),
            stop_time=now - timedelta(days=2, minutes=2),
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('2.10'),
            avg_confidence_score=Decimal('0.55'),
            claimed=False,
            flagged=True,
        )

        self.pending_dispute = Dispute.objects.create(
            playlog=self.playlog_recent,
            dispute_status='Pending',
            dispute_comments='Awaiting review',
        )
        self.flagged_dispute = Dispute.objects.create(
            playlog=self.playlog_flagged,
            dispute_status='Flagged',
            dispute_comments='Low confidence',
        )

        older_playlog = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=10),
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('1.75'),
            avg_confidence_score=Decimal('0.72'),
        )
        self.resolved_dispute = Dispute.objects.create(
            playlog=older_playlog,
            dispute_status='Resolved',
            dispute_comments='Verified by staff',
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.station_user)
        access_token['user_id'] = str(self.station_user.user_id)
        access_token['user_type'] = self.station_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_station_disputes_returns_payload_with_token(self) -> None:
        url = reverse('stations:get_station_disputes_view')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
                'page': 1,
                'page_size': 5,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        disputes_payload = data.get('disputes') or {}
        results = disputes_payload.get('results') or []

        self.assertGreaterEqual(len(results), 1)
        first_result = results[0]
        self.assertIn('track_title', first_result)
        self.assertIn('artist_name', first_result)
        self.assertIn('confidence', first_result)
        self.assertIn('earnings', first_result)
        self.assertIn('status', first_result)
        self.assertIn('cover_art', first_result)
        self.assertIn('audio_file_mp3', first_result)

        pagination = disputes_payload.get('pagination') or {}
        self.assertEqual(pagination.get('page_number'), 1)
        self.assertIn('count', pagination)
        self.assertIn('total_pages', pagination)

        summary = data.get('summary') or {}
        self.assertEqual(summary.get('total'), 3)
        self.assertEqual(summary.get('resolved'), 1)
        self.assertEqual(summary.get('flagged'), 1)
        self.assertEqual(summary.get('pending_review'), 2)
        self.assertIsInstance(summary.get('average_confidence'), (int, float))

        status_choices = data.get('status_choices') or []
        self.assertIn('Flagged', status_choices)
        self.assertIn('Pending', status_choices)

    def test_station_disputes_allows_jwt_authentication(self) -> None:
        url = reverse('stations:get_station_disputes_view')
        response = self.jwt_client.get(
            url,
            {
                'station_id': self.station.station_id,
                'page': 1,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_station_disputes_search_filters_results(self) -> None:
        url = reverse('stations:get_station_disputes_view')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
                'search': 'verified',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        data = payload.get('data') or {}
        results = (data.get('disputes') or {}).get('results') or []
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].get('status'), 'Resolved')

    def test_station_disputes_period_filter_limits_results(self) -> None:
        url = reverse('stations:get_station_disputes_view')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
                'period': 'daily',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        data = payload.get('data') or {}
        summary = data.get('summary') or {}

        # Only the pending dispute falls within the last day window
        self.assertEqual(summary.get('total'), 1)
        self.assertEqual(summary.get('resolved'), 0)
        self.assertEqual(summary.get('flagged'), 0)

    def test_station_dispute_detail_returns_payload_with_token(self) -> None:
        url = reverse(
            'stations:get_station_dispute_detail_view',
            kwargs={'dispute_id': self.pending_dispute.pk},
        )
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
        self.assertEqual(data.get('id'), self.pending_dispute.pk)
        self.assertEqual(data.get('track_title'), 'Dispute Track')
        self.assertIn('play_logs', data)
        self.assertIsInstance(data.get('play_logs'), list)
        self.assertIn('audio_file_mp3', data)

    def test_station_dispute_detail_allows_jwt_authentication(self) -> None:
        url = reverse(
            'stations:get_station_dispute_detail_view',
            kwargs={'dispute_id': self.pending_dispute.pk},
        )
        response = self.jwt_client.get(
            url,
            {
                'station_id': self.station.station_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)

    def test_station_dispute_detail_requires_station_id(self) -> None:
        url = reverse(
            'stations:get_station_dispute_detail_view',
            kwargs={'dispute_id': self.pending_dispute.pk},
        )
        response = self.client.get(url, format='json')

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        errors = payload.get('errors') or {}
        self.assertIn('station_id', errors)

    def test_station_dispute_detail_not_found_for_other_station(self) -> None:
        other_station = Station.objects.create(
            user=self.station_user,
            name='Other Station',
            station_id='ST-DISP-999',
            country='Ghana',
        )

        url = reverse(
            'stations:get_station_dispute_detail_view',
            kwargs={'dispute_id': self.pending_dispute.pk},
        )
        response = self.client.get(
            url,
            {
                'station_id': other_station.station_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 404)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Dispute not found.')

