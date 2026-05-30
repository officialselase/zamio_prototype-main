"""
Publisher Sub-Distribution Views
Handles viewing and managing publisher-to-artist royalty distributions
"""

from decimal import Decimal
from typing import Dict, List
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from music_monitor.models import PublisherArtistSubDistribution, RoyaltyDistribution
from publishers.models import PublisherProfile

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_sub_distributions_view(request):
    """
    Get publisher's sub-distributions showing how royalties are split with artists
    """
    payload: Dict[str, object] = {}
    data: Dict[str, object] = {}
    errors: Dict[str, List[str]] = {}

    # Get publisher profile
    try:
        publisher = PublisherProfile.objects.select_related('user').get(user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher'] = ['Publisher profile not found for user']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    # Query parameters
    status_filter = request.GET.get('status', '')
    artist_id = request.GET.get('artist_id', '')
    start_date = request.GET.get('start_date', '')
    end_date = request.GET.get('end_date', '')

    # Build queryset
    sub_distributions = PublisherArtistSubDistribution.objects.filter(
        publisher=publisher
    ).select_related(
        'artist', 'parent_distribution', 'parent_distribution__play_log', 
        'parent_distribution__play_log__track', 'parent_distribution__play_log__station'
    )

    # Apply filters
    if status_filter:
        sub_distributions = sub_distributions.filter(status=status_filter)
    
    if artist_id:
        sub_distributions = sub_distributions.filter(artist__user_id=artist_id)
    
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            start_dt = timezone.make_aware(start_dt) if timezone.is_naive(start_dt) else start_dt
            sub_distributions = sub_distributions.filter(calculated_at__gte=start_dt)
        except ValueError:
            errors['start_date'] = ['Invalid date format. Use YYYY-MM-DD']
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = timezone.make_aware(end_dt) if timezone.is_naive(end_dt) else end_dt
            sub_distributions = sub_distributions.filter(calculated_at__lte=end_dt)
        except ValueError:
            errors['end_date'] = ['Invalid date format. Use YYYY-MM-DD']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Calculate summary statistics
    summary_stats = sub_distributions.aggregate(
        total_amount=Sum('total_amount'),
        publisher_fees=Sum('publisher_fee_amount'),
        artist_payments=Sum('artist_net_amount'),
        total_count=Count('id'),
        paid_count=Count('id', filter=Q(status='paid')),
        pending_count=Count('id', filter=Q(status__in=['pending', 'calculated', 'approved']))
    )

    # Get breakdown by status
    status_breakdown = {}
    for status_choice in PublisherArtistSubDistribution.SUB_DISTRIBUTION_STATUS:
        status_key = status_choice[0]
        count = sub_distributions.filter(status=status_key).count()
        amount = sub_distributions.filter(status=status_key).aggregate(
            total=Sum('artist_net_amount')
        )['total'] or Decimal('0')
        status_breakdown[status_key] = {
            'count': count,
            'amount': float(amount),
            'label': status_choice[1]
        }

    # Get breakdown by artist
    artist_breakdown = sub_distributions.values(
        'artist__user_id', 'artist__first_name', 'artist__last_name', 'artist__email'
    ).annotate(
        total_distributions=Count('id'),
        total_amount=Sum('artist_net_amount'),
        paid_amount=Sum('artist_net_amount', filter=Q(status='paid')),
        pending_amount=Sum('artist_net_amount', filter=Q(status__in=['pending', 'calculated', 'approved']))
    ).order_by('-total_amount')

    artist_summary = []
    for artist_data in artist_breakdown:
        artist_name = f"{artist_data.get('artist__first_name', '')} {artist_data.get('artist__last_name', '')}".strip()
        if not artist_name:
            artist_name = artist_data.get('artist__email', 'Unknown Artist')
        
        artist_summary.append({
            'artist_id': str(artist_data['artist__user_id']),
            'artist_name': artist_name,
            'artist_email': artist_data.get('artist__email'),
            'total_distributions': artist_data['total_distributions'],
            'total_amount': float(artist_data['total_amount'] or 0),
            'paid_amount': float(artist_data['paid_amount'] or 0),
            'pending_amount': float(artist_data['pending_amount'] or 0),
            'currency': 'GHS'
        })

    # Get recent sub-distributions
    recent_distributions = sub_distributions.order_by('-calculated_at')[:50]
    
    distributions_list = []
    for sub_dist in recent_distributions:
        artist_name = f"{sub_dist.artist.first_name} {sub_dist.artist.last_name}".strip()
        if not artist_name:
            artist_name = sub_dist.artist.email

        track_title = None
        station_name = None
        if sub_dist.parent_distribution.play_log:
            play_log = sub_dist.parent_distribution.play_log
            if play_log.track:
                track_title = play_log.track.title
            if play_log.station:
                station_name = play_log.station.name

        distributions_list.append({
            'sub_distribution_id': str(sub_dist.sub_distribution_id),
            'parent_distribution_id': str(sub_dist.parent_distribution.distribution_id),
            'artist_id': str(sub_dist.artist.user_id),
            'artist_name': artist_name,
            'artist_email': sub_dist.artist.email,
            'total_amount': float(sub_dist.total_amount),
            'publisher_fee_percentage': float(sub_dist.publisher_fee_percentage),
            'publisher_fee_amount': float(sub_dist.publisher_fee_amount),
            'artist_net_amount': float(sub_dist.artist_net_amount),
            'currency': sub_dist.currency,
            'status': sub_dist.status,
            'calculated_at': sub_dist.calculated_at.isoformat(),
            'approved_at': sub_dist.approved_at.isoformat() if sub_dist.approved_at else None,
            'paid_to_artist_at': sub_dist.paid_to_artist_at.isoformat() if sub_dist.paid_to_artist_at else None,
            'payment_reference': sub_dist.payment_reference,
            'track_title': track_title,
            'station_name': station_name,
            'agreement_reference': sub_dist.agreement_reference,
        })

    # Build response
    data = {
        'summary': {
            'total_amount': float(summary_stats['total_amount'] or 0),
            'publisher_fees': float(summary_stats['publisher_fees'] or 0),
            'artist_payments': float(summary_stats['artist_payments'] or 0),
            'total_distributions': summary_stats['total_count'] or 0,
            'paid_count': summary_stats['paid_count'] or 0,
            'pending_count': summary_stats['pending_count'] or 0,
            'currency': 'GHS',
            'average_fee_percentage': float(publisher.default_admin_fee_percent or 15.0)
        },
        'status_breakdown': status_breakdown,
        'artist_breakdown': artist_summary,
        'recent_distributions': distributions_list
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def approve_sub_distribution_view(request):
    """
    Approve a sub-distribution for payment to artist
    """
    payload: Dict[str, object] = {}
    errors: Dict[str, List[str]] = {}

    sub_distribution_id = request.data.get('sub_distribution_id')
    
    if not sub_distribution_id:
        errors['sub_distribution_id'] = ['Sub-distribution ID is required']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        publisher = PublisherProfile.objects.get(user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher'] = ['Publisher profile not found']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    try:
        sub_dist = PublisherArtistSubDistribution.objects.get(
            sub_distribution_id=sub_distribution_id,
            publisher=publisher
        )
    except PublisherArtistSubDistribution.DoesNotExist:
        errors['sub_distribution_id'] = ['Sub-distribution not found']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    if sub_dist.status not in ['calculated', 'pending']:
        errors['status'] = [f'Cannot approve sub-distribution with status: {sub_dist.status}']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Approve the sub-distribution
    sub_dist.approve_for_payment()

    payload['message'] = 'Sub-distribution approved successfully'
    payload['data'] = {
        'sub_distribution_id': str(sub_dist.sub_distribution_id),
        'status': sub_dist.status,
        'approved_at': sub_dist.approved_at.isoformat() if sub_dist.approved_at else None
    }
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def mark_sub_distribution_paid_view(request):
    """
    Mark a sub-distribution as paid to artist
    """
    payload: Dict[str, object] = {}
    errors: Dict[str, List[str]] = {}

    sub_distribution_id = request.data.get('sub_distribution_id')
    payment_reference = request.data.get('payment_reference')
    payment_method = request.data.get('payment_method', '')
    
    if not sub_distribution_id:
        errors['sub_distribution_id'] = ['Sub-distribution ID is required']
    if not payment_reference:
        errors['payment_reference'] = ['Payment reference is required']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        publisher = PublisherProfile.objects.get(user=request.user)
    except PublisherProfile.DoesNotExist:
        errors['publisher'] = ['Publisher profile not found']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    try:
        sub_dist = PublisherArtistSubDistribution.objects.get(
            sub_distribution_id=sub_distribution_id,
            publisher=publisher
        )
    except PublisherArtistSubDistribution.DoesNotExist:
        errors['sub_distribution_id'] = ['Sub-distribution not found']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    if sub_dist.status not in ['approved', 'calculated']:
        errors['status'] = [f'Cannot mark as paid with status: {sub_dist.status}']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Mark as paid
    sub_dist.mark_as_paid(payment_reference, payment_method)

    payload['message'] = 'Sub-distribution marked as paid successfully'
    payload['data'] = {
        'sub_distribution_id': str(sub_dist.sub_distribution_id),
        'status': sub_dist.status,
        'paid_to_artist_at': sub_dist.paid_to_artist_at.isoformat() if sub_dist.paid_to_artist_at else None,
        'payment_reference': sub_dist.payment_reference
    }
    return Response(payload, status=status.HTTP_200_OK)
