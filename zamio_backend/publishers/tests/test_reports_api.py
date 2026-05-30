from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from artists.models import Artist, Track
from music_monitor.models import PlayLog
from publishers.models import PublisherProfile
from stations.models import Station

pytestmark = pytest.mark.django_db


@pytest.fixture
def publisher_reports_setup():
    user_model = get_user_model()
    now = timezone.now()

    publisher_user = user_model.objects.create_user(
        email='reports-publisher@example.com',
        password='strongpassword',
        first_name='Report',
        last_name='Publisher',
    )
    publisher_user.user_type = 'Publisher'
    publisher_user.save(update_fields=['user_type'])

    publisher = PublisherProfile.objects.create(
        user=publisher_user,
        publisher_id='pub-123',
        company_name='Reporting House',
    )

    artist_one_user = user_model.objects.create_user(
        email='artist-one@example.com',
        password='password123',
        first_name='Artist',
        last_name='One',
    )
    artist_one_user.user_type = 'Artist'
    artist_one_user.save(update_fields=['user_type'])

    artist_two_user = user_model.objects.create_user(
        email='artist-two@example.com',
        password='password123',
        first_name='Artist',
        last_name='Two',
    )
    artist_two_user.user_type = 'Artist'
    artist_two_user.save(update_fields=['user_type'])

    artist_one = Artist.objects.create(
        user=artist_one_user,
        stage_name='First Artist',
        region='Ghana',
    )
    artist_two = Artist.objects.create(
        user=artist_two_user,
        stage_name='Second Artist',
        region='International',
    )

    track_one = Track.objects.create(
        title='Track One',
        artist=artist_one,
        publisher=publisher,
    )
    track_two = Track.objects.create(
        title='Track Two',
        artist=artist_two,
        publisher=publisher,
    )

    station_local = Station.objects.create(
        user=user_model.objects.create_user(
            email='station-local@example.com',
            password='password123',
            first_name='Local',
            last_name='Station',
        ),
        name='Joy FM',
        region='Ghana',
    )

    station_global = Station.objects.create(
        user=user_model.objects.create_user(
            email='station-global@example.com',
            password='password123',
            first_name='Global',
            last_name='Station',
        ),
        name='BBC Africa',
        region='International',
    )

    # Recent play logs within default 30-day window
    for day_offset in range(3):
        PlayLog.objects.create(
            track=track_one,
            station=station_local,
            source='Radio',
            played_at=now - timedelta(days=day_offset + 2),
            royalty_amount=Decimal('5.00'),
        )
    for day_offset in range(2):
        PlayLog.objects.create(
            track=track_two,
            station=station_global,
            source='Radio',
            played_at=now - timedelta(days=day_offset + 4),
            royalty_amount=Decimal('7.50'),
        )

    # Historical logs to influence growth calculations (previous period)
    PlayLog.objects.create(
        track=track_one,
        station=station_local,
        source='Radio',
        played_at=now - timedelta(days=45),
        royalty_amount=Decimal('2.50'),
    )
    PlayLog.objects.create(
        track=track_two,
        station=station_global,
        source='Radio',
        played_at=now - timedelta(days=50),
        royalty_amount=Decimal('3.25'),
    )

    return {
        'publisher': publisher,
        'publisher_user': publisher_user,
        'station_local': station_local,
        'station_global': station_global,
    }


def test_publisher_reports_requires_auth(publisher_reports_setup):
    publisher = publisher_reports_setup['publisher']
    client = APIClient()
    url = reverse('publishers:publisher-reports')

    response = client.get(url, {'publisher_id': publisher.publisher_id})

    assert response.status_code == 401


def test_publisher_reports_with_token_auth(publisher_reports_setup):
    publisher = publisher_reports_setup['publisher']
    publisher_user = publisher_reports_setup['publisher_user']
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=publisher_user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    url = reverse('publishers:publisher-reports')
    response = client.get(url, {'publisher_id': publisher.publisher_id, 'period': 'last30days'})

    assert response.status_code == 200
    payload = response.json()
    data = payload.get('data') or {}

    assert 'overview' in data
    overview = data['overview']
    assert overview['totalEarnings'] > 0
    assert overview['totalAirplay'] == 5
    assert overview['totalStations'] == 2
    assert overview['growth']['earnings'] >= 0

    stations = data.get('stationPerformance') or []
    assert len(stations) >= 2
    first_station = stations[0]
    assert 'station' in first_station and 'earnings' in first_station
    assert first_station['earnings'] > 0

    artists = data.get('artistPerformance') or []
    assert len(artists) == 2
    assert {artist['artist'] for artist in artists} == {'First Artist', 'Second Artist'}

    monthly = data.get('monthlyTrends') or []
    assert monthly, 'monthly trends should not be empty'
    assert {'month', 'year', 'earnings', 'airplay'}.issubset(monthly[0].keys())

    regions = data.get('regionalPerformance') or []
    assert regions
    region_names = {region['region'] for region in regions}
    assert {'Ghana', 'International'}.issubset(region_names)

    filters = data.get('filters') or {}
    assert 'stations' in filters and filters['stations']
    assert 'regions' in filters and 'Ghana' in filters['regions']


def test_publisher_reports_with_jwt_auth(publisher_reports_setup):
    publisher = publisher_reports_setup['publisher']
    publisher_user = publisher_reports_setup['publisher_user']
    client = APIClient()

    refresh = RefreshToken.for_user(publisher_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    url = reverse('publishers:publisher-reports')
    response = client.get(url, {'publisher_id': publisher.publisher_id, 'period': 'last7days'})

    assert response.status_code == 200
    payload = response.json()
    data = payload.get('data') or {}
    assert data.get('overview', {}).get('totalAirplay') >= 0


def test_publisher_reports_region_filter(publisher_reports_setup):
    publisher = publisher_reports_setup['publisher']
    publisher_user = publisher_reports_setup['publisher_user']
    station_local = publisher_reports_setup['station_local']
    client = APIClient()

    token, _ = Token.objects.get_or_create(user=publisher_user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    url = reverse('publishers:publisher-reports')
    response = client.get(
        url,
        {
            'publisher_id': publisher.publisher_id,
            'region': station_local.region,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    data = payload.get('data') or {}

    stations = data.get('stationPerformance') or []
    assert all(station['region'] == station_local.region for station in stations)
    regions = data.get('regionalPerformance') or []
    assert {region['region'] for region in regions} == {station_local.region}
