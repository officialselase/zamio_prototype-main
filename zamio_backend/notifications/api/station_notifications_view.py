from __future__ import annotations

from typing import Dict, Tuple

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from notifications.api.serializers import StationNotificationSerializer
from notifications.models import Notification
from stations.models import Station


def _resolve_station(station_id: str) -> Tuple[Station | None, Dict[str, list[str]]]:
    errors: Dict[str, list[str]] = {}
    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        return None, errors

    try:
        station = Station.objects.select_related('user').get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station not found.']
        return None, errors

    return station, errors


def _station_notifications_queryset(station: Station):
    return Notification.objects.filter(
        is_archived=False,
    ).filter(
        Q(station=station) | Q(station__isnull=True, user=station.user)
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_notifications_view(request):
    payload: Dict[str, object] = {}
    station_id = (request.query_params.get('station_id') or '').strip()

    station, errors = _resolve_station(station_id)
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    notifications_qs = _station_notifications_queryset(station)

    search = (request.query_params.get('search') or '').strip()
    if search:
        notifications_qs = notifications_qs.filter(
            Q(title__icontains=search) | Q(message__icontains=search)
        )

    filter_type = (request.query_params.get('filter_type') or '').strip()
    if filter_type and filter_type.lower() != 'all':
        notifications_qs = notifications_qs.filter(type__iexact=filter_type)

    filter_priority = (request.query_params.get('filter_priority') or '').strip()
    if filter_priority and filter_priority.lower() != 'all':
        notifications_qs = notifications_qs.filter(priority__iexact=filter_priority)

    filter_read = (request.query_params.get('filter_read') or '').strip().lower()
    if filter_read == 'read':
        notifications_qs = notifications_qs.filter(read=True)
    elif filter_read == 'unread':
        notifications_qs = notifications_qs.filter(read=False)

    order_by = (request.query_params.get('order_by') or 'newest').strip().lower()
    ordering_map = {
        'newest': '-created_at',
        'oldest': 'created_at',
        'title': 'title',
        'priority': '-priority',
    }
    notifications_qs = notifications_qs.order_by(ordering_map.get(order_by, '-created_at'))

    try:
        page_number = int(request.query_params.get('page') or '1')
    except (TypeError, ValueError):
        page_number = 1

    try:
        page_size = int(request.query_params.get('page_size') or '10')
    except (TypeError, ValueError):
        page_size = 10

    page_size = max(1, min(page_size, 100))

    total_count = notifications_qs.count()
    unread_count = notifications_qs.filter(read=False).count()
    high_priority_count = notifications_qs.filter(priority__iexact='high').count()

    type_counts = notifications_qs.values('type').annotate(count=Count('id'))
    type_count_map = {entry['type']: entry['count'] for entry in type_counts}

    available_types = [
        value.lower()
        for value in notifications_qs.order_by('type').values_list('type', flat=True).distinct()
        if value
    ]
    available_priorities = [
        value.lower()
        for value in notifications_qs.order_by('priority').values_list('priority', flat=True).distinct()
        if value
    ]

    paginator = Paginator(notifications_qs, page_size)
    try:
        page = paginator.page(page_number)
    except PageNotAnInteger:
        page = paginator.page(1)
    except EmptyPage:
        page = paginator.page(paginator.num_pages)

    serializer = StationNotificationSerializer(page.object_list, many=True)

    stats = {
        'total_count': total_count,
        'unread_count': unread_count,
        'read_count': max(total_count - unread_count, 0),
        'high_priority_count': high_priority_count,
        'system_count': sum(
            count for key, count in type_count_map.items() if (key or '').lower() == 'system'
        ),
        'performance_count': sum(
            count for key, count in type_count_map.items() if (key or '').lower() == 'performance'
        ),
    }

    pagination = {
        'page_number': page.number,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'count': total_count,
        'next': page.next_page_number() if page.has_next() else None,
        'previous': page.previous_page_number() if page.has_previous() else None,
        'has_next': page.has_next(),
        'has_previous': page.has_previous(),
    }

    payload['message'] = 'Successful'
    payload['data'] = {
        'notifications': serializer.data,
        'stats': stats,
        'filters': {
            'available_types': available_types,
            'available_priorities': available_priorities,
        },
        'pagination': pagination,
    }

    return Response(payload, status=status.HTTP_200_OK)


def _resolve_notification_for_station(
    notification_id: str | int,
    station: Station,
) -> Tuple[Notification | None, Dict[str, list[str]]]:
    errors: Dict[str, list[str]] = {}
    try:
        notification = Notification.objects.get(id=notification_id, is_archived=False)
    except Notification.DoesNotExist:
        errors['notification_id'] = ['Notification not found.']
        return None, errors

    if notification.station and notification.station_id != station.id:
        errors['notification_id'] = ['Notification does not belong to this station.']
        return None, errors

    if notification.station is None and notification.user_id != station.user_id:
        errors['notification_id'] = ['Notification does not belong to this station.']
        return None, errors

    return notification, errors


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def mark_station_notification_read_view(request):
    payload: Dict[str, object] = {}
    station_id = (request.data.get('station_id') or '').strip()
    notification_id = request.data.get('notification_id')

    station, errors = _resolve_station(station_id)
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if not notification_id:
        payload['message'] = 'Errors'
        payload['errors'] = {'notification_id': ['Notification ID is required.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    notification, notification_errors = _resolve_notification_for_station(notification_id, station)
    if notification_errors:
        payload['message'] = 'Errors'
        payload['errors'] = notification_errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    if not notification.read:
        notification.read = True
        notification.save(update_fields=['read', 'updated_at'])

    payload['message'] = 'Successful'
    payload['data'] = {
        'notification_id': notification.id,
        'read': notification.read,
    }

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def mark_all_station_notifications_read_view(request):
    payload: Dict[str, object] = {}
    station_id = (request.data.get('station_id') or '').strip()

    station, errors = _resolve_station(station_id)
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    notifications_qs = _station_notifications_queryset(station).filter(read=False)
    updated_count = notifications_qs.update(read=True)

    payload['message'] = 'Successful'
    payload['data'] = {'updated_count': updated_count}
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def delete_station_notification_view(request):
    payload: Dict[str, object] = {}
    station_id = (request.data.get('station_id') or '').strip()
    notification_id = request.data.get('notification_id')

    station, errors = _resolve_station(station_id)
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if not notification_id:
        payload['message'] = 'Errors'
        payload['errors'] = {'notification_id': ['Notification ID is required.']}
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    notification, notification_errors = _resolve_notification_for_station(notification_id, station)
    if notification_errors:
        payload['message'] = 'Errors'
        payload['errors'] = notification_errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    notification.is_archived = True
    notification.save(update_fields=['is_archived', 'updated_at'])

    payload['message'] = 'Successful'
    payload['data'] = {
        'notification_id': notification.id,
        'archived': notification.is_archived,
    }

    return Response(payload, status=status.HTTP_200_OK)
