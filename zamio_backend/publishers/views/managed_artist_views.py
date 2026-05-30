from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Iterable, List, Optional, Tuple

from django.contrib.auth import get_user_model
from django.core.paginator import EmptyPage, Page, PageNotAnInteger, Paginator
from django.db.models import Count, Max, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.models import Album, Artist, Track
from music_monitor.models import PlayLog, StreamLog
from publishers.models import (
    PublisherArtistRelationship,
    PublisherProfile,
    PublishingAgreement,
)

User = get_user_model()


def _resolve_publisher(
    request,
) -> Tuple[Optional[PublisherProfile], Dict[str, List[str]], int]:
    """Resolve the publisher for the request with ownership validation."""

    errors: Dict[str, List[str]] = {}
    publisher_id = (
        request.query_params.get('publisher_id')
        or request.data.get('publisher_id')
        or ''
    ).strip()

    publisher: Optional[PublisherProfile] = None
    status_code = status.HTTP_400_BAD_REQUEST

    if publisher_id:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(
                publisher_id=publisher_id
            )
        except PublisherProfile.DoesNotExist:
            errors.setdefault('publisher_id', []).append('Publisher not found.')
            status_code = status.HTTP_404_NOT_FOUND
    else:
        try:
            publisher = PublisherProfile.objects.select_related('user').get(
                user=request.user
            )
        except PublisherProfile.DoesNotExist:
            errors.setdefault('publisher', []).append(
                'Publisher profile not found for the authenticated user.'
            )

    if publisher and publisher.user_id != request.user.id:
        errors.setdefault('publisher', []).append('Access denied for publisher.')
        publisher = None
        status_code = status.HTTP_404_NOT_FOUND

    return publisher, errors, status_code


