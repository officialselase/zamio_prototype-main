"""
Artist Payments and Royalty Withdrawals View
Provides comprehensive payment data for artists including:
- Overview statistics
- Payment status breakdown
- Recent payments
- Monthly trends
- Top earning tracks
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F, Max
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from artists.models import Artist, Track
from music_monitor.models import PlayLog
from royalties.models import RoyaltyWithdrawal, RoyaltyLineItem, RoyaltyCycle


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def get_artist_payments_view(request):
    """
    Get comprehensive payment and royalty data for an artist
    
    Query Parameters:
        - artist_id (required): Artist's unique identifier
        - time_range (optional): 7days, 30days, 3months, 12months (default: 12months)
        - status_filter (optional): all, paid, pending, failed (default: all)
    """
    payload, data, errors = {}, {}, {}

    artist_id = request.query_params.get('artist_id')
    time_range = request.query_params.get('time_range', '12months')
    status_filter = request.query_params.get('status_filter', 'all')
    
    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist_id'] = ['Artist not found.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Define timeframe
    now = timezone.now()
    start_date = None
    
    if time_range == '7days':
        start_date = now - timedelta(days=7)
    elif time_range == '30days':
        start_date = now - timedelta(days=30)
    elif time_range == '3months':
        start_date = now - timedelta(days=90)
    elif time_range == '12months':
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=365)

    # Get artist's tracks
    tracks = Track.objects.filter(artist=artist, is_archived=False)
    
    # Base play logs queryset
    base_qs = PlayLog.objects.filter(track__in=tracks)
    if start_date:
        base_qs = base_qs.filter(played_at__gte=start_date)
    
    # Calculate total earnings from plays (₵0.015 per play)
    total_plays = base_qs.count()
    total_earnings = total_plays * Decimal('0.015')
    
    # Get withdrawal data
    withdrawals_qs = RoyaltyWithdrawal.objects.filter(artist=artist)
    if start_date:
        withdrawals_qs = withdrawals_qs.filter(requested_at__gte=start_date)
    
    # === OVERVIEW STATISTICS ===
    paid_withdrawals = withdrawals_qs.filter(status='paid')
    pending_withdrawals = withdrawals_qs.filter(status='pending')
    failed_withdrawals = withdrawals_qs.filter(status='failed')
    
    total_paid = paid_withdrawals.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    total_pending = pending_withdrawals.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Calculate this month's payments
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    paid_this_month = paid_withdrawals.filter(
        processed_at__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Get next payout info (next pending withdrawal)
    next_payout = pending_withdrawals.order_by('requested_at').first()
    
    # Calculate growth rate (compare to previous period)
    previous_start = start_date - (now - start_date) if start_date else None
    if previous_start:
        previous_paid = paid_withdrawals.filter(
            processed_at__gte=previous_start,
            processed_at__lt=start_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        if previous_paid > 0:
            growth_rate = float((total_paid - previous_paid) / previous_paid * 100)
        else:
            growth_rate = 0.0
    else:
        growth_rate = 0.0
    
    overview = {
        'total_earnings': float(total_earnings),
        'pending_payments': float(total_pending),
        'paid_this_month': float(paid_this_month),
        'total_transactions': withdrawals_qs.count(),
        'average_payment': float(total_paid / paid_withdrawals.count()) if paid_withdrawals.count() > 0 else 0.0,
        'growth_rate': round(growth_rate, 1),
        'next_payout_date': next_payout.requested_at.isoformat() if next_payout else None,
        'next_payout_amount': float(next_payout.amount) if next_payout else 0.0
    }
    
    # === PAYMENT STATUS BREAKDOWN ===
    payment_status = [
        {
            'status': 'paid',
            'amount': float(total_paid),
            'count': paid_withdrawals.count(),
            'percentage': round((paid_withdrawals.count() / withdrawals_qs.count() * 100) if withdrawals_qs.count() > 0 else 0, 1),
            'description': 'Successfully processed payments'
        },
        {
            'status': 'pending',
            'amount': float(total_pending),
            'count': pending_withdrawals.count(),
            'percentage': round((pending_withdrawals.count() / withdrawals_qs.count() * 100) if withdrawals_qs.count() > 0 else 0, 1),
            'description': 'Awaiting verification and processing'
        },
        {
            'status': 'failed',
            'amount': float(failed_withdrawals.aggregate(total=Sum('amount'))['total'] or Decimal('0')),
            'count': failed_withdrawals.count(),
            'percentage': round((failed_withdrawals.count() / withdrawals_qs.count() * 100) if withdrawals_qs.count() > 0 else 0, 1),
            'description': 'Failed transactions requiring attention'
        }
    ]
    
    # === RECENT PAYMENTS ===
    recent_withdrawals = withdrawals_qs.select_related('artist').order_by('-requested_at')[:10]
    recent_payments = []
    
    for withdrawal in recent_withdrawals:
        # Determine source based on metadata or default to 'Radio Stations'
        source = 'Radio Stations'  # Default
        payment_method = 'Bank Transfer'  # Default
        
        if withdrawal.metadata:
            source = withdrawal.metadata.get('source', source)
            payment_method = withdrawal.metadata.get('payment_method', payment_method)
        
        recent_payments.append({
            'id': str(withdrawal.withdrawal_id),
            'date': withdrawal.requested_at.date().isoformat(),
            'amount': float(withdrawal.amount),
            'status': withdrawal.status,
            'source': source,
            'period': withdrawal.requested_at.strftime('%b %Y'),
            'tracks': tracks.count(),  # Total tracks for artist
            'description': withdrawal.notes or f'Royalty payment for {withdrawal.requested_at.strftime("%b %Y")}',
            'payment_method': payment_method,
            'reference': str(withdrawal.withdrawal_id)[:12].upper()
        })
    
    # === MONTHLY TRENDS ===
    # Group paid withdrawals by month
    monthly_qs = paid_withdrawals.annotate(
        month=TruncMonth('processed_at')
    ).values('month').annotate(
        total_amount=Sum('amount')
    ).order_by('month')
    
    monthly_trends = []
    for entry in monthly_qs:
        monthly_trends.append({
            'month': entry['month'].strftime('%b'),
            'amount': float(entry['total_amount']),
            'status': 'paid'
        })
    
    # Add pending for current month if exists
    current_month_pending = pending_withdrawals.filter(
        requested_at__gte=month_start
    ).aggregate(total=Sum('amount'))['total']
    
    if current_month_pending and current_month_pending > 0:
        monthly_trends.append({
            'month': now.strftime('%b'),
            'amount': float(current_month_pending),
            'status': 'pending'
        })
    
    # === TOP EARNING TRACKS ===
    # Calculate earnings per track based on play count
    track_earnings = []
    for track in tracks:
        track_plays = base_qs.filter(track=track).count()
        track_revenue = track_plays * Decimal('0.015')
        
        # Calculate trend (compare to previous period)
        if previous_start:
            previous_plays = PlayLog.objects.filter(
                track=track,
                played_at__gte=previous_start,
                played_at__lt=start_date
            ).count()
            
            if previous_plays > 0:
                trend = float((track_plays - previous_plays) / previous_plays * 100)
            else:
                trend = 0.0
        else:
            trend = 0.0
        
        track_earnings.append({
            'title': track.title,
            'earnings': float(track_revenue),
            'plays': track_plays,
            'trend': round(trend, 1)
        })
    
    # Sort by earnings and get top 5
    top_earning_tracks = sorted(track_earnings, key=lambda x: x['earnings'], reverse=True)[:5]
    
    # === PAYMENT METHODS BREAKDOWN ===
    payment_methods = [
        {
            'method': 'Bank Transfer',
            'count': paid_withdrawals.count(),  # Simplified - all use bank transfer
            'total_amount': float(total_paid),
            'percentage': 100.0
        }
    ]
    
    # Compile response
    data.update({
        'time_range': time_range,
        'overview': overview,
        'payment_status': payment_status,
        'recent_payments': recent_payments,
        'monthly_trends': monthly_trends,
        'top_earning_tracks': top_earning_tracks,
        'payment_methods': payment_methods
    })
    
    payload.update({'message': 'Successful', 'data': data})
    return Response(payload, status=status.HTTP_200_OK)
