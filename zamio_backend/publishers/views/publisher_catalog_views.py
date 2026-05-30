from datetime import timedelta

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Count, Q, Sum, Value, DecimalField
from django.db.models.functions import Coalesce, TruncDate
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
from music_monitor.models import PlayLog, StreamLog
from publishers.models import PublisherProfile
from publishers.serializers import PublisherCatalogTrackSerializer


def _parse_positive_int(value, default):
    try:
        value_int = int(value)
        return value_int if value_int > 0 else default
    except (TypeError, ValueError):
        return default


def _build_pagination_payload(paginator, page, page_number, page_size):
    if paginator.count == 0:
        return {
            'count': 0,
            'page_number': 1,
            'page_size': page_size,
            'total_pages': 0,
            'next': None,
            'previous': None,
            'has_next': False,
            'has_previous': False,
        }

    has_next = page.has_next()
    has_previous = page.has_previous()
    return {
        'count': paginator.count,
        'page_number': page_number,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'next': page.next_page_number() if has_next else None,
        'previous': page.previous_page_number() if has_previous else None,
        'has_next': has_next,
        'has_previous': has_previous,
    }


def _resolve_trend(recent_total, previous_total):
    if previous_total <= 0 and recent_total <= 0:
        return 'Stable'
    if previous_total <= 0 and recent_total > 0:
        return 'Rising'
    if recent_total <= 0 and previous_total > 0:
        return 'Declining'

    change_ratio = (recent_total - previous_total) / previous_total
    if change_ratio >= 0.1:
        return 'Rising'
    if change_ratio <= -0.1:
        return 'Declining'
    return 'Stable'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_catalog_view(request):
    query_params = request.query_params

    publisher_id = query_params.get('publisher_id')
    search_query = (query_params.get('search') or '').strip()
    status_filter = (query_params.get('status') or '').strip().lower()
    genre_filter = (query_params.get('genre') or '').strip()
    artist_filter = (query_params.get('artist_id') or '').strip()
    sort_by = (query_params.get('sort_by') or 'streams').strip().lower()
    sort_order = (query_params.get('sort_order') or 'desc').strip().lower()
    page_number = _parse_positive_int(query_params.get('page', 1), 1)
    page_size = _parse_positive_int(query_params.get('page_size', 24), 24)

    payload = {}
    errors = {}

    publisher = None
    if publisher_id:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(
                publisher_id=publisher_id
            )
        except PublisherProfile.DoesNotExist:
            errors['publisher'] = ['Publisher not found.']
    else:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(
                user=request.user
            )
        except PublisherProfile.DoesNotExist:
            errors['publisher'] = ['Publisher profile not found for user.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    has_staff_privileges = bool(getattr(request.user, 'is_staff', False)) or bool(
        getattr(request.user, 'is_superuser', False)
    )
    if publisher.user_id != request.user.id and not has_staff_privileges:
        payload['message'] = 'Errors'
        payload['errors'] = {
            'publisher': ['You do not have permission to view this catalog.']
        }
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    base_tracks = Track.objects.filter(
        Q(publisher=publisher)
        | Q(
            publishingagreement__publisher=publisher,
            publishingagreement__status__in=['accepted'],
            publishingagreement__is_archived=False,
        )
        | Q(artist__publisher=publisher)
    ).select_related(
        'artist',
        'artist__user',
        'album',
        'publisher',
        'genre',
    ).prefetch_related(
        'contributors__user'
    ).distinct()

    tracks_qs = base_tracks

    if search_query:
        tracks_qs = tracks_qs.filter(
            Q(title__icontains=search_query)
            | Q(track_id__icontains=search_query)
            | Q(isrc_code__icontains=search_query)
            | Q(artist__stage_name__icontains=search_query)
            | Q(artist__user__first_name__icontains=search_query)
            | Q(artist__user__last_name__icontains=search_query)
        )

    if status_filter and status_filter not in {'all', 'any'}:
        if status_filter == 'published':
            tracks_qs = tracks_qs.filter(
                Q(status__iexact='Approved') | Q(active=True)
            )
        elif status_filter == 'draft':
            tracks_qs = tracks_qs.filter(
                Q(status__in=['Pending', 'Rejected']),
                is_archived=False,
            )
        elif status_filter == 'scheduled':
            tracks_qs = tracks_qs.filter(
                processing_status__in=['queued', 'processing']
            )
        elif status_filter == 'archived':
            tracks_qs = tracks_qs.filter(is_archived=True)

    if genre_filter:
        tracks_qs = tracks_qs.filter(genre__name__iexact=genre_filter)

    if artist_filter:
        artist_lookup = Q(artist__artist_id=artist_filter)
        try:
            artist_pk = int(artist_filter)
        except (TypeError, ValueError):
            artist_pk = None
        if artist_pk is not None:
            artist_lookup |= Q(artist__id=artist_pk)
        tracks_qs = tracks_qs.filter(artist_lookup)

    sort_map = {
        'recent': '-updated_at',
        'streams': '-catalog_streams',
        'title': 'title',
        'release_date': '-release_date',
        'status': 'status',
    }
    order_field = sort_map.get(sort_by, '-updated_at')
    if sort_order == 'asc' and order_field.startswith('-'):
        order_field = order_field[1:]
    elif sort_order == 'desc' and not order_field.startswith('-'):
        order_field = f'-{order_field}'

    # Annotate for ordering by streams
    tracks_qs = tracks_qs.annotate(
        catalog_streams=Coalesce(
            Count(
                'track_playlog',
                filter=Q(track_playlog__is_archived=False),
                distinct=False,
            ),
            0,
        )
    ).order_by(order_field, '-updated_at')

    paginator = Paginator(tracks_qs, max(page_size, 1))
    try:
        page = paginator.page(page_number)
    except PageNotAnInteger:
        page = paginator.page(1)
        page_number = 1
    except EmptyPage:
        page = paginator.page(paginator.num_pages)
        page_number = paginator.num_pages

    tracks_page = list(page.object_list)

    track_ids = [track.id for track in tracks_page]
    base_track_ids = list(base_tracks.values_list('id', flat=True))

    now = timezone.now()
    recent_dates = [
        (now - timedelta(days=offset)).date().isoformat()
        for offset in range(6, -1, -1)
    ]
    previous_dates = [
        (now - timedelta(days=7 + offset)).date().isoformat()
        for offset in range(6, -1, -1)
    ]

    metrics_map = {track_id: {
        'streams': 0,
        'downloads': 0,
        'revenue': 0,
        'daily_counts': {},
        'top_countries': [],
        'rank': None,
        'trend': 'Stable',
    } for track_id in track_ids}

    if track_ids:
        playlogs_page = PlayLog.objects.filter(
            track_id__in=track_ids,
            is_archived=False,
        ).select_related('station')

        stream_totals = playlogs_page.values('track_id').annotate(
            streams=Count('id'),
            revenue=Coalesce(
                Sum('royalty_amount'),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )
        for row in stream_totals:
            track_id = row['track_id']
            metrics = metrics_map.setdefault(track_id, {})
            metrics['streams'] = int(row.get('streams') or 0)
            metrics['revenue'] = row.get('revenue') or 0

        downloads_totals = StreamLog.objects.filter(
            track_id__in=track_ids,
            is_archived=False,
        ).values('track_id').annotate(total=Count('id'))
        for row in downloads_totals:
            track_id = row['track_id']
            metrics = metrics_map.setdefault(track_id, {})
            metrics['downloads'] = int(row.get('total') or 0)

        two_week_window = now - timedelta(days=13)
        daily_rows = (
            playlogs_page.filter(created_at__gte=two_week_window)
            .annotate(day=TruncDate('created_at'))
            .values('track_id', 'day')
            .annotate(total=Count('id'))
        )
        for row in daily_rows:
            track_id = row['track_id']
            metrics = metrics_map.setdefault(track_id, {})
            day = row['day']
            if day:
                metrics.setdefault('daily_counts', {})[day.isoformat()] = int(row['total'] or 0)

        country_rows = playlogs_page.values(
            'track_id', 'station__country'
        ).annotate(total=Count('id'))
        for row in country_rows:
            track_id = row['track_id']
            metrics = metrics_map.setdefault(track_id, {})
            country = row['station__country'] or 'Unknown'
            metrics.setdefault('country_totals', []).append((country, int(row['total'] or 0)))

    # Compute rank map across publisher catalog
    playlogs_all = PlayLog.objects.filter(
        track_id__in=base_track_ids,
        is_archived=False,
    )
    ranking_rows = playlogs_all.values('track_id').annotate(
        streams=Count('id')
    ).order_by('-streams')
    rank_map = {}
    for index, row in enumerate(ranking_rows, start=1):
        rank_map[row['track_id']] = index

    for track_id, metrics in metrics_map.items():
        metrics['rank'] = rank_map.get(track_id)
        countries = sorted(
            metrics.get('country_totals', []),
            key=lambda item: item[1],
            reverse=True,
        )
        metrics['top_countries'] = [country for country, _ in countries[:5]]

        daily_counts = metrics.get('daily_counts', {})
        recent_total = sum(daily_counts.get(date_key, 0) for date_key in recent_dates)
        previous_total = sum(daily_counts.get(date_key, 0) for date_key in previous_dates)
        metrics['trend'] = _resolve_trend(recent_total, previous_total)
        metrics.pop('country_totals', None)

    serializer = PublisherCatalogTrackSerializer(
        tracks_page,
        many=True,
        context={
            'request': request,
            'metrics': metrics_map,
            'recent_dates': recent_dates,
        },
    )

    pagination_payload = _build_pagination_payload(
        paginator, page, page_number, page_size
    )

    # Summary metrics across the full catalog
    summary_total_tracks = base_tracks.count()
    summary_published = base_tracks.filter(
        Q(status__iexact='Approved') | Q(active=True)
    ).count()
    summary_drafts = base_tracks.filter(
        Q(status__in=['Pending', 'Rejected']),
        is_archived=False,
    ).count()
    summary_scheduled = base_tracks.filter(
        processing_status__in=['queued', 'processing']
    ).count()

    summary_streams = playlogs_all.count()
    summary_revenue = playlogs_all.aggregate(
        total=Coalesce(
            Sum('royalty_amount'),
            Value(0),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    )['total'] or 0
    summary_downloads = StreamLog.objects.filter(
        track_id__in=base_track_ids,
        is_archived=False,
    ).count()

    genres = list(
        base_tracks.exclude(genre__name__isnull=True)
        .values_list('genre__name', flat=True)
        .distinct()
    )
    genres.sort()

    artist_rows = (
        base_tracks.values(
            'artist__id', 'artist__artist_id', 'artist__stage_name'
        )
        .annotate(track_count=Count('id'))
        .order_by('artist__stage_name')
    )
    artist_filters = []
    for row in artist_rows:
        identifier = row['artist__artist_id'] or str(row['artist__id'])
        name = row['artist__stage_name'] or 'Unknown Artist'
        artist_filters.append({
            'id': identifier,
            'name': name,
            'trackCount': row['track_count'],
        })

    payload['message'] = 'Successful'
    payload['data'] = {
        'summary': {
            'totalTracks': summary_total_tracks,
            'publishedTracks': summary_published,
            'draftTracks': summary_drafts,
            'scheduledTracks': summary_scheduled,
            'totalStreams': summary_streams,
            'totalDownloads': summary_downloads,
            'totalRevenue': float(summary_revenue),
        },
        'filters': {
            'statuses': ['published', 'draft', 'scheduled', 'archived'],
            'genres': genres,
            'artists': artist_filters,
        },
        'tracks': {
            'results': serializer.data,
            'pagination': pagination_payload,
        },
    }

    return Response(payload, status=status.HTTP_200_OK)
