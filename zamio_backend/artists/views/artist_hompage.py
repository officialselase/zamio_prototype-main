from collections import Counter
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from artists.models import Artist
from music_monitor.models import PlayLog, StreamLog
from stations.models import Station

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication, TokenAuthentication])
def get_artist_homedata(request):
    payload, data, errors = {}, {}, {}
    artist_id = request.query_params.get('artist_id')
    period = request.query_params.get('period', 'all-time')
    sd_str, ed_str = request.query_params.get('start_date'), request.query_params.get('end_date')

    if not artist_id:
        errors['artist_id'] = ["Artist ID is required"]
    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist does not exist']

    now = timezone.now()
    start_date = end_date = None

    try:
        if sd_str and ed_str:
            s = datetime.strptime(sd_str, '%Y-%m-%d')
            e = datetime.strptime(ed_str, '%Y-%m-%d') + timedelta(days=1)
            start_date = timezone.make_aware(s)
            end_date = timezone.make_aware(e)
        else:
            mapping = {
                'daily': now - timedelta(days=1),
                'weekly': now - timedelta(weeks=1),
                'monthly': now - timedelta(days=30),
                'yearly': now - timedelta(days=365),
                'all-time': None
            }
            if period in mapping:
                start_date = mapping[period]
            else:
                errors['period'] = ['Invalid period. Choose from: daily, weekly, monthly, yearly, all-time']
    except ValueError:
        errors['date_format'] = ['start_date and end_date must be YYYY-MM-DD']

    if errors:
        return Response({'message': "Errors", 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    playlogs = PlayLog.objects.filter(track__artist=artist, active=True)
    if start_date:
        if end_date:
            playlogs = playlogs.filter(played_at__range=(start_date, end_date))
        else:
            playlogs = playlogs.filter(played_at__gte=start_date)

    period_end = end_date or now

    comparison_start = comparison_end = None
    lookback_delta = None
    prev_logs = PlayLog.objects.none()

    if start_date:
        comparison_end = start_date
        comparison_start = start_date
        if end_date:
            lookback_delta = end_date - start_date
        else:
            lookback_delta = period_end - start_date

        if not lookback_delta or lookback_delta.total_seconds() <= 0:
            lookback_delta = timedelta(days=7)

        comparison_start = start_date - lookback_delta
        prev_logs = PlayLog.objects.filter(track__artist=artist, active=True)
        prev_logs = prev_logs.filter(played_at__gte=comparison_start, played_at__lt=comparison_end)

    totalPlays = playlogs.count()
    totalStations = playlogs.values('station').distinct().count()
    totalEarnings = float(playlogs.aggregate(total=Sum('royalty_amount'))['total'] or 0)
    confidence_score = float(playlogs.aggregate(avg=Avg('avg_confidence_score'))['avg'] or 0)
    active_regions = playlogs.values('station__region').exclude(station__region__isnull=True).distinct().count()
    active_tracks = playlogs.values('track').distinct().count()

    # Top Songs
    top_tracks = (
        playlogs.values('track', 'track__title')
        .annotate(
            plays=Count('id'),
            earnings=Sum('royalty_amount'),
            confidence=Avg('avg_confidence_score'),
            stations=Count('station', distinct=True)
        )
        .order_by('-plays')[:5]
    )

    prev_track_map = {}
    if start_date:
        prev_track_map = {
            entry['track']: entry['plays']
            for entry in (
                prev_logs.values('track')
                .annotate(plays=Count('id'))
            )
        }

    topSongs = []
    for index, track in enumerate(top_tracks):
        trend = 'stable'
        if start_date:
            prev_count = prev_track_map.get(track['track'], 0)
            if prev_count:
                change = track['plays'] - prev_count
                if change > 0:
                    trend = 'up'
                elif change < 0:
                    trend = 'down'
            else:
                trend = 'up' if track['plays'] else 'stable'
        else:
            if index == 0:
                trend = 'up'
            elif index == len(top_tracks) - 1 and len(top_tracks) > 1:
                trend = 'down'

        topSongs.append({
            "title": track['track__title'],
            "plays": track['plays'],
            "earnings": round(float(track['earnings'] or 0), 2),
            "confidence": round(float(track['confidence'] or 0), 1),
            "stations": track['stations'],
            "trend": trend,
        })

    # Plays Over Time
    duration_days = (end_date - start_date).days if start_date and end_date else None
    if duration_days and duration_days <= 30:
        tb = TruncDate('played_at')
    else:
        tb = TruncMonth('played_at')

    time_qs = (
        playlogs
        .annotate(date=tb)
        .values('date')
        .annotate(
            airplay=Count('id'),
            earnings=Sum('royalty_amount')
        )
        .order_by('date')
    )

    playsOverTime = [
        {
            'date': entry['date'].strftime('%Y-%m-%d'),
            'airplay': entry['airplay'],
            'earnings': round(float(entry['earnings'] or 0), 2),
        }
        for entry in time_qs
    ]

    # Ghana Region Breakdown
    region_qs = playlogs.values('station__region').annotate(
        plays=Count('id'), earnings=Sum('royalty_amount'), stations=Count('station', distinct=True)
    )
    prev_region_map = {}
    if start_date:
        prev_region_map = {
            entry['station__region']: entry['plays']
            for entry in (
                prev_logs.values('station__region')
                .annotate(plays=Count('id'))
            )
        }

    ghanaRegions = []
    for r in region_qs:
        region_name = r['station__region'] or "Unknown"
        current_plays = r['plays']
        previous_plays = prev_region_map.get(r['station__region'], 0) if start_date else None
        if start_date:
            if previous_plays:
                growth_value = ((current_plays - previous_plays) / previous_plays) * 100
            elif current_plays:
                growth_value = 100.0
            else:
                growth_value = 0.0
        else:
            growth_value = 0.0

        if growth_value > 1:
            region_trend = 'up'
        elif growth_value < -1:
            region_trend = 'down'
        else:
            region_trend = 'stable'

        ghanaRegions.append({
            "region": region_name,
            "plays": current_plays,
            "earnings": round(float(r['earnings'] or 0), 2),
            "stations": r['stations'],
            "growth": round(growth_value, 1),
            "trend": region_trend,
        })

    # Station Breakdown
    sb_qs = (
        playlogs
        .values('station__name', 'station__region', 'station__station_type')
        .annotate(plays=Count('id'))
        .order_by('-plays')
    )
    station_total = totalPlays or 1
    station_type_labels = dict(Station.STATION_TYPES)
    stationBreakdown = [{
        "station": s['station__name'],
        "plays": s['plays'],
        "percentage": round((s['plays'] / station_total) * 100, 1),
        "region": s['station__region'] or "Unknown",
        "type": station_type_labels.get(s['station__station_type'], 'Unknown')
    } for s in sb_qs[:5]]
    others = sb_qs[5:]
    if others:
        others_total = sum([o['plays'] for o in others])
        stationBreakdown.append({
            "station": "Others",
            "plays": others_total,
            "percentage": round((others_total / station_total) * 100, 1),
            "region": "Various",
            "type": "Mixed"
        })

    # Fan Demographics
    fanDemographics = []
    stream_logs = StreamLog.objects.filter(track__artist=artist, active=True).exclude(fan__isnull=True)
    if start_date:
        if end_date:
            stream_logs = stream_logs.filter(played_at__range=(start_date, end_date))
        else:
            stream_logs = stream_logs.filter(played_at__gte=start_date)

    fan_ids = list(stream_logs.values_list('fan_id', flat=True).distinct())
    if fan_ids:
        from fan.models import Fan  # local import to avoid circular dependencies

        fans = list(Fan.objects.filter(id__in=fan_ids))
        total_fans = len(fans)

        region_counts = Counter([fan.region or "Unknown" for fan in fans])
        country_counts = Counter([fan.country or "Unknown" for fan in fans])

        age_buckets = {
            '13-17': 0,
            '18-24': 0,
            '25-34': 0,
            '35-44': 0,
            '45+': 0,
        }
        today = timezone.now().date()
        for fan in fans:
            if fan.dob:
                age = max(0, (today - fan.dob.date()).days // 365)
                if age < 18:
                    age_buckets['13-17'] += 1
                elif age < 25:
                    age_buckets['18-24'] += 1
                elif age < 35:
                    age_buckets['25-34'] += 1
                elif age < 45:
                    age_buckets['35-44'] += 1
                else:
                    age_buckets['45+'] += 1

        for label, count in region_counts.most_common(5):
            fanDemographics.append({
                "category": "region",
                "label": label,
                "fans": count,
                "percentage": round((count / total_fans) * 100, 1) if total_fans else 0,
            })

        for label, count in country_counts.most_common(3):
            fanDemographics.append({
                "category": "country",
                "label": label,
                "fans": count,
                "percentage": round((count / total_fans) * 100, 1) if total_fans else 0,
            })

        for label, count in age_buckets.items():
            if count:
                fanDemographics.append({
                    "category": "age_range",
                    "label": label,
                    "fans": count,
                    "percentage": round((count / total_fans) * 100, 1) if total_fans else 0,
                })

    if start_date:
        prev_plays = prev_logs.count()
    else:
        prev_plays = 0

    if prev_plays:
        growth_rate = round(((totalPlays - prev_plays) / prev_plays) * 100, 1)
    else:
        growth_rate = 100.0 if totalPlays else 0.0

    stats_summary = {
        "totalPlays": totalPlays,
        "totalStations": totalStations,
        "totalEarnings": round(totalEarnings, 2),
        "avgConfidence": round(confidence_score, 1),
        "growthRate": growth_rate,
        "activeTracks": active_tracks,
    }

    data.update({
        "period": 'custom' if sd_str and ed_str else period,
        "start_date": sd_str,
        "end_date": ed_str,
        "artistName": artist.stage_name,
        "stats": stats_summary,
        "confidenceScore": round(confidence_score, 1),
        "activeRegions": active_regions,
        "topSongs": topSongs,
        "playsOverTime": playsOverTime,
        "ghanaRegions": ghanaRegions,
        "stationBreakdown": stationBreakdown,
        "fanDemographics": fanDemographics,
    })

    return Response({"message": "Successful", "data": data}, status=status.HTTP_200_OK)
