from datetime import timedelta, datetime
from decimal import Decimal

from django.utils import timezone
from django.db.models import Count, Avg, Sum, F
from django.db.models.functions import TruncDate, TruncMonth
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status

from music_monitor.models import PlayLog
from stations.models import Station, StationStaff

from accounts.api.custom_jwt import CustomJWTAuthentication



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_dashboard_data(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.query_params.get('station_id')
    period = request.query_params.get('period', 'all-time')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')

    if not station_id:
        errors['station_id'] = ["Station ID is required"]

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ["Station does not exist"]

    # Date range filtering
    now = timezone.now()
    start_date = None
    end_date = None

    try:
        if start_date_str and end_date_str:
            start_date = timezone.make_aware(datetime.strptime(start_date_str, "%Y-%m-%d"))
            end_date = timezone.make_aware(datetime.strptime(end_date_str, "%Y-%m-%d") + timedelta(days=1))
        else:
            if period == 'daily':
                start_date = now - timedelta(days=1)
            elif period == 'weekly':
                start_date = now - timedelta(days=7)
            elif period == 'monthly':
                start_date = now - timedelta(days=30)
            elif period == 'yearly':
                start_date = now - timedelta(days=365)
            elif period == 'all-time':
                start_date = None
            else:
                errors['period'] = ['Invalid period. Choose from: daily, weekly, monthly, yearly, all-time']
    except ValueError:
        errors['date_format'] = ['start_date and end_date must be in YYYY-MM-DD format']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Fetch all logs for this station
    playlogs = PlayLog.objects.filter(station=station)

    period_start = None
    period_end = now

    if start_date and end_date:
        playlogs = playlogs.filter(played_at__range=(start_date, end_date))
        period_start = start_date
        period_end = end_date
    elif start_date:
        playlogs = playlogs.filter(played_at__gte=start_date)
        period_start = start_date
    else:
        earliest_log = playlogs.order_by('played_at').values_list('played_at', flat=True).first()
        if earliest_log:
            period_start = earliest_log
        else:
            period_start = now - timedelta(days=30)

    # Metrics
    total_songs = playlogs.values('track').distinct().count()
    total_plays = playlogs.count()
    total_royalties = playlogs.aggregate(total=Sum('royalty_amount'))['total'] or Decimal('0')

    def normalize_confidence(value):
        if value is None:
            return 0.0
        numeric = float(value)
        if numeric <= 1:
            numeric *= 100
        return round(numeric, 1)

    confidence_aggregate = playlogs.aggregate(avg_confidence=Avg('avg_confidence_score'))['avg_confidence']
    confidence_score = normalize_confidence(confidence_aggregate)

    active_regions = (
        playlogs
        .exclude(track__artist__region__isnull=True)
        .exclude(track__artist__region__exact='')
        .values('track__artist__region')
        .distinct()
        .count()
    )

    staff_qs = StationStaff.objects.filter(station=station, is_archived=False)
    active_staff = staff_qs.filter(active=True).count()

    # Operational metrics
    distinct_days = playlogs.exclude(played_at__isnull=True).annotate(day=TruncDate('played_at')).values('day').distinct().count()
    total_days = 0
    if period_start and period_end:
        delta_days = (period_end - period_start).days
        total_days = max(delta_days if delta_days > 0 else 1, 1)
    uptime = round(min((distinct_days / total_days) * 100, 100), 1) if total_days else 0.0

    stats = {
        "tracksDetected": total_plays,
        "monitoringAccuracy": round(confidence_score, 1),
        "uptime": uptime,
        "revenueEarned": float(total_royalties),
        "activeStaff": active_staff,
        "complianceScore": 0.0,
    }

    compliance_checks = [
        bool(station.license_number),
        bool(station.license_expiry_date and station.license_expiry_date >= timezone.now().date()),
        station.verification_status == 'verified',
        station.compliance_completed,
    ]
    if compliance_checks:
        compliance_score = (sum(1 for check in compliance_checks if check) / len(compliance_checks)) * 10
        stats["complianceScore"] = round(compliance_score, 1)



    # Recent detections
    recent_logs = playlogs.order_by('-played_at')[:5]
    recent_detections = []
    for log in recent_logs:
        if not log.track:
            continue
        artist_name = getattr(log.track.artist, 'stage_name', None)
        if log.flagged:
            status_label = 'flagged'
        elif log.claimed:
            status_label = 'verified'
        else:
            status_label = 'pending'

        timestamp = None
        if log.played_at:
            timestamp = timezone.localtime(log.played_at).strftime('%b %d, %Y %H:%M')

        recent_detections.append({
            "id": log.id,
            "title": log.track.title,
            "artist": artist_name,
            "confidence": normalize_confidence(log.avg_confidence_score),
            "timestamp": timestamp,
            "status": status_label,
        })

    # System health metrics
    def status_for_value(value: float, excellent: float, good: float, average: float = 0.0) -> str:
        if value >= excellent:
            return 'excellent'
        if value >= good:
            return 'good'
        if value >= average:
            return 'average'
        return 'poor'

    system_health = [
        {
            "metric": "Stream Uptime",
            "value": uptime,
            "status": status_for_value(uptime, 98, 95, 85),
            "unit": "%",
        },
        {
            "metric": "Detection Confidence",
            "value": stats["monitoringAccuracy"],
            "status": status_for_value(stats["monitoringAccuracy"], 95, 85, 75),
            "unit": "%",
        },
        {
            "metric": "Royalty Capture",
            "value": round(float(total_royalties), 2),
            "status": status_for_value(float(total_royalties), 500, 250, 100),
        },
        {
            "metric": "Unique Tracks",
            "value": total_songs,
            "status": status_for_value(total_songs, 25, 15, 5),
        },
    ]

    # Staff performance data (approximation based on overall metrics)
    staff_performance = []
    if active_staff:
        base_detections = total_plays // active_staff if active_staff else 0
        remainder = total_plays % active_staff if active_staff else 0
        for index, staff in enumerate(staff_qs.order_by('name')[:6]):
            detections = base_detections + (1 if index < remainder else 0)
            staff_performance.append({
                "name": staff.name,
                "role": staff.get_role_display() if hasattr(staff, 'get_role_display') else staff.role,
                "detections": detections,
                "accuracy": stats["monitoringAccuracy"],
                "status": 'active' if staff.active else 'inactive',
            })

    # Top performing tracks
    top_tracks_qs = (
        playlogs.values('track_id', 'track__title', 'track__artist__stage_name')
        .annotate(
            detections=Count('id'),
            confidence=Avg('avg_confidence_score'),
            earnings=Sum('royalty_amount'),
        )
        .order_by('-detections')[:5]
    )

    top_tracks = []
    for index, track in enumerate(top_tracks_qs):
        confidence_value = normalize_confidence(track['confidence'])
        if index == 0:
            trend = 'up'
        elif index == len(top_tracks_qs) - 1 and len(top_tracks_qs) > 1:
            trend = 'down'
        else:
            trend = 'stable'
        top_tracks.append({
            "id": track['track_id'],
            "title": track['track__title'],
            "detections": track['detections'],
            "earnings": round(float(track['earnings'] or 0), 2),
            "confidence": round(confidence_value, 1),
            "trend": trend,
            "stations": 1,
        })

    # Monthly trends (detections and earnings)
    monthly_qs = (
        playlogs
        .annotate(month=TruncMonth('played_at'))
        .values('month')
        .annotate(
            detections=Count('id'),
            avg_confidence=Avg('avg_confidence_score'),
            earnings=Sum('royalty_amount'),
        )
        .order_by('month')
    )

    monthly_trends = []
    for entry in monthly_qs:
        month_label = entry['month'].strftime('%b') if entry['month'] else 'Unknown'
        monthly_trends.append({
            "month": month_label,
            "detections": entry['detections'],
            "accuracy": normalize_confidence(entry['avg_confidence']),
            "earnings": float(entry['earnings'] or 0),
        })

    # Station breakdown by detection source
    source_qs = (
        playlogs
        .values('source')
        .annotate(detections=Count('id'))
        .order_by('-detections')
    )
    total_source_detections = sum(row['detections'] for row in source_qs) or 1
    station_breakdown = []
    for row in source_qs:
        source_label = row['source'] or 'Unknown'
        station_breakdown.append({
            "station": source_label,
            "detections": row['detections'],
            "percentage": round((row['detections'] / total_source_detections) * 100, 1),
            "region": station.region or 'Unknown',
            "type": source_label,
        })

    # Regional performance (artist regions)
    regional_qs = (
        playlogs
        .values('track__artist__region')
        .annotate(
            detections=Count('id'),
            earnings=Sum('royalty_amount'),
            stations=Count('station', distinct=True),
        )
    )
    total_regional_detections = sum(row['detections'] for row in regional_qs) or 1
    ghana_regions = []
    region_count = len(regional_qs)
    baseline_share = (100 / region_count) if region_count else 0
    for row in regional_qs:
        region_name = row['track__artist__region'] or 'Unknown'
        share = (row['detections'] / total_regional_detections) * 100
        growth = round(share - baseline_share, 1)
        if growth > 1:
            trend = 'up'
        elif growth < -1:
            trend = 'down'
        else:
            trend = 'stable'
        ghana_regions.append({
            "region": region_name,
            "detections": row['detections'],
            "earnings": round(float(row['earnings'] or 0), 2),
            "stations": row['stations'] or 1,
            "growth": growth,
            "trend": trend,
        })

    # Compliance status payload
    today = timezone.now().date()
    broadcasting_valid = bool(station.license_expiry_date and station.license_expiry_date >= today)
    music_valid = bool(station.license_number)
    technical_valid = station.stream_status == 'active'
    compliance_status = {
        "broadcastingLicense": 'valid' if broadcasting_valid else 'expired',
        "musicLicense": 'valid' if music_valid else 'pending',
        "technicalCertification": 'valid' if technical_valid else 'pending',
        "lastAudit": station.verified_at.strftime('%Y-%m-%d') if station.verified_at else None,
        "nextAudit": station.license_expiry_date.strftime('%Y-%m-%d') if station.license_expiry_date else None,
    }

    # Dispute summary
    dispute_summary = {
        "total": total_plays,
        "disputed": playlogs.filter(flagged=True).count(),
        "undisputed": playlogs.filter(flagged=False).count(),
    }

    # Trend data for charts
    trend_qs = (
        playlogs
        .annotate(date=TruncDate('played_at'))
        .values('date')
        .annotate(plays=Count('id'))
        .order_by('date')
    )
    trend_data = [{"date": row["date"], "plays": row["plays"]} for row in trend_qs]

    # Airplay by weekday for consistency
    weekday_map = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    airplay_qs = (
        playlogs
        .annotate(day_of_week=F('played_at__week_day'))
        .values('day_of_week')
        .annotate(plays=Count('id'))
    )
    plays_by_day = {i: 0 for i in range(1, 8)}
    for row in airplay_qs:
        plays_by_day[row['day_of_week']] = row['plays']
    airplay_data = [
        {"day": weekday_map[i % 7], "plays": plays_by_day[i]} for i in range(1, 8)
    ]

    station_name = station.name

    data.update({
        "period": period if not (start_date_str and end_date_str) else "custom",
        "start_date": start_date_str,
        "end_date": end_date_str,
        "stationId": station.station_id,
        "stationName": station_name,
        "totalSongs": total_songs,
        "totalPlays": total_plays,
        "confidenceScore": stats["monitoringAccuracy"],
        "activeRegions": active_regions,
        "totalRoyalties": round(float(total_royalties), 2),
        "stats": stats,
        "recentDetections": recent_detections,
        "systemHealth": system_health,
        "staffPerformance": staff_performance,
        "topTracks": top_tracks,
        "monthlyTrends": monthly_trends,
        "stationBreakdown": station_breakdown,
        "ghanaRegions": ghana_regions,
        "complianceStatus": compliance_status,
        "disputeSummary": dispute_summary,
        "trendData": trend_data,
        "airplayData": airplay_data,
    })

    payload['message'] = "Success"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
