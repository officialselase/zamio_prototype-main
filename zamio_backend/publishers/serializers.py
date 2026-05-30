from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from artists.models import Track
from music_monitor.models import Dispute, MatchCache, PlayLog, StreamLog
from .models import (
    PublisherProfile,
    PublishingAgreement,
    PublisherAccountSettings,
    PublisherArtistRelationship,
)


def _mask_account_identifier(value: str | None) -> str | None:
    if not value:
        return None
    value_str = str(value)
    if len(value_str) <= 4:
        return value_str
    return f"{'*' * (len(value_str) - 4)}{value_str[-4:]}"


class PublisherAccountSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublisherAccountSettings
        fields = [
            'email_notifications',
            'royalty_alerts',
            'weekly_reports',
            'two_factor_auth',
            'preferred_language',
            'timezone',
            'currency',
        ]

    def to_representation(self, instance):
        base = super().to_representation(instance)
        return {
            'emailNotifications': base['email_notifications'],
            'royaltyAlerts': base['royalty_alerts'],
            'weeklyReports': base['weekly_reports'],
            'twoFactorAuth': base['two_factor_auth'],
            'language': base['preferred_language'],
            'timezone': base['timezone'],
            'currency': base['currency'],
        }


class PublisherProfileDetailSerializer(serializers.Serializer):
    def to_representation(self, publisher: PublisherProfile):
        user = publisher.user
        settings, _ = PublisherAccountSettings.objects.get_or_create(publisher=publisher)

        publisher_payload = {
            'publisherId': str(publisher.publisher_id),
            'companyName': publisher.company_name or '',
            'companyType': publisher.company_type or '',
            'industry': publisher.industry or '',
            'foundedYear': publisher.founded_year,
            'employeeCount': publisher.employee_count,
            'country': publisher.country or '',
            'region': publisher.region or '',
            'city': publisher.city or '',
            'address': publisher.address or '',
            'postalCode': publisher.postal_code or '',
            'businessRegistration': publisher.business_registration_number or '',
            'taxId': publisher.tax_id or '',
            'licenseNumber': publisher.license_number or '',
            'primaryContact': publisher.primary_contact_name or '',
            'contactEmail': publisher.primary_contact_email or '',
            'contactPhone': publisher.primary_contact_phone or '',
            'website': publisher.website_url or '',
            'complianceOfficer': publisher.compliance_officer_name or '',
            'officerEmail': publisher.compliance_officer_email or '',
            'officerPhone': publisher.compliance_officer_phone or '',
            'officerTitle': publisher.compliance_officer_title or '',
            'description': publisher.description or '',
            'logoUrl': user.photo.url if getattr(user, 'photo', None) else None,
        }

        revenue_splits = []
        country = publisher.country or 'Ghana'
        if publisher.writer_split is not None or publisher.publisher_split is not None:
            revenue_splits.append({
                'id': 'default',
                'name': 'Default Publishing Split',
                'writerPercentage': float(publisher.writer_split or 0),
                'publisherPercentage': float(publisher.publisher_split or 0),
                'territory': country,
                'type': 'performance',
                'isActive': True,
            })
        for key, label in [
            ('performance_share', 'Performance Rights'),
            ('mechanical_share', 'Mechanical Rights'),
            ('sync_share', 'Sync Licensing'),
        ]:
            share_value = getattr(publisher, key, None)
            if share_value is None:
                continue
            revenue_splits.append({
                'id': key,
                'name': label,
                'writerPercentage': max(0.0, 100.0 - float(share_value)),
                'publisherPercentage': float(share_value),
                'territory': country,
                'type': key.split('_')[0],
                'isActive': True,
            })

        payment_methods = []
        if publisher.bank_account:
            payment_methods.append({
                'id': f'bank-{publisher.id}',
                'type': 'bank',
                'accountName': publisher.bank_account_name or publisher.company_name or '',
                'accountNumber': _mask_account_identifier(publisher.bank_account),
                'bankName': publisher.bank_name or '',
                'routingNumber': publisher.bank_branch_code or '',
                'isDefault': publisher.preferred_payment_method == 'bank',
                'isVerified': bool(publisher.bank_account),
            })
        if publisher.momo_account:
            payment_methods.append({
                'id': f'momo-{publisher.id}',
                'type': 'mobile_money',
                'accountName': publisher.momo_account_name or publisher.company_name or '',
                'accountNumber': _mask_account_identifier(publisher.momo_account),
                'mobileProvider': publisher.momo_provider or '',
                'isDefault': publisher.preferred_payment_method == 'momo',
                'isVerified': bool(publisher.momo_account),
            })

        linked_artists = []
        relationships = publisher.artist_relationships.select_related('artist__user')
        relationship_label_map = dict(PublisherArtistRelationship.RELATIONSHIP_TYPES)
        for relationship in relationships:
            artist = relationship.artist
            artist_user = getattr(artist, 'user', None)
            legal_name = None
            if artist_user:
                names = [artist_user.first_name or '', artist_user.last_name or '']
                legal_name = ' '.join(part for part in names if part).strip() or None
            linked_artists.append({
                'id': str(relationship.id),
                'name': artist.stage_name or legal_name or 'Unknown Artist',
                'status': relationship.status,
                'contractType': relationship_label_map.get(relationship.relationship_type, relationship.relationship_type),
                'linkedDate': (relationship.start_date.isoformat()
                               if relationship.start_date
                               else relationship.created_at.isoformat()),
                'catalogSize': artist.track_set.count() if hasattr(artist, 'track_set') else 0,
                'lastRoyalty': 0,
            })

        return {
            'publisher': publisher_payload,
            'revenueSplits': revenue_splits,
            'paymentMethods': payment_methods,
            'linkedArtists': linked_artists,
            'accountSettings': PublisherAccountSettingsSerializer(settings).data,
        }

 
