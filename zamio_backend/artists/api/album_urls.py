"""URL patterns for the artist album management API."""

from django.urls import path

from artists.api.album_management_views import (
    list_albums,
    create_album,
    update_album,
    delete_album,
    retrieve_album,
)


urlpatterns = [
    path('albums/', list_albums, name='artist_album_list'),
    path('albums/manage/', create_album, name='artist_album_create'),
    path('albums/<int:album_id>/', update_album, name='artist_album_update'),
    path('albums/<int:album_id>/detail/', retrieve_album, name='artist_album_detail'),
    path('albums/<int:album_id>/delete/', delete_album, name='artist_album_delete'),
]