def _parse_positive_int(value, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _safe_decimal(value) -> Decimal:
    if value is None:
        return Decimal('0')
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        return Decimal('0')


def _format_currency(value: Decimal) -> float:
    return float(round(value, 2))


def _format_datetime(value) -> Optional[str]:
    if not value:
        return None
    try:
        if timezone.is_naive(value):
            value = timezone.make_aware(value, timezone.get_default_timezone())
        return value.isoformat()
    except Exception:
        try:
            return value.isoformat()  # type: ignore[no-any-return]
        except Exception:
            return None


def _calculate_followers(social_metrics) -> int:
    if not social_metrics:
        return 0
    total = 0
    if isinstance(social_metrics, dict):
        for value in social_metrics.values():
            if isinstance(value, dict):
                followers = value.get('followers')
                if isinstance(followers, (int, float)):
                    total += int(followers)
            elif isinstance(value, (int, float)):
                total += int(value)
    return total


def _serialize_social_links(artist: Artist) -> Dict[str, Optional[str]]:
    return {
        'spotify': getattr(artist, 'spotify', None),
        'instagram': getattr(artist, 'instagram', None),
        'twitter': getattr(artist, 'twitter', None),
        'youtube': getattr(artist, 'youtube', None),
        'facebook': getattr(artist, 'facebook', None),
        'website': getattr(artist, 'website', None),
    }


def _determine_artist_status(artist: Artist) -> str:
    if artist.is_archived:
        return 'inactive'
    if not artist.active:
        return 'inactive'
    if (artist.verification_status or '').lower() == 'verified':
        return 'active'
    return 'pending'


def _resolve_location(artist: Artist) -> Optional[str]:
    if artist.location:
        return artist.location
    parts: List[str] = []
    region = getattr(artist, 'region', None)
    if region:
        parts.append(region)
    if artist.country:
        parts.append(artist.country)
    return ', '.join(parts) if parts else None


def _normalise_contract(
    relationship: Optional[PublisherArtistRelationship],
    agreement: Optional[PublishingAgreement],
) -> Dict[str, Optional[object]]:
    if relationship:
        return {
            'type': relationship.relationship_type.title() if relationship.relationship_type else None,
            'status': relationship.status,
            'startDate': relationship.start_date.isoformat() if relationship.start_date else None,
            'endDate': relationship.end_date.isoformat() if relationship.end_date else None,
            'royaltyRate': float(relationship.royalty_split_percentage)
            if relationship.royalty_split_percentage is not None
            else None,
            'advance': _format_currency(_safe_decimal(relationship.advance_amount)),
            'territory': relationship.territory,
            'worldwide': relationship.worldwide,
        }

    if agreement:
        return {
            'type': 'Publishing Agreement',
            'status': agreement.status,
            'startDate': agreement.agreement_date.isoformat() if agreement.agreement_date else None,
            'endDate': None,
            'royaltyRate': float(agreement.publisher_share) if agreement.publisher_share is not None else None,
            'advance': None,
            'territory': None,
            'worldwide': None,
        }

    return {
        'type': None,
        'status': 'pending',
        'startDate': None,
        'endDate': None,
        'royaltyRate': None,
        'advance': 0.0,
        'territory': None,
        'worldwide': False,
    }


@dataclass
class ArtistAggregate:
    total_streams: int = 0
    monthly_streams: int = 0
    play_count: int = 0
    match_count: int = 0
    total_earnings: Decimal = Decimal('0')
    last_played_at: Optional[str] = None


def _build_activity_entries(artist: Artist, limit: int = 6) -> List[Dict[str, object]]:
    activities: List[Dict[str, object]] = []

    recent_play_logs = (
        PlayLog.objects.filter(track__artist=artist)
        .select_related('track', 'station')
        .order_by('-played_at', '-created_at')[:limit]
    )

    for play_log in recent_play_logs:
        activities.append(
            {
                'type': 'play',
                'title': f"Airplay on {getattr(play_log.station, 'name', 'Unknown Station')}",
                'details': f"{play_log.track.title} detected with confidence {float(play_log.avg_confidence_score or 0):.2f}",
                'date': _format_datetime(play_log.played_at),
            }
        )

    recent_tracks = (
        Track.objects.filter(artist=artist, is_archived=False)
        .order_by('-release_date', '-created_at')[:limit]
    )

    for track in recent_tracks:
        if track.release_date:
            activities.append(
                {
                    'type': 'release',
                    'title': f"Released {track.title}",
                    'details': 'New catalog release',
                    'date': track.release_date.isoformat(),
                }
            )

    activities.sort(key=lambda entry: entry.get('date') or '', reverse=True)
    return activities[:limit]


def _build_song_payloads(artist: Artist) -> List[Dict[str, object]]:
    songs: List[Dict[str, object]] = []

    tracks = (
        Track.objects.filter(artist=artist, is_archived=False)
        .select_related('album', 'genre')
        .order_by('-release_date', '-created_at')
    )

    for track in tracks:
        playlogs = PlayLog.objects.filter(track=track).select_related('station').order_by('-played_at')[:3]
        total_plays = PlayLog.objects.filter(track=track).count() + StreamLog.objects.filter(track=track).count()
        total_earnings = _safe_decimal(
            PlayLog.objects.filter(track=track).aggregate(total=Sum('royalty_amount'))['total']
        ) + _safe_decimal(
            StreamLog.objects.filter(track=track).aggregate(total=Sum('royalty_amount'))['total']
        )

        songs.append(
            {
                'id': track.id,
                'trackId': track.track_id,
                'title': track.title,
                'duration': track.duration.total_seconds() if track.duration else None,
                'releaseDate': track.release_date.isoformat() if track.release_date else None,
                'totalPlays': total_plays,
                'totalEarnings': _format_currency(total_earnings),
                'status': 'Active' if track.active and not track.is_archived else 'Inactive',
                'album': getattr(track.album, 'title', None),
                'genre': getattr(track.genre, 'name', None),
                'recentPlays': [
                    {
                        'station': getattr(play.station, 'name', None),
                        'date': _format_datetime(play.played_at),
                        'confidence': float(play.avg_confidence_score or 0),
                    }
                    for play in playlogs
                ],
            }
        )

    return songs


def _build_royalty_history(artist: Artist, limit: int = 12) -> List[Dict[str, object]]:
    history: List[Dict[str, object]] = []

    playlogs = PlayLog.objects.filter(track__artist=artist).order_by('-played_at')[:limit]
    streamlogs = StreamLog.objects.filter(track__artist=artist).order_by('-played_at')[:limit]

    for log in playlogs:
        history.append(
            {
                'date': _format_datetime(log.played_at),
                'amount': _format_currency(_safe_decimal(log.royalty_amount)),
                'source': 'Radio Airplay',
                'status': 'Paid' if log.claimed else 'Pending',
            }
        )

    for log in streamlogs:
        history.append(
            {
                'date': _format_datetime(log.played_at),
                'amount': _format_currency(_safe_decimal(log.royalty_amount)),
                'source': 'Streaming',
                'status': 'Paid' if log.claimed else 'Pending',
            }
        )

    history.sort(key=lambda entry: entry.get('date') or '', reverse=True)
    return history[:limit]


def _build_artist_payload(
    artist: Artist,
    aggregates: ArtistAggregate,
    genres: Iterable[str],
    relationship: Optional[PublisherArtistRelationship],
    agreement: Optional[PublishingAgreement],
) -> Dict[str, object]:
    user = getattr(artist, 'user', None)
    photo_url = getattr(getattr(user, 'photo', None), 'url', None)

    return {
        'artistId': artist.artist_id,
        'stageName': artist.stage_name,
        'name': f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or artist.stage_name,
        'email': getattr(user, 'email', None),
        'phone': getattr(user, 'phone', None),
        'status': _determine_artist_status(artist),
        'joinDate': artist.created_at.date().isoformat() if artist.created_at else None,
        'location': _resolve_location(artist),
        'bio': artist.bio,
        'profileImage': photo_url,
        'coverImage': getattr(getattr(user, 'cover_photo', None), 'url', None),
        'genres': sorted({genre for genre in genres if genre}),
        'socialMedia': _serialize_social_links(artist),
        'stats': {
            'totalStreams': aggregates.total_streams,
            'monthlyStreams': aggregates.monthly_streams,
            'totalTracks': Track.objects.filter(artist=artist, is_archived=False).count(),
            'totalAlbums': Album.objects.filter(artist=artist, is_archived=False).count(),
            'followers': _calculate_followers(getattr(artist, 'social_metrics', {})),
            'earnings': _format_currency(aggregates.total_earnings),
            'lastActivity': aggregates.last_played_at,
        },
        'contract': _normalise_contract(relationship, agreement),
        'recentActivity': _build_activity_entries(artist, limit=6),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_all_managed_artists_view(request):
    payload: Dict[str, object] = {}

    publisher, errors, error_status = _resolve_publisher(request)
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=error_status)

    search_term = (request.query_params.get('search') or '').strip()
    status_filter = (request.query_params.get('status') or '').strip().lower()
    genre_filter = (request.query_params.get('genre') or '').strip()
    sort_by = (request.query_params.get('sort_by') or 'name').strip().lower()
    sort_order = (request.query_params.get('sort_order') or 'asc').strip().lower()
    page_number = _parse_positive_int(request.query_params.get('page'), 1)
    page_size = _parse_positive_int(request.query_params.get('page_size'), 12)

    artists_qs = (
        Artist.objects.filter(publisher=publisher, is_archived=False)
        .select_related('user')
    )

    if search_term:
        artists_qs = artists_qs.filter(
            Q(stage_name__icontains=search_term)
            | Q(user__first_name__icontains=search_term)
            | Q(user__last_name__icontains=search_term)
            | Q(user__email__icontains=search_term)
        )

    if status_filter:
        if status_filter == 'active':
            artists_qs = artists_qs.filter(active=True, is_archived=False)
        elif status_filter == 'inactive':
            artists_qs = artists_qs.filter(Q(active=False) | Q(is_archived=True))
        elif status_filter == 'pending':
            artists_qs = artists_qs.filter(verification_status__in=['pending', 'skipped'])

    if genre_filter:
        artists_qs = artists_qs.filter(
            Q(primary_genre__iexact=genre_filter)
            | Q(track__genre__name__iexact=genre_filter)
        ).distinct()

    if sort_by == 'joined':
        order_field = 'created_at'
    elif sort_by == 'status':
        order_field = 'verification_status'
    elif sort_by == 'streams':
        order_field = '-id'  # placeholder; real ordering applied later after aggregates
    else:
        order_field = 'stage_name'

    if sort_by != 'streams':
        if sort_order == 'desc':
            order_field = f"-{order_field.lstrip('-')}"
        artists_qs = artists_qs.order_by(order_field)

    artist_ids = list(artists_qs.values_list('id', flat=True))

    aggregates: Dict[int, ArtistAggregate] = {artist_id: ArtistAggregate() for artist_id in artist_ids}
    genres_map: Dict[int, set] = defaultdict(set)

    if artist_ids:
        thirty_days_ago = timezone.now() - timedelta(days=30)

        play_stats = (
            PlayLog.objects.filter(track__artist_id__in=artist_ids)
            .values('track__artist_id')
            .annotate(
                total=Count('id'),
                monthly=Count('id', filter=Q(played_at__gte=thirty_days_ago)),
                earnings=Sum('royalty_amount'),
                last_play=Max('played_at'),
            )
        )

        for row in play_stats:
            artist_id = row['track__artist_id']
            aggregate = aggregates[artist_id]
            aggregate.play_count = row['total'] or 0
            aggregate.total_streams += aggregate.play_count
            aggregate.monthly_streams += row['monthly'] or 0
            aggregate.total_earnings += _safe_decimal(row['earnings'])
            aggregate.last_played_at = _format_datetime(row['last_play'])

        stream_stats = (
            StreamLog.objects.filter(track__artist_id__in=artist_ids)
            .values('track__artist_id')
            .annotate(
                total=Count('id'),
                monthly=Count('id', filter=Q(played_at__gte=thirty_days_ago)),
                earnings=Sum('royalty_amount'),
                last_play=Max('played_at'),
            )
        )

        for row in stream_stats:
            artist_id = row['track__artist_id']
            aggregate = aggregates[artist_id]
            stream_count = row['total'] or 0
            aggregate.total_streams += stream_count
            aggregate.monthly_streams += row['monthly'] or 0
            aggregate.total_earnings += _safe_decimal(row['earnings'])
            last_play = _format_datetime(row['last_play'])
            if last_play and last_play > (aggregate.last_played_at or ''):
                aggregate.last_played_at = last_play

        track_genres = (
            Track.objects.filter(artist_id__in=artist_ids, is_archived=False)
            .values('artist_id', 'genre__name')
        )
        for row in track_genres:
            artist_id = row['artist_id']
            genre_name = row['genre__name']
            if genre_name:
                genres_map[artist_id].add(genre_name)

    relationships = {
        rel.artist_id: rel
        for rel in PublisherArtistRelationship.objects.filter(
            publisher=publisher,
            artist_id__in=artist_ids,
            is_archived=False,
        ).order_by('-status', '-start_date', '-created_at')
    }

    agreements = {
        agreement.songwriter_id: agreement
        for agreement in PublishingAgreement.objects.filter(
            publisher=publisher,
            songwriter_id__in=artist_ids,
            status__in=['accepted', 'active'],
        ).order_by('-agreement_date', '-created_at')
    }

    artist_payloads = [
        _build_artist_payload(
            artist,
            aggregates.get(artist.id, ArtistAggregate()),
            genres_map.get(artist.id, set()) | ({artist.primary_genre} if artist.primary_genre else set()),
            relationships.get(artist.id),
            agreements.get(artist.id),
        )
        for artist in artists_qs
    ]

    if sort_by == 'streams':
        artist_payloads.sort(
            key=lambda item: item['stats']['totalStreams'],
            reverse=(sort_order == 'desc'),
        )

    paginator = Paginator(artist_payloads, page_size)
    try:
        page: Page = paginator.page(page_number)
    except PageNotAnInteger:
        page = paginator.page(1)
    except EmptyPage:
        page = paginator.page(paginator.num_pages)

    summary = {
        'totalArtists': paginator.count,
        'activeArtists': artists_qs.filter(active=True, is_archived=False).count(),
        'pendingArtists': artists_qs.filter(verification_status__in=['pending', 'skipped']).count(),
        'totalStreams': sum(item['stats']['totalStreams'] for item in artist_payloads),
        'monthlyStreams': sum(item['stats']['monthlyStreams'] for item in artist_payloads),
        'totalEarnings': float(
            round(
                sum(
                    _safe_decimal(item['stats']['earnings'])
                    for item in artist_payloads
                ),
                2,
            )
        ),
    }

    available_genres = sorted({genre for genres in genres_map.values() for genre in genres})
    if any(artist.primary_genre for artist in artists_qs):
        available_genres.extend(
            sorted(
                {
                    artist.primary_genre
                    for artist in artists_qs
                    if artist.primary_genre
                }
            )
        )
    available_genres = sorted(set(available_genres))

    payload['message'] = 'Successful'
    payload['data'] = {
        'summary': summary,
        'filters': {
            'statuses': ['active', 'pending', 'inactive'],
            'genres': available_genres,
            'sortOptions': ['name', 'streams', 'status', 'joined'],
        },
        'artists': {
            'results': list(page.object_list),
            'pagination': {
                'page_number': page.number,
                'total_pages': paginator.num_pages,
                'count': paginator.count,
                'next': page.next_page_number() if page.has_next() else None,
                'previous': page.previous_page_number() if page.has_previous() else None,
            },
        },
    }

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_managed_artist_details_view(request):
    payload: Dict[str, object] = {}

    publisher, errors, error_status = _resolve_publisher(request)
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=error_status)

    artist_id = (request.query_params.get('artist_id') or '').strip()
    if not artist_id:
        payload['message'] = 'Errors'
        payload['errors'] = {'artist_id': ['Artist ID is required.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        artist = Artist.objects.select_related('user').get(
            artist_id=artist_id,
            publisher=publisher,
            is_archived=False,
        )
    except Artist.DoesNotExist:
        payload['message'] = 'Errors'
        payload['errors'] = {'artist_id': ['Artist not found for this publisher.']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    aggregate = ArtistAggregate()
    summaries = (
        PlayLog.objects.filter(track__artist=artist)
        .aggregate(
            total=Count('id'),
            earnings=Sum('royalty_amount'),
            last_play=Max('played_at'),
        )
    )
    aggregate.total_streams += summaries.get('total') or 0
    aggregate.total_earnings += _safe_decimal(summaries.get('earnings'))
    aggregate.last_played_at = _format_datetime(summaries.get('last_play'))

    thirty_days_ago = timezone.now() - timedelta(days=30)
    aggregate.monthly_streams += PlayLog.objects.filter(
        track__artist=artist,
        played_at__gte=thirty_days_ago,
    ).count()

    stream_summary = (
        StreamLog.objects.filter(track__artist=artist)
        .aggregate(
            total=Count('id'),
            earnings=Sum('royalty_amount'),
            last_play=Max('played_at'),
        )
    )

    aggregate.total_streams += stream_summary.get('total') or 0
    aggregate.total_earnings += _safe_decimal(stream_summary.get('earnings'))
    last_stream_play = _format_datetime(stream_summary.get('last_play'))
    if last_stream_play and last_stream_play > (aggregate.last_played_at or ''):
        aggregate.last_played_at = last_stream_play

    aggregate.monthly_streams += StreamLog.objects.filter(
        track__artist=artist,
        played_at__gte=thirty_days_ago,
    ).count()

    relationship = (
        PublisherArtistRelationship.objects.filter(
            publisher=publisher,
            artist=artist,
            is_archived=False,
        )
        .order_by('-status', '-start_date', '-created_at')
        .first()
    )

    agreement = (
        PublishingAgreement.objects.filter(
            publisher=publisher,
            songwriter=artist,
            status__in=['accepted', 'active'],
        )
        .order_by('-agreement_date', '-created_at')
        .first()
    )

    genres = set()
    if artist.primary_genre:
        genres.add(artist.primary_genre)
    genres.update(
        Track.objects.filter(artist=artist, is_archived=False)
        .values_list('genre__name', flat=True)
        .exclude(genre__name__isnull=True)
    )

    artist_payload = _build_artist_payload(
        artist,
        aggregate,
        genres,
        relationship,
        agreement,
    )

    artist_payload.update(
        {
            'songs': _build_song_payloads(artist),
            'royaltyHistory': _build_royalty_history(artist),
            'playLogs': _build_royalty_history(artist, limit=5),
        }
    )

    payload['message'] = 'Successful'
    payload['data'] = artist_payload
    return Response(payload, status=status.HTTP_200_OK)

