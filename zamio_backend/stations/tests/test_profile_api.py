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
from music_monitor.models import PlayLog
from stations.models import Station, StationComplianceDocument, StationStaff


@override_settings(SECURE_SSL_REDIRECT=False)
class StationProfileAPITestCase(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()

        self.station_user = user_model.objects.create_user(
            email='station@example.com',
            password='secure-password',
            first_name='Station',
            last_name='Owner',
        )
        self.station_user.phone = '+233200000001'
        self.station_user.save(update_fields=['phone'])
        self.station_user.user_type = 'Station'
        self.station_user.save(update_fields=['user_type'])

        self.station = Station.objects.create(
            user=self.station_user,
            name='Wave FM',
            station_id='ST-PROFILE-001',
            tagline='Your Voice in the Capital',
            founded_year=2004,
            primary_contact_name='Kofi Asante',
            primary_contact_title='Station Manager',
            primary_contact_email='contact@wavefm.com',
            primary_contact_phone='+233201234567',
            phone='+233201234567',
            country='Ghana',
            region='Greater Accra',
            city='Accra',
            coverage_area='Accra Metropolitan Area',
            estimated_listeners=150000,
            broadcast_frequency='104.3 FM',
            license_number='LIC-2025-001',
            license_expiry_date=timezone.now().date() + timedelta(days=180),
            compliance_contact_name='Ama Compliance',
            compliance_contact_email='compliance@wavefm.com',
            compliance_contact_phone='+233208880000',
            emergency_contact_phone='+233200009999',
            social_media_links={'facebook': 'https://facebook.com/wavefm'},
            verification_status='verified',
            active=True,
        )

        self.token, _ = Token.objects.get_or_create(user=self.station_user)

        genre = Genre.objects.create(name='Afrobeats')

        artist_user = user_model.objects.create_user(
            email='artist@example.com',
            password='secure-password',
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
        track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            audio_file=audio_file,
            genre=genre,
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('10.00'),
        )

        now = timezone.now()
        PlayLog.objects.create(
            track=track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(minutes=5),
            start_time=now - timedelta(minutes=6),
            stop_time=now - timedelta(minutes=2),
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('2.50'),
            avg_confidence_score=Decimal('0.92'),
            claimed=True,
            flagged=False,
        )
        PlayLog.objects.create(
            track=track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=1),
            start_time=now - timedelta(days=1, minutes=3),
            stop_time=now - timedelta(days=1, minutes=1),
            duration=timedelta(minutes=2),
            royalty_amount=Decimal('1.75'),
            avg_confidence_score=Decimal('0.64'),
            claimed=False,
            flagged=True,
        )

        StationStaff.objects.create(
            station=self.station,
            name='Ama Serwaa',
            email='ama@wavefm.com',
            phone='+233201110000',
            role='manager',
            permission_level='admin',
            can_upload_playlogs=True,
            can_manage_streams=True,
            can_view_analytics=True,
            hire_date=timezone.now().date() - timedelta(days=365),
            active=True,
        )

        StationComplianceDocument.objects.create(
            station=self.station,
            name='Broadcast License',
            document_type='license',
            status='approved',
            file_size=2_400_000,
            expiry_date=timezone.now().date() + timedelta(days=30),
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.station_user)
        access_token['user_id'] = str(self.station_user.user_id)
        access_token['user_type'] = self.station_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_station_profile_requires_authentication(self) -> None:
        url = reverse('stations:get_station_profile_view')
        response = APIClient().get(url, {'station_id': self.station.station_id}, format='json')
        self.assertEqual(response.status_code, 401)

    def test_station_profile_requires_station_id(self) -> None:
        url = reverse('stations:get_station_profile_view')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Errors')
        self.assertIn('station_id', (payload.get('errors') or {}))

    def test_station_profile_returns_data_with_token(self) -> None:
        url = reverse('stations:get_station_profile_view')
        response = self.client.get(url, {'station_id': self.station.station_id}, format='json')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        profile = data.get('profile') or {}
        stats = data.get('stats') or {}
        recent_activity = data.get('recentActivity') or []
        staff = data.get('staff') or []
        documents = data.get('complianceDocuments') or []

        self.assertEqual(profile.get('name'), 'Wave FM')
        self.assertEqual(profile.get('tagline'), 'Your Voice in the Capital')
        self.assertEqual(profile.get('status'), 'Active')
        self.assertEqual(profile.get('contactName'), 'Kofi Asante')
        self.assertIn('logo', profile)

        self.assertEqual(stats.get('totalDetections'), 2)
        self.assertEqual(stats.get('activeStaff'), 1)
        self.assertIn('accuracy', stats)
        self.assertIn('uptime', stats)

        self.assertGreaterEqual(len(recent_activity), 1)
        self.assertIn('status', recent_activity[0])

        self.assertGreaterEqual(len(staff), 1)
        self.assertEqual(staff[0].get('roleType'), 'admin')
        self.assertIn('permissions', staff[0])

        self.assertGreaterEqual(len(documents), 1)
        self.assertEqual(documents[0].get('status'), 'approved')

    def test_station_profile_allows_jwt_authentication(self) -> None:
        url = reverse('stations:get_station_profile_view')
        response = self.jwt_client.get(url, {'station_id': self.station.station_id}, format='json')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')
        self.assertIn('profile', payload.get('data') or {})
