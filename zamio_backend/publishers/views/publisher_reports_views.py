from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Iterable, List, Tuple

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.models import Track
from music_monitor.models import PlayLog
from publishers.models import PublisherProfile

User = get_user_model()

PeriodKey = str

PERIOD_DAY_MAP: Dict[PeriodKey, int] = {
    'last7days': 7,
    'last30days': 30,
    'last3months': 90,
    'last6months': 180,
    'lastyear': 365,
}

DEFAULT_PERIOD: PeriodKey = 'last30days'


@dataclass
class PeriodWindow:
    key: PeriodKey
    start: timezone.datetime
    end: timezone.datetime
    previous_start: timezone.datetime
    previous_end: timezone.datetime


def _resolve_period_window(period: PeriodKey | None) -> PeriodWindow:
    period_key = (period or DEFAULT_PERIOD).lower()
    window_days = PERIOD_DAY_MAP.get(period_key, PERIOD_DAY_MAP[DEFAULT_PERIOD])

    now = timezone.now()
    end = now
    start = now - timedelta(days=max(window_days - 1, 0))

    previous_end = start - timedelta(microseconds=1)
    previous_start = previous_end - timedelta(days=max(window_days - 1, 0))

    return PeriodWindow(period_key, start, end, previous_start, previous_end)


def _resolve_publisher(request, publisher_id: str | None) -> Tuple[PublisherProfile | None, Dict[str, List[str]]]:
    errors: Dict[str, List[str]] = {}
    publisher: PublisherProfile | None = None

    if publisher_id:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(publisher_id=publisher_id)
        except PublisherProfile.DoesNotExist:
            errors['publisher'] = ['Publisher not found.']
    else:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(user=request.user)
        except PublisherProfile.DoesNotExist:
            errors['publisher'] = ['Publisher profile not found for user.']

    return publisher, errors


def _decimal_to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _calculate_growth(current: float, previous: float) -> float:
    if previous and float(previous) > 0:
        try:
            return round(((float(current) - float(previous)) / float(previous)) * 100, 2)
        except ZeroDivisionError:
            return 100.0
    if current:
        return 100.0
    return 0.0


def _apply_filters(queryset, station_identifier: str | None, region: str | None):
    if station_identifier:
        queryset = queryset.filter(
            Q(station__station_id=station_identifier) | Q(station__pk=station_identifier)
        )
    if region:
        queryset = queryset.filter(station__region__iexact=region)
    return queryset


