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
from music_monitor.models import Dispute, PlayLog, StreamLog
from publishers.models import PublisherProfile, PublishingAgreement
from royalties.models import RoyaltyWithdrawal
from stations.models import Station


@override_settings(SECURE_SSL_REDIRECT=False)
class PublisherRoyaltiesAPITestCase(TestCase):
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
            publisher_id='PUB-ROY-001',
            company_name='Royalties Publisher',
            country='Ghana',
            payout_currency='GHS',
            payout_frequency='Monthly',
            minimum_payout_amount=Decimal('500.00'),
            writer_split=Decimal('70.00'),
            publisher_split=Decimal('25.00'),
            mechanical_share=Decimal('5.00'),
        )

        self.token, _ = Token.objects.get_or_create(user=self.publisher_user)

        genre = Genre.objects.create(name='Afrobeats')

        artist_user = user_model.objects.create_user(
            email='artist@example.com',
            password='strong-password',
            first_name='Artist',
            last_name='Example',
        )
        artist_user.user_type = 'Artist'
        artist_user.save(update_fields=['user_type'])

        self.artist = Artist.objects.create(
            user=artist_user,
            stage_name='Test Artist',
            publisher=self.publisher,
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
            genre=genre,
            duration=timedelta(minutes=3),
            royalty_amount=Decimal('10.00'),
        )

        PublishingAgreement.objects.create(
            publisher=self.publisher,
            songwriter=self.artist,
            track=self.track,
            writer_share=Decimal('70.00'),
            publisher_share=Decimal('25.00'),
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
            name='Joy FM',
            station_id='ST-001',
            country='Ghana',
            region='Greater Accra',
            active=True,
        )

        now = timezone.now()
        previous_month = now - timedelta(days=30)

        self.recent_playlog = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=now - timedelta(days=1),
            start_time=now - timedelta(days=1, minutes=3),
            stop_time=now - timedelta(days=1, minutes=2),
            duration=timedelta(minutes=1),
            royalty_amount=Decimal('5.50'),
            avg_confidence_score=Decimal('0.92'),
            claimed=True,
        )

        self.previous_playlog = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            source='Radio',
            played_at=previous_month,
            start_time=previous_month - timedelta(minutes=3),
            stop_time=previous_month - timedelta(minutes=2),
            duration=timedelta(minutes=1),
            royalty_amount=Decimal('3.40'),
            avg_confidence_score=Decimal('0.85'),
            claimed=False,
            flagged=True,
        )

        Dispute.objects.create(
            playlog=self.previous_playlog,
            dispute_status='Pending',
            dispute_comments='Review requested',
        )

        StreamLog.objects.create(
            track=self.track,
            played_at=now - timedelta(days=2),
            duration=timedelta(minutes=4),
            royalty_amount=Decimal('2.25'),
        )

        RoyaltyWithdrawal.objects.create(
            requester=self.publisher_user,
            requester_type='publisher',
            amount=Decimal('4.00'),
            currency='GHS',
            artist=self.artist,
            publisher=self.publisher,
            status='processed',
            payment_details={
                'period': now.strftime('%B %Y'),
                'due_date': (now + timedelta(days=3)).strftime('%Y-%m-%d'),
            },
            processed_at=now - timedelta(days=1),
        )

        RoyaltyWithdrawal.objects.create(
            requester=self.publisher_user,
            requester_type='publisher',
            amount=Decimal('6.00'),
            currency='GHS',
            artist=self.artist,
            publisher=self.publisher,
            status='approved',
            payment_details={
                'period': previous_month.strftime('%B %Y'),
                'due_date': (previous_month + timedelta(days=5)).strftime('%Y-%m-%d'),
            },
        )

        RoyaltyWithdrawal.objects.create(
            requester=self.publisher_user,
            requester_type='publisher',
            amount=Decimal('2.50'),
            currency='GHS',
            artist=self.artist,
            publisher=self.publisher,
            status='pending',
            payment_details={
                'period': now.strftime('%B %Y'),
                'due_date': (now + timedelta(days=10)).strftime('%Y-%m-%d'),
            },
        )

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.jwt_client = APIClient()
        access_token = AccessToken.for_user(self.publisher_user)
        access_token['user_id'] = str(self.publisher_user.user_id)
        access_token['user_type'] = self.publisher_user.user_type
        self.jwt_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')

    def test_publisher_royalties_returns_data_with_token(self) -> None:
        url = reverse('publishers:publisher-royalties')
        response = self.client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
                'period': 'monthly',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        summary = data.get('summary') or {}
        self.assertIn('totalEarnings', summary)
        self.assertGreater(summary.get('totalEarnings', 0), 0)
        self.assertIn('paidEarnings', summary)
        self.assertIn('pendingEarnings', summary)
        self.assertIn('disputedEarnings', summary)

        earnings = data.get('earnings') or []
        self.assertGreaterEqual(len(earnings), 1)
        first_period = earnings[0]
        self.assertIn('period', first_period)
        self.assertIn('totalEarnings', first_period)
        self.assertIn('status', first_period)
        self.assertIsInstance(first_period.get('platformBreakdown'), dict)

        top_tracks = data.get('topTracks') or []
        self.assertGreaterEqual(len(top_tracks), 1)
        first_track = top_tracks[0]
        self.assertIn('title', first_track)
        self.assertIn('earnings', first_track)
        self.assertIn('trend', first_track)

        payments = data.get('payments') or {}
        payment_items = payments.get('items') or []
        self.assertGreaterEqual(len(payment_items), 1)
        payment_stats = payments.get('stats') or {}
        self.assertIn('totalScheduled', payment_stats)
        self.assertIn('totalPaid', payment_stats)

        distribution = data.get('distribution') or {}
        splits = distribution.get('splits') or []
        self.assertEqual(len(splits), 3)
        settings = distribution.get('settings') or {}
        self.assertIn('autoPayoutThreshold', settings)
        self.assertIn('paymentFrequency', settings)

    def test_publisher_royalties_allows_jwt_authentication(self) -> None:
        url = reverse('publishers:publisher-royalties')
        response = self.jwt_client.get(
            url,
            {
                'publisher_id': self.publisher.publisher_id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get('message'), 'Successful')

        data = payload.get('data') or {}
        summary = data.get('summary') or {}
        self.assertIn('totalEarnings', summary)
        self.assertIn('currency', summary)
