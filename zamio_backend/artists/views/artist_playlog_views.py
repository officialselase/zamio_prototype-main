


from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from artists.models import Artist
from artists.serializers import ArtistMatchCacheSerializer, ArtistPlayLogSerializer
from music_monitor.models import MatchCache, PlayLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_play_logs(request, station_id):
    logs = PlayLog.objects.filter(station_id=station_id).order_by('-played_at')[:100]
    data = [{
        'track_title': log.track.title,
        'artist_name': log.track.artist.name,
        'played_at': log.played_at,
        'duration': log.duration.total_seconds() if log.duration else None,
        'source': log.source,
        'royalty_amount': str(log.royalty_amount) if log.royalty_amount else "0.00"
    } for log in logs]
    return Response(data)







@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication, TokenAuthentication])
def get_all_track_playlog_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = (request.query_params.get('search') or '').strip()
    artist_id = request.query_params.get('artist_id', '')
    play_page_number = request.query_params.get('play_page', 1)
    match_page_number = request.query_params.get('match_page', 1)
    play_page_size = request.query_params.get('play_page_size', 10)
    match_page_size = request.query_params.get('match_page_size', play_page_size)
    play_sort_by = request.query_params.get('play_sort_by', 'matched_at')
    play_sort_order = (request.query_params.get('play_sort_order', 'desc') or 'desc').lower()
    match_sort_by = request.query_params.get('match_sort_by', 'matched_at')
    match_sort_order = (request.query_params.get('match_sort_order', 'desc') or 'desc').lower()

    # Validate artist
    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    def parse_positive_int(value, default):
        try:
            value_int = int(value)
            return value_int if value_int > 0 else default
        except (TypeError, ValueError):
            return default

    play_page_number = parse_positive_int(play_page_number, 1)
    match_page_number = parse_positive_int(match_page_number, 1)
    play_page_size = parse_positive_int(play_page_size, 10)
    match_page_size = parse_positive_int(match_page_size, play_page_size)

    playlogs_qs = (
        PlayLog.objects.filter(track__artist=artist, is_archived=False)
        .select_related('track', 'track__artist', 'station')
        .annotate(
            track_total_plays=Count(
                'track__track_playlog',
                filter=Q(track__track_playlog__is_archived=False)
            )
        )
    )

    match_cache_qs = (
        MatchCache.objects.filter(track__artist=artist)
        .select_related('track', 'track__artist', 'station')
    )

    if search_query:
        playlogs_qs = playlogs_qs.filter(
            Q(track__title__icontains=search_query)
            | Q(track__artist__stage_name__icontains=search_query)
            | Q(station__name__icontains=search_query)
            | Q(track__album__title__icontains=search_query)
            | Q(track__genre__name__icontains=search_query)
        )
        match_cache_qs = match_cache_qs.filter(
            Q(track__title__icontains=search_query)
            | Q(track__artist__stage_name__icontains=search_query)
            | Q(station__name__icontains=search_query)
        )

    play_order_map = {
        'matched_at': 'played_at',
        'track_title': 'track__title',
        'station_name': 'station__name',
        'royalty_amount': 'royalty_amount',
        'plays': 'track_total_plays',
        'duration': 'duration',
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

    play_paginator, play_page = paginate_queryset(playlogs_qs, play_page_number, play_page_size)
    match_paginator, match_page = paginate_queryset(match_cache_qs, match_page_number, match_page_size)

    if isinstance(play_page, list):
        play_results = []
        play_page_number = 1
    else:
        play_serializer = ArtistPlayLogSerializer(play_page, many=True)
        play_results = play_serializer.data
        play_page_number = play_page.number

    if isinstance(match_page, list):
        match_results = []
        match_page_number = 1
    else:
        match_serializer = ArtistMatchCacheSerializer(match_page, many=True)
        match_results = match_serializer.data
        match_page_number = match_page.number

    def build_pagination_payload(paginator, page, page_number, page_size):
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

    data['playLogs'] = {
        'results': play_results,
        'pagination': build_pagination_payload(play_paginator, play_page, play_page_number, play_page_size),
    }

    data['matchLogs'] = {
        'results': match_results,
        'pagination': build_pagination_payload(match_paginator, match_page, match_page_number, match_page_size),
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)