User = get_user_model()




class AllPublishersSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    registered_on = serializers.SerializerMethodField()


    class Meta:
        model = PublisherProfile
        fields = ["publisher_id", "stage_name","total_earnings", "photo", "registered_on"]

    def get_photo(self, obj):
        return obj.user.photo.url if obj.user else None

    def get_registered_on(self, obj):
        return obj.user.timestamp if obj.user else None


class PublisherListSerializer(serializers.ModelSerializer):
    """Serializer for listing publishers in admin panel"""
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = PublisherProfile
        fields = [
            'publisher_id', 'company_name', 'company_type', 'industry',
            'country', 'region', 'city', 'verified', 'active', 'created_at',
            'primary_contact_email', 'primary_contact_phone', 'website_url', 'user'
        ]
    
    def get_user(self, obj):
        if obj.user:
            return {
                'email': obj.user.email,
                'first_name': obj.user.first_name or '',
                'last_name': obj.user.last_name or '',
            }
        return None


class PublisherDetailsSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = PublisherProfile
        fields = "__all__"
    
    def get_user(self, obj):
        if obj.user:
            return {
                'email': obj.user.email,
                'first_name': obj.user.first_name or '',
                'last_name': obj.user.last_name or '',
                'photo': obj.user.photo.url if hasattr(obj.user, 'photo') and obj.user.photo else None,
            }
        return None



