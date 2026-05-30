from django.utils.timesince import timesince
from rest_framework import serializers

from notifications.models import Notification


class NotificationDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


class AllNotificationsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


class StationNotificationSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    station_name = serializers.SerializerMethodField()
    station_id = serializers.SerializerMethodField()
    alert_level = serializers.SerializerMethodField()
    actionable = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()
    action_type = serializers.SerializerMethodField()
    listeners = serializers.SerializerMethodField()
    milestone = serializers.SerializerMethodField()
    tracks_detected = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    license_type = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    growth = serializers.SerializerMethodField()
    platform = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    playlist = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'priority',
            'title',
            'message',
            'read',
            'timestamp',
            'time_ago',
            'station_name',
            'station_id',
            'alert_level',
            'actionable',
            'action_label',
            'action_type',
            'listeners',
            'milestone',
            'tracks_detected',
            'days_until_expiry',
            'license_type',
            'amount',
            'growth',
            'platform',
            'username',
            'playlist',
        ]

    @staticmethod
    def _metadata(obj: Notification) -> dict:
        metadata = getattr(obj, 'metadata', None)
        if isinstance(metadata, dict):
            return metadata
        return {}

    def get_type(self, obj: Notification) -> str:
        value = obj.type or ''
        return value.lower()

    def get_priority(self, obj: Notification) -> str:
        value = obj.priority or ''
        return value.lower()

    def get_timestamp(self, obj: Notification) -> str | None:
        if obj.created_at:
            return obj.created_at.isoformat()
        return None

    def get_time_ago(self, obj: Notification) -> str:
        if obj.created_at:
            return f"{timesince(obj.created_at)} ago"
        return 'Just now'

    def get_station_name(self, obj: Notification) -> str | None:
        if obj.station:
            return obj.station.name
        user = getattr(obj, 'user', None)
        if not user:
            return None
        station_qs = getattr(user, 'station_user', None)
        if station_qs is None:
            return None
        station = station_qs.first()
        return station.name if station else None

    def get_station_id(self, obj: Notification) -> str | None:
        if obj.station:
            return obj.station.station_id
        user = getattr(obj, 'user', None)
        if not user:
            return None
        station_qs = getattr(user, 'station_user', None)
        if station_qs is None:
            return None
        station = station_qs.first()
        return station.station_id if station else None

    def get_alert_level(self, obj: Notification) -> str:
        metadata = self._metadata(obj)
        value = metadata.get('alert_level')
        if isinstance(value, str) and value:
            return value
        return self.get_priority(obj)

    def get_actionable(self, obj: Notification) -> bool:
        metadata = self._metadata(obj)
        if obj.action_required:
            return True
        actionable = metadata.get('actionable')
        if isinstance(actionable, bool):
            return actionable
        return bool(obj.action_label or metadata.get('action_label') or metadata.get('action_type'))

    def get_action_label(self, obj: Notification) -> str | None:
        if obj.action_label:
            return obj.action_label
        metadata = self._metadata(obj)
        value = metadata.get('action_label')
        return value if isinstance(value, str) else None

    def get_action_type(self, obj: Notification) -> str | None:
        if obj.action_type:
            return obj.action_type
        metadata = self._metadata(obj)
        value = metadata.get('action_type')
        return value if isinstance(value, str) else None

    def get_listeners(self, obj: Notification) -> int | None:
        metadata = self._metadata(obj)
        value = metadata.get('listeners')
        return int(value) if isinstance(value, (int, float)) else None

    def get_milestone(self, obj: Notification) -> bool:
        metadata = self._metadata(obj)
        value = metadata.get('milestone')
        return bool(value) if isinstance(value, bool) else False

    def get_tracks_detected(self, obj: Notification) -> int | None:
        metadata = self._metadata(obj)
        value = metadata.get('tracks_detected')
        return int(value) if isinstance(value, (int, float)) else None

    def get_days_until_expiry(self, obj: Notification) -> int | None:
        metadata = self._metadata(obj)
        value = metadata.get('days_until_expiry')
        return int(value) if isinstance(value, (int, float)) else None

    def get_license_type(self, obj: Notification) -> str | None:
        metadata = self._metadata(obj)
        value = metadata.get('license_type')
        return value if isinstance(value, str) else None

    def get_amount(self, obj: Notification) -> float | None:
        metadata = self._metadata(obj)
        value = metadata.get('amount')
        if isinstance(value, (int, float)):
            return float(value)
        return None

    def get_growth(self, obj: Notification) -> float | None:
        metadata = self._metadata(obj)
        value = metadata.get('growth')
        if isinstance(value, (int, float)):
            return float(value)
        return None

    def get_platform(self, obj: Notification) -> str | None:
        metadata = self._metadata(obj)
        value = metadata.get('platform')
        return value if isinstance(value, str) else None

    def get_username(self, obj: Notification) -> str | None:
        metadata = self._metadata(obj)
        value = metadata.get('username')
        return value if isinstance(value, str) else None

    def get_playlist(self, obj: Notification) -> str | None:
        metadata = self._metadata(obj)
        value = metadata.get('playlist')
        return value if isinstance(value, str) else None



