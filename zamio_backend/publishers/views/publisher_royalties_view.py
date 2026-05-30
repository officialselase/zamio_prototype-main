from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.models import Track
from music_monitor.models import Dispute, PlayLog, StreamLog
from publishers.models import PublisherProfile, PublishingAgreement
from royalties.models import RoyaltyWithdrawal

User = get_user_model()


def _parse_date(value: Optional[str], *, is_end: bool = False) -> Optional[datetime]:
    if not value:
        return None

    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None

    base_time = datetime.max.time() if is_end else datetime.min.time()
    combined = datetime.combine(parsed, base_time)
    if timezone.is_naive(combined):
        combined = timezone.make_aware(combined, timezone.get_default_timezone())
    return combined


def _serialize_datetime(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_default_timezone())
    return value.isoformat()


def _decimal(value: Optional[Decimal]) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(value)
    except Exception:
        return Decimal("0")


def _format_decimal(value: Optional[Decimal]) -> float:
    return float(_decimal(value))


def _calculate_percentage(part: Decimal, total: Decimal) -> float:
    total = _decimal(total)
    if total == 0:
        return 0.0
    return float((part / total) * Decimal("100"))


def _month_end(value: datetime) -> datetime:
    tentative = value.replace(day=28) + timedelta(days=4)
    next_month = tentative.replace(day=1)
    return next_month - timedelta(seconds=1)


def _safe_track_identifier(track: Track) -> str:
    if track.track_id:
        return str(track.track_id)
    return f"TRK-{track.pk}" if track.pk else "unknown-track"