class PublisherPlayLogSerializer(serializers.ModelSerializer):
    track_title = serializers.CharField(source='track.title', read_only=True)
    artist = serializers.SerializerMethodField()
    publisher_catalog_id = serializers.SerializerMethodField()
    station_name = serializers.CharField(source='station.name', read_only=True)
    station_region = serializers.SerializerMethodField()
    matched_at = serializers.SerializerMethodField()
    stop_time = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    plays = serializers.SerializerMethodField()
    royalty_amount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    license_type = serializers.SerializerMethodField()
    territory = serializers.SerializerMethodField()

    class Meta:
        model = PlayLog
        fields = [
            'id',
            'track_title',
            'artist',
            'publisher_catalog_id',
            'station_name',
            'station_region',
            'matched_at',
            'stop_time',
            'duration',
            'plays',
            'royalty_amount',
            'status',
            'license_type',
            'territory',
        ]

    def _format_datetime(self, value):
        if not value:
            return None
        try:
            if timezone.is_naive(value):
                value = timezone.make_aware(value, timezone.get_default_timezone())
            return value.isoformat()
        except Exception:
            try:
                return value.isoformat()
            except Exception:
                return None

    def _format_duration(self, value):
        if not value:
            return None
        if isinstance(value, timedelta):
            total_seconds = int(value.total_seconds())
        else:
            try:
                total_seconds = int(float(value))
            except (TypeError, ValueError):
                return None
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours:02}:{minutes:02}:{seconds:02}"

    def get_artist(self, obj):
        artist = getattr(obj.track, 'artist', None)
        if not artist:
            return None
        if getattr(artist, 'stage_name', None):
            return artist.stage_name
        user = getattr(artist, 'user', None)
        if user and (user.first_name or user.last_name):
            return f"{user.first_name or ''} {user.last_name or ''}".strip()
        if user and user.username:
            return user.username
        if user and user.email:
            return user.email
        return None

    def get_publisher_catalog_id(self, obj):
        track = getattr(obj, 'track', None)
        if not track:
            return None
        if getattr(track, 'track_id', None):
            return track.track_id
        if getattr(track, 'isrc_code', None):
            return track.isrc_code
        return f"TRK-{track.id}" if getattr(track, 'id', None) else None

    def get_station_region(self, obj):
        station = getattr(obj, 'station', None)
        if not station:
            return None
        if getattr(station, 'region', None):
            return station.region
        return getattr(station, 'country', None)

    def get_matched_at(self, obj):
        return self._format_datetime(
            obj.played_at or obj.start_time or obj.created_at
        )

    def get_stop_time(self, obj):
        return self._format_datetime(obj.stop_time)

    def get_duration(self, obj):
        return self._format_duration(obj.duration)

    def get_plays(self, obj):
        plays = getattr(obj, 'track_total_plays', None)
        if plays is None:
            return 0
        try:
            return int(plays)
        except (TypeError, ValueError):
            return 0

    def get_royalty_amount(self, obj):
        if obj.royalty_amount is None:
            return 0.0
        try:
            return float(obj.royalty_amount)
        except (TypeError, ValueError):
            return 0.0

    def get_status(self, obj):
        """
        Unified status logic based on verification_status field.
        Returns user-friendly status labels.
        """
        try:
            # Check for disputes first
            if obj.flagged or obj.verification_status == 'disputed':
                return 'Disputed'
            
            # Check for open disputes
            open_dispute = Dispute.objects.filter(
                playlog=obj,
                is_archived=False,
            ).exclude(dispute_status__iexact='resolved').exists()
            if open_dispute:
                return 'Pending'
            
            # Check verification status
            if obj.verification_status == 'rejected':
                return 'Rejected'
            
            if obj.verification_status == 'verified':
                return 'Confirmed'
            
            # Pending review
            return 'Pending'
        except Exception:
            return 'Pending'

    def get_license_type(self, obj):
        source = (obj.source or '').lower()
        if source == 'streaming':
            return 'Mechanical'
        if source == 'radio':
            return 'Performance'
        return 'Performance'

    def get_territory(self, obj):
        station = getattr(obj, 'station', None)
        if station and getattr(station, 'country', None):
            return station.country
        return 'Ghana'


