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
from music_monitor.models import Dispute, MatchCache, PlayLog
from stations.models import Station


@override_settings(SECURE_SSL_REDIRECT=False)
class StationPlaylogsAPITestCase(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()

        self.station_user = user_model.objects.create_user(
            email='station@example.com',
            password='strong-password',
            first_name='Station',
            last_name='User',
        )
        self.station_user.user_type = 'Station'
        self.station_user.save(update_fields=['user_type'])

        self.station = Station.objects.create(
            user=self.station_user,
            name='Wave FM',
            station_id='ST-LOG-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        self.token, _ = Token.objects.get_or_create(user=self.station_user)

        genre = Genre.objects.create(name='Afrobeats')

        artist_user = user_model.objects.create_user(
            email='artist@example.com',
            password='strong-password',
            first_name='Artist',
            last_name='User',
        )
        artist_user.user_type = 'Artist'
        artist_user.save(update_fields=['user_type'])

        self.artist = Artist.objects.create(
            user=artist_user,
            stage_name='Test Artist',
            country='Ghana',
            region='Greater Accra',
        )

        audio_file = SimpleUploadedFile('track.mp3', b'fake-mp3-data', content_type='audio/mpeg')
        self.track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            audio_file=audio_file,
            genre=genre,
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('12.50'),
        )

        now = timezone.now()
        self.playlog_recent = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(minutes=5),
            start_time=now - timedelta(minutes=6),
            stop_time=now - timedelta(minutes=3),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('2.50'),
            avg_confidence_score=Decimal('0.82'),
            claimed=True,
            flagged=False,
        )
        self.playlog_flagged = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=1),
            start_time=now - timedelta(days=1, minutes=4),
            stop_time=now - timedelta(days=1, minutes=1),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('1.75'),
            avg_confidence_score=Decimal('0.64'),
            claimed=False,
            flagged=True,
        )

        self.match_cache = MatchCache.objects.create(
            track=self.track,
            station=self.station,
            avg_confidence_score=Decimal('0.91'),
            processed=True,
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.station_user)
        access_token['user_id'] = str(self.station_user.user_id)
        access_token['user_type'] = self.station_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_station_playlogs_returns_data_with_token(self) -> None:
        url = reverse('stations:get_all_station_playlog_view')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
                'play_page': 1,
                'match_page': 1,
                'play_page_size': 10,
                'match_page_size': 10,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload.get('message'), 'Successful')
        data = payload.get('data') or {}

        play_logs = data.get('playLogs') or {}
        play_results = play_logs.get('results') or []
        self.assertGreaterEqual(len(play_results), 1)
        first_log = play_results[0]
        self.assertIn('track_title', first_log)
        self.assertIn('artist', first_log)
        self.assertIn('station_name', first_log)
        self.assertIn('matched_at', first_log)
        self.assertIn('royalty_amount', first_log)
        self.assertIn('status', first_log)
        self.assertIn('plays', first_log)
        self.assertIn('source', first_log)

        play_pagination = play_logs.get('pagination') or {}
        self.assertEqual(play_pagination.get('page_number'), 1)
        self.assertIn('count', play_pagination)
        self.assertIn('total_pages', play_pagination)

        match_logs = data.get('matchLogs') or {}
        match_results = match_logs.get('results') or []
        self.assertGreaterEqual(len(match_results), 1)
        first_match = match_results[0]
        self.assertIn('track_title', first_match)
        self.assertIn('artist', first_match)
        self.assertIn('station_name', first_match)
        self.assertIn('matched_at', first_match)
        self.assertIn('confidence', first_match)
        self.assertIn('status', first_match)

    def test_station_playlogs_allows_jwt_authentication(self) -> None:
        url = reverse('stations:get_all_station_playlog_view')
        response = self.jwt_client.get(
            url,
            {
                'station_id': self.station.station_id,
                'play_page': 1,
                'match_page': 1,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_station_playlogs_search_filters_results(self) -> None:
        other_station = Station.objects.create(
            user=self.station_user,
            name='Other Station',
            station_id='ST-OTHER-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )
        PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=timezone.now() - timedelta(days=2),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('0.85'),
            avg_confidence_score=Decimal('0.71'),
        )
        PlayLog.objects.create(
            track=self.track,
            station=other_station,
            source='Radio',
            played_at=timezone.now() - timedelta(days=2),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('0.85'),
            avg_confidence_score=Decimal('0.71'),
        )

        url = reverse('stations:get_all_station_playlog_view')
        response = self.client.get(
            url,
            {
                'station_id': self.station.station_id,
                'search': 'Test Track',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        data = payload.get('data') or {}
        play_logs = data.get('playLogs') or {}
        play_results = play_logs.get('results') or []
        self.assertTrue(all('Test Track' in entry.get('track_title', '') for entry in play_results))

    def test_station_playlogs_requires_valid_station(self) -> None:
        url = reverse('stations:get_all_station_playlog_view')
        response = self.client.get(
            url,
            {
                'station_id': 'ST-NOT-REAL',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Errors')
        self.assertIn('station', payload.get('errors') or {})

    def test_flag_playlog_creates_dispute_with_token_auth(self) -> None:
        url = reverse('music_monitor:flag_match_for_dispute')
        response = self.client.post(
            url,
            {
                'playlog_id': self.playlog_recent.id,
                'comment': 'Incorrect identification',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.playlog_recent.refresh_from_db()
        self.assertTrue(self.playlog_recent.flagged)

        disputes = Dispute.objects.filter(playlog=self.playlog_recent, is_archived=False)
        self.assertEqual(disputes.count(), 1)
        dispute = disputes.first()
        self.assertIsNotNone(dispute)
        if dispute is not None:
            self.assertEqual(dispute.dispute_status, 'Flagged')
            self.assertEqual(dispute.dispute_comments, 'Incorrect identification')

    def test_flag_playlog_allows_jwt_authentication(self) -> None:
        url = reverse('music_monitor:flag_match_for_dispute')
        response = self.jwt_client.post(
            url,
            {
                'playlog_id': self.playlog_recent.id,
                'comment': 'Flag via bearer token',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.playlog_recent.refresh_from_db()
        self.assertTrue(self.playlog_recent.flagged)

    def test_flag_playlog_rejects_foreign_station(self) -> None:
        other_user = get_user_model().objects.create_user(
            email='other-station@example.com',
            password='strong-password',
            first_name='Other',
            last_name='Station',
        )
        other_user.user_type = 'Station'
        other_user.save(update_fields=['user_type'])

        Station.objects.create(
            user=other_user,
            name='Shield FM',
            station_id='ST-LOG-999',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        other_token, _ = Token.objects.get_or_create(user=other_user)
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')

        url = reverse('music_monitor:flag_match_for_dispute')
        response = other_client.post(
            url,
            {
                'playlog_id': self.playlog_recent.id,
                'comment': 'Trying to flag someone else log',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.playlog_recent.refresh_from_db()
        self.assertFalse(self.playlog_recent.flagged)
        self.assertFalse(
            Dispute.objects.filter(playlog=self.playlog_recent, is_archived=False).exists()
        )