def _station_trend(current_value: float, previous_value: float) -> str:
    return 'up' if float(current_value or 0) >= float(previous_value or 0) else 'down'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_reports_view(request):
    payload: Dict[str, object] = {}
    errors: Dict[str, Iterable[str]] = {}

    query_params = request.query_params
    publisher_id = query_params.get('publisher_id')
    period_key = query_params.get('period')
    region_filter = (query_params.get('region') or '').strip()
    station_filter = query_params.get('station_id') or query_params.get('station')

    if station_filter and station_filter.lower() == 'all':
        station_filter = None
    if region_filter and region_filter.lower() == 'all':
        region_filter = ''

    publisher, publisher_errors = _resolve_publisher(request, publisher_id)
    if publisher_errors:
        payload['message'] = 'Errors'
        payload['errors'] = publisher_errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    assert publisher is not None  # For type-checkers

    has_staff_privileges = bool(getattr(request.user, 'is_staff', False)) or bool(
        getattr(request.user, 'is_superuser', False)
    )

    if publisher.user_id != request.user.id and not has_staff_privileges:
        payload['message'] = 'Errors'
        payload['errors'] = {'publisher': ['You do not have permission to view these reports.']}
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    period_window = _resolve_period_window(period_key)

    publisher_tracks = Track.objects.filter(
        Q(publisher=publisher)
        | Q(
            publishingagreement__publisher=publisher,
            publishingagreement__status__in=['accepted'],
            publishingagreement__is_archived=False,
        )
        | Q(artist__publisher=publisher)
    ).distinct()

    base_logs = (
        PlayLog.objects.filter(track__in=publisher_tracks, is_archived=False)
        .select_related('station', 'track', 'track__artist')
        .annotate(effective_played_at=Coalesce('played_at', 'created_at'))
    )

    base_logs = _apply_filters(base_logs, station_filter, region_filter)

    current_logs = base_logs.filter(
        effective_played_at__gte=period_window.start,
        effective_played_at__lte=period_window.end,
    )
    previous_logs = base_logs.filter(
        effective_played_at__gte=period_window.previous_start,
        effective_played_at__lte=period_window.previous_end,
    )

    totals = current_logs.aggregate(
        total_earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
        total_airplay=Count('id'),
        total_stations=Count('station', distinct=True),
        total_artists=Count('track__artist', distinct=True),
    )

    previous_totals = previous_logs.aggregate(
        total_earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
        total_airplay=Count('id'),
        total_stations=Count('station', distinct=True),
        total_artists=Count('track__artist', distinct=True),
    )

    total_earnings = _decimal_to_float(totals.get('total_earnings'))
    total_airplay = int(totals.get('total_airplay') or 0)
    total_stations = int(totals.get('total_stations') or 0)
    total_artists = int(totals.get('total_artists') or 0)

    overview = {
        'totalEarnings': total_earnings,
        'totalAirplay': total_airplay,
        'totalStations': total_stations,
        'totalArtists': total_artists,
        'growth': {
            'earnings': _calculate_growth(total_earnings, _decimal_to_float(previous_totals.get('total_earnings'))),
            'airplay': _calculate_growth(total_airplay, previous_totals.get('total_airplay') or 0),
            'stations': _calculate_growth(total_stations, previous_totals.get('total_stations') or 0),
            'artists': _calculate_growth(total_artists, previous_totals.get('total_artists') or 0),
        },
    }

    station_stats = list(
        current_logs.values('station_id', 'station__station_id', 'station__name', 'station__region')
        .annotate(
            airplay=Count('id'),
            earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
            tracks=Count('track', distinct=True),
            artists=Count('track__artist', distinct=True),
        )
        .order_by('-earnings')
    )

    previous_station_stats = {
        stat['station_id']: stat
        for stat in previous_logs.values('station_id')
        .annotate(
            airplay=Count('id'),
            earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
        )
    }

    station_performance = []
    for stat in station_stats:
        previous_entry = previous_station_stats.get(stat['station_id'])
        previous_plays = previous_entry['airplay'] if previous_entry else 0
        previous_earnings = previous_entry['earnings'] if previous_entry else 0
        current_airplay = int(stat['airplay'] or 0)
        current_earnings = _decimal_to_float(stat['earnings'])
        avg_per_play = current_earnings / current_airplay if current_airplay else 0.0
        station_performance.append(
            {
                'stationId': stat['station__station_id'] or str(stat['station_id']),
                'station': stat['station__name'] or 'Unknown Station',
                'region': stat['station__region'] or 'Unknown',
                'airplay': current_airplay,
                'earnings': current_earnings,
                'tracks': int(stat['tracks'] or 0),
                'artists': int(stat['artists'] or 0),
                'avgPerPlay': round(avg_per_play, 2),
                'trend': _station_trend(current_airplay, previous_plays),
                'earningsTrend': _station_trend(current_earnings, _decimal_to_float(previous_earnings)),
            }
        )

    artist_stats = list(
        current_logs.values('track__artist_id', 'track__artist__stage_name', 'track__artist__region')
        .annotate(
            airplay=Count('id'),
            earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
            tracks=Count('track', distinct=True),
        )
        .order_by('-earnings')
    )

    previous_artist_stats = {
        stat['track__artist_id']: stat
        for stat in previous_logs.values('track__artist_id')
        .annotate(
            airplay=Count('id'),
            earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
        )
    }

    artist_station_counts: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for entry in current_logs.values('track__artist_id', 'station__name').annotate(play_count=Count('id')):
        artist_station_counts[entry['track__artist_id']][entry['station__name'] or 'Unknown Station'] = int(
            entry['play_count'] or 0
        )

    artist_performance = []
    for stat in artist_stats:
        artist_id = stat['track__artist_id']
        previous_entry = previous_artist_stats.get(artist_id)
        previous_airplay = previous_entry['airplay'] if previous_entry else 0
        previous_earnings = previous_entry['earnings'] if previous_entry else 0
        current_airplay = int(stat['airplay'] or 0)
        current_earnings = _decimal_to_float(stat['earnings'])
        track_count = int(stat['tracks'] or 0)
        avg_per_track = current_earnings / track_count if track_count else 0.0

        top_station_name = 'Unknown Station'
        if artist_station_counts.get(artist_id):
            top_station_name = max(
                artist_station_counts[artist_id].items(),
                key=lambda item: (item[1], item[0]),
            )[0]

        artist_performance.append(
            {
                'artistId': artist_id,
                'artist': stat['track__artist__stage_name'] or 'Unknown Artist',
                'region': stat['track__artist__region'] or 'Unknown',
                'totalAirplay': current_airplay,
                'totalEarnings': current_earnings,
                'topStation': top_station_name,
                'tracks': track_count,
                'avgPerTrack': round(avg_per_track, 2),
                'trend': _station_trend(current_earnings, _decimal_to_float(previous_earnings)),
                'airplayTrend': _station_trend(current_airplay, previous_airplay),
            }
        )

    monthly_trends = []
    for entry in (
        current_logs.annotate(month_bucket=TruncMonth('effective_played_at'))
        .values('month_bucket')
        .annotate(
            earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
            airplay=Count('id'),
        )
        .order_by('month_bucket')
    ):
        bucket = entry['month_bucket']
        if not bucket:
            continue
        monthly_trends.append(
            {
                'month': bucket.strftime('%b'),
                'year': bucket.strftime('%Y'),
                'label': bucket.strftime('%b %Y'),
                'earnings': _decimal_to_float(entry['earnings']),
                'airplay': int(entry['airplay'] or 0),
            }
        )

    regional_performance = []
    regional_stats = list(
        current_logs.values('station__region')
        .annotate(
            earnings=Coalesce(Sum('royalty_amount'), Value(Decimal('0'))),
            airplay=Count('id'),
            stations=Count('station', distinct=True),
        )
        .order_by('-earnings')
    )

    total_regional_earnings = sum(_decimal_to_float(entry['earnings']) for entry in regional_stats) or 0.0
    for entry in regional_stats:
        earnings_value = _decimal_to_float(entry['earnings'])
        percentage = 0.0
        if total_regional_earnings > 0:
            percentage = round((earnings_value / total_regional_earnings) * 100, 2)

        regional_performance.append(
            {
                'region': entry['station__region'] or 'Unknown',
                'earnings': earnings_value,
                'airplay': int(entry['airplay'] or 0),
                'stations': int(entry['stations'] or 0),
                'percentage': percentage,
            }
        )

    available_stations = (
        base_logs.values('station__station_id', 'station__name')
        .distinct()
        .order_by('station__name')
    )
    station_filters = [
        {
            'stationId': entry['station__station_id'] or str(entry.get('station_id')),
            'name': entry['station__name'] or 'Unknown Station',
        }
        for entry in available_stations
    ]

    raw_region_values = list(
        base_logs.values_list('station__region', flat=True)
        .distinct()
        .order_by('station__region')
    )

    region_filters: List[str] = []
    include_unknown = False
    for region_value in raw_region_values:
        if (region_value or '').strip():
            region_filters.append(region_value)  # type: ignore[arg-type]
        else:
            include_unknown = True
    if include_unknown:
        region_filters.append('Unknown')

    filters = {
        'stations': station_filters,
        'regions': [region or 'Unknown' for region in region_filters if (region or '').strip()],
        'availablePeriods': [
            {'value': key, 'label': label}
            for key, label in [
                ('last7days', 'Last 7 Days'),
                ('last30days', 'Last 30 Days'),
                ('last3months', 'Last 3 Months'),
                ('last6months', 'Last 6 Months'),
                ('lastyear', 'Last Year'),
            ]
        ],
        'selected': {
            'period': period_window.key,
            'stationId': station_filter or 'all',
            'region': region_filter or 'all',
        },
    }

    payload['message'] = 'Successful'
    payload['data'] = {
        'overview': overview,
        'stationPerformance': station_performance,
        'artistPerformance': artist_performance,
        'monthlyTrends': monthly_trends,
        'regionalPerformance': regional_performance,
        'filters': filters,
        'metadata': {
            'periodStart': period_window.start.isoformat(),
            'periodEnd': period_window.end.isoformat(),
        },
    }

    return Response(payload, status=status.HTTP_200_OK)