class PublisherMatchCacheSerializer(serializers.ModelSerializer):
    song = serializers.CharField(source='track.title', read_only=True)
    artist = serializers.SerializerMethodField()
    publisher_catalog_id = serializers.SerializerMethodField()
    station = serializers.CharField(source='station.name', read_only=True)
    station_region = serializers.SerializerMethodField()
    matched_at = serializers.SerializerMethodField()
    confidence = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    license_status = serializers.SerializerMethodField()

    class Meta:
        model = MatchCache
        fields = [
            'id',
            'song',
            'artist',
            'publisher_catalog_id',
            'station',
            'station_region',
            'matched_at',
            'confidence',
            'status',
            'license_status',
        ]

    def _format_datetime(self, value):
        if not value:
            return None
        try:
            if timezone.is_naive(value):
                value = timezone.make_aware(value, timezone.get_default_timezone())
            return value.isoformat()
        except Exception:
            try:
                return value.isoformat()
            except Exception:
                return None

    def get_artist(self, obj):
        artist = getattr(obj.track, 'artist', None)
        if not artist:
            return None
        if getattr(artist, 'stage_name', None):
            return artist.stage_name
        user = getattr(artist, 'user', None)
        if user and (user.first_name or user.last_name):
            return f"{user.first_name or ''} {user.last_name or ''}".strip()
        if user and user.username:
            return user.username
        if user and user.email:
            return user.email
        return None

    def get_publisher_catalog_id(self, obj):
        track = getattr(obj, 'track', None)
        if not track:
            return None
        if getattr(track, 'track_id', None):
            return track.track_id
        if getattr(track, 'isrc_code', None):
            return track.isrc_code
        return f"TRK-{track.id}" if getattr(track, 'id', None) else None

    def get_station_region(self, obj):
        station = getattr(obj, 'station', None)
        if not station:
            return None
        if getattr(station, 'region', None):
            return station.region
        return getattr(station, 'country', None)

    def get_matched_at(self, obj):
        return self._format_datetime(obj.matched_at)

    def get_confidence(self, obj):
        if obj.avg_confidence_score is None:
            return None
        try:
            value = float(obj.avg_confidence_score)
        except (TypeError, ValueError):
            return None
        if value <= 1:
            return round(value * 100, 2)
        return round(value, 2)

    def get_status(self, obj):
        if getattr(obj, 'failed_reason', None):
            return 'Disputed'
        if getattr(obj, 'processed', False):
            return 'Verified'
        return 'Pending'

    def get_license_status(self, obj):
        agreement_exists = PublishingAgreement.objects.filter(
            track=obj.track,
            status__in=['accepted'],
            is_archived=False,
        ).exists()
        return 'Active' if agreement_exists else 'Pending'
    






