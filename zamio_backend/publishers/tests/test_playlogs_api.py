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
from music_monitor.models import MatchCache, PlayLog
from publishers.models import PublisherProfile, PublishingAgreement
from stations.models import Station


@override_settings(SECURE_SSL_REDIRECT=False)
class PublisherPlaylogsAPITestCase(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()

        self.publisher_user = user_model.objects.create_user(
            email='publisher@example.com',
            password='strong-password',
            first_name='Publisher',
            last_name='User',
        )
        self.publisher_user.user_type = 'Publisher'
        self.publisher_user.save(update_fields=['user_type'])

        self.publisher = PublisherProfile.objects.create(
            user=self.publisher_user,
            publisher_id='PUB-LOG-001',
            company_name='Test Publisher',
            country='Ghana',
        )

        self.token, _ = Token.objects.get_or_create(user=self.publisher_user)

        self.genre = Genre.objects.create(name='Afrobeats')

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
        )

        audio_file = SimpleUploadedFile(
            'track.mp3',
            b'fake-mp3-data',
            content_type='audio/mpeg',
        )
        self.track = Track.objects.create(
            artist=self.artist,
            publisher=self.publisher,
            title='Test Track',
            audio_file=audio_file,
            genre=self.genre,
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('15.25'),
        )

        PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.artist,
            track=self.track,
            writer_share=Decimal('40.0'),
            publisher_share=Decimal('60.0'),
            status='accepted',
        )

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
            name='Test Station',
            station_id='ST-PUB-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        now = timezone.now()
        self.playlog_recent = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(minutes=10),
            start_time=now - timedelta(minutes=12),
            stop_time=now - timedelta(minutes=9),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('2.75'),
            avg_confidence_score=Decimal('0.84'),
            claimed=True,
        )

        self.match_cache = MatchCache.objects.create(
            track=self.track,
            station=self.station,
            avg_confidence_score=Decimal('0.93'),
            processed=True,
        )

        other_track = Track.objects.create(
            artist=self.artist,
            publisher=self.publisher,
            title='Other Song',
            audio_file=SimpleUploadedFile('other.mp3', b'data', content_type='audio/mpeg'),
            genre=self.genre,
            duration=timedelta(minutes=4),
        )
        PlayLog.objects.create(
            track=other_track,
            station=self.station,
            source='Streaming',
            played_at=now - timedelta(days=1),
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('1.10'),
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.publisher_user)
        access_token['user_id'] = str(self.publisher_user.user_id)
        access_token['user_type'] = self.publisher_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_publisher_playlogs_returns_data_with_token(self) -> None:
        url = reverse('publishers:publisher-playlogs')
        response = self.client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
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

        play_pagination = play_logs.get('pagination') or {}
        self.assertEqual(play_pagination.get('page_number'), 1)
        self.assertIn('count', play_pagination)
        self.assertIn('total_pages', play_pagination)

        match_logs = data.get('matchLogs') or {}
        match_results = match_logs.get('results') or []
        self.assertGreaterEqual(len(match_results), 1)
        first_match = match_results[0]
        self.assertIn('song', first_match)
        self.assertIn('artist', first_match)
        self.assertIn('station', first_match)
        self.assertIn('matched_at', first_match)
        self.assertIn('confidence', first_match)
        self.assertIn('status', first_match)

    def test_publisher_playlogs_allows_jwt_authentication(self) -> None:
        url = reverse('publishers:publisher-playlogs')
        response = self.jwt_client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
                'play_page': 1,
                'match_page': 1,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_publisher_playlogs_search_filters_results(self) -> None:
        url = reverse('publishers:publisher-playlogs')
        response = self.client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
                'search': 'Test Track',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        data = payload.get('data') or {}
        play_logs = data.get('playLogs') or {}
        play_results = play_logs.get('results') or []
        self.assertTrue(
            all('Test Track' in (entry.get('track_title') or '') for entry in play_results)
        )

    def test_publisher_playlogs_requires_valid_publisher(self) -> None:
        url = reverse('publishers:publisher-playlogs')
        response = self.client.get(
            url,
            {
                'publisher_id': 'PUB-NOT-REAL',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Errors')
        self.assertIn('publisher', payload.get('errors') or {})

    def test_publisher_playlogs_rejects_foreign_user(self) -> None:
        user_model = get_user_model()
        other_user = user_model.objects.create_user(
            email='other-publisher@example.com',
            password='strong-password',
            first_name='Other',
            last_name='Publisher',
        )
        other_user.user_type = 'Publisher'
        other_user.save(update_fields=['user_type'])

        other_publisher = PublisherProfile.objects.create(
            user=other_user,
            publisher_id='PUB-LOG-999',
            company_name='Other Publisher',
        )

        other_token, _ = Token.objects.get_or_create(user=other_user)
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')

        url = reverse('publishers:publisher-playlogs')
        response = other_client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Errors')
        self.assertIn('publisher', payload.get('errors') or {})

        # Ensure their own data can still be requested
        ok_response = other_client.get(
            url,
            {
                'publisher_id': other_publisher.publisher_id,
            },
            format='json',
        )
        self.assertEqual(ok_response.status_code, 200)
