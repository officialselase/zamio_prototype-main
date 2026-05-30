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

from artists.models import Artist, Contributor, Genre, Track
from music_monitor.models import PlayLog, StreamLog
from publishers.models import PublisherProfile
from stations.models import Station


@override_settings(SECURE_SSL_REDIRECT=False)
class PublisherCatalogAPITestCase(TestCase):
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
            publisher_id='PUB-CATALOG-001',
            company_name='Catalog Test Publishing',
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
            title='Sunrise Over Accra',
            audio_file=audio_file,
            genre=self.genre,
            duration=timedelta(minutes=3, seconds=45),
            bpm=128,
            musical_key='A minor',
            mood='Energetic',
            language='English',
            is_featured=True,
            distribution_platforms=['Spotify', 'Apple Music'],
            tags=['afrobeats', 'summer'],
            collaborators=['DJ Mensa'],
            status='Approved',
        )

        Contributor.objects.create(
            user=self.publisher_user,
            role='Composer',
            track=self.track,
            percent_split=Decimal('50.0'),
            publisher=self.publisher,
            active=True,
        )

        self.station = Station.objects.create(
            user=user_model.objects.create_user(
                email='station@example.com',
                password='strong-password',
                first_name='Station',
                last_name='User',
            ),
            name='Zamio FM',
            station_id='ST-CAT-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        now = timezone.now()
        recent_play = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=1),
            duration=timedelta(minutes=3, seconds=45),
            royalty_amount=Decimal('2.50'),
        )
        PlayLog.objects.filter(pk=recent_play.pk).update(
            created_at=now - timedelta(days=1)
        )

        previous_play = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=9),
            duration=timedelta(minutes=3, seconds=45),
            royalty_amount=Decimal('1.75'),
        )
        PlayLog.objects.filter(pk=previous_play.pk).update(
            created_at=now - timedelta(days=9)
        )

        StreamLog.objects.create(
            track=self.track,
            fan=None,
            duration=timedelta(minutes=3, seconds=45),
            royalty_amount=Decimal('0.40'),
        )

        other_audio = SimpleUploadedFile(
            'bside.mp3',
            b'fake-audio',
            content_type='audio/mpeg',
        )
        self.other_track = Track.objects.create(
            artist=self.artist,
            publisher=self.publisher,
            title='Moonlight Drive',
            audio_file=other_audio,
            genre=self.genre,
            duration=timedelta(minutes=4),
            status='Pending',
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.publisher_user)
        access_token['user_id'] = str(self.publisher_user.user_id)
        access_token['user_type'] = self.publisher_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_catalog_endpoint_returns_data_with_token(self) -> None:
        url = reverse('publishers:publisher-catalog')
        response = self.client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
                'page_size': 10,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        summary = data.get('summary') or {}
        self.assertEqual(summary.get('totalTracks'), 2)
        self.assertGreater(summary.get('totalStreams', 0), 0)

        tracks = data.get('tracks') or {}
        results = tracks.get('results') or []
        self.assertGreaterEqual(len(results), 1)

        first_track = results[0]
        self.assertEqual(first_track.get('title'), 'Sunrise Over Accra')
        self.assertEqual(first_track.get('artist'), 'Test Artist')
        self.assertIn('streams', first_track)
        self.assertIn('revenue', first_track)
        self.assertIsInstance(first_track.get('platforms'), list)
        performance = first_track.get('performance') or {}
        self.assertEqual(len(performance.get('dailyStreams') or []), 7)
        self.assertIn(performance.get('chartPerformance'), {'Rising', 'Stable', 'Declining'})

    def test_catalog_endpoint_supports_jwt_authentication(self) -> None:
        url = reverse('publishers:publisher-catalog')
        response = self.jwt_client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
                'page': 1,
                'page_size': 5,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_catalog_endpoint_allows_search_and_filters(self) -> None:
        url = reverse('publishers:publisher-catalog')
        response = self.client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
                'search': 'Moonlight',
                'status': 'draft',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        tracks = payload.get('data', {}).get('tracks', {})
        results = tracks.get('results') or []
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].get('title'), 'Moonlight Drive')
