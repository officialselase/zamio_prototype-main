"""Album management API endpoints for artists."""

from datetime import date
from typing import Optional

from django.db.models import Count, Sum, Value, Q, DecimalField
from django.db.models.functions import Coalesce, TruncMonth
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.models import Album, Artist, Genre, Track, Contributor
from artists.serializers import AlbumManagementSerializer
from music_monitor.models import PlayLog



def _get_artist_for_request(request) -> Optional[Artist]:
    try:
        return Artist.objects.get(user=request.user)
    except Artist.DoesNotExist:
        return None


def _parse_release_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None

    parsed = parse_date(value)
    return parsed


def _resolve_genre(genre_id: Optional[int], genre_name: Optional[str]) -> Optional[Genre]:
    if genre_id:
        return Genre.objects.get(id=genre_id)

    if genre_name and genre_name.strip():
        return Genre.objects.get_or_create(name=genre_name.strip())[0]

    return None


class AlbumPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 50


def _parse_boolean(value) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value

    value_str = str(value).strip().lower()
    if value_str in {'true', '1', 'yes', 'on'}:
        return True
    if value_str in {'false', '0', 'no', 'off'}:
        return False
    return None


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_albums(request):
    """Return paginated albums for the authenticated artist."""

    payload = {'message': '', 'data': {}, 'errors': {}}

    artist = _get_artist_for_request(request)
    if not artist:
        payload['message'] = 'User is not registered as an artist'
        payload['errors'] = {'user': ['Only artists can manage albums']}
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    base_queryset = Album.objects.filter(artist=artist, is_archived=False)

    search_query = (request.query_params.get('search') or '').strip()

    status_filter = (request.query_params.get('status') or '').lower()
    if status_filter == 'active':
        base_queryset = base_queryset.filter(active=True, is_archived=False)
    elif status_filter == 'inactive':
        base_queryset = base_queryset.filter(active=False)
    elif status_filter == 'draft':
        base_queryset = base_queryset.filter(status__iexact='pending')

    if search_query:
        base_queryset = base_queryset.filter(
            Q(title__icontains=search_query)
            | Q(album_id__icontains=search_query)
            | Q(genre__name__icontains=search_query)
        )

    annotated_queryset = base_queryset.annotate(
        track_count=Count('track', distinct=True),
        total_plays=Count('track__track_playlog', distinct=True),
        total_revenue=Coalesce(
            Sum('track__royalty_amount'),
            Value(0, output_field=DecimalField(max_digits=12, decimal_places=2)),
        ),
    )

    sort_by_param = request.query_params.get('sort_by') or 'createdAt'
    sort_order = (request.query_params.get('sort_order') or 'desc').lower()
    sort_map = {
        'title': 'title',
        'releaseDate': 'release_date',
        'trackCount': 'track_count',
        'totalPlays': 'total_plays',
        'totalRevenue': 'total_revenue',
        'createdAt': 'created_at',
    }
    sort_field = sort_map.get(sort_by_param, 'created_at')
    if sort_order == 'asc':
        annotated_queryset = annotated_queryset.order_by(sort_field, 'id')
    else:
        annotated_queryset = annotated_queryset.order_by(f'-{sort_field}', '-id')

    paginator = AlbumPagination()
    page = paginator.paginate_queryset(annotated_queryset, request)

    serializer = AlbumManagementSerializer(page, many=True, context={'request': request})

    stats_queryset = Album.objects.filter(artist=artist, is_archived=False)
    stats = {
        'total': stats_queryset.count(),
        'active': stats_queryset.filter(active=True).count(),
        'inactive': stats_queryset.filter(active=False).count(),
        'draft': stats_queryset.filter(status__iexact='pending').count(),
    }

    pagination = {
        'page': paginator.page.number,
        'page_size': paginator.get_page_size(request),
        'total_pages': paginator.page.paginator.num_pages,
        'total_count': paginator.page.paginator.count,
        'has_next': paginator.page.has_next(),
        'has_previous': paginator.page.has_previous(),
    }

    payload['message'] = 'Albums retrieved successfully'
    payload['data'] = {
        'albums': serializer.data,
        'pagination': pagination,
        'stats': stats,
    }
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def create_album(request):
    """Create a new album for the authenticated artist."""

    payload = {'message': '', 'data': {}, 'errors': {}}

    artist = _get_artist_for_request(request)
    if not artist:
        payload['message'] = 'User is not registered as an artist'
        payload['errors'] = {'user': ['Only artists can create albums']}
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    title = (request.data.get('title') or '').strip()
    if not title:
        payload['message'] = 'Album title is required'
        payload['errors'] = {'title': ['This field is required']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    release_date_raw = request.data.get('release_date')
    release_date_value = _parse_release_date(release_date_raw)
    if release_date_raw and release_date_value is None:
        payload['message'] = 'Invalid release date'
        payload['errors'] = {'release_date': ['Use the YYYY-MM-DD date format']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        genre = _resolve_genre(request.data.get('genre_id'), request.data.get('genre'))
    except Genre.DoesNotExist:
        payload['message'] = 'Genre not found'
        payload['errors'] = {'genre': ['The provided genre could not be found']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if Album.objects.filter(artist=artist, title__iexact=title, is_archived=False).exists():
        payload['message'] = 'Album already exists'
        payload['errors'] = {'title': ['You already have an album with this title']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    cover_art = request.FILES.get('cover_art')

    album = Album.objects.create(
        artist=artist,
        title=title,
        release_date=release_date_value,
        genre=genre,
        active=True,
        cover_art=cover_art or None,
    )

    serializer = AlbumManagementSerializer(album, context={'request': request})

    payload['message'] = 'Album created successfully'
    payload['data'] = {'album': serializer.data}
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_album(request, album_id: int):
    """Update album metadata for the authenticated artist."""

    payload = {'message': '', 'data': {}, 'errors': {}}

    artist = _get_artist_for_request(request)
    if not artist:
        payload['message'] = 'User is not registered as an artist'
        payload['errors'] = {'user': ['Only artists can update albums']}
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    try:
        album = Album.objects.get(id=album_id, artist=artist, is_archived=False)
    except Album.DoesNotExist:
        payload['message'] = 'Album not found'
        payload['errors'] = {'album': ['Album not found']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    updates = []

    if 'title' in request.data:
        new_title = (request.data.get('title') or '').strip()
        if not new_title:
            payload['message'] = 'Album title is required'
            payload['errors'] = {'title': ['This field cannot be blank']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        if Album.objects.filter(artist=artist, title__iexact=new_title).exclude(id=album.id).exists():
            payload['message'] = 'Album already exists'
            payload['errors'] = {'title': ['You already have an album with this title']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        if album.title != new_title:
            album.title = new_title
            updates.append('title')

    if 'release_date' in request.data:
        release_date_raw = request.data.get('release_date')
        new_release_date = _parse_release_date(release_date_raw)
        if release_date_raw and new_release_date is None:
            payload['message'] = 'Invalid release date'
            payload['errors'] = {'release_date': ['Use the YYYY-MM-DD date format']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        if album.release_date != new_release_date:
            album.release_date = new_release_date
            updates.append('release_date')

    if 'genre_id' in request.data or 'genre' in request.data:
        try:
            genre = _resolve_genre(request.data.get('genre_id'), request.data.get('genre'))
        except Genre.DoesNotExist:
            payload['message'] = 'Genre not found'
            payload['errors'] = {'genre': ['The provided genre could not be found']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        if genre != album.genre:
            album.genre = genre
            updates.append('genre')

    if 'status' in request.data:
        new_status = (request.data.get('status') or '').strip()
        if new_status and new_status in dict(Album.STATUS_CHOICES):
            if album.status != new_status:
                album.status = new_status
                updates.append('status')

    if 'active' in request.data:
        parsed_active = _parse_boolean(request.data.get('active'))
        if parsed_active is None:
            payload['message'] = 'Invalid active flag'
            payload['errors'] = {'active': ['Provide a boolean value']}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        if album.active != parsed_active:
            album.active = parsed_active
            updates.append('active')

    cover_art = request.FILES.get('cover_art')
    if cover_art:
        album.cover_art = cover_art
        album.cover_art_hash = ''
        updates.append('cover_art')

    if not updates:
        serializer = AlbumManagementSerializer(album, context={'request': request})
        payload['message'] = 'No changes applied'
        payload['data'] = {'album': serializer.data}
        return Response(payload, status=status.HTTP_200_OK)

    update_fields = updates + ['updated_at']
    if 'cover_art' in updates:
        update_fields.append('cover_art_hash')

    album.save(update_fields=list(dict.fromkeys(update_fields)))

    serializer = AlbumManagementSerializer(album, context={'request': request})
    payload['message'] = 'Album updated successfully'
    payload['data'] = {'album': serializer.data}
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def retrieve_album(request, album_id: int):
    """Return rich album analytics for the authenticated artist."""

    payload = {'message': '', 'data': {}, 'errors': {}}

    artist = _get_artist_for_request(request)
    if not artist:
        payload['message'] = 'User is not registered as an artist'
        payload['errors'] = {'user': ['Only artists can view album details']}
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    try:
        album = Album.objects.get(id=album_id, artist=artist, is_archived=False)
    except Album.DoesNotExist:
        payload['message'] = 'Album not found'
        payload['errors'] = {'album': ['Album not found']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    album_serializer = AlbumManagementSerializer(album, context={'request': request})

    tracks_qs = (
        Track.objects.filter(album=album, is_archived=False)
        .annotate(
            plays=Count(
                'track_playlog',
                filter=Q(track_playlog__is_archived=False),
            ),
            revenue=Coalesce(
                Sum(
                    'track_playlog__royalty_amount',
                    filter=Q(track_playlog__is_archived=False),
                ),
                Value(0, output_field=DecimalField(max_digits=12, decimal_places=2)),
            ),
        )
    )

    tracks_payload = []
    total_tracks = tracks_qs.count()
    active_tracks = tracks_qs.filter(active=True).count()
    inactive_tracks = tracks_qs.filter(active=False).count()
    total_plays = 0
    total_revenue_value = 0
    total_duration_seconds = 0
    duration_count = 0

    for track in tracks_qs:
        plays = getattr(track, 'plays', 0) or 0
        revenue_amount = track.revenue if getattr(track, 'revenue', None) is not None else 0
        total_plays += plays
        total_revenue_value += float(revenue_amount)
        if track.duration:
            total_duration_seconds += track.duration.total_seconds()
            duration_count += 1

        cover_url = None
        if track.cover_art:
            try:
                cover_url = track.cover_art.url
            except Exception:
                cover_url = None
            else:
                if request:
                    cover_url = request.build_absolute_uri(cover_url)

        tracks_payload.append(
            {
                'id': track.id,
                'title': track.title,
                'status': (track.status or '').lower(),
                'release_date': track.release_date.isoformat() if track.release_date else None,
                'duration_seconds': int(track.duration.total_seconds()) if track.duration else None,
                'plays': plays,
                'revenue': float(revenue_amount),
                'cover_art_url': cover_url,
                'active': track.active,
            }
        )

    average_track_duration = (
        total_duration_seconds / duration_count if duration_count else None
    )

    playlogs = (
        PlayLog.objects.filter(track__album=album, is_archived=False)
        .annotate(effective_played_at=Coalesce('played_at', 'created_at'))
    )

    monthly_summary = (
        playlogs
        .exclude(effective_played_at__isnull=True)
        .annotate(month=TruncMonth('effective_played_at'))
        .values('month')
        .annotate(
            amount=Coalesce(
                Sum('royalty_amount'),
                Value(0, output_field=DecimalField(max_digits=12, decimal_places=2)),
            ),
            plays=Count('id'),
        )
        .order_by('month')
    )

    monthly_payload = []
    plays_over_time = []
    for item in monthly_summary:
        month = item['month']
        label = month.strftime('%b %Y') if month else 'Unknown'
        amount = float(item['amount']) if item['amount'] is not None else 0.0
        plays_count = item.get('plays', 0) or 0
        monthly_payload.append(
            {
                'month': label,
                'amount': amount,
                'currency': 'GHS',
                'plays': plays_count,
            }
        )
        plays_over_time.append({'label': label, 'plays': plays_count})

    territory_qs = (
        playlogs
        .values('station__country', 'station__region')
        .annotate(
            amount=Coalesce(
                Sum('royalty_amount'),
                Value(0, output_field=DecimalField(max_digits=12, decimal_places=2)),
            ),
            plays=Count('id'),
        )
        .order_by('-amount')
    )

    territory_payload = []
    total_revenue_decimal = sum(float(item['amount']) for item in territory_qs if item['amount'] is not None)
    for item in territory_qs:
        amount = float(item['amount']) if item['amount'] is not None else 0.0
        territory_name = (
            item.get('station__country')
            or item.get('station__region')
            or 'Unspecified'
        )
        percentage = (amount / total_revenue_decimal * 100) if total_revenue_decimal else 0.0
        territory_payload.append(
            {
                'territory': territory_name,
                'amount': amount,
                'currency': 'GHS',
                'percentage': round(percentage, 2),
                'plays': item.get('plays', 0) or 0,
            }
        )

    top_station_qs = (
        playlogs
        .values('station__name', 'station__region', 'station__country')
        .annotate(
            plays=Count('id'),
            amount=Coalesce(
                Sum('royalty_amount'),
                Value(0, output_field=DecimalField(max_digits=12, decimal_places=2)),
            ),
        )
        .order_by('-plays')[:10]
    )

    top_stations_payload = [
        {
            'name': item.get('station__name') or 'Unknown Station',
            'count': item.get('plays', 0) or 0,
            'region': item.get('station__region'),
            'country': item.get('station__country'),
            'revenue': float(item['amount']) if item['amount'] is not None else 0.0,
        }
        for item in top_station_qs
    ]

    contributors_qs = Contributor.objects.filter(track__album=album, is_archived=False)
    contributors_payload = []
    for contributor in contributors_qs.select_related('user'):
        user = getattr(contributor, 'user', None)
        if user:
            full_name = f"{user.first_name} {user.last_name}".strip()
            if not full_name:
                full_name = user.get_full_name() or user.username or user.email or 'Contributor'
        else:
            full_name = 'Contributor'

        contributors_payload.append(
            {
                'id': contributor.id,
                'name': full_name,
                'role': contributor.role,
                'percentage': float(contributor.percent_split),
            }
        )

    payload['message'] = 'Album details retrieved successfully'
    payload['data'] = {
        'album': album_serializer.data,
        'stats': {
            'total_tracks': total_tracks,
            'active_tracks': active_tracks,
            'inactive_tracks': inactive_tracks,
            'total_plays': total_plays,
            'total_revenue': round(total_revenue_value, 2),
            'average_track_duration_seconds': int(average_track_duration) if average_track_duration else None,
        },
        'tracks': tracks_payload,
        'revenue': {
            'monthly': monthly_payload,
            'territories': territory_payload,
        },
        'performance': {
            'plays_over_time': plays_over_time,
            'top_stations': top_stations_payload,
        },
        'contributors': contributors_payload,
    }

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_album(request, album_id: int):
    """Archive (soft delete) an album for the authenticated artist."""

    payload = {'message': '', 'data': {}, 'errors': {}}

    artist = _get_artist_for_request(request)
    if not artist:
        payload['message'] = 'User is not registered as an artist'
        payload['errors'] = {'user': ['Only artists can remove albums']}
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    try:
        album = Album.objects.get(id=album_id, artist=artist, is_archived=False)
    except Album.DoesNotExist:
        payload['message'] = 'Album not found'
        payload['errors'] = {'album': ['Album not found']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    album.is_archived = True
    album.active = False
    album.save(update_fields=['is_archived', 'active', 'updated_at'])

    payload['message'] = 'Album archived successfully'
    payload['data'] = {'album_id': album_id}
    return Response(payload, status=status.HTTP_200_OK)

