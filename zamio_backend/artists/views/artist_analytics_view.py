
import os
import subprocess
import uuid
import shutil

from click import File
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
import librosa
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response

from accounts.api.artist_views import is_valid_email, check_email_exist
from artists.models import Album, Artist, Contributor, Fingerprint, Genre, Track
from artists.serializers import AlbumSerializer, GenreSerializer
from django.core.files.base import ContentFile

from artists.utils.fingerprint_tracks import simple_fingerprint
from datetime import timedelta

from music_monitor.models import PlayLog
from django.utils import timezone
from django.db.models import Count, Sum
from datetime import datetime
from django.db.models import F
from django.db.models.functions import TruncDate, TruncMonth


User = get_user_model()




@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def get_artist_analytics_view(request):
    payload, data, errors = {}, {}, {}

    artist_id = request.query_params.get('artist_id')
    time_range = request.query_params.get('time_range', '12months')  # 7days, 30days, 3months, 12months
    
    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']
    else:
        try:
            artist = Artist.objects.get(artist_id=artist_id)
        except Artist.DoesNotExist:
            errors['artist_id'] = ['Artist not found.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Define timeframe by time_range
    now = timezone.now()
    start_date = None
    previous_start_date = None
    
    if time_range == '7days':
        start_date = now - timedelta(days=7)
        previous_start_date = now - timedelta(days=14)
    elif time_range == '30days':
        start_date = now - timedelta(days=30)
        previous_start_date = now - timedelta(days=60)
    elif time_range == '3months':
        start_date = now - timedelta(days=90)
        previous_start_date = now - timedelta(days=180)
    elif time_range == '12months':
        start_date = now - timedelta(days=365)
        previous_start_date = now - timedelta(days=730)
    else:
        start_date = now - timedelta(days=365)
        previous_start_date = now - timedelta(days=730)

    tracks = Track.objects.filter(artist=artist, is_archived=False)
    albums = Album.objects.filter(artist=artist, is_archived=False)

    # Base queryset filtered by time_range
    base_qs = PlayLog.objects.filter(track__in=tracks)
    if start_date:
        base_qs = base_qs.filter(played_at__gte=start_date)
    
    # Previous period for growth calculation
    previous_qs = PlayLog.objects.filter(track__in=tracks)
    if previous_start_date and start_date:
        previous_qs = previous_qs.filter(played_at__gte=previous_start_date, played_at__lt=start_date)

    # === OVERVIEW STATISTICS ===
    total_plays = base_qs.count()
    previous_plays = previous_qs.count()
    growth_rate = ((total_plays - previous_plays) / previous_plays * 100) if previous_plays > 0 else 0
    
    # Calculate total revenue (assuming ₵0.015 per play as base rate)
    total_revenue = total_plays * 0.015
    previous_revenue = previous_plays * 0.015
    
    # Unique listeners estimate (approximate from play patterns)
    unique_listeners = base_qs.values('station').distinct().count() * 150  # Rough estimate
    
    overview = {
        'total_plays': total_plays,
        'total_revenue': round(total_revenue, 2),
        'total_tracks': tracks.count(),
        'total_albums': albums.count(),
        'active_listeners': unique_listeners,
        'growth_rate': round(growth_rate, 1),
        'previous_period_growth': round(growth_rate, 1)
    }
    
    # === MONTHLY PERFORMANCE ===
    # Group by month for last 12 months
    monthly_qs = (
        base_qs
        .annotate(month=TruncMonth('played_at'))
        .values('month')
        .annotate(
            plays=Count('id'),
            stations=Count('station', distinct=True)
        )
        .order_by('month')
    )
    
    monthly_performance = []
    for entry in monthly_qs:
        month_plays = entry['plays']
        month_revenue = month_plays * 0.015
        month_listeners = entry['stations'] * 150
        monthly_performance.append({
            'month': entry['month'].strftime('%b'),
            'plays': month_plays,
            'revenue': round(month_revenue, 2),
            'listeners': month_listeners
        })


    # === TOP TRACKS WITH GROWTH ===
    track_stats = {}
    for track in tracks:
        current_plays = base_qs.filter(track=track).count()
        previous_track_plays = previous_qs.filter(track=track).count()
        growth = ((current_plays - previous_track_plays) / previous_track_plays * 100) if previous_track_plays > 0 else 0
        
        track_revenue = current_plays * 0.015
        track_listeners = base_qs.filter(track=track).values('station').distinct().count() * 150
        
        track_stats[track.id] = {
            'title': track.title,
            'plays': current_plays,
            'revenue': round(track_revenue, 2),
            'growth': round(growth, 1),
            'listeners': track_listeners,
            'avg_play_time': 3.0  # Placeholder
        }
    
    top_tracks = sorted(track_stats.values(), key=lambda x: x['plays'], reverse=True)[:5]
    
    # === GEOGRAPHIC PERFORMANCE ===
    region_stats = (
        base_qs
        .values(region=F('station__region'))
        .annotate(
            plays=Count('id'),
            stations=Count('station', distinct=True)
        )
        .order_by('-plays')
    )
    
    total_plays_for_regions = sum(r['plays'] for r in region_stats) or 1
    geographic_performance = []
    for region in region_stats:
        region_plays = region['plays']
        region_revenue = region_plays * 0.015
        region_listeners = region['stations'] * 150
        percentage = (region_plays / total_plays_for_regions) * 100
        
        geographic_performance.append({
            'region': region['region'] or 'Unknown',
            'plays': region_plays,
            'percentage': round(percentage, 1),
            'revenue': round(region_revenue, 2),
            'listeners': region_listeners,
            'avg_revenue_per_listener': round(region_revenue / region_listeners, 2) if region_listeners > 0 else 0
        })
    
    # === REVENUE BY SOURCE ===
    # Currently only radio plays are tracked via PlayLog
    # Other sources are estimated based on industry standards
    revenue_by_source = [
        {
            'source': 'Radio Airplay (Tracked)',
            'amount': round(total_revenue, 2),  # All tracked revenue is from radio
            'percentage': 100.0,
            'plays': total_plays,
            'avg_per_play': 0.015
        }
    ]
    
    # === RECENT ACTIVITY ===
    recent_logs = base_qs.select_related('track', 'station').order_by('-played_at')[:5]
    recent_activity = []
    for log in recent_logs:
        time_diff = now - log.played_at
        if time_diff.days > 0:
            time_str = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
        elif time_diff.seconds >= 3600:
            hours = time_diff.seconds // 3600
            time_str = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff.seconds >= 60:
            minutes = time_diff.seconds // 60
            time_str = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_str = "Just now"
        
        recent_activity.append({
            'action': f"Track played on {log.station.name if log.station else 'Unknown Station'}",
            'time': time_str,
            'plays': 1,
            'revenue': 0.015,
            'location': log.station.region if log.station and log.station.region else 'Unknown'
        })
    
    # === TRACK DETAILS (for detailed analytics) ===
    track_details = []
    for track_data in top_tracks:
        track_details.append({
            'title': track_data['title'],
            'plays': track_data['plays'],
            'revenue': track_data['revenue'],
            'listeners': track_data['listeners'],
            'avg_play_time': track_data['avg_play_time'],
            'completion_rate': 75.0,  # Placeholder
            'skip_rate': 15.0  # Placeholder
        })

    data.update({
        'time_range': time_range,
        'overview': overview,
        'monthly_performance': monthly_performance,
        'top_tracks': top_tracks,
        'geographic_performance': geographic_performance,
        'revenue_by_source': revenue_by_source,
        'recent_activity': recent_activity,
        'track_details': track_details,
    })
    
    payload.update({'message': 'Successful', 'data': data})
    return Response(payload, status=status.HTTP_200_OK)
