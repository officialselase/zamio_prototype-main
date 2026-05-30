from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from music_monitor.models import Dispute, PlayLog
from publishers.models import PublisherArtistRelationship, PublisherProfile, PublishingAgreement
from royalties.models import RoyaltyWithdrawal
from stations.models import Station
from artists.models import Artist, Track


pytestmark = pytest.mark.django_db


@pytest.fixture
def publisher_dashboard_setup():
    user_model = get_user_model()
    now = timezone.now()

    publisher_user = user_model.objects.create_user(
        email='publisher@example.com',
        password='password123',
        first_name='Pub',
        last_name='Lisher',
    )
    publisher_user.user_type = 'Publisher'
    publisher_user.save(update_fields=['user_type'])

    publisher = PublisherProfile.objects.create(
        user=publisher_user,
        publisher_id=str(uuid4()),
        company_name='Test Publishing',
        writer_split=Decimal('40.0'),
        publisher_split=Decimal('60.0'),
        verified=True,
    )

    artist_user = user_model.objects.create_user(
        email='artist@example.com',
        password='password123',
        first_name='Art',
        last_name='Ist',
    )
    artist_user.user_type = 'Artist'
    artist_user.save(update_fields=['user_type'])

    artist = Artist.objects.create(
        user=artist_user,
        stage_name='Artist One',
        region='Greater Accra',
    )

    audio_file = SimpleUploadedFile('test.mp3', b'fake-audio', content_type='audio/mpeg')
    track = Track.objects.create(
        title='Sample Track',
        artist=artist,
        audio_file=audio_file,
        publisher=publisher,
    )

    agreement = PublishingAgreement.objects.create(
        publisher=publisher,
        songwriter=artist,
        track=track,
        writer_share=Decimal('40.0'),
        publisher_share=Decimal('60.0'),
        status='accepted',
    )

    station_user = user_model.objects.create_user(
        email='station@example.com',
        password='password123',
        first_name='Sta',
        last_name='Tion',
    )
    station_user.user_type = 'Station'
    station_user.save(update_fields=['user_type'])

    station = Station.objects.create(
        user=station_user,
        name='Test Station',
        region='Greater Accra',
    )

    recent_log = PlayLog.objects.create(
        track=track,
        station=station,
        source='Radio',
        played_at=now - timedelta(days=1),
        royalty_amount=Decimal('5.00'),
        avg_confidence_score=Decimal('0.85'),
        claimed=True,
    )
    PlayLog.objects.create(
        track=track,
        station=station,
        source='Streaming',
        played_at=now - timedelta(days=2),
        royalty_amount=Decimal('3.00'),
        avg_confidence_score=Decimal('0.90'),
        flagged=True,
    )
    PlayLog.objects.create(
        track=track,
        station=station,
        source='Radio',
        played_at=now - timedelta(days=40),
        royalty_amount=Decimal('2.50'),
    )

    RoyaltyWithdrawal.objects.create(
        requester=publisher_user,
        requester_type='publisher',
        publisher=publisher,
        amount=Decimal('150.00'),
        currency='GHS',
        status='processed',
        processed_at=now - timedelta(days=2),
    )

    PublisherArtistRelationship.objects.create(
        publisher=publisher,
        artist=artist,
        royalty_split_percentage=Decimal('60.0'),
        start_date=(now - timedelta(days=90)).date(),
        status='active',
    )

    Dispute.objects.create(
        playlog=recent_log,
        dispute_status='Flagged',
    )

    return {
        'publisher': publisher,
        'user': publisher_user,
        'agreement': agreement,
    }


def test_publisher_dashboard_requires_auth(publisher_dashboard_setup):
    publisher = publisher_dashboard_setup['publisher']
    client = APIClient()
    url = reverse('publishers:publisher-dashboard')

    response = client.get(url, {'publisher_id': publisher.publisher_id})

    assert response.status_code == 401


def test_publisher_dashboard_token_auth(publisher_dashboard_setup):
    publisher = publisher_dashboard_setup['publisher']
    user = publisher_dashboard_setup['user']
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    url = reverse('publishers:publisher-dashboard')

    response = client.get(
        url,
        {'publisher_id': publisher.publisher_id, 'period': 'monthly'},
        HTTP_AUTHORIZATION=f'Token {token.key}',
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['data']['stats']['totalPerformances']['value'] >= 0
    assert payload['data']['topSongs'][0]['title'] == 'Sample Track'
    assert payload['data']['regionPerformance'][0]['region'] == 'Greater Accra'


def test_publisher_dashboard_jwt_auth(publisher_dashboard_setup):
    publisher = publisher_dashboard_setup['publisher']
    user = publisher_dashboard_setup['user']
    client = APIClient()
    token = RefreshToken.for_user(user)
    access = str(token.access_token)
    url = reverse('publishers:publisher-dashboard')

    response = client.get(
        url,
        {'publisher_id': publisher.publisher_id, 'period': 'weekly'},
        HTTP_AUTHORIZATION=f'Bearer {access}',
    )

    assert response.status_code == 200
    payload = response.json()
    assert 'performanceScore' in payload['data']
    assert payload['data']['metadata']['period'] == 'weekly'
