"""
Artist Notifications View
Provides notification data for artists with proper JWT authentication
"""

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Q
from django.utils.timesince import timesince
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from artists.models import Artist
from notifications.models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def get_artist_notifications_view(request):
    """
    Get paginated notifications for an artist
    
    Query Parameters:
        - artist_id (required): Artist's unique identifier
        - search (optional): Search in title and message
        - filter_type (optional): Filter by notification type
        - filter_read (optional): 'read', 'unread', or empty for all
        - order_by (optional): 'Title', 'Newest', 'Oldest', 'Type'
        - page (optional): Page number (default: 1)
    """
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '').strip()
    page_number = request.query_params.get('page', '1')
    artist_id = request.query_params.get('artist_id', '')
    order_by = request.query_params.get('order_by', '')
    filter_type = request.query_params.get('filter_type', '')
    filter_read = request.query_params.get('filter_read', '')
    page_size = 10

    # Validate page number
    try:
        page_number = int(page_number)
    except ValueError:
        page_number = 1

    # Validate artist
    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Fetch notifications
    notifications_qs = Notification.objects.filter(
        user=artist.user,
        is_archived=False
    )

    # Search filter
    if search_query:
        notifications_qs = notifications_qs.filter(
            Q(title__icontains=search_query) | Q(message__icontains=search_query)
        )

    # Type filter
    if filter_type:
        notifications_qs = notifications_qs.filter(type=filter_type)

    # Read/Unread filter
    if filter_read == 'read':
        notifications_qs = notifications_qs.filter(read=True)
    elif filter_read == 'unread':
        notifications_qs = notifications_qs.filter(read=False)

    # Ordering
    if order_by:
        order_map = {
            "Title": "title",
            "Newest": "-created_at",
            "Oldest": "created_at",
            "Type": "type"
        }
        notifications_qs = notifications_qs.order_by(order_map.get(order_by, "-created_at"))
    else:
        notifications_qs = notifications_qs.order_by("-created_at")

    # Get stats before pagination
    total_count = notifications_qs.count()
    unread_count = notifications_qs.filter(read=False).count()

    # Paginate
    paginator = Paginator(notifications_qs, page_size)
    try:
        page = paginator.page(page_number)
    except PageNotAnInteger:
        page = paginator.page(1)
    except EmptyPage:
        page = paginator.page(paginator.num_pages)

    # Format data with snake_case
    formatted_notifications = []
    for notification in page.object_list:
        formatted_notifications.append({
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "read": notification.read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "time_ago": timesince(notification.created_at) + " ago" if notification.created_at else "Just now"
        })

    data['notifications'] = formatted_notifications
    data['stats'] = {
        'total_count': total_count,
        'unread_count': unread_count,
        'read_count': total_count - unread_count
    }
    data['pagination'] = {
        'page_number': page.number,
        'total_pages': paginator.num_pages,
        'next': page.next_page_number() if page.has_next() else None,
        'previous': page.previous_page_number() if page.has_previous() else None,
        'has_next': page.has_next(),
        'has_previous': page.has_previous()
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def mark_notification_read_view(request):
    """
    Mark a notification as read
    
    Body Parameters:
        - notification_id (required): Notification ID
    """
    payload = {}
    data = {}
    errors = {}

    notification_id = request.data.get('notification_id', '')

    if not notification_id:
        errors['notification_id'] = ['Notification ID is required.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        notification = Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        errors['notification_id'] = ['Notification not found.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    notification.read = True
    notification.save()

    data['notification_id'] = notification.id
    data['read'] = notification.read
    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def mark_all_notifications_read_view(request):
    """
    Mark all notifications as read for an artist
    
    Body Parameters:
        - artist_id (required): Artist ID
    """
    payload = {}
    data = {}
    errors = {}

    artist_id = request.data.get('artist_id', '')

    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Mark all unread notifications as read
    updated_count = Notification.objects.filter(
        user=artist.user,
        read=False,
        is_archived=False
    ).update(read=True)

    data['updated_count'] = updated_count
    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def delete_notification_view(request):
    """
    Archive (soft delete) a notification
    
    Body Parameters:
        - notification_id (required): Notification ID
    """
    payload = {}
    data = {}
    errors = {}

    notification_id = request.data.get('notification_id', '')

    if not notification_id:
        errors['notification_id'] = ['Notification ID is required.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        notification = Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        errors['notification_id'] = ['Notification not found.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    notification.is_archived = True
    notification.save()

    data['notification_id'] = notification.id
    data['archived'] = notification.is_archived
    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
