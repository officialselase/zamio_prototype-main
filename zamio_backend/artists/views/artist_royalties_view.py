"""
Artist Royalties View
Provides royalty information for authenticated artists
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
from music_monitor.models import RoyaltyDistribution, PublisherArtistSubDistribution, PlayLog
from artists.models import Artist, Track

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_artist_royalties_view(request):
    """
    Get comprehensive royalty information for authenticated artist
    """
    payload: Dict[str, object] = {}
    data: Dict[str, object] = {}
    errors: Dict[str, List[str]] = {}

    # Get time range from query params
    time_range = request.GET.get('time_range', '12months')
    
    # Calculate date range
    end_date = timezone.now()
    if time_range == '7days':
        start_date = end_date - timedelta(days=7)
    elif time_range == '30days':
        start_date = end_date - timedelta(days=30)
    elif time_range == '3months':
        start_date = end_date - timedelta(days=90)
    elif time_range == '12months':
        start_date = end_date - timedelta(days=365)
    else:
        start_date = None

    try:
        # Get artist profile
        artist = Artist.objects.select_related('user', 'publisher').get(user=request.user)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist profile not found']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    # Get direct distributions (self-published tracks)
    direct_distributions = RoyaltyDistribution.objects.filter(
        recipient=request.user,
        recipient_type='artist'
    ).select_related('play_log', 'play_log__track', 'play_log__station')
    
    if start_date:
        direct_distributions = direct_distributions.filter(calculated_at__gte=start_date)

    # Get publisher sub-distributions (if represented by publisher)
    sub_distributions = PublisherArtistSubDistribution.objects.filter(
        artist=request.user
    ).select_related('publisher', 'parent_distribution', 'parent_distribution__play_log')
    
    if start_date:
        sub_distributions = sub_distributions.filter(calculated_at__gte=start_date)

    # Calculate summary statistics
    direct_summary = direct_distributions.aggregate(
        total=Sum('net_amount'),
        count=Count('id'),
        paid=Sum('net_amount', filter=Q(status='paid')),
        pending=Sum('net_amount', filter=Q(status__in=['pending', 'calculated', 'approved']))
    )

    sub_dist_summary = sub_distributions.aggregate(
        total=Sum('artist_net_amount'),
        count=Count('id'),
        paid=Sum('artist_net_amount', filter=Q(status='paid')),
        pending=Sum('artist_net_amount', filter=Q(status__in=['pending', 'calculated', 'approved']))
    )

    # Combine totals
    total_earnings = float(direct_summary['total'] or 0) + float(sub_dist_summary['total'] or 0)
    paid_amount = float(direct_summary['paid'] or 0) + float(sub_dist_summary['paid'] or 0)
    pending_amount = float(direct_summary['pending'] or 0) + float(sub_dist_summary['pending'] or 0)
    total_transactions = (direct_summary['count'] or 0) + (sub_dist_summary['count'] or 0)

    # Calculate growth rate (compare to previous period)
    if start_date:
        period_length = (end_date - start_date).days
        previous_start = start_date - timedelta(days=period_length)
        previous_end = start_date
        
        previous_direct = RoyaltyDistribution.objects.filter(
            recipient=request.user,
            recipient_type='artist',
            calculated_at__gte=previous_start,
            calculated_at__lt=previous_end
        ).aggregate(total=Sum('net_amount'))['total'] or 0
        
        previous_sub = PublisherArtistSubDistribution.objects.filter(
            artist=request.user,
            calculated_at__gte=previous_start,
            calculated_at__lt=previous_end
        ).aggregate(total=Sum('artist_net_amount'))['total'] or 0
        
        previous_total = float(previous_direct) + float(previous_sub)
        
        if previous_total > 0:
            growth_rate = ((total_earnings - previous_total) / previous_total) * 100
        else:
            growth_rate = 0.0
    else:
        growth_rate = 0.0

    # Get payment status breakdown
    payment_status = []
    
    # Paid
    paid_count = direct_distributions.filter(status='paid').count() + sub_distributions.filter(status='paid').count()
    if paid_count > 0:
        payment_status.append({
            'status': 'paid',
            'count': paid_count,
            'amount': paid_amount,
            'percentage': round((paid_count / total_transactions * 100) if total_transactions > 0 else 0, 1),
            'description': 'Successfully paid to your account'
        })
    
    # Pending
    pending_count = (
        direct_distributions.filter(status__in=['pending', 'calculated', 'approved']).count() +
        sub_distributions.filter(status__in=['pending', 'calculated', 'approved']).count()
    )
    if pending_count > 0:
        payment_status.append({
            'status': 'pending',
            'count': pending_count,
            'amount': pending_amount,
            'percentage': round((pending_count / total_transactions * 100) if total_transactions > 0 else 0, 1),
            'description': 'Awaiting payment processing'
        })

    # Get recent payments (combined)
    recent_payments = []
    
    # Add direct distributions
    for dist in direct_distributions.order_by('-calculated_at')[:20]:
        track_title = dist.play_log.track.title if dist.play_log and dist.play_log.track else 'Unknown Track'
        station_name = dist.play_log.station.name if dist.play_log and dist.play_log.station else 'Unknown Station'
        
        recent_payments.append({
            'id': str(dist.distribution_id),
            'description': f'Royalty payment for {track_title}',
            'amount': float(dist.net_amount),
            'status': dist.status,
            'date': dist.calculated_at.isoformat(),
            'source': station_name,
            'payment_type': 'direct',
            'reference': str(dist.distribution_id)[:8],
            'period': dist.calculated_at.strftime('%B %Y'),
            'tracks': 1
        })
    
    # Add publisher sub-distributions
    for sub_dist in sub_distributions.order_by('-calculated_at')[:20]:
        recent_payments.append({
            'id': str(sub_dist.sub_distribution_id),
            'description': f'Publisher payment via {sub_dist.publisher.company_name}',
            'amount': float(sub_dist.artist_net_amount),
            'status': sub_dist.status,
            'date': sub_dist.calculated_at.isoformat(),
            'source': sub_dist.publisher.company_name,
            'payment_type': 'publisher',
            'reference': str(sub_dist.sub_distribution_id)[:8],
            'period': sub_dist.calculated_at.strftime('%B %Y'),
            'tracks': 1,
            'publisher_fee': float(sub_dist.publisher_fee_percentage)
        })
    
    # Sort by date and limit
    recent_payments.sort(key=lambda x: x['date'], reverse=True)
    recent_payments = recent_payments[:20]

    # Get top earning tracks
    track_earnings = {}
    
    # From direct distributions
    for dist in direct_distributions:
        if dist.play_log and dist.play_log.track:
            track_id = dist.play_log.track.id
            if track_id not in track_earnings:
                track_earnings[track_id] = {
                    'track': dist.play_log.track,
                    'earnings': 0,
                    'plays': 0
                }
            track_earnings[track_id]['earnings'] += float(dist.net_amount)
            track_earnings[track_id]['plays'] += 1
    
    # From publisher sub-distributions
    for sub_dist in sub_distributions:
        if sub_dist.parent_distribution.play_log and sub_dist.parent_distribution.play_log.track:
            track_id = sub_dist.parent_distribution.play_log.track.id
            if track_id not in track_earnings:
                track_earnings[track_id] = {
                    'track': sub_dist.parent_distribution.play_log.track,
                    'earnings': 0,
                    'plays': 0
                }
            track_earnings[track_id]['earnings'] += float(sub_dist.artist_net_amount)
            track_earnings[track_id]['plays'] += 1
    
    # Sort and format top tracks
    top_tracks = sorted(track_earnings.values(), key=lambda x: x['earnings'], reverse=True)[:10]
    top_earning_tracks = [
        {
            'title': item['track'].title,
            'earnings': item['earnings'],
            'plays': item['plays'],
            'trend': 0  # Could calculate trend if needed
        }
        for item in top_tracks
    ]

    # Get payment methods (simplified)
    payment_methods = [
        {
            'method': 'Direct Payment',
            'count': direct_summary['count'] or 0,
            'total_amount': float(direct_summary['total'] or 0)
        }
    ]
    
    if sub_dist_summary['count'] > 0:
        payment_methods.append({
            'method': f'Via Publisher ({artist.publisher.company_name if artist.publisher else "Publisher"})',
            'count': sub_dist_summary['count'] or 0,
            'total_amount': float(sub_dist_summary['total'] or 0)
        })

    # Build response
    data = {
        'time_range': time_range,
        'overview': {
            'total_earnings': total_earnings,
            'pending_payments': pending_amount,
            'paid_this_month': paid_amount,  # Simplified
            'total_transactions': total_transactions,
            'average_payment': total_earnings / total_transactions if total_transactions > 0 else 0,
            'growth_rate': growth_rate,
            'next_payout_date': None,  # Could be calculated based on payment schedule
            'next_payout_amount': pending_amount
        },
        'payment_status': payment_status,
        'recent_payments': recent_payments,
        'monthly_trends': [],  # Could be calculated if needed
        'top_earning_tracks': top_earning_tracks,
        'payment_methods': payment_methods,
        'has_publisher': artist.publisher is not None,
        'publisher_name': artist.publisher.company_name if artist.publisher else None,
        'publisher_fee': float(artist.publisher.administrative_fee_percentage) if artist.publisher and artist.publisher.administrative_fee_percentage else None
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
