
import os
import subprocess
import uuid
import shutil
from decimal import Decimal
from django.core.exceptions import FieldDoesNotExist, FieldError

from django.db.models import Sum, Count, Avg, F, Q, Min, Max
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from django.utils.timezone import localtime

from click import File
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from accounts.api.custom_jwt import CustomJWTAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.artist_views import is_valid_email, check_email_exist
from accounts.models import AuditLog
from artists.models import Album, Artist, Contributor, Fingerprint, Genre, Track
from artists.serializers import AlbumSerializer, GenreSerializer
from django.core.files.base import ContentFile
from django.core.cache import cache

from artists.utils.audio_loading import load_audio_samples
from artists.utils.fingerprint_tracks import simple_fingerprint
from datetime import timedelta

AUTHENTICATION_CLASSES = [TokenAuthentication, CustomJWTAuthentication]

from core.utils import get_duration
from music_monitor.models import PlayLog


User = get_user_model()


SUPPORTED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.wma'}


def _run_ffmpeg(command):
    return subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )


def _ffmpeg_error_message(error):
    stderr = getattr(error, 'stderr', '') or ''
    stdout = getattr(error, 'stdout', '') or ''
    details = (stderr or stdout or str(error)).strip()
    return details[-1000:] if details else str(error)


def _get_artist_for_request(request, artist_id):
    if artist_id:
        return Artist.objects.get(artist_id=artist_id)

    # Some upload forms rely on the authenticated artist account instead of
    # posting artist_id. Detect the local Artist -> User relation defensively.
    for field_name in ('user', 'account', 'owner'):
        try:
            Artist._meta.get_field(field_name)
            artist = Artist.objects.filter(**{field_name: request.user}).first()
            if artist:
                return artist
        except (FieldDoesNotExist, FieldError):
            continue

    return None




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def add_track(request):
    data = {}
    errors = {}

    title = request.data.get('title', "").strip()
    artist_id = request.data.get('artist_id', "").strip()
    album_id = request.data.get('album_id', "").strip()
    release_date = request.data.get('release_date', "").strip()
    genre_id = request.data.get('genre_id', "").strip()
    lyrics = request.data.get('lyrics', "")
    explicit = request.data.get('explicit', False)
    audio_file_uploaded = request.FILES.get('audio_file', None)

    # Validate required fields
    if not title:
        errors['title'] = ['Track title is required.']
    if not genre_id:
        errors['genre_id'] = ['Genre is required.']
    if not audio_file_uploaded:
        errors['audio_file'] = ['Audio file is required.']

    # Validate artist
    artist = None
    try:
        artist = _get_artist_for_request(request, artist_id)
        if not artist:
            errors['artist_id'] = ['Artist ID is required.']
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']

    # Validate album (optional)
    album = None
    if album_id:
        try:
            album = Album.objects.get(id=album_id)
        except Album.DoesNotExist:
            errors['album'] = ['Album not found.']

    # Validate genre
    genre = None
    if genre_id:
        try:
            genre = Genre.objects.get(id=genre_id)
        except Genre.DoesNotExist:
            errors['genre'] = ['Genre not found.']

    # Return early if validation failed
    if errors:
        return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    # Prepare temp paths and filenames
    original_ext = os.path.splitext(audio_file_uploaded.name)[1].lower()
    if original_ext not in SUPPORTED_AUDIO_EXTENSIONS:
        errors['audio_file'] = [
            'Unsupported file type. Please upload MP3, WAV, M4A, AAC, FLAC, OGG, OPUS, or WMA audio.'
        ]
        return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    base_filename = uuid.uuid4().hex
    mp3_name = f"{base_filename}.mp3"
    wav_name = f"{base_filename}.wav"

    temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
    os.makedirs(temp_dir, exist_ok=True)

    input_path = os.path.join(temp_dir, f"{base_filename}{original_ext}")
    wav_path = os.path.join(temp_dir, wav_name)
    mp3_path = os.path.join(temp_dir, mp3_name)

    # Save uploaded file to input_path
    try:
        with open(input_path, 'wb+') as dest:
            for chunk in audio_file_uploaded.chunks():
                dest.write(chunk)
    except Exception as e:
        errors['audio_file'] = [f'Failed to save uploaded file: {str(e)}']
        return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    track = None

    try:
        # Create track without audio files first
        track = Track.objects.create(
            title=title,
            artist=artist,
            album=album,
            release_date=release_date or None,
            genre=genre,
            lyrics=lyrics,
            explicit=explicit,
            active=True
        )

        # Convert or copy to both formats
        if original_ext == '.mp3':
            _run_ffmpeg(['ffmpeg', '-y', '-i', input_path, '-vn', '-ar', '44100', '-ac', '2', '-f', 'wav', wav_path])
            shutil.copyfile(input_path, mp3_path)

        elif original_ext == '.wav':
            _run_ffmpeg(['ffmpeg', '-y', '-i', input_path, '-vn', '-b:a', '192k', mp3_path])
            shutil.copyfile(input_path, wav_path)

        else:
            _run_ffmpeg(['ffmpeg', '-y', '-i', input_path, '-vn', '-ar', '44100', '-ac', '2', '-f', 'wav', wav_path])
            _run_ffmpeg(['ffmpeg', '-y', '-i', input_path, '-vn', '-b:a', '192k', mp3_path])

        # Load audio and extract duration
        clip_samples, clip_sr = load_audio_samples(wav_path)
        duration_seconds = clip_samples.size / clip_sr
        track.duration = timedelta(seconds=round(duration_seconds))

        # Generate fingerprints
        audio_fingerprints = simple_fingerprint(clip_samples, clip_sr, plot=False)
        if not audio_fingerprints:
            raise ValueError("No fingerprints generated from audio")

        # Save both audio formats to Track model
        with open(wav_path, 'rb') as wav_file, open(mp3_path, 'rb') as mp3_file:
            wav_django_file = ContentFile(wav_file.read())
            mp3_django_file = ContentFile(mp3_file.read())

            track.audio_file_wav.save(wav_name, wav_django_file, save=False)
            track.audio_file_mp3.save(mp3_name, mp3_django_file, save=False)
            track.fingerprinted = True
            track.save()

        # Save fingerprints
        if audio_fingerprints:
            fingerprint_objects = [
                Fingerprint(track=track, hash=hash_value, offset=offset)
                for hash_value, offset in audio_fingerprints
            ]
            Fingerprint.objects.bulk_create(fingerprint_objects, batch_size=1000)
            cache.delete("fingerprints_index_v1")

    except subprocess.CalledProcessError as e:
        if track:
            track.delete()
        errors['audio_file'] = [f'ffmpeg failed: {_ffmpeg_error_message(e)}']
        return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    except ValueError as e:
        if track:
            track.delete()
        errors['audio_file'] = [str(e)]
        return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        if track:
            track.delete()
        errors['audio_file'] = [f'Processing failed: {str(e)}']
        return Response({'message': 'Errors', 'errors': errors}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    finally:
        # Clean up temp files
        for path in set([input_path, wav_path, mp3_path]):
            if os.path.exists(path):
                os.remove(path)

    # Success response
    # Return both DB id and public track_id for frontend flows
    data['db_id'] = track.id
    data['track_id'] = track.track_id
    data['title'] = track.title
    data['isrc_code'] = track.isrc_code

    # Get client IP for audit logging
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    # Log successful track upload
    AuditLog.objects.create(
        user=request.user,
        action='track_uploaded',
        resource_type='track',
        resource_id=str(track.track_id),
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        request_data={
            'title': title,
            'artist_id': artist_id,
            'album_id': album_id,
            'genre_id': genre_id,
            'explicit': explicit,
            'file_size': audio_file_uploaded.size,
            'file_name': audio_file_uploaded.name
        },
        response_data={
            'success': True,
            'track_id': str(track.track_id),
            'duration_seconds': float(track.duration.total_seconds()) if track.duration else 0,
            'fingerprints_created': len(audio_fingerprints) if audio_fingerprints else 0,
            'isrc_code': track.isrc_code
        },
        status_code=201
    )

    return Response({'message': 'Successful', 'data': data}, status=status.HTTP_201_CREATED)





@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_all_tracks_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    artist_id = request.query_params.get('artist_id', "")
    order_by = request.query_params.get('order_by', "")
    page_size = 10

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']


    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


    tracks = Track.objects.filter(artist=artist, is_archived=False).order_by("-created_at")

    if search_query:
        tracks = tracks.filter(
            Q(title__icontains=search_query) |
            Q(status__icontains=search_query) |
            Q(isrc_code__icontains=search_query) |
            Q(artist__stage_name__icontains=search_query) |
            Q(artist__stage_name__icontains=search_query) |
            Q(album__title__icontains=search_query) |
            Q(genre__name__icontains=search_query)
        )

    if order_by:
        if order_by == "Genre":
            tracks = tracks.order_by("genre__name")
        if order_by == "Album":
            tracks = tracks.order_by("album__title")
        if order_by == "Title":
            tracks = tracks.order_by("title")
        if order_by == "Release Date":
            tracks = tracks.order_by("release_date")
        if order_by == "Status":
            tracks = tracks.order_by("status")



    paginator = Paginator(tracks, page_size)
    try:
        paginated_tracks = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_tracks = paginator.page(1)
    except EmptyPage:
        paginated_tracks = paginator.page(paginator.num_pages)

    from ..serializers import TrackSerializer
    serializer = TrackSerializer(paginated_tracks, many=True)

    data['tracks'] = serializer.data
    data['pagination'] = {
        'page_number': paginated_tracks.number,
        'total_pages': paginator.num_pages,
        'next': paginated_tracks.next_page_number() if paginated_tracks.has_next() else None,
        'previous': paginated_tracks.previous_page_number() if paginated_tracks.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_all_tracks_admin_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    order_by = request.query_params.get('order_by', "")
    page_size = 10



    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


    tracks = Track.objects.all().order_by("-created_at")

    if search_query:
        tracks = tracks.filter(
            Q(title__icontains=search_query) |
            Q(status__icontains=search_query) |
            Q(isrc_code__icontains=search_query) |
            Q(artist__stage_name__icontains=search_query) |
            Q(artist__stage_name__icontains=search_query) |
            Q(album__title__icontains=search_query) |
            Q(genre__name__icontains=search_query)
        )

    if order_by:
        if order_by == "Genre":
            tracks = tracks.order_by("genre__name")
        if order_by == "Album":
            tracks = tracks.order_by("album__title")
        if order_by == "Title":
            tracks = tracks.order_by("title")
        if order_by == "Release Date":
            tracks = tracks.order_by("release_date")
        if order_by == "Status":
            tracks = tracks.order_by("status")



    paginator = Paginator(tracks, page_size)
    try:
        paginated_tracks = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_tracks = paginator.page(1)
    except EmptyPage:
        paginated_tracks = paginator.page(paginator.num_pages)

    from ..serializers import TrackSerializer
    serializer = TrackSerializer(paginated_tracks, many=True)

    data['tracks'] = serializer.data
    data['pagination'] = {
        'page_number': paginated_tracks.number,
        'total_pages': paginator.num_pages,
        'next': paginated_tracks.next_page_number() if paginated_tracks.has_next() else None,
        'previous': paginated_tracks.previous_page_number() if paginated_tracks.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_track_details_view(request):
    payload = {}
    errors = {}
    data = {}

    track_identifier = request.query_params.get('track_id')
    period = request.query_params.get('period', 'all-time')

    if track_identifier in (None, ''):
        errors['track_id'] = ['Track ID is required.']

    track = None
    if track_identifier not in (None, ''):
        lookup_value = str(track_identifier).strip()
        if not lookup_value:
            errors['track_id'] = ['Track ID is required.']
        else:
            track = Track.objects.filter(track_id=lookup_value).first()
            if not track:
                try:
                    pk_value = int(lookup_value)
                except (TypeError, ValueError):
                    pk_value = None
                if pk_value is not None:
                    track = Track.objects.filter(id=pk_value).first()

    if not track and 'track_id' not in errors:
        errors['track'] = ['Track not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    playlogs = (
        PlayLog.objects.filter(track=track)
        .select_related('station')
        .order_by('-played_at')
    )
    play_count = playlogs.count()

    aggregates = playlogs.aggregate(
        total_revenue=Sum('royalty_amount'),
        average_confidence=Avg('avg_confidence_score'),
        first_played_at=Min('played_at'),
        last_played_at=Max('played_at'),
    )

    total_revenue_value = Decimal(aggregates.get('total_revenue') or 0)
    average_confidence = aggregates.get('average_confidence')
    first_played_at = aggregates.get('first_played_at')
    last_played_at = aggregates.get('last_played_at')

    def format_timestamp(value):
        if not value:
            return None
        try:
            return localtime(value).isoformat()
        except Exception:
            return value.isoformat() if hasattr(value, 'isoformat') else None

    def format_label(value, default_label='Unknown', fmt='%b %Y'):
        if not value:
            return default_label
        try:
            return localtime(value).strftime(fmt)
        except Exception:
            try:
                return value.strftime(fmt)
            except Exception:
                return default_label

    monthly_revenue_qs = (
        playlogs
        .exclude(played_at__isnull=True)
        .annotate(month=TruncMonth('played_at'))
        .values('month')
        .annotate(amount=Sum('royalty_amount'), plays=Count('id'))
        .order_by('month')
    )

    monthly_revenue = [
        {
            'month': format_label(entry['month']),
            'amount': round(float(entry['amount'] or 0), 2),
            'currency': 'GHS',
        }
        for entry in monthly_revenue_qs
    ]

    if period in ('daily', 'weekly'):
        truncated_field = TruncDate('played_at')
        label_format = '%b %d'
    else:
        truncated_field = TruncMonth('played_at')
        label_format = '%b %Y'

    time_series_qs = (
        playlogs
        .exclude(played_at__isnull=True)
        .annotate(bucket=truncated_field)
        .values('bucket')
        .annotate(
            revenue=Sum('royalty_amount'),
            plays=Count('id'),
            stations=Count('station', distinct=True),
        )
        .order_by('bucket')
    )

    playsOverTime = [
        {
            'month': format_label(entry['bucket'], fmt=label_format),
            'revenue': round(float(entry['revenue'] or 0), 2),
            'plays': entry['plays'],
            'stations': entry['stations'],
        }
        for entry in time_series_qs
    ]

    if not monthly_revenue and playsOverTime:
        monthly_revenue = [
            {'month': item['month'], 'amount': item['revenue'], 'currency': 'GHS'}
            for item in playsOverTime
        ]

    ts_qs = (
        playlogs
        .values('station__name', 'station__region', 'station__country')
        .annotate(plays=Count('id'), revenue=Sum('royalty_amount'))
        .order_by('-plays')
    )

    top_stations = [
        {
            'name': entry['station__name'] or 'Unknown Station',
            'count': entry['plays'],
            'region': entry['station__region'],
            'country': entry['station__country'],
            'revenue': round(float(entry['revenue'] or 0), 2),
        }
        for entry in ts_qs[:5]
    ]

    latest_logs = playlogs[:25]
    play_logs_payload = []
    for log in latest_logs:
        station = getattr(log, 'station', None)
        play_logs_payload.append({
            'played_at': format_timestamp(log.played_at),
            'station': getattr(station, 'name', None),
            'region': getattr(station, 'region', None),
            'country': getattr(station, 'country', None),
        })

    contributors = Contributor.objects.filter(track=track)

    _contributors = []
    for contrib in contributors:
        user = getattr(contrib, 'user', None)
        first = getattr(user, 'first_name', '') if user else ''
        last = getattr(user, 'last_name', '') if user else ''
        username = getattr(user, 'username', '') if user else ''
        email = getattr(user, 'email', '') if user else ''
        display_name = (f"{first} {last}".strip() or username or email)
        con_data = {
            'role': contrib.role,
            'name': display_name,
            'percentage': float(contrib.percent_split) if contrib.percent_split is not None else None,
        }
        _contributors.append(con_data)

    territory_qs = (
        playlogs
        .values('station__region', 'station__country')
        .annotate(amount=Sum('royalty_amount'), plays=Count('id'))
        .order_by('-amount', '-plays')
    )

    territory_intermediate = []
    for entry in territory_qs:
        territory_name = entry['station__region'] or entry['station__country'] or 'Unknown Region'
        amount = Decimal(entry['amount'] or 0)
        plays = entry['plays'] or 0
        territory_intermediate.append({
            'territory': territory_name,
            'amount': amount,
            'plays': plays,
        })

    total_territory_amount = sum(item['amount'] for item in territory_intermediate)
    total_territory_amount = total_territory_amount or Decimal('0')
    total_territory_plays = sum(item['plays'] for item in territory_intermediate)

    territories = []
    for item in territory_intermediate:
        if total_territory_amount > 0:
            percentage_value = (item['amount'] / total_territory_amount) * Decimal('100')
        elif total_territory_plays > 0:
            percentage_value = Decimal(item['plays']) / Decimal(total_territory_plays) * Decimal('100')
        else:
            percentage_value = Decimal('0')

        territories.append({
            'territory': item['territory'],
            'amount': round(float(item['amount']), 2),
            'currency': 'GHS',
            'percentage': round(float(percentage_value), 2),
        })

    radioStations = [
        {"name": "Joy FM", "latitude": 5.5600, "longitude": -0.2100},
        {"name": "Peace FM", "latitude": 5.5900, "longitude": -0.2400},
        {"name": "YFM Accra", "latitude": 5.5800, "longitude": -0.2200},
        {"name": "Luv FM", "latitude": 6.6885, "longitude": -1.6244},
        {"name": "Skyy Power FM", "latitude": 4.9437, "longitude": -1.7587},
        {"name": "Cape FM", "latitude": 5.1053, "longitude": -1.2466},
        {"name": "Radio Central", "latitude": 5.1066, "longitude": -1.2474},
        {"name": "Radio Savannah", "latitude": 9.4075, "longitude": -0.8419},
    ]

    # Helper function to build absolute URI
    def build_absolute_uri(file_field):
        if not file_field:
            return None
        try:
            url = file_field.url
            # Skip default placeholder images
            if 'defaults/track_cover.png' in url or 'defaults/album_cover.png' in url:
                return None
            return request.build_absolute_uri(url)
        except Exception:
            return None
    
    # Get cover art - prefer track cover, fallback to album cover
    def get_cover_art_url():
        # Try track cover art first
        track_cover = build_absolute_uri(track.cover_art)
        if track_cover:
            return track_cover
        
        # Fallback to album cover art if track has an album
        if track.album:
            album_cover = build_absolute_uri(track.album.cover_art)
            if album_cover:
                return album_cover
        
        return None

    # Build track object with all track-specific fields
    track_data = {
        'id': track.id,
        'track_id': track.track_id,
        'title': track.title,
        'artist': getattr(track.artist, 'stage_name', None),
        'album': track.album.title if getattr(track, 'album', None) else None,
        'genre': track.genre.name if getattr(track, 'genre', None) else None,
        'lyrics': track.lyrics,
        'duration_seconds': track.duration.total_seconds() if getattr(track, 'duration', None) else None,
        'release_date': track.release_date.isoformat() if track.release_date else None,
        'plays': int(play_count),
        'total_revenue': round(float(total_revenue_value), 2),
        'cover_art_url': get_cover_art_url(),
        'audio_file_url': build_absolute_uri(track.audio_file_mp3) or build_absolute_uri(track.audio_file),
    }

    stats_data = {
        'total_plays': int(play_count),
        'total_revenue': round(float(total_revenue_value), 2),
        'average_confidence': float(average_confidence) if average_confidence is not None else None,
        'first_played_at': format_timestamp(first_played_at),
        'last_played_at': format_timestamp(last_played_at),
    }

    # Legacy flat structure for backward compatibility
    data['id'] = track.id
    data['track_id'] = track.track_id
    data['title'] = track.title
    data['artist_name'] = getattr(track.artist, 'stage_name', None)
    data['album_title'] = track.album.title if getattr(track, 'album', None) else None
    data['genre_name'] = track.genre.name if getattr(track, 'genre', None) else None
    data['lyrics'] = track.lyrics
    data['duration'] = get_duration(track.duration) if getattr(track, 'duration', None) else "00:00:00"
    data['release_date'] = track.release_date.isoformat() if track.release_date else None
    data['plays'] = int(play_count)
    data['total_revenue'] = round(float(total_revenue_value), 2)
    data['cover_art'] = get_cover_art_url()  # Use same fallback logic
    data['audio_file_mp3'] = build_absolute_uri(track.audio_file_mp3)
    data['audio_file_url'] = track_data['audio_file_url']

    # Nested structure matching frontend expectations
    data['track'] = track_data
    data['stats'] = stats_data

    # Get payout history from RoyaltyWithdrawal
    payout_history = []
    try:
        from royalties.models import RoyaltyWithdrawal
        
        # Get withdrawals for this artist
        withdrawals = RoyaltyWithdrawal.objects.filter(
            artist=track.artist,
            status__in=['processed', 'approved']
        ).order_by('-requested_at')[:10]
        
        for withdrawal in withdrawals:
            # Determine period from requested_at date
            period_date = withdrawal.requested_at
            period_label = format_label(period_date, fmt='%B %Y')
            
            payout_history.append({
                'date': withdrawal.requested_at.date().isoformat() if withdrawal.requested_at else None,
                'amount': round(float(withdrawal.amount), 2),
                'status': 'Paid' if withdrawal.status == 'processed' else 'Pending',
                'period': period_label,
            })
    except Exception as e:
        # If RoyaltyWithdrawal doesn't exist or other error, just use empty list
        pass

    data['revenue'] = {
        'monthly': monthly_revenue,
        'territories': territories,
        'payout_history': payout_history,
    }

    data['performance'] = {
        'plays_over_time': playsOverTime,
        'top_stations': top_stations,
    }

    # Nested structure for frontend
    data['play_logs'] = play_logs_payload
    data['contributors'] = _contributors

    # Legacy flat structure for backward compatibility
    data['topStations'] = top_stations
    data['playLogs'] = play_logs_payload
    data['playsOverTime'] = playsOverTime
    data['radioStations'] = radioStations



    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def edit_track(request):
    payload = {}
    data = {}
    errors = {}

    track_id = request.data.get('track_id')
 
    if not track_id:
        errors['track_id'] = ['Track ID is required.']

    try:
        track = Track.objects.get(track_id=track_id)
    except Track.DoesNotExist:
        errors['track'] = ['Track not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Store original values for audit logging
    original_values = {
        'title': track.title,
        'release_date': str(track.release_date) if track.release_date else None,
        'lyrics': track.lyrics,
        'explicit': track.explicit,
        'artist_id': track.artist.artist_id if track.artist else None,
        'album_id': track.album.id if track.album else None,
        'genre_id': track.genre.id if track.genre else None,
    }

    # Update optional fields
    updated_fields = {}
    for field in ['title', 'release_date', 'lyrics', 'explicit']:
        val = request.data.get(field, None)
        if val is not None and val != '':
            if field == 'explicit':
                val = val in ['true', 'True', True, 1, '1']
            setattr(track, field, val)
            updated_fields[field] = val

    # Handle artist change
    artist_id = request.data.get('artist_id', None)
    if artist_id and artist_id != original_values['artist_id']:
        try:
            artist = Artist.objects.get(artist_id=artist_id)
            track.artist = artist
            updated_fields['artist_id'] = artist_id
        except Artist.DoesNotExist:
            errors['artist'] = ['Artist not found.']

    # Handle album change
    album_id = request.data.get('album_id', None)
    if album_id and album_id != '':
        try:
            album = Album.objects.get(id=album_id)
            track.album = album
            updated_fields['album_id'] = album_id
        except Album.DoesNotExist:
            errors['album'] = ['Album not found.']
    elif album_id == '':
        # Allow clearing album
        track.album = None
        updated_fields['album_id'] = None

    # Handle genre change
    genre_id = request.data.get('genre_id', None)
    if genre_id and genre_id != '':
        try:
            genre = Genre.objects.get(id=genre_id)
            track.genre = genre
            updated_fields['genre_id'] = genre_id
        except Genre.DoesNotExist:
            errors['genre'] = ['Genre not found.']

    # Handle cover art upload
    cover_art = request.FILES.get('cover_art', None)
    if cover_art:
        track.cover_art = cover_art
        updated_fields['cover_art'] = 'Updated'

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    track.save()

    # Get client IP for audit logging
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    # Log track edit for audit trail
    AuditLog.objects.create(
        user=request.user,
        action='track_edited',
        resource_type='track',
        resource_id=str(track.track_id),
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        request_data={
            'track_id': track_id,
            'updated_fields': list(updated_fields.keys()),
            'original_values': original_values,
            'new_values': updated_fields
        },
        response_data={
            'success': True,
            'track_id': str(track.track_id),
            'title': track.title,
            'updated_fields_count': len(updated_fields)
        },
        status_code=200
    )

    # Create edit history record for version tracking
    if updated_fields:
        from artists.models import TrackEditHistory
        TrackEditHistory.objects.create(
            track=track,
            user=request.user,
            changed_fields=list(updated_fields.keys()),
            old_values=original_values,
            new_values=updated_fields,
            edit_reason=request.data.get('edit_reason', ''),
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

    data['track_id'] = track.track_id
    data['title'] = track.title
    data['updated_fields'] = updated_fields

    payload['message'] = "Track updated successfully"
    payload['data'] = data
    return Response(payload)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def archive_track(request):
    return toggle_track_archive_state(request, True)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def unarchive_track(request):
    return toggle_track_archive_state(request, False)


def toggle_track_archive_state(request, state):
    payload = {}
    errors = {}

    track_id = request.data.get('track_id', "")

    if not track_id:
        errors['track_id'] = ['Track ID is required.']

    try:
        track = Track.objects.get(track_id=track_id)
    except Track.DoesNotExist:
        errors['track'] = ['Track not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    track.is_archived = state
    track.save()

    payload['message'] = "Successful"
    return Response(payload)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def delete_track(request):
    payload = {}
    errors = {}

    track_id = request.data.get('track_id', "")

    if not track_id:
        errors['track_id'] = ['Track ID is required.']

    try:
        track = Track.objects.get(track_id=track_id)
    except Track.DoesNotExist:
        errors['track'] = ['Track not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    track.delete()

    payload['message'] = "Track deleted successfully."
    return Response(payload)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_all_archived_tracks_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    page_size = 10

    tracks = Track.objects.filter(is_archived=True)

    if search_query:
        tracks = tracks.filter(
            Q(title__icontains=search_query) |
            Q(isrc_code__icontains=search_query) |
            Q(artist__name__icontains=search_query)
        )

    paginator = Paginator(tracks, page_size)
    try:
        paginated_tracks = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_tracks = paginator.page(1)
    except EmptyPage:
        paginated_tracks = paginator.page(paginator.num_pages)

    from ..serializers import TrackSerializer
    serializer = TrackSerializer(paginated_tracks, many=True)

    data['tracks'] = serializer.data
    data['pagination'] = {
        'page_number': paginated_tracks.number,
        'total_pages': paginator.num_pages,
        'next': paginated_tracks.next_page_number() if paginated_tracks.has_next() else None,
        'previous': paginated_tracks.previous_page_number() if paginated_tracks.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_upload_track_support_data_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.query_params.get('artist_id', "")

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']


    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # All Genre
    genres = Genre.objects.filter(is_archived=False)
    if not genres.exists():
        # Fallback genres if none in DB
        data['genres'] = [
            {'id': 1, 'name': 'HipHop'},
            {'id': 2, 'name': 'Gospel'},
            {'id': 3, 'name': 'Jazz'},
            {'id': 4, 'name': 'Afro Pop'},
            {'id': 5, 'name': 'Rock'},
            {'id': 6, 'name': 'HighLife'},
            {'id': 7, 'name': 'Afrobeats'},
            {'id': 8, 'name': 'Reggae'},
            {'id': 9, 'name': 'R&B'},
            {'id': 10, 'name': 'Pop'},
            {'id': 11, 'name': 'Electronic'},
            {'id': 12, 'name': 'Country'},
        ]
    else:
        genres_serializer = GenreSerializer(genres, many=True)
        data['genres'] = genres_serializer.data

    #All Artist Albums

    albums = Album.objects.filter(is_archived=False, artist=artist)
    album_serializer = AlbumSerializer(albums, many=True)
    data['albums'] = album_serializer.data


    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_edit_track_support_data_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.query_params.get('artist_id', "")
    track_id = request.query_params.get('track_id', "")

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']

    try:
        track = Track.objects.get(track_id=track_id)
    except Track.DoesNotExist:
        errors['track'] = ['Track not found.']


    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # All Genre
    genres = Genre.objects.filter(is_archived=False)
    if not genres.exists():
        # Fallback genres if none in DB
        data['genres'] = [
            {'id': 1, 'name': 'HipHop'},
            {'id': 2, 'name': 'Gospel'},
            {'id': 3, 'name': 'Jazz'},
            {'id': 4, 'name': 'Afro Pop'},
            {'id': 5, 'name': 'Rock'},
            {'id': 6, 'name': 'HighLife'},
            {'id': 7, 'name': 'Afrobeats'},
            {'id': 8, 'name': 'Reggae'},
            {'id': 9, 'name': 'R&B'},
            {'id': 10, 'name': 'Pop'},
            {'id': 11, 'name': 'Electronic'},
            {'id': 12, 'name': 'Country'},
        ]
    else:
        genres_serializer = GenreSerializer(genres, many=True)
        data['genres'] = genres_serializer.data

    #All Artist Albums

    albums = Album.objects.filter(is_archived=False, artist=artist)
    album_serializer = AlbumSerializer(albums, many=True)
    data['albums'] = album_serializer.data

    from ..serializers import TrackDetailsSerializer
    track_serializer = TrackDetailsSerializer(track, many=False)
    data['track_details'] = track_serializer.data



    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def upload_track_cover_view(request):
    payload = {}
    data = {}
    errors = {}

    track_id = request.data.get('track_id')
    photo = request.data.get('photo')
 
    if not track_id:
        errors['track_id'] = ['Track ID is required.']
    if not photo:
        errors['photo'] = ['Cover Art is required.']

    try:
        track = Track.objects.get(track_id=track_id)
    except Track.DoesNotExist:
        errors['track'] = ['Track not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    track.cover_art=photo
    track.save()

    data['track_id'] = track.id
    data['title'] = track.title

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes(AUTHENTICATION_CLASSES)
def get_track_edit_history_view(request):
    payload = {}
    data = {}
    errors = {}

    track_id = request.query_params.get('track_id')

    if not track_id:
        errors['track_id'] = ['Track ID is required.']

    try:
        track = Track.objects.get(track_id=track_id)
    except Track.DoesNotExist:
        errors['track'] = ['Track not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    from artists.models import TrackEditHistory
    edit_history = TrackEditHistory.objects.filter(track=track).select_related('user')[:20]  # Last 20 edits

    history_data = []
    for edit in edit_history:
        user_name = f"{edit.user.first_name} {edit.user.last_name}".strip() if edit.user else "Unknown User"
        if not user_name or user_name == "Unknown User":
            user_name = edit.user.email if edit.user else "System"
        
        history_data.append({
            'id': edit.id,
            'user_name': user_name,
            'changed_fields': edit.changed_fields,
            'old_values': edit.old_values,
            'new_values': edit.new_values,
            'edit_reason': edit.edit_reason,
            'created_at': edit.created_at.isoformat(),
        })

    data['edit_history'] = history_data
    data['track_title'] = track.title

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)
