from django.urls import path

from notifications.api.views import (
    get_all_artist_notifications_view,
    get_all_publisher_notifications_view,
    get_all_station_notifications_view,
    set_notification_to_read,
    get_all_notifications,
    delete_notification,
)
from notifications.api.artist_notifications_view import (
    get_artist_notifications_view,
    mark_notification_read_view,
    mark_all_notifications_read_view,
    delete_notification_view
)
from notifications.api.station_notifications_view import (
    delete_station_notification_view,
    get_station_notifications_view,
    mark_all_station_notifications_read_view,
    mark_station_notification_read_view,
)

app_name = 'notifications'

urlpatterns = [
        # Legacy endpoints (TokenAuth)
        path('get-all-artist-notifications/', get_all_artist_notifications_view, name="get_all_artist_notifications_view"),
        path('get-all-station-notifications/', get_all_station_notifications_view, name="get_all_station_notifications_view"),
        path('get-all-publisher-notifications/', get_all_publisher_notifications_view, name="get_all_publisher_notifications_view"),

    path('set-to-read/', set_notification_to_read, name="set_notification_to_read"),
    path('get-all-notifications/', get_all_notifications, name="get_all_notifications"),
    path('delete-notification/', delete_notification, name="delete_notification"),

    # New JWT-based endpoints
    path('artist/', get_artist_notifications_view, name="get_artist_notifications"),
    path('mark-read/', mark_notification_read_view, name="mark_notification_read"),
    path('mark-all-read/', mark_all_notifications_read_view, name="mark_all_notifications_read"),
    path('delete/', delete_notification_view, name="delete_notification_new"),

    # Station notification endpoints
    path('station/', get_station_notifications_view, name="get_station_notifications"),
    path('station/mark-read/', mark_station_notification_read_view, name="mark_station_notification_read"),
    path('station/mark-all-read/', mark_all_station_notifications_read_view, name="mark_all_station_notifications_read"),
    path('station/delete/', delete_station_notification_view, name="delete_station_notification"),

]
