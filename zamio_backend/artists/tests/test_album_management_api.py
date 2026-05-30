from django.contrib.auth import get_user_model
import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from artists.models import Album, Artist, Genre, Track, Contributor
from music_monitor.models import PlayLog
from stations.models import Station


User = get_user_model()


class AlbumManagementAPITestCase(TestCase):
    """Integration tests for the artist album management API endpoints."""

    def setUp(self):
        self.temp_media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.temp_media)
        self.override.enable()
        self.addCleanup(lambda: shutil.rmtree(self.temp_media, ignore_errors=True))
        self.addCleanup(self.override.disable)

        self.client = APIClient()
        self.user = User.objects.create_user(
            email='album-manager@example.com',
            first_name='Album',
            last_name='Manager',
            password='strongpass123',
        )
        self.artist = Artist.objects.create(
            user=self.user,
            stage_name='Album Manager',
        )
        self.client.force_authenticate(self.user)

        self.genre = Genre.objects.create(name='Afrobeats')

        self.active_album = Album.objects.create(
            artist=self.artist,
            title='Approved Album',
            genre=self.genre,
            status='Approved',
            release_date=timezone.now().date(),
            active=True,
        )
        self.draft_album = Album.objects.create(
            artist=self.artist,
            title='Pending Album',
            status='Pending',
            active=True,
        )
        self.inactive_album = Album.objects.create(
            artist=self.artist,
            title='Rejected Album',
            status='Rejected',
            active=False,
        )

    def test_list_albums_returns_paginated_payload(self):
        response = self.client.get('/api/artists/api/albums/', {'page': 1, 'page_size': 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data.get('data', {})
        albums = payload.get('albums', [])
        self.assertEqual(len(albums), 3)

        albums_by_title = {album['title']: album for album in albums}
        self.assertEqual(albums_by_title['Approved Album']['status'], 'active')
        self.assertEqual(albums_by_title['Pending Album']['status'], 'draft')
        self.assertEqual(albums_by_title['Rejected Album']['status'], 'inactive')

        pagination = payload.get('pagination', {})
        self.assertEqual(pagination['page'], 1)
        self.assertEqual(pagination['total_count'], 3)

        stats = payload.get('stats', {})
        self.assertEqual(stats['total'], 3)
        self.assertEqual(stats['active'], 2)
        self.assertEqual(stats['draft'], 1)
        self.assertEqual(stats['inactive'], 1)

    def test_create_album_persists_new_record(self):
        cover_art = SimpleUploadedFile(
            'cover.jpg',
            b'\xff\xd8\xff\xdb\x00C' + (b'\x00' * 64) + b'\xff\xd9',
            content_type='image/jpeg',
        )
        response = self.client.post(
            '/api/artists/api/albums/manage/',
            {
                'title': 'New Album',
                'release_date': '2024-01-01',
                'genre_id': self.genre.id,
                'cover_art': cover_art,
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        payload = response.data.get('data', {})
        album_payload = payload.get('album')
        self.assertIsNotNone(album_payload)
        self.assertEqual(album_payload['title'], 'New Album')
        self.assertEqual(album_payload['genre'], 'Afrobeats')

        created_album = Album.objects.get(artist=self.artist, title='New Album')
        self.assertNotIn('defaults/album_cover.png', created_album.cover_art.name)

    def test_update_album_applies_changes(self):
        response = self.client.patch(
            f'/api/artists/api/albums/{self.draft_album.id}/',
            {
                'title': 'Updated Pending Album',
                'status': 'Approved',
                'active': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.draft_album.refresh_from_db()
        self.assertEqual(self.draft_album.title, 'Updated Pending Album')
        self.assertEqual(self.draft_album.status, 'Approved')
        self.assertTrue(self.draft_album.active)

    def test_delete_album_soft_archives_record(self):
        response = self.client.delete(f'/api/artists/api/albums/{self.inactive_album.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.inactive_album.refresh_from_db()
        self.assertTrue(self.inactive_album.is_archived)
        self.assertFalse(self.inactive_album.active)

    def test_retrieve_album_returns_detailed_payload(self):
        station_user = User.objects.create_user(
            email='station@example.com',
            password='testpass123',
        )
        station = Station.objects.create(user=station_user, name='Test Station')

        audio_file = SimpleUploadedFile('track.mp3', b'0' * 1024, content_type='audio/mpeg')
        cover_file = SimpleUploadedFile(
            'track-cover.jpg',
            b'\xff\xd8\xff\xdb\x00C' + (b'\x00' * 64) + b'\xff\xd9',
            content_type='image/jpeg',
        )

        track = Track.objects.create(
            artist=self.artist,
            album=self.active_album,
            title='Hit Song',
            genre=self.genre,
            audio_file=audio_file,
            cover_art=cover_file,
            duration=timedelta(minutes=3, seconds=45),
            status='Approved',
            active=True,
        )

        PlayLog.objects.create(
            track=track,
            station=station,
            source='Radio',
            played_at=timezone.now(),
            royalty_amount=Decimal('12.50'),
            active=True,
        )

        contributor_user = User.objects.create_user(
            email='contributor@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Doe',
        )
        Contributor.objects.create(
            track=track,
            user=contributor_user,
            role='Producer',
            percent_split=Decimal('50.00'),
            active=True,
        )

        response = self.client.get(f'/api/artists/api/albums/{self.active_album.id}/detail/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data.get('data', {})
        self.assertEqual(data.get('album', {}).get('id'), self.active_album.id)
        self.assertGreaterEqual(data.get('stats', {}).get('total_tracks', 0), 1)

        tracks = data.get('tracks', [])
        self.assertTrue(any(track_payload['title'] == 'Hit Song' for track_payload in tracks))

        revenue = data.get('revenue', {})
        monthly = revenue.get('monthly', [])
        self.assertTrue(monthly)

        contributors = data.get('contributors', [])
        self.assertTrue(contributors)

