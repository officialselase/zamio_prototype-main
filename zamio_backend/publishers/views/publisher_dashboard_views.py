from decimal import Decimal
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from artists.models import Track
from publishers.models import PublisherProfile, PublishingAgreement, PublisherArtistRelationship
from music_monitor.models import PlayLog, Dispute
from royalties.models import RoyaltyWithdrawal

User = get_user_model()


def _calculate_growth(current: float, previous: float) -> float:
    if previous and float(previous) > 0:
        return round(((float(current) - float(previous)) / float(previous)) * 100, 2)
    if current:
        return 100.0
    return 0.0


def _clamp_score(value: float) -> float:
    return round(max(min(float(value), 10.0), 0.0), 2)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_metrics_view(request):
    """Get publisher metrics for dashboard cards"""
    payload = {}
    data = {}
    errors = {}

    try:
        # Get all publishers with basic metrics
        publishers = PublisherProfile.objects.filter(is_archived=False).annotate(
            artist_count=Count('artist_relationships', filter=Q(artist_relationships__status='active')),
            agreement_count=Count('publishingagreement'),
            total_tracks=Count('publishingagreement__track', distinct=True)
        )

        publisher_metrics = []
        for publisher in publishers:
            # Calculate total earnings from royalty withdrawals
            total_earnings = RoyaltyWithdrawal.objects.filter(
                requester=publisher.user,
                status__in=['approved', 'processed']
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Calculate total plays for publisher's tracks
            publisher_tracks = Track.objects.filter(
                publishingagreement__publisher=publisher,
                publishingagreement__status='accepted'
            )
            total_plays = PlayLog.objects.filter(
                track__in=publisher_tracks
            ).count()

            # Get recent activity (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_plays = PlayLog.objects.filter(
                track__in=publisher_tracks,
                created_at__gte=thirty_days_ago
            ).count()

            publisher_data = {
                'publisher_id': publisher.publisher_id,
                'company_name': publisher.company_name or f"{publisher.user.first_name} {publisher.user.last_name}",
                'verified': publisher.verified,
                'artist_count': publisher.artist_count,
                'agreement_count': publisher.agreement_count,
                'total_tracks': publisher.total_tracks,
                'total_earnings': float(total_earnings),
                'total_plays': total_plays,
                'recent_plays': recent_plays,
                'region': publisher.region or 'Not specified',
                'country': publisher.country or 'Ghana',
                'created_at': publisher.created_at.isoformat(),
                'user': {
                    'name': f"{publisher.user.first_name or ''} {publisher.user.last_name or ''}".strip(),
                    'email': publisher.user.email,
                    'photo': publisher.user.photo.url if hasattr(publisher.user, 'photo') and publisher.user.photo else None,
                }
            }
            publisher_metrics.append(publisher_data)

        # Sort by total earnings descending
        publisher_metrics.sort(key=lambda x: x['total_earnings'], reverse=True)

        data['publishers'] = publisher_metrics
        data['total_publishers'] = len(publisher_metrics)
        data['total_verified'] = sum(1 for p in publisher_metrics if p['verified'])
        data['total_artists_managed'] = sum(p['artist_count'] for p in publisher_metrics)
        data['total_agreements'] = sum(p['agreement_count'] for p in publisher_metrics)

        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)

    except Exception as e:
        errors['general'] = [str(e)]
        payload['message'] = "Error fetching publisher metrics"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_analytics_view(request):
    """Get publisher analytics data for dashboard charts"""
    payload = {}
    data = {}
    errors = {}

    try:
        # Get top publishers by earnings
        top_publishers = PublisherProfile.objects.filter(is_archived=False)
        
        publisher_analytics = []
        for publisher in top_publishers:
            # Calculate earnings
            total_earnings = RoyaltyWithdrawal.objects.filter(
                requester=publisher.user,
                status__in=['approved', 'processed']
            ).aggregate(total=Sum('amount'))['total'] or 0

            if total_earnings > 0:  # Only include publishers with earnings
                publisher_analytics.append({
                    'publisher_id': publisher.publisher_id,
                    'company_name': publisher.company_name or f"{publisher.user.first_name} {publisher.user.last_name}",
                    'total_earnings': float(total_earnings),
                    'region': publisher.region or 'Not specified',
                })

        # Sort by earnings and take top 10
        publisher_analytics.sort(key=lambda x: x['total_earnings'], reverse=True)
        top_publishers_data = publisher_analytics[:10]

        # Get monthly publisher registration trends
        monthly_registrations = []
        for i in range(6):  # Last 6 months
            month_start = timezone.now().replace(day=1) - timedelta(days=30*i)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            count = PublisherProfile.objects.filter(
                created_at__gte=month_start,
                created_at__lte=month_end
            ).count()
            
            monthly_registrations.append({
                'month': month_start.strftime('%b %Y'),
                'registrations': count
            })

        monthly_registrations.reverse()  # Chronological order

        # Get regional distribution
        regional_distribution = PublisherProfile.objects.filter(
            is_archived=False,
            region__isnull=False
        ).values('region').annotate(
            count=Count('id')
        ).order_by('-count')

        data['top_publishers'] = top_publishers_data
        data['monthly_registrations'] = monthly_registrations
        data['regional_distribution'] = list(regional_distribution)

        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)

    except Exception as e:
        errors['general'] = [str(e)]
        payload['message'] = "Error fetching publisher analytics"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_detail_view(request):
    """Get detailed publisher information for dashboard detail views"""
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.query_params.get('publisher_id')
    if not publisher_id:
        errors['publisher_id'] = ["Publisher ID is required"]

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    except PublisherProfile.DoesNotExist:
        errors['publisher_id'] = ['Publisher does not exist']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get publisher's artists
        artist_relationships = PublisherArtistRelationship.objects.filter(
            publisher=publisher,
            status='active'
        ).select_related('artist')

        artists_data = []
        for relationship in artist_relationships:
            artist = relationship.artist
            # Get artist's track count and earnings
            track_count = Track.objects.filter(
                publishingagreement__publisher=publisher,
                publishingagreement__songwriter=artist,
                publishingagreement__status='accepted'
            ).count()

            artist_earnings = RoyaltyWithdrawal.objects.filter(
                requester=artist.user,
                status__in=['approved', 'processed']
            ).aggregate(total=Sum('amount'))['total'] or 0

            artists_data.append({
                'artist_id': artist.artist_id,
                'stage_name': artist.stage_name,
                'name': f"{artist.user.first_name or ''} {artist.user.last_name or ''}".strip(),
                'track_count': track_count,
                'earnings': float(artist_earnings),
                'relationship_type': relationship.relationship_type,
                'royalty_split': float(relationship.royalty_split_percentage),
                'start_date': relationship.start_date.isoformat(),
            })

        # Get publisher's agreements
        agreements = PublishingAgreement.objects.filter(
            publisher=publisher
        ).select_related('track', 'songwriter')

        agreements_data = []
        for agreement in agreements:
            agreements_data.append({
                'id': agreement.id,
                'track_title': agreement.track.title,
                'artist_name': agreement.songwriter.stage_name,
                'writer_share': float(agreement.writer_share),
                'publisher_share': float(agreement.publisher_share),
                'status': agreement.status,
                'agreement_date': agreement.agreement_date.isoformat(),
                'verified': agreement.verified_by_admin,
            })

        # Calculate total metrics
        total_earnings = RoyaltyWithdrawal.objects.filter(
            requester=publisher.user,
            status__in=['approved', 'processed']
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_tracks = Track.objects.filter(
            publishingagreement__publisher=publisher,
            publishingagreement__status='accepted'
        ).count()

        total_plays = PlayLog.objects.filter(
            track__publishingagreement__publisher=publisher,
            track__publishingagreement__status='accepted'
        ).count()

        data['publisher'] = {
            'publisher_id': publisher.publisher_id,
            'company_name': publisher.company_name,
            'verified': publisher.verified,
            'region': publisher.region,
            'city': publisher.city,
            'country': publisher.country,
            'writer_split': float(publisher.writer_split or 0),
            'publisher_split': float(publisher.publisher_split or 0),
            'total_earnings': float(total_earnings),
            'total_tracks': total_tracks,
            'total_plays': total_plays,
            'created_at': publisher.created_at.isoformat(),
            'user': {
                'name': f"{publisher.user.first_name or ''} {publisher.user.last_name or ''}".strip(),
                'email': publisher.user.email,
                'photo': publisher.user.photo.url if hasattr(publisher.user, 'photo') and publisher.user.photo else None,
            }
        }
        data['artists'] = artists_data
        data['agreements'] = agreements_data

        payload['message'] = "Successful"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)

    except Exception as e:
        errors['general'] = [str(e)]
        payload['message'] = "Error fetching publisher details"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_dashboard_view(request):
    payload = {}
    data = {}
    errors = {}

    publisher_id = request.query_params.get('publisher_id')
    period = (request.query_params.get('period') or 'monthly').lower()
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')

    publisher = None

    if publisher_id:
        try:
            publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
        except PublisherProfile.DoesNotExist:
            errors['publisher_id'] = ['Publisher does not exist']
    else:
        try:
            publisher = PublisherProfile.objects.get(user=request.user)
        except PublisherProfile.DoesNotExist:
            errors['publisher'] = ['Publisher profile not found for user']

    if publisher and request.user != publisher.user and not request.user.is_staff and not request.user.is_superuser:
        errors['publisher_id'] = ['You do not have permission to view this publisher']

    now = timezone.now()
    start_date = None
    end_date = now

    if start_date_str and end_date_str:
        try:
            start_date = timezone.make_aware(datetime.strptime(start_date_str, "%Y-%m-%d"))
            end_date = timezone.make_aware(datetime.strptime(end_date_str, "%Y-%m-%d")) + timedelta(days=1)
        except ValueError:
            errors['date_range'] = ['start_date and end_date must be in YYYY-MM-DD format']
    elif not errors:
        if period == 'daily':
            start_date = now - timedelta(days=1)
        elif period == 'weekly':
            start_date = now - timedelta(days=7)
        elif period == 'monthly':
            start_date = now - timedelta(days=30)
        elif period == 'yearly':
            start_date = now - timedelta(days=365)
        elif period in ('all-time', 'alltime', 'lifetime'):
            start_date = None
        else:
            errors['period'] = ['Invalid period. Choose from: daily, weekly, monthly, yearly, all-time']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    agreements_qs = PublishingAgreement.objects.filter(publisher=publisher, status='accepted')

    base_playlogs = (
        PlayLog.objects.filter(
            track__publishingagreement__publisher=publisher,
            track__publishingagreement__status='accepted',
        )
        .select_related('track', 'track__artist', 'station')
    )

    if start_date:
        playlogs = base_playlogs.filter(played_at__gte=start_date)
    else:
        playlogs = base_playlogs

    if end_date:
        playlogs = playlogs.filter(played_at__lt=end_date)

    previous_logs = PlayLog.objects.none()
    if start_date:
        delta = end_date - start_date
        previous_logs = base_playlogs.filter(
            played_at__gte=start_date - delta,
            played_at__lt=start_date,
        )

    total_performances = playlogs.count()
    total_earnings = playlogs.aggregate(total=Sum('royalty_amount'))['total'] or Decimal('0')
    
    # Works in catalog should be ALL accepted agreements, not just those with plays
    works_in_catalog = agreements_qs.values('track_id').distinct().count()
    
    # Calculate previous catalog size for growth comparison
    # Get agreements that existed before the current period
    if start_date:
        previous_catalog_size = agreements_qs.filter(
            created_at__lt=start_date
        ).values('track_id').distinct().count()
    else:
        previous_catalog_size = 0
    
    active_stations = playlogs.values('station_id').distinct().count()

    previous_performances = previous_logs.count()
    previous_earnings = previous_logs.aggregate(total=Sum('royalty_amount'))['total'] or Decimal('0')
    previous_station_count = previous_logs.values('station_id').distinct().count()

    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Publisher Dashboard Stats for {publisher.publisher_id}:")
    logger.info(f"  - Total Performances: {total_performances} (change: {_calculate_growth(total_performances, previous_performances)}%)")
    logger.info(f"  - Total Earnings: {total_earnings} (change: {_calculate_growth(total_earnings, previous_earnings)}%)")
    logger.info(f"  - Works in Catalog: {works_in_catalog} (change: {_calculate_growth(works_in_catalog, previous_catalog_size)}%)")
    logger.info(f"  - Active Stations: {active_stations} (change: {_calculate_growth(active_stations, previous_station_count)}%)")
    logger.info(f"  - Total Agreements (accepted): {agreements_qs.count()}")
    logger.info(f"  - Period: {period}, Start: {start_date}, End: {end_date}")

    stats = {
        'totalPerformances': {
            'value': total_performances,
            'change': _calculate_growth(total_performances, previous_performances),
        },
        'totalEarnings': {
            'value': float(total_earnings),
            'change': _calculate_growth(total_earnings, previous_earnings),
        },
        'worksInCatalog': {
            'value': works_in_catalog,
            'change': _calculate_growth(works_in_catalog, previous_catalog_size),
        },
        'activeStations': {
            'value': active_stations,
            'change': _calculate_growth(active_stations, previous_station_count),
        },
    }

    bucket = TruncDate('played_at') if period in ('daily', 'weekly') else TruncMonth('played_at')
    plays_over_time = (
        playlogs.exclude(played_at__isnull=True)
        .annotate(period_bucket=bucket)
        .values('period_bucket')
        .annotate(
            airplay=Count('id', filter=Q(source='Radio')),
            streaming=Count('id', filter=Q(source='Streaming')),
            total=Count('id'),
        )
        .order_by('period_bucket')
    )

    plays_over_time_data = []
    for entry in plays_over_time:
        period_value = entry['period_bucket']
        label = None
        if isinstance(period_value, datetime):
            localized = timezone.localtime(period_value)
            label = localized.strftime('%b %d, %Y') if period in ('daily', 'weekly') else localized.strftime('%b %Y')
        elif period_value:
            label = str(period_value)

        plays_over_time_data.append({
            'period': period_value.isoformat() if hasattr(period_value, 'isoformat') else None,
            'label': label,
            'airplay': entry['airplay'],
            'streaming': entry['streaming'],
            'total': entry['total'],
        })

    top_songs_data = [
        {
            'trackId': item['track_id'],
            'title': item['track__title'],
            'artist': item['track__artist__stage_name'],
            'plays': item['plays'],
            'earnings': float(item['earnings'] or 0),
            'stations': item['stations'],
        }
        for item in (
            playlogs.values('track_id', 'track__title', 'track__artist__stage_name')
            .annotate(
                plays=Count('id'),
                earnings=Sum('royalty_amount'),
                stations=Count('station_id', distinct=True),
            )
            .order_by('-plays')[:10]
        )
    ]

    previous_region_totals = {
        entry['track__artist__region'] or 'Unknown': entry['plays']
        for entry in (
            previous_logs
            .values('track__artist__region')
            .annotate(plays=Count('id'))
        )
    }

    region_performance = [
        {
            'region': entry['track__artist__region'] or 'Unknown',
            'plays': entry['plays'],
            'earnings': float(entry['earnings'] or 0),
            'stations': entry['stations'],
            'growth': _calculate_growth(entry['plays'], previous_region_totals.get(entry['track__artist__region'] or 'Unknown', 0)),
        }
        for entry in (
            playlogs
            .values('track__artist__region')
            .annotate(
                plays=Count('id'),
                earnings=Sum('royalty_amount'),
                stations=Count('station_id', distinct=True),
            )
            .order_by('-plays')
        )
    ]

    top_station_data = []
    for entry in (
        playlogs
        .values('station_id', 'station__name', 'station__region')
        .annotate(plays=Count('id'))
        .order_by('-plays')[:10]
    ):
        percentage = 0.0
        if total_performances:
            percentage = round((entry['plays'] / total_performances) * 100, 2)
        top_station_data.append({
            'stationId': entry['station_id'],
            'name': entry['station__name'],
            'region': entry['station__region'],
            'plays': entry['plays'],
            'percentage': percentage,
        })

    recent_activity = []
    recent_logs = playlogs.order_by('-played_at', '-created_at')[:5]
    for log in recent_logs:
        timestamp = log.played_at or log.created_at
        timestamp_display = timezone.localtime(timestamp).strftime('%b %d, %Y %H:%M') if timestamp else None
        recent_activity.append({
            'id': log.id,
            'type': 'playlog',
            'title': f"{log.track.title if log.track else 'Track'} detected",
            'description': f"{getattr(log.track.artist, 'stage_name', 'Unknown Artist')} at {log.station.name if log.station else 'Unknown Station'}",
            'timestamp': timestamp.isoformat() if timestamp else None,
            'time': timestamp_display,
        })

    for agreement in agreements_qs.order_by('-created_at')[:3]:
        recent_activity.append({
            'id': agreement.id,
            'type': 'agreement',
            'title': f"Agreement signed with {agreement.songwriter.stage_name}",
            'description': f"{agreement.track.title} • {agreement.status.title()}",
            'timestamp': agreement.created_at.isoformat(),
            'time': timezone.localtime(agreement.created_at).strftime('%b %d, %Y %H:%M'),
        })

    for withdrawal in RoyaltyWithdrawal.objects.filter(
        requester=publisher.user,
        requester_type='publisher',
    ).order_by('-requested_at')[:3]:
        recent_activity.append({
            'id': str(withdrawal.withdrawal_id),
            'type': 'payment',
            'title': 'Royalty Payment Processed' if withdrawal.status == 'processed' else 'Royalty Payment Requested',
            'description': f"₵{float(withdrawal.amount):,.2f} {withdrawal.status.capitalize()}",
            'timestamp': withdrawal.requested_at.isoformat(),
            'time': timezone.localtime(withdrawal.requested_at).strftime('%b %d, %Y %H:%M'),
        })

    recent_activity.sort(key=lambda item: item.get('timestamp') or '', reverse=True)
    recent_activity = recent_activity[:8]

    active_relationships = PublisherArtistRelationship.objects.filter(publisher=publisher, status='active')
    disputes_count = Dispute.objects.filter(playlog__in=playlogs).count()
    unclaimed_logs = playlogs.filter(claimed=False).count()

    roster = {
        'writerCount': active_relationships.values('artist_id').distinct().count(),
        'agreementCount': agreements_qs.count(),
        'publisherSplit': float(publisher.publisher_split or 0),
        'writerSplit': float(publisher.writer_split or 0),
        'unclaimedLogs': unclaimed_logs,
        'disputes': disputes_count,
    }

    previous_artist_totals = {
        entry['track__artist_id']: entry['plays']
        for entry in previous_logs.values('track__artist_id').annotate(plays=Count('id'))
    }

    top_artists_data = []
    for entry in (
        playlogs
        .values('track__artist_id', 'track__artist__stage_name')
        .annotate(
            plays=Count('id'),
            revenue=Sum('royalty_amount'),
        )
        .order_by('-plays')[:10]
    ):
        artist_id = entry['track__artist_id']
        plays = entry['plays']
        top_artists_data.append({
            'artistId': artist_id,
            'name': entry['track__artist__stage_name'],
            'plays': plays,
            'revenue': float(entry['revenue'] or 0),
            'trend': _calculate_growth(plays, previous_artist_totals.get(artist_id, 0)),
        })

    data['stats'] = stats
    data['playsOverTime'] = plays_over_time_data
    data['topSongs'] = top_songs_data
    data['regionPerformance'] = region_performance
    data['topStations'] = top_station_data
    data['recentActivity'] = recent_activity
    data['roster'] = roster
    data['topArtists'] = top_artists_data
    data['metadata'] = {
        'period': period,
        'startDate': start_date.isoformat() if start_date else None,
        'endDate': end_date.isoformat() if end_date else None,
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)
