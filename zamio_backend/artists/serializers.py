from django.contrib.auth import get_user_model
from rest_framework import serializers

from artists.models import Artist
from music_monitor.models import MatchCache, PlayLog


User = get_user_model()




class AllArtistsSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    registered_on = serializers.SerializerMethodField()


    class Meta:
        model = Artist
        fields = ["artist_id", "stage_name","total_earnings", "photo", "registered_on"]

    def get_photo(self, obj):
        return obj.user.photo.url if obj.user else None

    def get_registered_on(self, obj):
        return obj.user.timestamp if obj.user else None


class ArtistDetailsSerializer(serializers.ModelSerializer):

    class Meta:
        model = Artist
        fields = "__all__"



from rest_framework import serializers
from .models import Genre, Album, Track, Contributor, PlatformAvailability

# Genre Serializer
class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name']

# Album Serializer
class AlbumSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.stage_name', read_only=True)  # Include artist stage name

    class Meta:
        model = Album
        fields = ['id', 'title', 'artist_name']


class AlbumManagementSerializer(serializers.ModelSerializer):
    """Serializer used by the artist album management API."""

    artist = serializers.CharField(source='artist.stage_name', read_only=True)
    artist_id = serializers.CharField(source='artist.artist_id', read_only=True)
    genre = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    raw_status = serializers.CharField(source='status', read_only=True)
    cover_art_url = serializers.SerializerMethodField()
    track_count = serializers.IntegerField(read_only=True)
    total_plays = serializers.IntegerField(read_only=True)
    total_revenue = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )
    release_date = serializers.DateField(format='%Y-%m-%d', allow_null=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Album
        fields = [
            'id',
            'album_id',
            'title',
            'artist',
            'artist_id',
            'genre',
            'release_date',
            'track_count',
            'total_plays',
            'total_revenue',
            'cover_art_url',
            'status',
            'raw_status',
            'is_archived',
            'active',
            'created_at',
            'updated_at',
        ]

    def get_genre(self, obj):
        return obj.genre.name if obj.genre else None

    def get_status(self, obj):
        if obj.is_archived:
            return 'inactive'
        if not obj.active:
            return 'inactive'
        if (obj.status or '').lower() == 'pending':
            return 'draft'
        return 'active'

    def get_cover_art_url(self, obj):
        cover = getattr(obj, 'cover_art', None)
        if not cover:
            return None

        request = self.context.get('request') if isinstance(self.context, dict) else None
        try:
            url = cover.url
        except Exception:
            return None

        if request:
            return request.build_absolute_uri(url)
        return url


# Album Details Serializer for editing
class AlbumDetailsSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.stage_name', read_only=True)
    artist_id = serializers.CharField(source='artist.artist_id', read_only=True)

    class Meta:
        model = Album
        fields = '__all__'

# Track Serializer
class TrackSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.stage_name', read_only=True)  # To include artist name in the response
    album_title = serializers.CharField(source='album.title', read_only=True)  # To include album title in the response
    genre_name = serializers.CharField(source='genre.name', read_only=True)  # To include genre name in the response
    airplays = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = '__all__'

    def get_airplays(self, obj):
        return PlayLog.objects.filter(track=obj).count()

    




class TrackDetailsSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.stage_name', read_only=True)  # To include artist name in the response
    album_title = serializers.CharField(source='album.title', read_only=True)  # To include album title in the response
    genre_name = serializers.CharField(source='genre.name', read_only=True)  # To include genre name in the response

    class Meta:
        model = Track
        fields = '__all__'




# Contributor Serializer
class ContributorSerializer(serializers.ModelSerializer):
    track_title = serializers.CharField(source='track.title', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    publisher_name = serializers.CharField(source='publisher.company_name', read_only=True)
    is_artist = serializers.SerializerMethodField()

    class Meta:
        model = Contributor
        fields = '__all__'
    
    def get_user_name(self, obj):
        """Get formatted user name"""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name or obj.user.username or obj.user.email
        return "Unknown User"
    
    def get_is_artist(self, obj):
        """Check if contributor is the track artist"""
        return obj.user == obj.track.artist.user if obj.track and obj.track.artist else False


# Enhanced Contributor Split Serializer
class ContributorSplitSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    publisher_name = serializers.CharField(source='publisher.company_name', read_only=True)
    is_artist = serializers.SerializerMethodField()

    class Meta:
        model = Contributor
        fields = ['id', 'user_name', 'user_email', 'role', 'percent_split', 'publisher_name', 'is_artist', 'active']
    
    def get_user_name(self, obj):
        """Get formatted user name"""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name or obj.user.username or obj.user.email
        return "Unknown User"
    
    def get_is_artist(self, obj):
        """Check if contributor is the track artist"""
        return obj.user == obj.track.artist.user if obj.track and obj.track.artist else False

# PlatformAvailability Serializer
class PlatformAvailabilitySerializer(serializers.ModelSerializer):
    track_title = serializers.CharField(source='track.title', read_only=True)  # To include track title in the response

    class Meta:
        model = PlatformAvailability
        fields = '__all__'



class BasePlayLogSerializer(serializers.ModelSerializer):
    """
    Base serializer with consistent status logic for all portals.
    Provides common fields and methods for PlayLog serialization.
    """
    track_title = serializers.CharField(source='track.title', read_only=True)
    station_name = serializers.CharField(source='station.name', read_only=True)
    artist = serializers.SerializerMethodField()
    matched_at = serializers.SerializerMethodField()
    stop_time = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    royalty_amount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    attribution_source = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()
    plays = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()
    confidence = serializers.SerializerMethodField()

    class Meta:
        model = PlayLog
        fields = [
            'id',
            'track_title',
            'artist',
            'station_name',
            'matched_at',
            'stop_time',
            'duration',
            'royalty_amount',
            'status',
            'attribution_source',
            'partner_name',
            'plays',
            'source',
            'confidence',
        ]

    def _format_datetime(self, value):
        if not value:
            return None
        return value.strftime('%Y-%m-%d ~ %H:%M:%S')

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

    def get_matched_at(self, obj):
        return self._format_datetime(obj.played_at or obj.start_time or obj.created_at)

    def get_stop_time(self, obj):
        return self._format_datetime(obj.stop_time)

    def get_duration(self, obj):
        if not obj.duration:
            return None
        total_seconds = int(obj.duration.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours:02}:{minutes:02}:{seconds:02}"

    def get_royalty_amount(self, obj):
        if obj.royalty_amount is None:
            return 0.0
        return float(obj.royalty_amount)

    def get_status(self, obj):
        """
        Unified status logic based on verification_status field.
        Returns user-friendly status labels.
        """
        # Check for disputes first
        if obj.flagged or obj.verification_status == 'disputed':
            return 'Disputed'
        
        # Check verification status
        if obj.verification_status == 'rejected':
            return 'Rejected'
        
        if obj.verification_status == 'verified':
            return 'Verified'
        
        # Pending review
        return 'Pending'


class ArtistPlayLogSerializer(BasePlayLogSerializer):
    """
    Artist-specific PlayLog serializer.
    Shows verification status from artist perspective.
    """
    pass

    def get_attribution_source(self, obj):
        try:
            from royalties.models import UsageAttribution
        except Exception:
            return "Local"
        if UsageAttribution.objects.filter(play_log=obj).exists():
            return "Partner"
        return "Local"

    def get_partner_name(self, obj):
        try:
            from royalties.models import UsageAttribution
        except Exception:
            return None
        ua = UsageAttribution.objects.filter(play_log=obj).select_related('origin_partner').first()
        if ua and ua.origin_partner:
            return ua.origin_partner.display_name or ua.origin_partner.company_name
        return None

    def get_plays(self, obj):
        total = getattr(obj, 'track_total_plays', None)
        if total is not None:
            return total
        return obj.track.track_playlog.filter(is_archived=False).count() if obj.track_id else 0

    def get_source(self, obj):
        return obj.source

    def get_confidence(self, obj):
        if obj.avg_confidence_score is None:
            return None
        return float(obj.avg_confidence_score)


class ArtistMatchCacheSerializer(serializers.ModelSerializer):
    song = serializers.CharField(source='track.title', read_only=True)
    artist = serializers.SerializerMethodField()
    station = serializers.CharField(source='station.name', read_only=True)
    matched_at = serializers.SerializerMethodField()
    confidence = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()
    match_type = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = MatchCache
        fields = ['id', 'song', 'artist', 'station', 'matched_at', 'confidence', 'source', 'match_type', 'status']

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

    def get_matched_at(self, obj):
        return obj.matched_at.strftime('%Y-%m-%d ~ %H:%M:%S') if obj.matched_at else None

    def get_confidence(self, obj):
        if obj.avg_confidence_score is None:
            return None
        return float(obj.avg_confidence_score)

    def get_source(self, obj):
        if obj.station_program_id:
            return 'Station Upload'
        return 'Local Fingerprinting'

    def get_match_type(self, obj):
        confidence = obj.avg_confidence_score or 0
        if confidence >= 95:
            return 'Exact Match'
        if confidence >= 85:
            return 'High Confidence Match'
        if confidence > 0:
            return 'Candidate Match'
        return 'Unclassified'

    def get_status(self, obj):
        if obj.failed_reason:
            return 'Review'
        if obj.processed:
            return 'Verified'
        return 'Pending'
