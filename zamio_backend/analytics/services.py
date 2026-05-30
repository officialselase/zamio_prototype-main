import json
import redis
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Any, Tuple
from django.db import models
from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.timesince import timesince
from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import AnalyticsSnapshot, AnalyticsCache, RealtimeMetric
from music_monitor.models import PlayLog, AudioDetection, RoyaltyDistribution, Dispute
from artists.models import Artist, Track, Genre
from stations.models import Station
from publishers.models import PublisherProfile, PublishingAgreement
from royalties.models import PartnerPRO, ReciprocalAgreement

User = get_user_model()


class AnalyticsAggregator:
    """Service for efficient analytics data processing and aggregation"""

    def __init__(self):
        self.redis_client = redis.Redis(
            host=getattr(settings, 'REDIS_HOST', 'localhost'),
            port=getattr(settings, 'REDIS_PORT', 6379),
            db=getattr(settings, 'REDIS_ANALYTICS_DB', 1),
            decode_responses=True
        )
        self.cache_prefix = 'analytics:'
        self.default_cache_timeout = 3600  # 1 hour

    def _coerce_decimal(self, value: Optional[Any], default: Decimal = Decimal('0')) -> Decimal:
        """Convert values to Decimal while guarding against nulls and invalid inputs."""
        if value is None:
            return default
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(value)
        except (InvalidOperation, TypeError, ValueError):
            return default

    def generate_cache_key(self, key_type: str, **params) -> str:
        """Generate consistent cache keys"""
        param_str = '_'.join([f"{k}:{v}" for k, v in sorted(params.items()) if v is not None])
        return f"{self.cache_prefix}{key_type}:{param_str}"
    
    def get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """Get data from Redis cache"""
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except (redis.RedisError, json.JSONDecodeError):
            pass
        return None
    
    def set_cached_data(self, cache_key: str, data: Dict, timeout: int = None) -> bool:
        """Set data in Redis cache"""
        try:
            timeout = timeout or self.default_cache_timeout
            serialized_data = json.dumps(data, default=str)
            return self.redis_client.setex(cache_key, timeout, serialized_data)
        except (redis.RedisError, TypeError, ValueError):
            return False
    
    def invalidate_cache_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        try:
            keys = self.redis_client.keys(f"{self.cache_prefix}{pattern}")
            if keys:
                self.redis_client.delete(*keys)
        except redis.RedisError:
            pass
    
    def get_artist_analytics(self, artist_id: str, date_range: Tuple[datetime, datetime]) -> Dict:
        """Get comprehensive analytics for an artist"""
        start_date, end_date = date_range
        cache_key = self.generate_cache_key(
            'artist_analytics',
            artist_id=artist_id,
            start=start_date.date(),
            end=end_date.date()
        )
        
        # Try cache first
        cached_data = self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Get artist and their tracks
        try:
            artist = Artist.objects.get(artist_id=artist_id)
            tracks = Track.objects.filter(artist=artist, active=True)
            track_ids = list(tracks.values_list('track_id', flat=True))
        except Artist.DoesNotExist:
            return {}
        
        # Base queryset for the date range
        play_logs = PlayLog.objects.filter(
            track__track_id__in=track_ids,
            played_at__range=(start_date, end_date),
            active=True
        )
        
        # Aggregate basic metrics
        basic_metrics = play_logs.aggregate(
            total_plays=Count('id'),
            total_revenue=Sum('royalty_amount') or Decimal('0'),
            avg_confidence=Avg('avg_confidence_score') or Decimal('0'),
            unique_stations=Count('station', distinct=True)
        )
        
        # Top performing tracks
        top_tracks = play_logs.values(
            'track__title', 'track__track_id'
        ).annotate(
            play_count=Count('id'),
            revenue=Sum('royalty_amount') or Decimal('0')
        ).order_by('-play_count')[:10]
        
        # Geographic distribution
        geographic_data = play_logs.values(
            'station__region', 'station__city'
        ).annotate(
            play_count=Count('id'),
            revenue=Sum('royalty_amount') or Decimal('0')
        ).order_by('-play_count')[:20]
        
        # Time series data (daily aggregation)
        daily_data = []
        current_date = start_date.date()
        while current_date <= end_date.date():
            day_start = timezone.make_aware(datetime.combine(current_date, datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            
            day_metrics = play_logs.filter(
                played_at__range=(day_start, day_end)
            ).aggregate(
                plays=Count('id'),
                revenue=Sum('royalty_amount') or Decimal('0')
            )
            
            daily_data.append({
                'date': current_date.isoformat(),
                'plays': day_metrics['plays'],
                'revenue': float(day_metrics['revenue'])
            })
            current_date += timedelta(days=1)
        
        # Station performance
        station_performance = play_logs.values(
            'station__name', 'station__station_id', 'station__station_class'
        ).annotate(
            play_count=Count('id'),
            revenue=Sum('royalty_amount') or Decimal('0'),
            avg_confidence=Avg('avg_confidence_score') or Decimal('0')
        ).order_by('-play_count')[:15]
        
        # Trend analysis (compare with previous period)
        previous_start = start_date - (end_date - start_date)
        previous_end = start_date
        
        previous_metrics = PlayLog.objects.filter(
            track__track_id__in=track_ids,
            played_at__range=(previous_start, previous_end),
            active=True
        ).aggregate(
            total_plays=Count('id'),
            total_revenue=Sum('royalty_amount') or Decimal('0')
        )
        
        # Calculate trends
        plays_trend = self._calculate_trend(
            basic_metrics['total_plays'], 
            previous_metrics['total_plays']
        )
        revenue_trend = self._calculate_trend(
            float(basic_metrics['total_revenue']), 
            float(previous_metrics['total_revenue'])
        )
        
        analytics_data = {
            'artist_info': {
                'artist_id': artist_id,
                'stage_name': artist.stage_name,
                'total_tracks': tracks.count(),
                'verified': artist.verified
            },
            'summary': {
                'total_plays': basic_metrics['total_plays'],
                'total_revenue': float(basic_metrics['total_revenue']),
                'avg_confidence_score': float(basic_metrics['avg_confidence']),
                'unique_stations': basic_metrics['unique_stations'],
                'plays_trend': plays_trend,
                'revenue_trend': revenue_trend
            },
            'top_tracks': list(top_tracks),
            'geographic_distribution': list(geographic_data),
            'daily_trends': daily_data,
            'station_performance': list(station_performance),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': timezone.now().isoformat()
        }
        
        # Cache the results
        self.set_cached_data(cache_key, analytics_data, timeout=1800)  # 30 minutes
        
        return analytics_data
    
    def get_publisher_analytics(self, publisher_id: int, date_range: Tuple[datetime, datetime]) -> Dict:
        """Get comprehensive analytics for a publisher"""
        start_date, end_date = date_range
        cache_key = self.generate_cache_key(
            'publisher_analytics',
            publisher_id=publisher_id,
            start=start_date.date(),
            end=end_date.date()
        )
        
        # Try cache first
        cached_data = self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        try:
            publisher = PublisherProfile.objects.get(id=publisher_id)
            artists = Artist.objects.filter(publisher=publisher, active=True)
            artist_ids = list(artists.values_list('artist_id', flat=True))
        except PublisherProfile.DoesNotExist:
            return {}
        
        # Get all tracks for publisher's artists
        tracks = Track.objects.filter(artist__artist_id__in=artist_ids, active=True)
        track_ids = list(tracks.values_list('track_id', flat=True))
        
        # Base queryset
        play_logs = PlayLog.objects.filter(
            track__track_id__in=track_ids,
            played_at__range=(start_date, end_date),
            active=True
        )
        
        # Portfolio overview
        portfolio_metrics = play_logs.aggregate(
            total_plays=Count('id'),
            total_revenue=Sum('royalty_amount') or Decimal('0'),
            unique_stations=Count('station', distinct=True),
            unique_tracks=Count('track', distinct=True)
        )
        
        # Artist performance comparison
        artist_performance = []
        for artist in artists:
            artist_tracks = tracks.filter(artist=artist)
            artist_track_ids = list(artist_tracks.values_list('track_id', flat=True))
            
            artist_metrics = play_logs.filter(
                track__track_id__in=artist_track_ids
            ).aggregate(
                plays=Count('id'),
                revenue=Sum('royalty_amount') or Decimal('0'),
                tracks_count=Count('track', distinct=True)
            )
            
            artist_performance.append({
                'artist_id': artist.artist_id,
                'stage_name': artist.stage_name,
                'plays': artist_metrics['plays'],
                'revenue': float(artist_metrics['revenue']),
                'tracks_count': artist_metrics['tracks_count'],
                'avg_revenue_per_track': float(artist_metrics['revenue']) / max(artist_metrics['tracks_count'], 1)
            })
        
        # Sort by revenue
        artist_performance.sort(key=lambda x: x['revenue'], reverse=True)
        
        # Revenue distribution by artist
        revenue_distribution = play_logs.values(
            'track__artist__stage_name', 'track__artist__artist_id'
        ).annotate(
            revenue=Sum('royalty_amount') or Decimal('0'),
            plays=Count('id')
        ).order_by('-revenue')[:10]
        
        # Monthly trends
        monthly_data = []
        current_month = start_date.replace(day=1)
        while current_month <= end_date:
            next_month = (current_month.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_end = min(next_month - timedelta(days=1), end_date)
            
            month_metrics = play_logs.filter(
                played_at__range=(current_month, month_end)
            ).aggregate(
                plays=Count('id'),
                revenue=Sum('royalty_amount') or Decimal('0'),
                unique_artists=Count('track__artist', distinct=True)
            )
            
            monthly_data.append({
                'month': current_month.strftime('%Y-%m'),
                'plays': month_metrics['plays'],
                'revenue': float(month_metrics['revenue']),
                'unique_artists': month_metrics['unique_artists']
            })
            
            current_month = next_month
            if current_month > end_date:
                break
        
        analytics_data = {
            'publisher_info': {
                'publisher_id': publisher_id,
                'company_name': publisher.company_name,
                'total_artists': artists.count(),
                'total_tracks': tracks.count()
            },
            'portfolio_summary': {
                'total_plays': portfolio_metrics['total_plays'],
                'total_revenue': float(portfolio_metrics['total_revenue']),
                'unique_stations': portfolio_metrics['unique_stations'],
                'unique_tracks': portfolio_metrics['unique_tracks'],
                'avg_revenue_per_play': float(portfolio_metrics['total_revenue']) / max(portfolio_metrics['total_plays'], 1)
            },
            'artist_performance': artist_performance,
            'revenue_distribution': list(revenue_distribution),
            'monthly_trends': monthly_data,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': timezone.now().isoformat()
        }
        
        # Cache the results
        self.set_cached_data(cache_key, analytics_data, timeout=1800)
        
        return analytics_data
    
    def get_station_analytics(self, station_id: str, date_range: Tuple[datetime, datetime]) -> Dict:
        """Get comprehensive analytics for a station"""
        start_date, end_date = date_range
        cache_key = self.generate_cache_key(
            'station_analytics',
            station_id=station_id,
            start=start_date.date(),
            end=end_date.date()
        )
        
        # Try cache first
        cached_data = self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        try:
            station = Station.objects.get(station_id=station_id)
        except Station.DoesNotExist:
            return {}
        
        # Play logs for this station
        play_logs = PlayLog.objects.filter(
            station=station,
            played_at__range=(start_date, end_date),
            active=True
        )
        
        # Detection data
        detections = AudioDetection.objects.filter(
            station=station,
            detected_at__range=(start_date, end_date)
        )
        
        # Basic metrics
        basic_metrics = play_logs.aggregate(
            total_plays=Count('id'),
            total_revenue_generated=Sum('royalty_amount') or Decimal('0'),
            avg_confidence=Avg('avg_confidence_score') or Decimal('0'),
            unique_tracks=Count('track', distinct=True),
            unique_artists=Count('track__artist', distinct=True)
        )
        
        # Detection accuracy metrics
        detection_metrics = detections.aggregate(
            total_detections=Count('id'),
            high_confidence_detections=Count('id', filter=Q(confidence_score__gte=0.8)),
            avg_detection_confidence=Avg('confidence_score') or Decimal('0'),
            local_detections=Count('id', filter=Q(detection_source='local')),
            acrcloud_detections=Count('id', filter=Q(detection_source='acrcloud'))
        )
        
        # Calculate detection accuracy rate
        detection_accuracy = 0
        if detection_metrics['total_detections'] > 0:
            detection_accuracy = (detection_metrics['high_confidence_detections'] / 
                                detection_metrics['total_detections']) * 100
        
        # Top played tracks
        top_tracks = play_logs.values(
            'track__title', 'track__artist__stage_name', 'track__track_id'
        ).annotate(
            play_count=Count('id'),
            avg_confidence=Avg('avg_confidence_score') or Decimal('0')
        ).order_by('-play_count')[:15]
        
        # Hourly distribution (to see peak hours)
        hourly_distribution = []
        for hour in range(24):
            hour_plays = play_logs.filter(
                played_at__hour=hour
            ).count()
            hourly_distribution.append({
                'hour': hour,
                'plays': hour_plays
            })
        
        # Daily compliance (submission vs detection)
        daily_compliance = []
        current_date = start_date.date()
        while current_date <= end_date.date():
            day_start = timezone.make_aware(datetime.combine(current_date, datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            
            day_plays = play_logs.filter(played_at__range=(day_start, day_end)).count()
            day_detections = detections.filter(detected_at__range=(day_start, day_end)).count()
            
            compliance_rate = 0
            if day_detections > 0:
                compliance_rate = (day_plays / day_detections) * 100
            
            daily_compliance.append({
                'date': current_date.isoformat(),
                'submitted_plays': day_plays,
                'detected_plays': day_detections,
                'compliance_rate': min(compliance_rate, 100)  # Cap at 100%
            })
            
            current_date += timedelta(days=1)
        
        # Detection source breakdown
        detection_source_breakdown = {
            'local': detection_metrics['local_detections'],
            'acrcloud': detection_metrics['acrcloud_detections'],
            'total': detection_metrics['total_detections']
        }
        
        analytics_data = {
            'station_info': {
                'station_id': station_id,
                'name': station.name,
                'station_class': station.station_class,
                'station_type': station.station_type,
                'region': station.region,
                'city': station.city
            },
            'summary': {
                'total_plays': basic_metrics['total_plays'],
                'total_revenue_generated': float(basic_metrics['total_revenue_generated']),
                'avg_confidence_score': float(basic_metrics['avg_confidence']),
                'unique_tracks': basic_metrics['unique_tracks'],
                'unique_artists': basic_metrics['unique_artists'],
                'detection_accuracy_rate': round(detection_accuracy, 2)
            },
            'detection_metrics': {
                'total_detections': detection_metrics['total_detections'],
                'high_confidence_detections': detection_metrics['high_confidence_detections'],
                'avg_detection_confidence': float(detection_metrics['avg_detection_confidence']),
                'detection_source_breakdown': detection_source_breakdown
            },
            'top_tracks': list(top_tracks),
            'hourly_distribution': hourly_distribution,
            'daily_compliance': daily_compliance,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': timezone.now().isoformat()
        }
        
        # Cache the results
        self.set_cached_data(cache_key, analytics_data, timeout=1800)
        
        return analytics_data
    
    def get_admin_analytics(self, date_range: Tuple[datetime, datetime]) -> Dict:
        """Get platform-wide analytics for administrators"""
        start_date, end_date = date_range
        cache_key = self.generate_cache_key(
            'admin_analytics',
            start=start_date.date(),
            end=end_date.date()
        )
        
        # Try cache first
        cached_data = self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Platform-wide metrics
        platform_metrics = {
            'total_users': User.objects.filter(is_active=True).count(),
            'total_artists': Artist.objects.filter(active=True).count(),
            'total_stations': Station.objects.filter(active=True).count(),
            'total_publishers': PublisherProfile.objects.filter(active=True).count(),
            'total_tracks': Track.objects.filter(active=True).count()
        }
        
        # Play and revenue metrics for date range
        play_metrics = PlayLog.objects.filter(
            played_at__range=(start_date, end_date),
            active=True
        ).aggregate(
            total_plays=Count('id'),
            total_revenue=Sum('royalty_amount'),
            unique_tracks=Count('track', distinct=True),
            unique_stations=Count('station', distinct=True)
        )

        # Detection metrics
        detection_metrics = AudioDetection.objects.filter(
            detected_at__range=(start_date, end_date)
        ).aggregate(
            total_detections=Count('id'),
            successful_detections=Count('id', filter=Q(processing_status='completed')),
            failed_detections=Count('id', filter=Q(processing_status='failed')),
            avg_confidence=Avg('confidence_score')
        )
        
        # System health indicators
        processing_success_rate = 0
        if detection_metrics['total_detections'] > 0:
            processing_success_rate = (
                detection_metrics['successful_detections'] /
                detection_metrics['total_detections']
            ) * 100

        royalty_distributions = RoyaltyDistribution.objects.filter(
            calculated_at__range=(start_date, end_date)
        )

        total_royalties = royalty_distributions.aggregate(
            total=Sum('net_amount')
        )['total']

        pending_payments_amount = royalty_distributions.filter(
            status__in=['pending', 'approved', 'withheld']
        ).aggregate(total=Sum('net_amount'))['total']

        # Growth calculations
        current_month_start = start_date.replace(day=1)
        previous_month_start = self._shift_month(current_month_start, -1)
        previous_month_end = current_month_start

        current_month_artists = Artist.objects.filter(
            created_at__gte=current_month_start,
            created_at__lt=self._shift_month(current_month_start, 1)
        ).count()

        previous_month_artists = Artist.objects.filter(
            created_at__gte=previous_month_start,
            created_at__lt=previous_month_end
        ).count()

        monthly_growth = self._calculate_percentage_change(
            current_month_artists,
            previous_month_artists
        )

        pending_disputes = Dispute.objects.filter(
            dispute_status__in=['Pending', 'Flagged', 'Review', 'Resolving']
        ).count()

        active_distributors = PartnerPRO.objects.filter(is_active=True).count()

        # Recent activity feed
        recent_activity = self._build_recent_activity_feed(start_date, end_date)

        # Top earner summary
        top_earners = self._collect_top_earners(start_date, end_date)

        revenue_trends = self._build_revenue_trends(end_date)

        genre_distribution = self._build_genre_distribution(start_date, end_date)

        publisher_stats, publisher_performance = self._collect_publisher_insights(
            start_date,
            end_date
        )
        
        # Top performing regions
        regional_performance = PlayLog.objects.filter(
            played_at__range=(start_date, end_date),
            active=True
        ).values(
            'station__region'
        ).annotate(
            plays=Count('id'),
            revenue=Sum('royalty_amount') or Decimal('0'),
            unique_stations=Count('station', distinct=True)
        ).order_by('-plays')[:10]
        
        # Revenue distribution by user type
        revenue_by_type = RoyaltyDistribution.objects.filter(
            calculated_at__range=(start_date, end_date),
            status='paid'
        ).values(
            'recipient_type'
        ).annotate(
            total_amount=Sum('net_amount'),
            count=Count('id')
        )

        total_revenue_value = self._coerce_decimal(play_metrics.get('total_revenue'))
        avg_confidence_value = self._coerce_decimal(detection_metrics.get('avg_confidence'))
        total_royalties_value = self._coerce_decimal(total_royalties)
        pending_payments_value = self._coerce_decimal(pending_payments_amount)

        revenue_distribution = [
            {
                'recipient_type': entry['recipient_type'],
                'total_amount': float(self._coerce_decimal(entry.get('total_amount'))),
                'count': entry['count'],
            }
            for entry in revenue_by_type
        ]
        
        # Daily system activity
        daily_activity = []
        current_date = start_date.date()
        while current_date <= end_date.date():
            day_start = timezone.make_aware(datetime.combine(current_date, datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            
            day_metrics = {
                'date': current_date.isoformat(),
                'plays': PlayLog.objects.filter(
                    played_at__range=(day_start, day_end), active=True
                ).count(),
                'detections': AudioDetection.objects.filter(
                    detected_at__range=(day_start, day_end)
                ).count(),
                'new_users': User.objects.filter(
                    timestamp__range=(day_start, day_end)
                ).count(),
                'new_tracks': Track.objects.filter(
                    created_at__range=(day_start, day_end), active=True
                ).count()
            }
            
            daily_activity.append(day_metrics)
            current_date += timedelta(days=1)
        
        analytics_data = {
            'platform_overview': platform_metrics,
            'period_summary': {
                'total_plays': play_metrics['total_plays'],
                'total_revenue': float(total_revenue_value),
                'unique_tracks_played': play_metrics['unique_tracks'],
                'active_stations': play_metrics['unique_stations'],
                'processing_success_rate': round(processing_success_rate, 2)
            },
            'detection_health': {
                'total_detections': detection_metrics['total_detections'],
                'successful_detections': detection_metrics['successful_detections'],
                'failed_detections': detection_metrics['failed_detections'],
                'avg_confidence_score': float(avg_confidence_value)
            },
            'regional_performance': list(regional_performance),
            'revenue_distribution': revenue_distribution,
            'daily_activity': daily_activity,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': timezone.now().isoformat(),
            'platformStats': {
                'totalStations': platform_metrics['total_stations'],
                'totalArtists': platform_metrics['total_artists'],
                'totalSongs': platform_metrics['total_tracks'],
                'totalPlays': play_metrics['total_plays'],
                'totalRoyalties': float(total_royalties_value),
                'pendingPayments': float(pending_payments_value),
                'activeDistributors': active_distributors,
                'monthlyGrowth': monthly_growth,
                'systemHealth': round(processing_success_rate, 2),
                'pendingDisputes': pending_disputes
            },
            'recentActivity': recent_activity,
            'topEarners': top_earners,
            'revenueTrends': revenue_trends,
            'genreDistribution': genre_distribution,
            'publisherStats': publisher_stats,
            'publisherPerformance': publisher_performance
        }

        # Cache the results
        self.set_cached_data(cache_key, analytics_data, timeout=900)  # 15 minutes

        return analytics_data
    
    def update_realtime_metric(self, metric_name: str, value: Decimal, **dimensions):
        """Update a real-time metric"""
        metadata = self._sanitize_metadata(dimensions.get('metadata', {}))

        RealtimeMetric.objects.create(
            metric_name=metric_name,
            value=value,
            station_id=dimensions.get('station_id'),
            artist_id=dimensions.get('artist_id'),
            metadata=metadata
        )
        
        # Also update Redis for immediate access
        redis_key = f"{self.cache_prefix}realtime:{metric_name}"
        if dimensions.get('station_id'):
            redis_key += f":station:{dimensions['station_id']}"
        if dimensions.get('artist_id'):
            redis_key += f":artist:{dimensions['artist_id']}"
        
        metric_data = {
            'value': float(value),
            'timestamp': timezone.now().isoformat(),
            'metadata': metadata
        }
        
        self.set_cached_data(redis_key, metric_data, timeout=300)  # 5 minutes
    
    def get_realtime_metrics(self, metric_names: List[str], **filters) -> Dict:
        """Get current real-time metrics"""
        metrics = {}
        
        for metric_name in metric_names:
            redis_key = f"{self.cache_prefix}realtime:{metric_name}"
            if filters.get('station_id'):
                redis_key += f":station:{filters['station_id']}"
            if filters.get('artist_id'):
                redis_key += f":artist:{filters['artist_id']}"
            
            cached_metric = self.get_cached_data(redis_key)
            if cached_metric:
                metrics[metric_name] = cached_metric
            else:
                # Fallback to database
                latest_metric = RealtimeMetric.objects.filter(
                    metric_name=metric_name,
                    **{k: v for k, v in filters.items() if v is not None}
                ).order_by('-timestamp').first()
                
                if latest_metric:
                    metrics[metric_name] = {
                        'value': float(latest_metric.value),
                        'timestamp': latest_metric.timestamp.isoformat(),
                        'metadata': latest_metric.metadata
                    }
        
        return metrics
    
    def _calculate_trend(self, current_value: float, previous_value: float) -> Dict:
        """Calculate trend percentage and direction"""
        if previous_value == 0:
            if current_value > 0:
                return {'percentage': 100, 'direction': 'up', 'status': 'positive'}
            else:
                return {'percentage': 0, 'direction': 'neutral', 'status': 'neutral'}

        percentage_change = ((current_value - previous_value) / previous_value) * 100

        return {
            'percentage': round(abs(percentage_change), 2),
            'direction': 'up' if percentage_change > 0 else 'down' if percentage_change < 0 else 'neutral',
            'status': 'positive' if percentage_change > 0 else 'negative' if percentage_change < 0 else 'neutral'
        }

    def _calculate_percentage_change(self, current: float, previous: float) -> float:
        """Return rounded percentage change between periods"""
        if previous in (0, 0.0):
            return 100.0 if current > 0 else 0.0

        change = ((current - previous) / previous) * 100
        return round(change, 2)

    def _shift_month(self, reference: datetime, months: int) -> datetime:
        """Shift a datetime object by a number of months, preserving timezone"""
        month_index = reference.month - 1 + months
        year = reference.year + month_index // 12
        month = month_index % 12 + 1
        return reference.replace(year=year, month=month)

    def _format_relative_time(self, timestamp: Optional[datetime]) -> str:
        if not timestamp:
            return 'just now'

        if timezone.is_naive(timestamp):
            timestamp = timezone.make_aware(timestamp)

        delta = timesince(timestamp, timezone.now())
        return 'just now' if not delta else f"{delta} ago"

    def _get_user_display_name(self, user_id: int) -> str:
        try:
            user = User.objects.get(id=user_id)
            return user.get_full_name() or user.email or f"User {user_id}"
        except User.DoesNotExist:
            return f"User {user_id}"

    def _get_artist_display_name(self, user_id: int) -> Optional[str]:
        artist = Artist.objects.filter(user_id=user_id).order_by('-created_at').first()
        return artist.stage_name if artist else None

    def _get_publisher_display_name(self, user_id: int) -> Optional[str]:
        publisher = PublisherProfile.objects.filter(user_id=user_id).order_by('-created_at').first()
        if publisher:
            return publisher.company_name or publisher.primary_contact_name
        return None

    def _build_recent_activity_feed(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        events: List[Dict[str, Any]] = []
        now = timezone.now()

        payments = RoyaltyDistribution.objects.filter(
            status='paid'
        ).order_by('-paid_at')[:5]

        for distribution in payments:
            recipient_name = self._get_artist_display_name(distribution.recipient_id) or \
                self._get_publisher_display_name(distribution.recipient_id) or \
                self._get_user_display_name(distribution.recipient_id)
            timestamp = distribution.paid_at or distribution.calculated_at or now
            events.append({
                'id': f"payment-{distribution.distribution_id}",
                'type': 'payment',
                'description': f"Royalty payment processed for {recipient_name}",
                'amount': float(distribution.net_amount),
                'status': 'completed',
                'timestamp': timestamp,
            })

        new_artists = Artist.objects.order_by('-created_at')[:5]
        for artist in new_artists:
            timestamp = artist.created_at or now
            events.append({
                'id': f"artist-{artist.artist_id or artist.id}",
                'type': 'registration',
                'description': f"New artist registered: {artist.stage_name}",
                'status': 'pending' if not artist.profile_completed else 'completed',
                'timestamp': timestamp,
            })

        disputes = Dispute.objects.filter(active=True).order_by('-created_at')[:5]
        for dispute in disputes:
            track_title = getattr(dispute.playlog.track, 'title', 'a track')
            timestamp = dispute.created_at or now
            status = (dispute.dispute_status or 'pending').lower()
            events.append({
                'id': f"dispute-{dispute.id}",
                'type': 'dispute',
                'description': f"Copyright dispute filed for \"{track_title}\"",
                'status': status,
                'timestamp': timestamp,
            })

        stations = Station.objects.order_by('-updated_at')[:5]
        for station in stations:
            timestamp = station.updated_at or now
            status = 'completed' if station.verification_status == 'verified' else station.verification_status or 'pending'
            events.append({
                'id': f"station-{station.station_id or station.id}",
                'type': 'station',
                'description': f"{station.name} updated station profile",
                'status': status.lower(),
                'timestamp': timestamp,
            })

        events.sort(key=lambda item: item['timestamp'] or now, reverse=True)

        formatted_events = []
        for event in events[:10]:
            timestamp = event.pop('timestamp', now)
            formatted_events.append({
                **event,
                'time': self._format_relative_time(timestamp),
                'timestamp': timestamp.isoformat(),
            })

        return formatted_events

    def _collect_top_earners(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        distributions = RoyaltyDistribution.objects.filter(
            recipient_type='artist',
            calculated_at__range=(start_date, end_date)
        )

        aggregated = distributions.values('recipient').annotate(
            total_earnings=Sum('net_amount') or Decimal('0')
        ).order_by('-total_earnings')[:5]

        recipient_ids = [entry['recipient'] for entry in aggregated]
        artist_map = {
            artist.user_id: artist for artist in Artist.objects.filter(user_id__in=recipient_ids)
        }
        user_map = {
            user.id: user for user in User.objects.filter(id__in=recipient_ids)
        }

        period_length = end_date - start_date
        previous_start = start_date - period_length
        previous_totals = RoyaltyDistribution.objects.filter(
            recipient_type='artist',
            calculated_at__range=(previous_start, start_date)
        ).values('recipient').annotate(total=Sum('net_amount'))
        previous_map = {item['recipient']: item['total'] or Decimal('0') for item in previous_totals}

        results = []
        for entry in aggregated:
            recipient_id = entry['recipient']
            artist = artist_map.get(recipient_id)
            user = user_map.get(recipient_id)
            name = artist.stage_name if artist else (user.get_full_name() if user else None) or (user.email if user else self._get_user_display_name(recipient_id))

            total_earnings = float(entry['total_earnings'] or Decimal('0'))
            previous_total = float(previous_map.get(recipient_id, Decimal('0')))
            growth = self._calculate_percentage_change(total_earnings, previous_total)

            plays = PlayLog.objects.filter(
                track__artist__user_id=recipient_id,
                played_at__range=(start_date, end_date),
                active=True
            ).count()

            results.append({
                'name': name,
                'totalEarnings': total_earnings,
                'plays': plays,
                'growth': growth
            })

        return results

    def _build_revenue_trends(self, end_date: datetime) -> List[Dict[str, Any]]:
        end_date = end_date if not timezone.is_naive(end_date) else timezone.make_aware(end_date)
        month_anchor = end_date.replace(day=1)
        trends: List[Dict[str, Any]] = []

        for offset in range(-5, 1):
            month_start = self._shift_month(month_anchor, offset)
            next_month_start = self._shift_month(month_anchor, offset + 1)

            month_distributions = RoyaltyDistribution.objects.filter(
                calculated_at__gte=month_start,
                calculated_at__lt=next_month_start
            )

            revenue = month_distributions.aggregate(total=Sum('net_amount'))['total'] or Decimal('0')
            artist_count = month_distributions.filter(recipient_type='artist').values('recipient').distinct().count()
            station_count = PlayLog.objects.filter(
                royalty_distributions__calculated_at__gte=month_start,
                royalty_distributions__calculated_at__lt=next_month_start
            ).values('station').distinct().count()

            trends.append({
                'month': month_start.strftime('%b'),
                'revenue': float(revenue),
                'artists': artist_count,
                'stations': station_count
            })

        return trends

    def _build_genre_distribution(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        genre_counts = PlayLog.objects.filter(
            played_at__range=(start_date, end_date),
            track__genre__name__isnull=False,
            active=True
        ).values('track__genre__name').annotate(
            value=Count('id')
        ).order_by('-value')[:6]

        palette = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1']
        distribution = []
        for idx, entry in enumerate(genre_counts):
            distribution.append({
                'name': entry['track__genre__name'],
                'value': entry['value'],
                'color': palette[idx % len(palette)]
            })

        return distribution

    def _collect_publisher_insights(self, start_date: datetime, end_date: datetime) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        total_publishers = PublisherProfile.objects.filter(is_archived=False).count()
        active_agreements = PublishingAgreement.objects.filter(status='accepted').count()
        international_partners = PartnerPRO.objects.filter(
            is_active=True,
            pro_type__in=['international', 'reciprocal']
        ).count()

        agreements_expiring = ReciprocalAgreement.objects.filter(
            expiry_date__isnull=False,
            expiry_date__lte=(end_date + timedelta(days=30)).date()
        ).count()

        catalogs_under_review = Track.objects.filter(status='Pending').count()

        pending_publisher_payments = RoyaltyDistribution.objects.filter(
            recipient_type='publisher',
            status__in=['pending', 'approved', 'withheld']
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0')

        publisher_payouts = RoyaltyDistribution.objects.filter(
            recipient_type='publisher',
            status='paid',
            paid_at__isnull=False,
            calculated_at__isnull=False
        )

        payout_durations = [
            (item.paid_at - item.calculated_at).total_seconds()
            for item in publisher_payouts
            if item.paid_at and item.calculated_at and item.paid_at >= item.calculated_at
        ]

        payout_velocity = 0.0
        if payout_durations:
            payout_velocity = round((sum(payout_durations) / len(payout_durations)) / 86400, 2)

        publisher_profiles = PublisherProfile.objects.annotate(
            total_royalties=Coalesce(
                Sum(
                    'user__received_royalties__net_amount',
                    filter=Q(
                        user__received_royalties__recipient_type='publisher',
                        user__received_royalties__calculated_at__range=(start_date, end_date)
                    ),
                    output_field=models.DecimalField(max_digits=12, decimal_places=4)
                ),
                Decimal('0')
            ),
            agreement_count=Count(
                'publishingagreement',
                filter=Q(publishingagreement__status='accepted'),
                distinct=True
            )
        ).order_by('-total_royalties')[:4]

        performance = []
        for publisher in publisher_profiles:
            status = 'Active' if publisher.verified or publisher.active else 'Renewing' if publisher.revenue_split_completed else 'Watchlist'
            performance.append({
                'name': publisher.company_name or self._get_user_display_name(publisher.user_id),
                'territory': publisher.region or publisher.country or 'Ghana',
                'totalRoyalties': float(publisher.total_royalties or Decimal('0')),
                'activeAgreements': publisher.agreement_count,
                'status': status
            })

        publisher_stats = {
            'totalPublishers': total_publishers,
            'activeAgreements': active_agreements,
            'pendingPublisherPayments': float(pending_publisher_payments),
            'internationalPartners': international_partners,
            'catalogsUnderReview': catalogs_under_review,
            'agreementsExpiring': agreements_expiring,
            'payoutVelocity': payout_velocity
        }

        return publisher_stats, performance

    def _stringify_non_json(self, value: Any) -> Any:
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)

    def _sanitize_metadata(self, metadata: Any) -> Dict[str, Any]:
        if metadata is None:
            return {}
        if isinstance(metadata, dict):
            sanitized: Dict[str, Any] = {}
            for key, value in metadata.items():
                if isinstance(value, dict):
                    sanitized[key] = self._sanitize_metadata(value)
                elif isinstance(value, (list, tuple)):
                    sanitized[key] = [
                        self._sanitize_metadata(item) if isinstance(item, dict) else self._stringify_non_json(item)
                        for item in value
                    ]
                else:
                    sanitized[key] = self._stringify_non_json(value)
            return sanitized
        if isinstance(metadata, (list, tuple)):
            return [
                self._sanitize_metadata(item) if isinstance(item, dict) else self._stringify_non_json(item)
                for item in metadata
            ]
        return {}

    def create_analytics_snapshot(self, snapshot_type: str, metric_type: str,
                                period_start: datetime, period_end: datetime,
                                **dimensions):
        """Create time-series snapshots for efficient historical queries"""
        # This would be called by a scheduled task to pre-aggregate data
        pass
    
    def cleanup_expired_cache(self):
        """Clean up expired cache entries"""
        try:
            # Clean up Redis cache
            expired_keys = []
            for key in self.redis_client.scan_iter(match=f"{self.cache_prefix}*"):
                ttl = self.redis_client.ttl(key)
                if ttl == -1:  # No expiration set
                    continue
                if ttl <= 0:  # Expired
                    expired_keys.append(key)
            
            if expired_keys:
                self.redis_client.delete(*expired_keys)
            
            # Clean up database cache entries
            AnalyticsCache.objects.filter(expires_at__lt=timezone.now()).delete()
            
        except redis.RedisError:
            pass


# Singleton instance
analytics_aggregator = AnalyticsAggregator()
