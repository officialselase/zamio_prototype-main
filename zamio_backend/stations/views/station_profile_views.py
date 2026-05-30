from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db.models import Avg, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.timesince import timesince
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from music_monitor.models import PlayLog
from stations.models import Station, StationComplianceDocument, StationStaff
from stations.serializers import (
    StationComplianceDocumentSerializer,
    StationProfileStaffSerializer,
)


def _normalize_confidence(value: Optional[Decimal]) -> float:
    if value is None:
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    if numeric <= 1:
        numeric *= 100
    return round(max(min(numeric, 100.0), 0.0), 1)


def _build_absolute_uri(request, file_field) -> Optional[str]:
    if not file_field:
        return None
    url = getattr(file_field, 'url', None)
    if not url:
        return None
    if request:
        try:
            return request.build_absolute_uri(url)
        except Exception:
            return url
    return url


def _format_relative(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    now = timezone.now()
    if value > now:
        delta = value - now
        days = delta.days
        if days >= 1:
            label = f"in {days} day{'s' if days != 1 else ''}"
        else:
            minutes = max(int(delta.total_seconds() // 60), 0)
            if minutes <= 1:
                label = 'in moments'
            else:
                label = f"in {minutes} minutes"
        return label

    human = timesince(value, now).replace('\xa0', ' ')
    if human.startswith('0 '):
        return 'moments ago'
    return f"{human} ago"


def _join_parts(*parts: Optional[str]) -> str:
    return ', '.join(part for part in parts if part)


def _resolve_contact_name(station: Station) -> str:
    if station.primary_contact_name:
        return station.primary_contact_name
    user = getattr(station, 'user', None)
    if user:
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if full_name:
            return full_name
        if user.email:
            return user.email
    return station.name


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_profile_view(request):
    station_id = (request.query_params.get('station_id') or '').strip()
    if not station_id:
        payload = {
            'message': 'Errors',
            'errors': {'station_id': ['Station ID is required.']},
        }
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.select_related('user').get(station_id=station_id)
    except Station.DoesNotExist:
        payload = {
            'message': 'Errors',
            'errors': {'station_id': ['Station not found.']},
        }
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    if request.user != station.user:
        payload = {
            'message': 'Errors',
            'errors': {'station_id': ['You do not have access to this station.']},
        }
        return Response(payload, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()
    playlogs = PlayLog.objects.filter(station=station)

    total_detections = playlogs.count()
    monthly_detections = playlogs.filter(
        played_at__gte=now - timedelta(days=30)
    ).count()
    total_royalties = playlogs.aggregate(total=Sum('royalty_amount'))['total'] or Decimal('0')
    accuracy = _normalize_confidence(
        playlogs.aggregate(avg=Avg('avg_confidence_score'))['avg']
    )

    earliest_play = playlogs.order_by('played_at').values_list('played_at', flat=True).first()
    distinct_days = playlogs.exclude(played_at__isnull=True).annotate(
        day=TruncDate('played_at')
    ).values('day').distinct().count()
    total_days = 0
    if earliest_play:
        total_days = max((now - earliest_play).days or 1, 1)
    uptime = round(min((distinct_days / total_days) * 100, 100), 1) if total_days else 0.0

    staff_qs = StationStaff.objects.filter(station=station, is_archived=False)
    active_staff = staff_qs.filter(active=True).count()

    avg_daily_listeners = station.estimated_listeners or 0
    try:
        weekly_reach = int(avg_daily_listeners) * 7 if avg_daily_listeners else 0
    except (TypeError, ValueError):
        weekly_reach = 0

    stats = {
        'totalDetections': total_detections,
        'monthlyDetections': monthly_detections,
        'accuracy': accuracy,
        'uptime': uptime,
        'revenue': float(total_royalties),
        'activeStaff': active_staff,
        'broadcasts': playlogs.exclude(played_at__isnull=True).count(),
        'avgDailyListeners': int(avg_daily_listeners or 0),
        'weeklyReach': weekly_reach,
    }

    status_map = {
        'verified': 'Active',
        'pending': 'Pending Verification',
        'rejected': 'Review Required',
        'suspended': 'Suspended',
    }
    status_label = status_map.get(station.verification_status, 'Pending Verification')
    if not station.active:
        status_label = 'Inactive'

    profile_data = {
        'id': station.station_id,
        'name': station.name,
        'tagline': station.tagline,
        'description': station.about or station.bio,
        'logo': _build_absolute_uri(request, station.photo),
        'coverImage': _build_absolute_uri(request, station.cover_image) or _build_absolute_uri(request, station.photo),
        'location': _join_parts(station.city, station.region, station.country),
        'address': station.location_name or _join_parts(station.location_name, station.city),
        'phone': station.phone or station.primary_contact_phone or getattr(station.user, 'phone', None),
        'email': station.primary_contact_email or getattr(station.user, 'email', None),
        'website': station.website_url,
        'frequency': station.broadcast_frequency,
        'established': str(station.founded_year) if station.founded_year else None,
        'licenseNumber': station.license_number,
        'licenseExpiry': station.license_expiry_date.isoformat() if station.license_expiry_date else None,
        'status': status_label,
        'rating': round(min(max(accuracy / 20.0, 0.0), 5.0), 1) if accuracy else 0.0,
        'weeklyReach': weekly_reach,
        'stationType': station.get_station_type_display() if hasattr(station, 'get_station_type_display') else station.station_type,
        'coverageArea': station.coverage_area,
        'contactName': _resolve_contact_name(station),
        'contactTitle': station.primary_contact_title or 'Station Manager',
        'complianceOfficer': station.compliance_contact_name,
        'complianceOfficerEmail': station.compliance_contact_email,
        'complianceOfficerPhone': station.compliance_contact_phone,
        'emergencyContact': station.emergency_contact_phone,
        'socialMedia': station.social_media_links or {},
    }

    recent_activity: List[Dict[str, Any]] = []
    recent_logs = (
        playlogs.select_related('track', 'track__artist')
        .order_by('-played_at', '-created_at')[:5]
    )
    for log in recent_logs:
        track = getattr(log, 'track', None)
        title = getattr(track, 'title', 'Detected track')
        artist_name = getattr(getattr(track, 'artist', None), 'stage_name', None)
        description_parts = [f"Confidence { _normalize_confidence(log.avg_confidence_score) }%"]
        if artist_name:
            description_parts.append(artist_name)
        if log.source:
            description_parts.append(log.source)
        recent_activity.append({
            'id': f'playlog-{log.id}',
            'type': 'detection',
            'title': title,
            'description': ' • '.join(part for part in description_parts if part),
            'time': _format_relative(log.played_at or log.created_at),
            'status': 'warning' if getattr(log, 'flagged', False) else ('success' if getattr(log, 'claimed', False) else 'info'),
        })

    upcoming_documents = StationComplianceDocument.objects.filter(
        station=station,
        is_archived=False,
        expiry_date__isnull=False,
        expiry_date__lte=timezone.now().date() + timedelta(days=45),
    )
    for document in upcoming_documents:
        due_display = document.expiry_date.strftime('%b %d, %Y') if document.expiry_date else None
        recent_activity.append({
            'id': f'document-{document.id}',
            'type': 'compliance',
            'title': f"{document.name} expires soon",
            'description': f"Expires on {due_display}" if due_display else 'Upcoming compliance deadline',
            'time': f"Due {due_display}" if due_display else None,
            'status': 'warning',
        })

    staff_serializer = StationProfileStaffSerializer(staff_qs.order_by('-active', 'name'), many=True)
    documents_serializer = StationComplianceDocumentSerializer(
        StationComplianceDocument.objects.filter(station=station, is_archived=False).order_by('-uploaded_at'),
        many=True,
    )

    payload = {
        'message': 'Successful',
        'data': {
            'profile': profile_data,
            'stats': stats,
            'recentActivity': recent_activity,
            'staff': staff_serializer.data,
            'complianceDocuments': documents_serializer.data,
        },
    }
    return Response(payload, status=status.HTTP_200_OK)
