from datetime import timedelta
import uuid

from django.urls import reverse
from django.utils import timezone
from django.core.files.base import ContentFile
from rest_framework.test import APITestCase

from accounts.models import User
from artists.models import Artist, Track
from music_monitor.models import PlayLog, AudioDetection, RoyaltyDistribution, Dispute
from publishers.models import PublisherProfile, PublishingAgreement
from royalties.models import PartnerPRO, ReciprocalAgreement
from stations.models import Station


class AdminDashboardApiTests(APITestCase):
    def setUp(self):
        self.url = reverse('analytics:admin_analytics')
        self.password = 'testpass123'
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password=self.password,
            is_staff=True
        )
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password=self.password
        )

    def _seed_dashboard_data(self):
        now = timezone.now()

        station_user = User.objects.create_user(
            email='station@example.com',
            password=self.password
        )
        station = Station.objects.create(
            user=station_user,
            name='Accra Central FM',
            station_class='class_a',
            station_type='commercial',
            active=True
        )

        artist_user = User.objects.create_user(
            email='artist@example.com',
            password=self.password
        )
        artist = Artist.objects.create(
            user=artist_user,
            stage_name='Artist One',
            artist_id='ART123',
            profile_completed=True,
            active=True
        )

        audio_file = ContentFile(b'test audio', name='song.mp3')
        track = Track.objects.create(
            artist=artist,
            title='Test Song',
            audio_file=audio_file,
            active=True
        )

        play_log = PlayLog.objects.create(
            track=track,
            station=station,
            source='Radio',
            played_at=now - timedelta(minutes=5),
            duration=timedelta(minutes=3),
            royalty_amount=2.5,
            avg_confidence_score=92,
            active=True
        )

        AudioDetection.objects.create(
            session_id=uuid.uuid4(),
            station=station,
            track=track,
            detection_source='local',
            confidence_score=0.98,
            processing_status='completed',
            audio_timestamp=now - timedelta(minutes=5)
        )

        publisher_user = User.objects.create_user(
            email='publisher@example.com',
            password=self.password
        )
        publisher = PublisherProfile.objects.create(
            user=publisher_user,
            company_name='Zamio Publishing',
            profile_completed=True,
            revenue_split_completed=True,
            payment_info_added=True,
            active=True,
            verified=True
        )

        PublishingAgreement.objects.create(
            publisher=publisher,
            songwriter=artist,
            track=track,
            writer_share=50,
            publisher_share=50,
            status='accepted'
        )

        partner_user = User.objects.create_user(
            email='pro@example.com',
            password=self.password
        )
        partner_pro = PartnerPRO.objects.create(
            user=partner_user,
            company_name='Global PRO',
            is_active=True,
            active=True
        )

        ReciprocalAgreement.objects.create(
            partner=partner_pro,
            territory='GH',
            effective_date=now.date() - timedelta(days=90),
            expiry_date=now.date() + timedelta(days=20),
            status='Active'
        )

        RoyaltyDistribution.objects.create(
            play_log=play_log,
            recipient=artist_user,
            recipient_type='artist',
            gross_amount=100,
            net_amount=85,
            percentage_split=50,
            status='paid',
            calculated_at=now - timedelta(days=2),
            paid_at=now - timedelta(days=1)
        )

        RoyaltyDistribution.objects.create(
            play_log=play_log,
            recipient=publisher_user,
            recipient_type='publisher',
            gross_amount=80,
            net_amount=60,
            percentage_split=50,
            status='approved',
            calculated_at=now - timedelta(days=2)
        )

        Dispute.objects.create(
            playlog=play_log,
            dispute_status='Pending',
            active=True
        )

    def test_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_requires_admin_privileges(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403, response.data if hasattr(response, 'data') else response.content)

    def test_returns_dashboard_payload(self):
        self._seed_dashboard_data()
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.data if hasattr(response, 'data') else response.content)

        data = response.data

        self.assertIn('platformStats', data)
        self.assertIn('publisherStats', data)
        self.assertIn('recentActivity', data)

        platform_stats = data['platformStats']
        self.assertGreaterEqual(platform_stats['totalStations'], 1)
        self.assertGreater(platform_stats['totalRoyalties'], 0)

        publisher_stats = data['publisherStats']
        self.assertGreaterEqual(publisher_stats['totalPublishers'], 1)
        self.assertGreaterEqual(publisher_stats['activeAgreements'], 1)

        recent_activity = data['recentActivity']
        self.assertTrue(any(event['type'] == 'payment' for event in recent_activity))
