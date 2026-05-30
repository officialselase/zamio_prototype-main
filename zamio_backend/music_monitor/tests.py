import json
import shutil
import tempfile
import uuid
from importlib import import_module
from unittest.mock import patch

import numpy as np
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from artists.models import Artist, Track
from music_monitor.models import AudioDetection, SnippetIngest
from stations.models import Station


class UploadAudioMatchTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.media_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media_dir, ignore_errors=True)
        media_override = override_settings(MEDIA_ROOT=self.media_dir)
        media_override.enable()
        self.addCleanup(media_override.disable)

        rest_framework_settings = dict(getattr(settings, 'REST_FRAMEWORK', {}))
        rest_framework_settings['DEFAULT_AUTHENTICATION_CLASSES'] = [
            'rest_framework.authentication.TokenAuthentication'
        ]
        rf_override = override_settings(REST_FRAMEWORK=rest_framework_settings)
        rf_override.enable()
        self.addCleanup(rf_override.disable)

        User = get_user_model()
        self.station_user = User.objects.create_user(
            email='station@example.com',
            password='pass12345'
        )
        self.artist_user = User.objects.create_user(
            email='artist@example.com',
            password='pass12345'
        )

        self.artist = Artist.objects.create(user=self.artist_user, stage_name='Example Artist')
        self.track = Track.objects.create(
            title='Example Track',
            artist=self.artist,
            audio_file=SimpleUploadedFile('track.mp3', b'audio-bytes', content_type='audio/mpeg'),
        )

        self.station = Station.objects.create(
            user=self.station_user,
            name='Example Station',
            station_id='STATION-123'
        )

        token, _ = Token.objects.get_or_create(user=self.station_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        self.match_log_views = import_module('music_monitor.views.match_log_views')

    def _build_payload(self, chunk_id, metadata):
        return {
            'file': SimpleUploadedFile('capture.aac', b'clip-bytes', content_type='audio/aac'),
            'station_id': self.station.station_id,
            'chunk_id': chunk_id,
            'started_at': '2024-01-01T00:00:00Z',
            'duration_seconds': '10',
            'metadata': json.dumps(metadata),
        }

    def test_upload_creates_detection_with_match(self):
        chunk_id = str(uuid.uuid4())
        metadata = {'quality': 'standard', 'bit_rate': '128000'}
        payload = self._build_payload(chunk_id, metadata)

        match_payload = {
            'match': True,
            'song_id': self.track.id,
            'hashes_matched': 25,
            'confidence': 97.5,
        }

        with (
            patch.object(self.match_log_views.ffmpeg, 'input', side_effect=RuntimeError('ffmpeg disabled')),
            patch.object(self.match_log_views.librosa, 'load', return_value=(np.ones(4410), 44100)),
            patch.object(self.match_log_views, 'simple_match_mp3', return_value=match_payload),
        ):
            response = self.client.post('/api/music-monitor/stream/upload/', data=payload, format='multipart')

        self.assertEqual(response.status_code, 200)
        detection = AudioDetection.objects.get()
        ingest = SnippetIngest.objects.get(chunk_id=chunk_id)

        self.assertTrue(response.data['match'])
        self.assertIn('detection_id', response.data)
        self.assertEqual(response.data.get('hashes_matched'), 25)
        self.assertAlmostEqual(response.data.get('confidence'), 100.0, places=2)
        self.assertIn('processing_time_ms', response.data)

        self.assertEqual(detection.track, self.track)
        self.assertEqual(detection.station, self.station)
        self.assertTrue(detection.external_metadata.get('match_found'))
        self.assertEqual(detection.external_metadata.get('hashes_matched'), 25)
        self.assertEqual(detection.external_metadata.get('capture_metadata'), metadata)

        self.assertTrue(ingest.processed)
        self.assertEqual(ingest.audio_detection, detection)
        self.assertEqual(ingest.metadata, metadata)
        self.assertEqual(ingest.file_size_bytes, payload['file'].size)

    def test_upload_creates_detection_without_match(self):
        chunk_id = str(uuid.uuid4())
        metadata = {'quality': 'low', 'bit_rate': '64000'}
        payload = self._build_payload(chunk_id, metadata)

        match_payload = {
            'match': False,
            'reason': 'No fingerprints',
            'hashes_matched': 0,
            'confidence': 0.0,
        }

        with (
            patch.object(self.match_log_views.ffmpeg, 'input', side_effect=RuntimeError('ffmpeg disabled')),
            patch.object(self.match_log_views.librosa, 'load', return_value=(np.ones(4410), 44100)),
            patch.object(self.match_log_views, 'simple_match_mp3', return_value=match_payload),
        ):
            response = self.client.post('/api/music-monitor/stream/upload/', data=payload, format='multipart')

        self.assertEqual(response.status_code, 200)
        detection = AudioDetection.objects.get()
        ingest = SnippetIngest.objects.get(chunk_id=chunk_id)

        self.assertFalse(response.data['match'])
        self.assertEqual(response.data.get('reason'), 'No fingerprints')
        self.assertIn('detection_id', response.data)
        self.assertEqual(response.data.get('confidence'), 0.0)

        self.assertIsNone(detection.track)
        self.assertFalse(detection.external_metadata.get('match_found'))
        self.assertEqual(detection.error_message, 'No fingerprints')
        self.assertEqual(detection.external_metadata.get('capture_metadata'), metadata)

        self.assertTrue(ingest.processed)
        self.assertEqual(ingest.audio_detection, detection)
        self.assertEqual(ingest.metadata, metadata)
