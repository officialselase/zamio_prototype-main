from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from ..models import Station, Complaint, ComplaintUpdate
from ..serializers import (
    ComplaintSerializer, 
    ComplaintDetailsSerializer, 
    ComplaintUpdateSerializer,
    ComplaintCreateSerializer
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def create_complaint(request):
    """Create a new complaint"""
    payload = {}
    errors = {}

    serializer = ComplaintCreateSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        complaint = serializer.save()
        
        # Create initial update
        ComplaintUpdate.objects.create(
            complaint=complaint,
            user=request.user,
            update_type='comment',
            message=f'Complaint created: {complaint.subject}'
        )
        
        # Trigger notification task
        from ..tasks import send_complaint_notification
        send_complaint_notification.delay(
            complaint_id=complaint.id,
            notification_type='created',
            recipient_type='admin'
        )
        
        response_serializer = ComplaintDetailsSerializer(complaint)
        payload['message'] = 'Complaint created successfully'
        payload['data'] = response_serializer.data
        return Response(payload, status=status.HTTP_201_CREATED)
    
    payload['message'] = 'Validation errors'
    payload['errors'] = serializer.errors
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_complaints_list(request):
    """Get paginated list of complaints with filtering"""
    payload = {}
    data = {}
    errors = {}

    # Query parameters
    station_id = request.query_params.get('station_id', '')
    status_filter = request.query_params.get('status', '')
    complaint_type_filter = request.query_params.get('complaint_type', '')
    priority_filter = request.query_params.get('priority', '')
    assigned_to_filter = request.query_params.get('assigned_to', '')
    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    page_size = int(request.query_params.get('page_size', 10))

    # Base queryset
    complaints_qs = Complaint.objects.filter(is_archived=False).select_related(
        'station', 'complainant', 'assigned_to', 'resolved_by'
    )

    # Apply filters
    if station_id:
        try:
            station = Station.objects.get(station_id=station_id)
            complaints_qs = complaints_qs.filter(station=station)
        except Station.DoesNotExist:
            errors['station_id'] = ['Station does not exist.']
            payload['message'] = 'Errors'
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if status_filter:
        complaints_qs = complaints_qs.filter(status=status_filter)

    if complaint_type_filter:
        complaints_qs = complaints_qs.filter(complaint_type=complaint_type_filter)

    if priority_filter:
        complaints_qs = complaints_qs.filter(priority=priority_filter)

    if assigned_to_filter:
        if assigned_to_filter == 'unassigned':
            complaints_qs = complaints_qs.filter(assigned_to__isnull=True)
        else:
            complaints_qs = complaints_qs.filter(assigned_to__id=assigned_to_filter)

    if search_query:
        complaints_qs = complaints_qs.filter(
            Q(complaint_id__icontains=search_query) |
            Q(subject__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(complainant__username__icontains=search_query) |
            Q(station__name__icontains=search_query)
        )

    # Order by priority and creation date
    priority_order = {
        'urgent': 1,
        'high': 2,
        'medium': 3,
        'low': 4
    }
    
    complaints_qs = complaints_qs.order_by('-created_at')

    # Pagination
    paginator = Paginator(complaints_qs, page_size)

    try:
        paginated = paginator.page(page_number)
    except PageNotAnInteger:
        paginated = paginator.page(1)
    except EmptyPage:
        paginated = paginator.page(paginator.num_pages)

    serializer = ComplaintSerializer(paginated, many=True)
    data['complaints'] = serializer.data
    data['pagination'] = {
        'page_number': paginated.number,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
        'next': paginated.next_page_number() if paginated.has_next() else None,
        'previous': paginated.previous_page_number() if paginated.has_previous() else None,
    }

    # Add filter choices for frontend
    data['status_choices'] = Complaint.COMPLAINT_STATUS_CHOICES
    data['type_choices'] = Complaint.COMPLAINT_TYPE_CHOICES
    data['priority_choices'] = Complaint.PRIORITY_CHOICES

    payload['message'] = 'Successful'
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_complaint_details(request):
    """Get detailed information about a specific complaint"""
    payload = {}
    errors = {}

    complaint_id = request.query_params.get('complaint_id')

    if not complaint_id:
        errors['complaint_id'] = ['Complaint ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        complaint = Complaint.objects.select_related(
            'station', 'complainant', 'assigned_to', 'resolved_by'
        ).get(id=complaint_id, is_archived=False)
    except Complaint.DoesNotExist:
        errors['complaint_id'] = ['Complaint does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Get complaint updates
    updates = ComplaintUpdate.objects.filter(complaint=complaint).select_related('user')
    
    complaint_serializer = ComplaintDetailsSerializer(complaint)
    updates_serializer = ComplaintUpdateSerializer(updates, many=True)
    
    data = complaint_serializer.data
    data['updates'] = updates_serializer.data

    payload['message'] = 'Successful'
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def update_complaint_status(request):
    """Update complaint status with workflow management"""
    payload = {}
    errors = {}

    complaint_id = request.data.get('complaint_id')
    new_status = request.data.get('status')
    resolution_notes = request.data.get('resolution_notes', '')
    assigned_to_id = request.data.get('assigned_to')

    if not complaint_id:
        errors['complaint_id'] = ['Complaint ID is required.']
    
    if not new_status:
        errors['status'] = ['Status is required.']

    # Validate status choice
    valid_statuses = [choice[0] for choice in Complaint.COMPLAINT_STATUS_CHOICES]
    if new_status and new_status not in valid_statuses:
        errors['status'] = ['Invalid status choice.']

    try:
        complaint = Complaint.objects.get(id=complaint_id, is_archived=False)
    except Complaint.DoesNotExist:
        errors['complaint_id'] = ['Complaint does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    old_status = complaint.status
    
    # Update complaint
    complaint.status = new_status
    
    # Handle assignment
    if assigned_to_id:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            assigned_user = User.objects.get(id=assigned_to_id)
            complaint.assigned_to = assigned_user
        except User.DoesNotExist:
            errors['assigned_to'] = ['Assigned user does not exist.']
            payload['message'] = 'Errors'
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle resolution
    if new_status == 'resolved':
        complaint.resolved_by = request.user
        complaint.resolved_at = timezone.now()
        if resolution_notes:
            complaint.resolution_notes = resolution_notes
    
    complaint.save()

    # Create status update record
    update_message = f'Status changed from {old_status} to {new_status}'
    if resolution_notes:
        update_message += f'\nResolution notes: {resolution_notes}'
    
    ComplaintUpdate.objects.create(
        complaint=complaint,
        user=request.user,
        update_type='status_change',
        message=update_message,
        old_status=old_status,
        new_status=new_status
    )

    # Trigger notification task
    from ..tasks import send_complaint_notification
    send_complaint_notification.delay(
        complaint_id=complaint.id,
        notification_type='status_updated',
        recipient_type='complainant'
    )

    serializer = ComplaintDetailsSerializer(complaint)
    payload['message'] = 'Complaint status updated successfully'
    payload['data'] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_complaint_update(request):
    """Add an update/comment to a complaint"""
    payload = {}
    errors = {}

    complaint_id = request.data.get('complaint_id')
    message = request.data.get('message', '')
    update_type = request.data.get('update_type', 'comment')

    if not complaint_id:
        errors['complaint_id'] = ['Complaint ID is required.']
    
    if not message:
        errors['message'] = ['Message is required.']

    try:
        complaint = Complaint.objects.get(id=complaint_id, is_archived=False)
    except Complaint.DoesNotExist:
        errors['complaint_id'] = ['Complaint does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Create update
    update = ComplaintUpdate.objects.create(
        complaint=complaint,
        user=request.user,
        update_type=update_type,
        message=message
    )

    # Trigger notification task
    from ..tasks import send_complaint_notification
    send_complaint_notification.delay(
        complaint_id=complaint.id,
        notification_type='updated',
        recipient_type='all'
    )

    serializer = ComplaintUpdateSerializer(update)
    payload['message'] = 'Update added successfully'
    payload['data'] = serializer.data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def assign_complaint(request):
    """Assign complaint to a user"""
    payload = {}
    errors = {}

    complaint_id = request.data.get('complaint_id')
    assigned_to_id = request.data.get('assigned_to')

    if not complaint_id:
        errors['complaint_id'] = ['Complaint ID is required.']
    
    if not assigned_to_id:
        errors['assigned_to'] = ['Assigned user ID is required.']

    try:
        complaint = Complaint.objects.get(id=complaint_id, is_archived=False)
    except Complaint.DoesNotExist:
        errors['complaint_id'] = ['Complaint does not exist.']

    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        assigned_user = User.objects.get(id=assigned_to_id)
    except User.DoesNotExist:
        errors['assigned_to'] = ['Assigned user does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    old_assignee = complaint.assigned_to
    complaint.assigned_to = assigned_user
    complaint.save()

    # Create assignment update
    message = f'Complaint assigned to {assigned_user.username}'
    if old_assignee:
        message = f'Complaint reassigned from {old_assignee.username} to {assigned_user.username}'

    ComplaintUpdate.objects.create(
        complaint=complaint,
        user=request.user,
        update_type='assignment',
        message=message
    )

    # Trigger notification task
    from ..tasks import send_complaint_notification
    send_complaint_notification.delay(
        complaint_id=complaint.id,
        notification_type='assigned',
        recipient_type='assignee'
    )

    serializer = ComplaintDetailsSerializer(complaint)
    payload['message'] = 'Complaint assigned successfully'
    payload['data'] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def archive_complaint(request):
    """Archive (soft delete) a complaint"""
    payload = {}
    errors = {}

    complaint_id = request.data.get('complaint_id')

    if not complaint_id:
        errors['complaint_id'] = ['Complaint ID is required.']

    try:
        complaint = Complaint.objects.get(id=complaint_id)
    except Complaint.DoesNotExist:
        errors['complaint_id'] = ['Complaint does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    complaint.is_archived = True
    complaint.save()

    # Create archive update
    ComplaintUpdate.objects.create(
        complaint=complaint,
        user=request.user,
        update_type='comment',
        message='Complaint archived'
    )

    payload['message'] = 'Complaint archived successfully'
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_complaint_statistics(request):
    """Get complaint statistics for dashboard"""
    payload = {}
    
    # Get statistics
    from django.db.models import Count
    
    total_complaints = Complaint.objects.filter(is_archived=False).count()
    
    status_stats = dict(
        Complaint.objects.filter(is_archived=False)
        .values('status')
        .annotate(count=Count('id'))
        .values_list('status', 'count')
    )
    
    type_stats = dict(
        Complaint.objects.filter(is_archived=False)
        .values('complaint_type')
        .annotate(count=Count('id'))
        .values_list('complaint_type', 'count')
    )
    
    priority_stats = dict(
        Complaint.objects.filter(is_archived=False)
        .values('priority')
        .annotate(count=Count('id'))
        .values_list('priority', 'count')
    )
    
    # Recent complaints (last 7 days)
    from datetime import timedelta
    recent_date = timezone.now() - timedelta(days=7)
    recent_complaints = Complaint.objects.filter(
        is_archived=False,
        created_at__gte=recent_date
    ).count()
    
    data = {
        'total_complaints': total_complaints,
        'recent_complaints': recent_complaints,
        'status_distribution': status_stats,
        'type_distribution': type_stats,
        'priority_distribution': priority_stats,
    }

    payload['message'] = 'Successful'
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)