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

from artists.models import Album, Artist, Genre, Track
from music_monitor.models import PlayLog, StreamLog
from publishers.models import PublisherArtistRelationship, PublisherProfile
from stations.models import Station


@override_settings(SECURE_SSL_REDIRECT=False)
class PublisherArtistManagementAPITestCase(TestCase):
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

        self.publisher_profile = PublisherProfile.objects.create(
            user=self.publisher_user,
            publisher_id='PUB-ART-001',
            company_name='Test Publisher',
            country='Ghana',
            active=True,
        )

        self.token, _ = Token.objects.get_or_create(user=self.publisher_user)

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
            publisher=self.publisher_profile,
            verification_status='verified',
        )

        self.album = Album.objects.create(
            artist=self.artist,
            title='Test Album',
            genre=genre,
        )

        audio_file = SimpleUploadedFile(
            'track.mp3',
            b'fake-mp3-data',
            content_type='audio/mpeg',
        )

        self.track = Track.objects.create(
            artist=self.artist,
            publisher=self.publisher_profile,
            title='Test Track',
            album=self.album,
            audio_file=audio_file,
            genre=genre,
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('15.25'),
            active=True,
        )

        PublisherArtistRelationship.objects.create(
            publisher=self.publisher_profile,
            artist=self.artist,
            relationship_type='exclusive',
            royalty_split_percentage=Decimal('60.00'),
            advance_amount=Decimal('5000.00'),
            start_date=timezone.now().date() - timedelta(days=90),
            end_date=timezone.now().date() + timedelta(days=275),
            status='active',
            created_by=self.publisher_user,
        )

        station_user = user_model.objects.create_user(
            email='station@example.com',
            password='strong-password',
            first_name='Station',
            last_name='User',
        )
        station_user.user_type = 'Station'
        station_user.save(update_fields=['user_type'])

        station = Station.objects.create(
            user=station_user,
            name='Test Station',
            station_id='ST-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        now = timezone.now()

        PlayLog.objects.create(
            track=self.track,
            station=station,
            source='Radio',
            played_at=now - timedelta(days=1),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('4.50'),
            avg_confidence_score=Decimal('0.89'),
            claimed=True,
        )

        StreamLog.objects.create(
            track=self.track,
            played_at=now - timedelta(days=2),
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('1.25'),
            claimed=False,
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        jwt_token = AccessToken.for_user(self.publisher_user)
        jwt_token['user_id'] = str(self.publisher_user.user_id)
        jwt_token['user_type'] = self.publisher_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(jwt_token)}')

    def test_artist_listing_returns_payload_with_token(self) -> None:
        url = reverse('publishers:publisher-artists')
        response = self.client.get(url, {'publisher_id': self.publisher_profile.publisher_id})

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload.get('message'), 'Successful')
        data = payload.get('data') or {}
        summary = data.get('summary') or {}
        artists = (data.get('artists') or {}).get('results') or []

        self.assertGreaterEqual(summary.get('totalArtists', 0), 1)
        self.assertGreaterEqual(summary.get('totalStreams', 0), 1)
        self.assertGreaterEqual(len(artists), 1)

        first_artist = artists[0]
        self.assertEqual(first_artist.get('artistId'), self.artist.artist_id)
        self.assertEqual(first_artist.get('stageName'), self.artist.stage_name)
        self.assertIn('stats', first_artist)
        self.assertIn('contract', first_artist)
        self.assertIn('recentActivity', first_artist)

    def test_artist_listing_allows_jwt_authentication(self) -> None:
        url = reverse('publishers:publisher-artists')
        response = self.jwt_client.get(url, {'publisher_id': self.publisher_profile.publisher_id})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

    def test_artist_detail_returns_expected_fields(self) -> None:
        url = reverse('publishers:publisher-artist-detail')
        response = self.client.get(
            url,
            {
                'publisher_id': self.publisher_profile.publisher_id,
                'artist_id': self.artist.artist_id,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        self.assertEqual(data.get('artistId'), self.artist.artist_id)
        self.assertIn('songs', data)
        self.assertIn('royaltyHistory', data)
        self.assertIn('stats', data)
        stats = data.get('stats') or {}
        self.assertGreaterEqual(stats.get('totalStreams', 0), 1)
        self.assertIn('earnings', stats)

    def test_artist_detail_rejects_unknown_artist(self) -> None:
        other_user = get_user_model().objects.create_user(
            email='other@example.com',
            password='strong-password',
        )
        other_publisher = PublisherProfile.objects.create(
            user=other_user,
            publisher_id='PUB-OTHER',
            company_name='Other Publisher',
        )

        url = reverse('publishers:publisher-artist-detail')
        response = self.client.get(
            url,
            {
                'publisher_id': other_publisher.publisher_id,
                'artist_id': self.artist.artist_id,
            },
        )

        self.assertEqual(response.status_code, 404)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Errors')

