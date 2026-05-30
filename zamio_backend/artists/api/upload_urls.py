"""
URL patterns for non-blocking upload processing API endpoints
"""
from django.urls import path
from artists.api.upload_status_views import (
    initiate_non_blocking_upload,
    get_upload_status,
    get_user_uploads,
    create_album_for_uploads,
    update_track_contributors,
    cancel_upload,
    delete_upload,
)

urlpatterns = [
    # Non-blocking upload endpoints
    path('upload/initiate/', initiate_non_blocking_upload, name='initiate_non_blocking_upload'),
    path('upload-status/<str:upload_id>/', get_upload_status, name='get_upload_status'),
    path('uploads/', get_user_uploads, name='get_user_uploads'),
    path('upload/<str:upload_id>/cancel/', cancel_upload, name='cancel_upload'),
    path('upload/<str:upload_id>/delete/', delete_upload, name='delete_upload'),
    path('albums/create/', create_album_for_uploads, name='create_album_for_uploads'),

    # Contributor management
    path('tracks/<int:track_id>/contributors/', update_track_contributors, name='update_track_contributors'),
]