"""
URL patterns for secure media file API endpoints
"""
from django.urls import path
from artists.api.media_views import (
    upload_track_view,
    track_processing_status_view,
    get_secure_media_url_view,
    secure_media_download_view,
    public_media_download_view,
    list_user_tracks_view,
    delete_track_view,
    verify_media_integrity_view,
    scan_media_for_malware_view
)

urlpatterns = [
    # Track upload and management
    path('tracks/upload/', upload_track_view, name='upload_track'),
    path('tracks/', list_user_tracks_view, name='list_user_tracks'),
    path('tracks/<int:track_id>/delete/', delete_track_view, name='delete_track'),
    path('tracks/<int:track_id>/status/', track_processing_status_view, name='track_processing_status'),
    
    # Secure media access
    path('media/<str:resource_type>/<int:resource_id>/<str:file_type>/url/', 
         get_secure_media_url_view, name='get_secure_media_url'),
    path('media/<str:resource_type>/<int:resource_id>/<str:file_type>/', 
         secure_media_download_view, name='secure_media_download'),
    
    # Public media access (for approved content)
    path('media/public/<str:resource_type>/<int:resource_id>/<str:file_type>/', 
         public_media_download_view, name='public_media_download'),
    
    # Security and integrity endpoints
    path('security/<str:resource_type>/<int:resource_id>/verify-integrity/', 
         verify_media_integrity_view, name='verify_media_integrity'),
    path('security/<str:resource_type>/<int:resource_id>/scan-malware/', 
         scan_media_for_malware_view, name='scan_media_malware'),
]