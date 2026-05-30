from datetime import timedelta

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from music_monitor.models import Dispute, STATUS_TYPE
from stations.models import Station
from stations.serializers import StationDisputeSerializer


PERIOD_WINDOWS = {
    'daily': timedelta(days=1),
    'weekly': timedelta(days=7),
    'monthly': timedelta(days=30),
}


def _parse_positive_int(value, default):
    try:
        parsed = int(value)
        if parsed > 0:
            return parsed
    except (TypeError, ValueError):
        pass
    return default


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_disputes_view(request):
    payload = {}
    data = {}
    errors = {}

    station_id = (request.query_params.get('station_id') or '').strip()
    if not station_id:
        errors['station_id'] = ['Station ID is required.']
    else:
        try:
            station = Station.objects.get(station_id=station_id)
        except Station.DoesNotExist:
            errors['station_id'] = ['Station not found.']
            station = None

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    search_query = (request.query_params.get('search') or '').strip()
    status_filter = (request.query_params.get('status') or '').strip()
    period = (request.query_params.get('period') or 'monthly').lower()
    sort_by = (request.query_params.get('sort_by') or 'recent').lower()
    sort_order = (request.query_params.get('sort_order') or 'desc').lower()
    page_number = _parse_positive_int(request.query_params.get('page'), 1)
    page_size = _parse_positive_int(request.query_params.get('page_size'), 10)

    disputes_qs = (
        Dispute.objects.filter(playlog__station=station, is_archived=False)
        .select_related(
            'playlog',
            'playlog__track',
            'playlog__track__artist',
            'playlog__station',
        )
        .annotate(
            track_total_plays=Count(
                'playlog__track__track_playlog',
                filter=Q(
                    playlog__track__track_playlog__is_archived=False,
                    playlog__track__track_playlog__station=station,
                ),
            )
        )
    )

    if search_query:
        disputes_qs = disputes_qs.filter(
            Q(playlog__track__title__icontains=search_query)
            | Q(playlog__track__artist__stage_name__icontains=search_query)
            | Q(playlog__track__album__title__icontains=search_query)
            | Q(dispute_comments__icontains=search_query)
            | Q(resolve_comments__icontains=search_query)
        )

    if status_filter:
        disputes_qs = disputes_qs.filter(dispute_status__iexact=status_filter)

    if period in PERIOD_WINDOWS:
        window_start = timezone.now() - PERIOD_WINDOWS[period]
        disputes_qs = disputes_qs.filter(
            Q(playlog__played_at__gte=window_start)
            | (
                Q(playlog__played_at__isnull=True)
                & Q(playlog__start_time__gte=window_start)
            )
            | (
                Q(playlog__played_at__isnull=True)
                & Q(playlog__start_time__isnull=True)
                & Q(created_at__gte=window_start)
            )
        )

    sort_map = {
        'recent': 'playlog__played_at',
        'confidence': 'playlog__avg_confidence_score',
        'earnings': 'playlog__royalty_amount',
        'status': 'dispute_status',
        'start_time': 'playlog__start_time',
    }
    order_field = sort_map.get(sort_by, 'created_at')
    if sort_order == 'desc':
        order_field = f"-{order_field.lstrip('-')}"
    else:
        order_field = order_field.lstrip('-')
    disputes_qs = disputes_qs.order_by(order_field, '-created_at')

    summary_queryset = disputes_qs
    total_disputes = summary_queryset.count()
    resolved_count = summary_queryset.filter(dispute_status__iexact='Resolved').count()
    flagged_count = summary_queryset.filter(dispute_status__iexact='Flagged').count()
    pending_count = summary_queryset.filter(
        dispute_status__in=['Pending', 'Review', 'Resolving']
    ).count()
    average_confidence = summary_queryset.aggregate(
        avg_confidence=Avg('playlog__avg_confidence_score')
    ).get('avg_confidence')
    normalized_average_confidence = (
        StationDisputeSerializer.normalize_confidence_value(average_confidence) or 0.0
    )

    paginator = Paginator(disputes_qs, page_size)
    if paginator.count == 0:
        disputes_page = []
        page_number = 1
    else:
        try:
            disputes_page = paginator.page(page_number)
        except PageNotAnInteger:
            disputes_page = paginator.page(1)
            page_number = 1
        except EmptyPage:
            disputes_page = paginator.page(paginator.num_pages)
            page_number = paginator.num_pages

    if isinstance(disputes_page, list):
        disputes_results = []
    else:
        serializer = StationDisputeSerializer(
            disputes_page,
            many=True,
            context={'request': request, 'station': station},
        )
        disputes_results = serializer.data

    pagination_payload = {
        'count': paginator.count,
        'page_number': page_number,
        'page_size': page_size,
        'total_pages': paginator.num_pages if paginator.count else 0,
        'next': None,
        'previous': None,
        'has_next': False,
        'has_previous': False,
    }

    if not isinstance(disputes_page, list):
        pagination_payload.update(
            {
                'next': disputes_page.next_page_number() if disputes_page.has_next() else None,
                'previous': disputes_page.previous_page_number()
                if disputes_page.has_previous()
                else None,
                'has_next': disputes_page.has_next(),
                'has_previous': disputes_page.has_previous(),
            }
        )

    data['disputes'] = {
        'results': disputes_results,
        'pagination': pagination_payload,
    }
    data['summary'] = {
        'total': total_disputes,
        'resolved': resolved_count,
        'flagged': flagged_count,
        'pending': pending_count,
        'pending_review': flagged_count + pending_count,
        'average_confidence': normalized_average_confidence,
    }
    data['status_choices'] = [choice[0] for choice in STATUS_TYPE]

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_dispute_detail_view(request, dispute_id):
    payload = {}
    errors = {}

    station_id = (request.query_params.get('station_id') or '').strip()
    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        station = None
    else:
        try:
            station = Station.objects.get(station_id=station_id)
        except Station.DoesNotExist:
            errors['station_id'] = ['Station not found.']
            station = None

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    dispute = (
        Dispute.objects.filter(
            pk=dispute_id,
            playlog__station=station,
            is_archived=False,
        )
        .select_related(
            'playlog',
            'playlog__track',
            'playlog__track__artist',
            'playlog__station',
        )
        .annotate(
            track_total_plays=Count(
                'playlog__track__track_playlog',
                filter=Q(
                    playlog__track__track_playlog__is_archived=False,
                    playlog__track__track_playlog__station=station,
                ),
            )
        )
        .first()
    )

    if not dispute:
        payload['message'] = 'Dispute not found.'
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    serializer = StationDisputeSerializer(
        dispute,
        context={'request': request, 'station': station},
    )

    payload['message'] = 'Successful'
    payload['data'] = serializer.data
    return Response(payload, status=status.HTTP_200_OK)

