from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Count, Q
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
from music_monitor.models import MatchCache, PlayLog
from publishers.models import PublisherProfile
from publishers.serializers import (
    PublisherMatchCacheSerializer,
    PublisherPlayLogSerializer,
)


def _parse_positive_int(value, default):
    try:
        value_int = int(value)
        return value_int if value_int > 0 else default
    except (TypeError, ValueError):
        return default


def _build_pagination_payload(paginator, page, page_number, page_size):
    total_pages = paginator.num_pages if paginator.count else 0
    has_next = has_previous = False
    next_page = previous_page = None

    if paginator.count and not isinstance(page, list):
        has_next = page.has_next()
        has_previous = page.has_previous()
        next_page = page.next_page_number() if has_next else None
        previous_page = page.previous_page_number() if has_previous else None

    return {
        'count': paginator.count,
        'page_number': page_number,
        'page_size': page_size,
        'total_pages': total_pages,
        'next': next_page,
        'previous': previous_page,
        'has_next': has_next,
        'has_previous': has_previous,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_playlogs_view(request):
    payload = {}
    data = {}
    errors = {}

    query_params = request.query_params
    search_query = (query_params.get('search') or '').strip()
    publisher_id = query_params.get('publisher_id')
    play_page_number = query_params.get('play_page', 1)
    match_page_number = query_params.get('match_page', 1)
    play_page_size = query_params.get('play_page_size', 10)
    match_page_size = query_params.get('match_page_size', play_page_size)
    play_sort_by = query_params.get('play_sort_by', 'matched_at')
    play_sort_order = (query_params.get('play_sort_order', 'desc') or 'desc').lower()
    match_sort_by = query_params.get('match_sort_by', 'matched_at')
    match_sort_order = (query_params.get('match_sort_order', 'desc') or 'desc').lower()
    log_page_state = (query_params.get('log_page_state') or 'all').lower()

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
            'publisher': ['You do not have permission to view these logs.']
        }
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    play_page_number = _parse_positive_int(play_page_number, 1)
    match_page_number = _parse_positive_int(match_page_number, 1)
    play_page_size = _parse_positive_int(play_page_size, 10)
    match_page_size = _parse_positive_int(match_page_size, play_page_size)

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
        .annotate(
            track_total_plays=Count(
                'track__track_playlog',
                filter=Q(
                    track__track_playlog__is_archived=False,
                    track__track_playlog__track__in=publisher_tracks,
                ),
            )
        )
    )

    match_cache_qs = (
        MatchCache.objects.filter(track__in=publisher_tracks)
        .select_related('track', 'track__artist', 'station')
    )

    if search_query:
        playlogs_qs = playlogs_qs.filter(
            Q(track__title__icontains=search_query)
            | Q(track__artist__stage_name__icontains=search_query)
            | Q(track__isrc_code__icontains=search_query)
            | Q(station__name__icontains=search_query)
        )
        match_cache_qs = match_cache_qs.filter(
            Q(track__title__icontains=search_query)
            | Q(track__artist__stage_name__icontains=search_query)
            | Q(track__isrc_code__icontains=search_query)
            | Q(station__name__icontains=search_query)
        )

    play_order_map = {
        'matched_at': 'played_at',
        'track_title': 'track__title',
        'station_name': 'station__name',
        'royalty_amount': 'royalty_amount',
        'plays': 'track_total_plays',
    }
    match_order_map = {
        'matched_at': 'matched_at',
        'song': 'track__title',
        'station': 'station__name',
        'confidence': 'avg_confidence_score',
    }

    play_order_field = play_order_map.get(play_sort_by, 'played_at')
    if play_sort_order == 'desc':
        play_order_field = f"-{play_order_field.lstrip('-')}"
    else:
        play_order_field = play_order_field.lstrip('-')
    playlogs_qs = playlogs_qs.order_by(play_order_field, '-created_at')

    match_order_field = match_order_map.get(match_sort_by, 'matched_at')
    if match_sort_order == 'desc':
        match_order_field = f"-{match_order_field.lstrip('-')}"
    else:
        match_order_field = match_order_field.lstrip('-')
    match_cache_qs = match_cache_qs.order_by(match_order_field, '-matched_at')

    def paginate_queryset(queryset, page_number, page_size):
        paginator = Paginator(queryset, max(page_size, 1))
        if paginator.count == 0:
            return paginator, []
        try:
            page = paginator.page(page_number)
        except PageNotAnInteger:
            page = paginator.page(1)
        except EmptyPage:
            page = paginator.page(paginator.num_pages)
        return paginator, page

    play_paginator, play_page = paginate_queryset(
        playlogs_qs, play_page_number, play_page_size
    )
    match_paginator, match_page = paginate_queryset(
        match_cache_qs, match_page_number, match_page_size
    )

    include_playlogs = log_page_state in {'playlog', 'playlogs', 'all'}
    include_matchlogs = log_page_state in {'matchlog', 'matchlogs', 'all'}

    if include_playlogs:
        if isinstance(play_page, list):
            play_results = []
            effective_page_number = 1
        else:
            serializer = PublisherPlayLogSerializer(play_page, many=True)
            play_results = serializer.data
            effective_page_number = play_page.number
        data['playLogs'] = {
            'results': play_results,
            'pagination': _build_pagination_payload(
                play_paginator, play_page, effective_page_number, play_page_size
            ),
        }
    else:
        data['playLogs'] = {
            'results': [],
            'pagination': _build_pagination_payload(
                play_paginator, [], 1, play_page_size
            ),
        }

    if include_matchlogs:
        if isinstance(match_page, list):
            match_results = []
            effective_match_page = 1
        else:
            serializer = PublisherMatchCacheSerializer(match_page, many=True)
            match_results = serializer.data
            effective_match_page = match_page.number
        data['matchLogs'] = {
            'results': match_results,
            'pagination': _build_pagination_payload(
                match_paginator, match_page, effective_match_page, match_page_size
            ),
        }
    else:
        data['matchLogs'] = {
            'results': [],
            'pagination': _build_pagination_payload(
                match_paginator, [], 1, match_page_size
            ),
        }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


# Backwards compatibility alias for older imports
get_all_artist_playlog_for_publisher_view = get_publisher_playlogs_view