def _resolve_artist_name(track: Track) -> Optional[str]:
    artist = getattr(track, "artist", None)
    if not artist:
        return None
    if getattr(artist, "stage_name", None):
        return artist.stage_name
    user = getattr(artist, "user", None)
    if user and (user.first_name or user.last_name):
        return f"{user.first_name or ''} {user.last_name or ''}".strip() or None
    if user and user.email:
        return user.email
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_royalties_view(request):
    payload: Dict[str, object] = {}
    data: Dict[str, object] = {}
    errors: Dict[str, List[str]] = {}

    query_params = request.query_params
    publisher_id = query_params.get('publisher_id')
    period = (query_params.get('period') or 'monthly').lower()
    start_date_param = query_params.get('start_date')
    end_date_param = query_params.get('end_date')

    publisher: Optional[PublisherProfile] = None

    if publisher_id:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(
                publisher_id=publisher_id
            )
        except PublisherProfile.DoesNotExist:
            errors['publisher_id'] = ['Publisher does not exist']
    else:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(
                user=request.user
            )
        except PublisherProfile.DoesNotExist:
            errors['publisher'] = ['Publisher profile not found for user']

    if publisher and request.user != publisher.user and not request.user.is_staff and not request.user.is_superuser:
        errors['publisher_id'] = ['You do not have permission to view this publisher']

    start_date = _parse_date(start_date_param) if start_date_param else None
    end_date = _parse_date(end_date_param, is_end=True) if end_date_param else None

    if start_date_param and start_date is None:
        errors['start_date'] = ['start_date must be in YYYY-MM-DD format']
    if end_date_param and end_date is None:
        errors['end_date'] = ['end_date must be in YYYY-MM-DD format']

    now = timezone.now()
    if end_date is None:
        end_date = now

    if start_date and start_date > end_date:
        errors['date_range'] = ['start_date must be before end_date']

    if not start_date:
        if period == 'daily':
            start_date = end_date - timedelta(days=7)
        elif period == 'weekly':
            start_date = end_date - timedelta(days=56)
        elif period == 'monthly':
            start_date = end_date - timedelta(days=180)
        elif period == 'quarterly':
            start_date = end_date - timedelta(days=365)
        elif period in ('yearly', 'annual'):
            start_date = end_date - timedelta(days=365)
        elif period in ('all-time', 'alltime', 'lifetime'):
            start_date = None
        else:
            errors['period'] = [
                'Invalid period. Choose from: daily, weekly, monthly, quarterly, yearly, all-time'
            ]

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    publisher_tracks = Track.objects.filter(
        Q(publisher=publisher)
        | Q(
            publishingagreement__publisher=publisher,
            publishingagreement__status__in=['accepted'],
            publishingagreement__is_archived=False,
        )
        | Q(artist__publisher=publisher)
    ).distinct()

    playlogs_qs = (
        PlayLog.objects.filter(track__in=publisher_tracks, is_archived=False)
        .select_related('track', 'track__artist', 'station')
    )
    streamlogs_qs = (
        StreamLog.objects.filter(track__in=publisher_tracks, is_archived=False)
        .select_related('track', 'track__artist')
    )

    if start_date:
        playlogs_qs = playlogs_qs.filter(played_at__gte=start_date)
        streamlogs_qs = streamlogs_qs.filter(played_at__gte=start_date)
    if end_date:
        playlogs_qs = playlogs_qs.filter(played_at__lte=end_date)
        streamlogs_qs = streamlogs_qs.filter(played_at__lte=end_date)

    radio_totals = playlogs_qs.aggregate(
        total=Sum('royalty_amount'),
        duration=Sum('duration'),
    )
    stream_totals = streamlogs_qs.aggregate(
        total=Sum('royalty_amount'),
        duration=Sum('duration'),
    )

    total_radio_earnings = _decimal(radio_totals.get('total'))
    total_stream_earnings = _decimal(stream_totals.get('total'))
    total_earnings = total_radio_earnings + total_stream_earnings

    total_duration = (radio_totals.get('duration') or timedelta()) + (
        stream_totals.get('duration') or timedelta()
    )

    playlog_ids = list(playlogs_qs.values_list('id', flat=True))
    dispute_play_ids: List[int] = []
    if playlog_ids:
        dispute_play_ids = list(
            Dispute.objects.filter(
                playlog_id__in=playlog_ids,
                is_archived=False,
            )
            .exclude(dispute_status__iexact='resolved')
            .values_list('playlog_id', flat=True)
        )

    disputed_total = playlogs_qs.filter(
        Q(flagged=True) | Q(id__in=dispute_play_ids)
    ).aggregate(total=Sum('royalty_amount'))
    disputed_earnings = _decimal(disputed_total.get('total'))

    withdrawals_qs = RoyaltyWithdrawal.objects.filter(publisher=publisher)
    if start_date:
        withdrawals_qs = withdrawals_qs.filter(requested_at__gte=start_date)
    if end_date:
        withdrawals_qs = withdrawals_qs.filter(requested_at__lte=end_date)

    withdrawals = list(
        withdrawals_qs.select_related('artist', 'artist__user').order_by('-requested_at')
    )

    paid_earnings = sum(
        (_decimal(withdrawal.amount) for withdrawal in withdrawals if withdrawal.status == 'processed'),
        Decimal('0'),
    )
    processing_earnings = sum(
        (_decimal(withdrawal.amount) for withdrawal in withdrawals if withdrawal.status == 'approved'),
        Decimal('0'),
    )
    scheduled_earnings = sum(
        (_decimal(withdrawal.amount) for withdrawal in withdrawals if withdrawal.status == 'pending'),
        Decimal('0'),
    )

    pending_earnings = total_earnings - paid_earnings
    if pending_earnings < 0:
        pending_earnings = Decimal('0')

    latest_payment = None
    for withdrawal in withdrawals:
        if withdrawal.status == 'processed' and withdrawal.processed_at:
            latest_payment = withdrawal.processed_at
            break

    previous_start = start_date - (end_date - start_date) if start_date else None
    previous_end = start_date if start_date else None

    previous_total = Decimal('0')
    if previous_start and previous_end:
        previous_logs = PlayLog.objects.filter(
            track__in=publisher_tracks,
            is_archived=False,
            played_at__gte=previous_start,
            played_at__lt=previous_end,
        )
        previous_total = _decimal(
            previous_logs.aggregate(total=Sum('royalty_amount')).get('total')
        )

    trend_value = Decimal('0')
    if previous_total:
        trend_value = ((total_earnings - previous_total) / previous_total) * Decimal('100')

    summary = {
        'totalEarnings': _format_decimal(total_earnings),
        'paidEarnings': _format_decimal(paid_earnings),
        'pendingEarnings': _format_decimal(pending_earnings),
        'processingEarnings': _format_decimal(processing_earnings),
        'scheduledEarnings': _format_decimal(scheduled_earnings),
        'disputedEarnings': _format_decimal(disputed_earnings),
        'currency': publisher.payout_currency or 'GHS',
        'latestPaymentDate': _serialize_datetime(latest_payment),
        'trendPercentage': float(trend_value) if trend_value else 0.0,
        'periodStart': _serialize_datetime(start_date) if start_date else None,
        'periodEnd': _serialize_datetime(end_date) if end_date else None,
        'totalDurationHours': round(total_duration.total_seconds() / 3600, 2)
        if total_duration
        else 0.0,
    }

    monthly_summary: Dict[datetime, Dict[str, object]] = {}
    monthly_track_sets: Dict[datetime, set] = defaultdict(set)
    monthly_artist_sets: Dict[datetime, set] = defaultdict(set)

    radio_monthly = (
        playlogs_qs.filter(played_at__isnull=False)
        .annotate(month=TruncMonth('played_at'))
        .values('month')
        .annotate(
            total=Sum('royalty_amount'),
            duration=Sum('duration'),
        )
        .order_by('month')
    )

    radio_station_monthly = (
        playlogs_qs.filter(played_at__isnull=False)
        .annotate(month=TruncMonth('played_at'))
        .values('month', 'station__name')
        .annotate(royalties=Sum('royalty_amount'), plays=Count('id'))
    )

    radio_monthly_tracks = playlogs_qs.filter(played_at__isnull=False).annotate(
        month=TruncMonth('played_at')
    ).values_list('month', 'track_id')
    radio_monthly_artists = playlogs_qs.filter(played_at__isnull=False).annotate(
        month=TruncMonth('played_at')
    ).values_list('month', 'track__artist_id')

    stream_monthly = (
        streamlogs_qs.filter(played_at__isnull=False)
        .annotate(month=TruncMonth('played_at'))
        .values('month')
        .annotate(
            total=Sum('royalty_amount'),
            duration=Sum('duration'),
        )
        .order_by('month')
    )

    stream_monthly_tracks = streamlogs_qs.filter(played_at__isnull=False).annotate(
        month=TruncMonth('played_at')
    ).values_list('month', 'track_id')
    stream_monthly_artists = streamlogs_qs.filter(played_at__isnull=False).annotate(
        month=TruncMonth('played_at')
    ).values_list('month', 'track__artist_id')

    for month, track_id in radio_monthly_tracks:
        if month:
            monthly_track_sets[month].add(track_id)
    for month, artist_id in radio_monthly_artists:
        if month:
            monthly_artist_sets[month].add(artist_id)
    for month, track_id in stream_monthly_tracks:
        if month:
            monthly_track_sets[month].add(track_id)
    for month, artist_id in stream_monthly_artists:
        if month:
            monthly_artist_sets[month].add(artist_id)

    for entry in radio_monthly:
        month = entry.get('month')
        if not month:
            continue
        bucket = monthly_summary.setdefault(
            month,
            {
                'total': Decimal('0'),
                'duration': timedelta(),
                'platformBreakdown': defaultdict(Decimal),
            },
        )
        bucket['total'] = bucket['total'] + _decimal(entry.get('total'))
        bucket['duration'] = bucket['duration'] + (entry.get('duration') or timedelta())

    for entry in stream_monthly:
        month = entry.get('month')
        if not month:
            continue
        bucket = monthly_summary.setdefault(
            month,
            {
                'total': Decimal('0'),
                'duration': timedelta(),
                'platformBreakdown': defaultdict(Decimal),
            },
        )
        bucket['total'] = bucket['total'] + _decimal(entry.get('total'))
        bucket['duration'] = bucket['duration'] + (entry.get('duration') or timedelta())
        bucket['platformBreakdown']['Streaming'] += _decimal(entry.get('total'))

    for entry in radio_station_monthly:
        month = entry.get('month')
        if not month:
            continue
        station_name = entry.get('station__name') or 'Unassigned Station'
        bucket = monthly_summary.setdefault(
            month,
            {
                'total': Decimal('0'),
                'duration': timedelta(),
                'platformBreakdown': defaultdict(Decimal),
            },
        )
        bucket['platformBreakdown'][station_name] += _decimal(entry.get('royalties'))

    withdrawals_by_period: Dict[str, List[RoyaltyWithdrawal]] = defaultdict(list)
    for withdrawal in withdrawals:
        payment_period = None
        details = withdrawal.payment_details or {}
        if isinstance(details, dict):
            payment_period = details.get('period')
        if not payment_period and withdrawal.requested_at:
            payment_period = withdrawal.requested_at.strftime('%B %Y')
        if payment_period:
            withdrawals_by_period[payment_period].append(withdrawal)

    monthly_earnings: List[Dict[str, object]] = []
    for month in sorted(monthly_summary.keys()):
        bucket = monthly_summary[month]
        total_value = _decimal(bucket.get('total'))
        period_label = month.strftime('%B %Y')
        period_withdrawals = withdrawals_by_period.get(period_label, [])

        status_label = 'pending'
        paid_date = None
        if any(w.status == 'processed' for w in period_withdrawals):
            status_label = 'paid'
            paid_record = next(
                (w for w in period_withdrawals if w.status == 'processed' and w.processed_at),
                None,
            )
            if paid_record:
                paid_date = paid_record.processed_at
        elif any(w.status == 'approved' for w in period_withdrawals):
            status_label = 'processing'
        elif any(w.status == 'pending' for w in period_withdrawals):
            status_label = 'scheduled'

        platform_breakdown_dict = {
            name: _format_decimal(amount)
            for name, amount in bucket['platformBreakdown'].items()
        }

        monthly_earnings.append(
            {
                'period': period_label,
                'startDate': month.date().isoformat(),
                'endDate': _month_end(month).date().isoformat(),
                'totalEarnings': _format_decimal(total_value),
                'status': status_label,
                'paidDate': _serialize_datetime(paid_date),
                'tracks': len(monthly_track_sets.get(month, set())),
                'artists': len(monthly_artist_sets.get(month, set())),
                'broadcastHours': round(
                    bucket['duration'].total_seconds() / 3600, 2
                )
                if bucket['duration']
                else 0.0,
                'platformBreakdown': platform_breakdown_dict,
            }
        )

    station_totals = (
        playlogs_qs.values('station__name', 'station__region', 'station__country')
        .annotate(
            royalties=Sum('royalty_amount'),
            plays=Count('id'),
        )
        .order_by('-royalties')
    )

    station_breakdown: List[Dict[str, object]] = []
    for entry in station_totals:
        royalties_value = _decimal(entry.get('royalties'))
        station_breakdown.append(
            {
                'station': entry.get('station__name') or 'Unassigned Station',
                'region': entry.get('station__region') or entry.get('station__country') or '—',
                'plays': entry.get('plays') or 0,
                'royalties': _format_decimal(royalties_value),
                'percentage': _calculate_percentage(royalties_value, total_radio_earnings),
            }
        )

    recent_threshold = now - timedelta(days=30)
    previous_threshold = recent_threshold - timedelta(days=30)

    track_activity = (
        playlogs_qs.values('track_id')
        .annotate(
            recent_plays=Count('id', filter=Q(played_at__gte=recent_threshold)),
            previous_plays=Count(
                'id',
                filter=Q(played_at__gte=previous_threshold, played_at__lt=recent_threshold),
            ),
        )
    )

    radio_track_stats = (
        playlogs_qs.values('track_id')
        .annotate(
            radio_earnings=Sum('royalty_amount'),
            radio_plays=Count('id'),
            last_play=Max('played_at'),
        )
    )

    stream_track_stats = (
        streamlogs_qs.values('track_id')
        .annotate(
            stream_earnings=Sum('royalty_amount'),
            stream_plays=Count('id'),
            last_stream=Max('played_at'),
        )
    )

    track_station_stats = (
        playlogs_qs.values('track_id', 'station__name', 'station__region')
        .annotate(
            royalties=Sum('royalty_amount'),
            plays=Count('id'),
        )
    )

    track_stats_map: Dict[int, Dict[str, object]] = defaultdict(
        lambda: {
            'radio_earnings': Decimal('0'),
            'stream_earnings': Decimal('0'),
            'radio_plays': 0,
            'stream_plays': 0,
            'recent_plays': 0,
            'previous_plays': 0,
            'last_activity': None,
            'top_station': None,
        }
    )

    for entry in radio_track_stats:
        track_id = entry.get('track_id')
        if track_id is None:
            continue
        stats = track_stats_map[track_id]
        stats['radio_earnings'] += _decimal(entry.get('radio_earnings'))
        stats['radio_plays'] += entry.get('radio_plays') or 0
        last_play = entry.get('last_play')
        if last_play and (
            not stats['last_activity'] or last_play > stats['last_activity']
        ):
            stats['last_activity'] = last_play

    for entry in stream_track_stats:
        track_id = entry.get('track_id')
        if track_id is None:
            continue
        stats = track_stats_map[track_id]
        stats['stream_earnings'] += _decimal(entry.get('stream_earnings'))
        stats['stream_plays'] += entry.get('stream_plays') or 0
        last_stream = entry.get('last_stream')
        if last_stream and (
            not stats['last_activity'] or last_stream > stats['last_activity']
        ):
            stats['last_activity'] = last_stream

    for entry in track_activity:
        track_id = entry.get('track_id')
        if track_id is None:
            continue
        stats = track_stats_map[track_id]
        stats['recent_plays'] = entry.get('recent_plays') or 0
        stats['previous_plays'] = entry.get('previous_plays') or 0

    for entry in track_station_stats:
        track_id = entry.get('track_id')
        if track_id is None:
            continue
        royalties_value = _decimal(entry.get('royalties'))
        stats = track_stats_map[track_id]
        current_top = stats.get('top_station')
        if (
            not current_top
            or royalties_value > _decimal(current_top.get('royalties'))
        ):
            stats['top_station'] = {
                'name': entry.get('station__name') or 'Unassigned Station',
                'region': entry.get('station__region') or '—',
                'royalties': royalties_value,
            }

    track_ids = list(track_stats_map.keys())
    tracks = Track.objects.filter(id__in=track_ids).select_related('artist', 'artist__user')
    tracks_map = {track.id: track for track in tracks}

    top_tracks: List[Dict[str, object]] = []
    for track_id, stats in track_stats_map.items():
        track = tracks_map.get(track_id)
        if not track:
            continue
        total_earnings_per_track = stats['radio_earnings'] + stats['stream_earnings']
        if total_earnings_per_track <= 0 and (stats['radio_plays'] + stats['stream_plays']) == 0:
            continue

        if stats['recent_plays'] > stats['previous_plays']:
            trend = 'up'
        elif stats['recent_plays'] < stats['previous_plays']:
            trend = 'down'
        else:
            trend = 'flat'

        station_info = stats.get('top_station') or {}
        top_tracks.append(
            {
                'trackId': _safe_track_identifier(track),
                'title': track.title,
                'artist': _resolve_artist_name(track),
                'airplay': stats['radio_plays'] + stats['stream_plays'],
                'earnings': _format_decimal(total_earnings_per_track),
                'station': station_info.get('name') or 'Streaming',
                'region': station_info.get('region') or '—',
                'trend': trend,
                'lastActivity': _serialize_datetime(stats.get('last_activity')),
            }
        )

    top_tracks.sort(key=lambda item: item['earnings'], reverse=True)
    top_tracks = top_tracks[:20]

    artist_track_titles: Dict[int, List[str]] = defaultdict(list)
    artist_station_map: Dict[int, Dict[str, object]] = {}

    artist_track_entries = (
        playlogs_qs.values('track__artist_id', 'track__title')
        .annotate(plays=Count('id'))
        .order_by('track__artist_id', '-plays')
    )

    for entry in artist_track_entries:
        artist_id = entry.get('track__artist_id')
        title = entry.get('track__title')
        if artist_id and title:
            if len(artist_track_titles[artist_id]) < 5:
                artist_track_titles[artist_id].append(title)

    artist_station_entries = (
        playlogs_qs.values('track__artist_id', 'station__name', 'station__region')
        .annotate(royalties=Sum('royalty_amount'))
        .order_by('track__artist_id', '-royalties')
    )

    for entry in artist_station_entries:
        artist_id = entry.get('track__artist_id')
        if not artist_id:
            continue
        if artist_id not in artist_station_map:
            artist_station_map[artist_id] = {
                'station': entry.get('station__name') or 'Multiple Stations',
                'region': entry.get('station__region') or '—',
            }

    payment_items: List[Dict[str, object]] = []
    for withdrawal in withdrawals:
        artist = withdrawal.artist
        artist_name = None
        if artist:
            if artist.stage_name:
                artist_name = artist.stage_name
            elif artist.user and (artist.user.first_name or artist.user.last_name):
                artist_name = f"{artist.user.first_name or ''} {artist.user.last_name or ''}".strip()
            elif artist.user and artist.user.email:
                artist_name = artist.user.email

        details = withdrawal.payment_details or {}
        due_date = None
        if isinstance(details, dict):
            due_date = details.get('due_date')

        if due_date and isinstance(due_date, str):
            due_date_value = _parse_date(due_date, is_end=True)
        else:
            due_date_value = withdrawal.requested_at

        artist_tracks_list = artist_track_titles.get(artist.id if artist else -1, [])
        station_info = artist_station_map.get(artist.id if artist else -1, {})

        payment_items.append(
            {
                'paymentId': str(withdrawal.withdrawal_id),
                'artist': artist_name or 'Unknown Artist',
                'amount': _format_decimal(_decimal(withdrawal.amount)),
                'status': withdrawal.status,
                'dueDate': _serialize_datetime(due_date_value),
                'processedAt': _serialize_datetime(withdrawal.processed_at),
                'tracks': artist_tracks_list,
                'station': station_info.get('station'),
                'region': station_info.get('region'),
            }
        )

    payment_stats = {
        'totalScheduled': _format_decimal(scheduled_earnings),
        'totalProcessing': _format_decimal(processing_earnings),
        'totalPaid': _format_decimal(paid_earnings),
        'currency': publisher.payout_currency or 'GHS',
    }

    track_total_royalties = defaultdict(Decimal)
    for entry in playlogs_qs.values('track_id').annotate(total=Sum('royalty_amount')):
        track_total_royalties[entry['track_id']] += _decimal(entry.get('total'))
    for entry in streamlogs_qs.values('track_id').annotate(total=Sum('royalty_amount')):
        track_total_royalties[entry['track_id']] += _decimal(entry.get('total'))

    agreements = {
        agreement.track_id: agreement
        for agreement in PublishingAgreement.objects.filter(
            track_id__in=list(track_total_royalties.keys()),
            publisher=publisher,
            status='accepted',
            is_archived=False,
        )
    }

    artist_share_amount = Decimal('0')
    publisher_share_amount = Decimal('0')
    mechanical_amount = Decimal('0')

    for track_id, total_amount in track_total_royalties.items():
        agreement = agreements.get(track_id)
        if not agreement:
            publisher_share_amount += total_amount
            continue

        writer_share = agreement.writer_share or Decimal('0')
        publisher_share = agreement.publisher_share or Decimal('0')

        artist_amount = (total_amount * writer_share) / Decimal('100')
        publisher_amount = (total_amount * publisher_share) / Decimal('100')
        residual = total_amount - artist_amount - publisher_amount

        artist_share_amount += artist_amount
        publisher_share_amount += publisher_amount
        if residual > 0:
            mechanical_amount += residual

    distribution_total = artist_share_amount + publisher_share_amount + mechanical_amount

    if distribution_total == 0 and total_earnings > 0:
        distribution_total = total_earnings

    if distribution_total == 0:
        distribution_total = Decimal('1')

    distribution_splits = [
        {
            'label': 'Artist Share',
            'amount': _format_decimal(artist_share_amount),
            'percentage': _calculate_percentage(artist_share_amount, distribution_total),
            'description': 'Share allocated to songwriters and performers',
        },
        {
            'label': 'Publisher Share',
            'amount': _format_decimal(publisher_share_amount),
            'percentage': _calculate_percentage(publisher_share_amount, distribution_total),
            'description': 'Share retained by the publisher for administration',
        },
        {
            'label': 'Mechanical Rights',
            'amount': _format_decimal(mechanical_amount),
            'percentage': _calculate_percentage(mechanical_amount, distribution_total),
            'description': 'Mechanical rights and administration reserves',
        },
    ]

    default_split_label = ' / '.join(
        f"{int(round(split['percentage']))}%" for split in distribution_splits
    )

    distribution_settings = {
        'autoPayoutThreshold': _format_decimal(
            _decimal(publisher.minimum_payout_amount)
        ),
        'paymentFrequency': publisher.payout_frequency or 'Monthly',
        'defaultSplitLabel': default_split_label or '—',
    }

    data['summary'] = summary
    data['earnings'] = monthly_earnings
    data['stationBreakdown'] = station_breakdown
    data['topTracks'] = top_tracks
    data['payments'] = {
        'items': payment_items,
        'stats': payment_stats,
    }
    data['distribution'] = {
        'splits': distribution_splits,
        'settings': distribution_settings,
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