class PublisherCatalogTrackSerializer(serializers.ModelSerializer):
    artist = serializers.SerializerMethodField()
    artistId = serializers.SerializerMethodField()
    album = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    releaseDate = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    genre = serializers.SerializerMethodField()
    streams = serializers.SerializerMethodField()
    downloads = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()
    platforms = serializers.SerializerMethodField()
    composer = serializers.SerializerMethodField()
    producer = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()
    coverArt = serializers.SerializerMethodField()
    audioUrl = serializers.SerializerMethodField()
    bpm = serializers.SerializerMethodField()
    key = serializers.SerializerMethodField()
    mood = serializers.SerializerMethodField()
    language = serializers.SerializerMethodField()
    explicit = serializers.SerializerMethodField()
    featured = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    collaborators = serializers.SerializerMethodField()
    lastUpdated = serializers.SerializerMethodField()
    performance = serializers.SerializerMethodField()
    publisherCatalogId = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = [
            'id',
            'title',
            'artist',
            'artistId',
            'album',
            'duration',
            'releaseDate',
            'status',
            'genre',
            'streams',
            'downloads',
            'revenue',
            'platforms',
            'composer',
            'producer',
            'label',
            'coverArt',
            'audioUrl',
            'bpm',
            'key',
            'mood',
            'language',
            'explicit',
            'featured',
            'tags',
            'collaborators',
            'lastUpdated',
            'performance',
            'publisherCatalogId',
            'isrc_code',
        ]

    def _get_metrics(self, obj):
        metrics = self.context.get('metrics') or {}
        return metrics.get(obj.id, {})

    def _resolve_artist_name(self, artist):
        if not artist:
            return None
        if getattr(artist, 'stage_name', None):
            return artist.stage_name
        user = getattr(artist, 'user', None)
        if user and (user.first_name or user.last_name):
            return f"{user.first_name or ''} {user.last_name or ''}".strip()
        if user and user.username:
            return user.username
        if user and user.email:
            return user.email
        return None

    def _format_duration(self, value):
        if not value:
            return '00:00'
        if isinstance(value, timedelta):
            total_seconds = int(value.total_seconds())
        else:
            try:
                total_seconds = int(float(value))
            except (TypeError, ValueError):
                return '00:00'
        minutes, seconds = divmod(total_seconds, 60)
        hours, minutes = divmod(minutes, 60)
        if hours:
            return f"{hours:02}:{minutes:02}:{seconds:02}"
        return f"{minutes:02}:{seconds:02}"

    def _build_absolute_url(self, file_field):
        if not file_field:
            return None
        try:
            url = file_field.url
        except Exception:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)
        return url

    def _get_contributor_names(self, obj, role_names):
        roles = {role.lower() for role in role_names}
        names = []
        contributors = getattr(obj, 'contributors', None)
        if not contributors:
            return names
        seen = set()
        for contributor in contributors.all():
            role = (contributor.role or '').lower()
            if role not in roles:
                continue
            user = getattr(contributor, 'user', None)
            display_name = None
            if user and (user.first_name or user.last_name):
                display_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
            if not display_name and user and user.username:
                display_name = user.username
            if not display_name and user and user.email:
                display_name = user.email
            if not display_name:
                display_name = getattr(contributor, 'name', None) or role.title()
            if display_name and display_name not in seen:
                seen.add(display_name)
                names.append(display_name)
        return names

    def get_artist(self, obj):
        return self._resolve_artist_name(getattr(obj, 'artist', None))

    def get_artistId(self, obj):
        artist = getattr(obj, 'artist', None)
        if not artist:
            return None
        if getattr(artist, 'artist_id', None):
            return artist.artist_id
        return str(getattr(artist, 'id', '')) or None

    def get_album(self, obj):
        album = getattr(obj, 'album', None)
        if album and getattr(album, 'title', None):
            return album.title
        return 'Single'

    def get_duration(self, obj):
        return self._format_duration(getattr(obj, 'duration', None))

    def get_releaseDate(self, obj):
        release_date = getattr(obj, 'release_date', None)
        if not release_date:
            return None
        try:
            return release_date.isoformat()
        except Exception:
            return str(release_date)

    def get_status(self, obj):
        if getattr(obj, 'is_archived', False):
            return 'archived'
        processing_status = (getattr(obj, 'processing_status', '') or '').lower()
        if processing_status in {'queued', 'processing'}:
            return 'scheduled'
        track_status = (getattr(obj, 'status', '') or '').lower()
        if track_status in {'approved', 'published'} or getattr(obj, 'active', False):
            return 'published'
        if track_status in {'rejected', 'pending'}:
            return 'draft'
        return track_status or 'draft'

    def get_genre(self, obj):
        genre = getattr(obj, 'genre', None)
        if genre and getattr(genre, 'name', None):
            return genre.name
        return 'Uncategorized'

    def get_streams(self, obj):
        metrics = self._get_metrics(obj)
        return int(metrics.get('streams', 0))

    def get_downloads(self, obj):
        metrics = self._get_metrics(obj)
        return int(metrics.get('downloads', 0))

    def get_revenue(self, obj):
        metrics = self._get_metrics(obj)
        revenue = metrics.get('revenue', 0)
        try:
            return float(revenue)
        except (TypeError, ValueError):
            return 0.0

    def get_platforms(self, obj):
        platforms = getattr(obj, 'distribution_platforms', None)
        if isinstance(platforms, (list, tuple)):
            return list(platforms)
        return []

    def get_composer(self, obj):
        composers = self._get_contributor_names(obj, {'composer'})
        return composers[0] if composers else None

    def get_producer(self, obj):
        producers = self._get_contributor_names(obj, {'producer'})
        return producers[0] if producers else None

    def get_label(self, obj):
        publisher = getattr(obj, 'publisher', None)
        if publisher and getattr(publisher, 'company_name', None):
            return publisher.company_name
        artist = getattr(obj, 'artist', None)
        if artist and getattr(artist, 'management_company', None):
            return artist.management_company
        return 'Independent'

    def get_coverArt(self, obj):
        return self._build_absolute_url(getattr(obj, 'cover_art', None))

    def get_audioUrl(self, obj):
        return self._build_absolute_url(getattr(obj, 'audio_file', None))

    def get_bpm(self, obj):
        bpm = getattr(obj, 'bpm', None)
        return int(bpm) if isinstance(bpm, int) else bpm

    def get_key(self, obj):
        return getattr(obj, 'musical_key', None)

    def get_mood(self, obj):
        return getattr(obj, 'mood', None)

    def get_language(self, obj):
        language = getattr(obj, 'language', None)
        return language or 'English'

    def get_explicit(self, obj):
        return bool(getattr(obj, 'explicit', False))

    def get_featured(self, obj):
        return bool(getattr(obj, 'is_featured', False))

    def get_tags(self, obj):
        tags = getattr(obj, 'tags', None)
        if isinstance(tags, (list, tuple)):
            return list(tags)
        return []

    def get_collaborators(self, obj):
        collaborators = []
        stored_collaborators = getattr(obj, 'collaborators', None)
        if isinstance(stored_collaborators, (list, tuple)):
            collaborators.extend(str(item) for item in stored_collaborators)
        featured = self._get_contributor_names(
            obj,
            {'featured artist', 'writer', 'engineer', 'mixer'}
        )
        for name in featured:
            if name not in collaborators:
                collaborators.append(name)
        return collaborators

    def get_lastUpdated(self, obj):
        updated_at = getattr(obj, 'updated_at', None)
        if not updated_at:
            return None
        try:
            if timezone.is_naive(updated_at):
                updated_at = timezone.make_aware(updated_at, timezone.get_default_timezone())
            return updated_at.isoformat()
        except Exception:
            try:
                return updated_at.isoformat()
            except Exception:
                return str(updated_at)

    def get_performance(self, obj):
        metrics = self._get_metrics(obj)
        recent_dates = self.context.get('recent_dates') or []
        daily_counts = metrics.get('daily_counts', {})
        daily_streams = [int(daily_counts.get(date_key, 0)) for date_key in recent_dates]
        return {
            'dailyStreams': daily_streams,
            'topCountries': metrics.get('top_countries', []),
            'peakPosition': metrics.get('rank'),
            'chartPerformance': metrics.get('trend') or 'Stable',
        }

    def get_publisherCatalogId(self, obj):
        if getattr(obj, 'track_id', None):
            return obj.track_id
        if getattr(obj, 'isrc_code', None):
            return obj.isrc_code
        return f"TRK-{obj.id}"

class PublishingAgreementSerializer(serializers.ModelSerializer):
    track_title = serializers.CharField(source='track.title', read_only=True)
    artist_name = serializers.CharField(source='songwriter.stage_name', read_only=True)
    publisher_name = serializers.CharField(source='publisher.user.first_name', read_only=True)

    class Meta:
        model = PublishingAgreement
        fields = [
            'id', 'publisher', 'publisher_name', 'songwriter', 'artist_name', 'track', 'track_title',
            'writer_share', 'publisher_share', 'contract_file', 'verified_by_admin', 'agreement_date',
            'status', 'is_archived', 'active', 'created_at', 'updated_at'
        ]
