#!/usr/bin/env python
"""
Upload a test track using the SIMPLE fingerprinting algorithm (same as matching).

Usage:
    python prototype/upload_track_simple.py /path/to/audio.mp3
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zamio_backend.settings')
django.setup()

from django.core.files import File
from django.db import transaction
from artists.models import Track, Album, Artist, Genre, Fingerprint
from accounts.models import User
from artists.utils.fingerprint_tracks import simple_fingerprint
import librosa
import numpy as np

def upload_and_fingerprint_track(audio_path):
    """Upload and fingerprint a track using simple algorithm"""
    
    audio_file = Path(audio_path)
    if not audio_file.exists():
        print(f"❌ Audio file not found: {audio_path}")
        return None
    
    print(f"\n📁 Processing: {audio_file.name}")
    print(f"   Size: {audio_file.stat().st_size / 1024 / 1024:.2f} MB")
    
    # Get or create artist
    user, _ = User.objects.get_or_create(
        username='testartist',
        defaults={
            'email': 'test@example.com',
            'user_type': 'artist'
        }
    )
    
    artist, _ = Artist.objects.get_or_create(
        user=user,
        defaults={'bio': 'Test artist for mobile detection'}
    )
    
    # Get or create genre
    genre, _ = Genre.objects.get_or_create(
        name='Test',
        defaults={'description': 'Test genre', 'active': True}
    )
    
    # Get or create album
    album, _ = Album.objects.get_or_create(
        artist=artist,
        title='Test Album',
        defaults={
            'release_date': '2024-01-01',
            'genre': genre
        }
    )
    
    # Create track
    track_title = audio_file.stem
    print(f"\n🎵 Creating track: {track_title}")
    
    # Delete existing track with same title
    Track.objects.filter(title=track_title, album=album).delete()
    
    track = Track.objects.create(
        album=album,
        artist=artist,
        title=track_title,
        genre=genre,
        active=True
    )
    
    # Attach audio file
    print(f"   📎 Attaching audio file...")
    with open(audio_file, 'rb') as f:
        track.audio_file.save(audio_file.name, File(f), save=True)
    
    print(f"   ✅ Audio file saved: {track.audio_file.name}")
    
    # Generate fingerprints using SIMPLE algorithm (same as matching)
    print(f"\n🔍 Generating fingerprints using SIMPLE algorithm...")
    try:
        # Load audio
        samples, sr = librosa.load(track.audio_file.path, sr=44100, mono=True)
        print(f"   📊 Loaded {len(samples)} samples at {sr}Hz")
        
        # Generate fingerprints using the SAME algorithm as matching
        fingerprint_hashes = simple_fingerprint(samples, sr, plot=False)
        
        if not fingerprint_hashes:
            print(f"   ❌ No fingerprints generated")
            return None
        
        print(f"   ✅ Generated {len(fingerprint_hashes)} fingerprint hashes")
        
        # Store in database
        print(f"   💾 Storing fingerprints in database...")
        with transaction.atomic():
            # Delete old fingerprints
            Fingerprint.objects.filter(track=track).delete()
            
            # Create new fingerprints
            fingerprint_objects = []
            for hash_value, offset in fingerprint_hashes:
                fingerprint_objects.append(
                    Fingerprint(
                        track=track,
                        hash=str(hash_value),
                        offset=offset,
                        version=1,
                        algorithm_version='simple_v1',
                        processing_status='completed'
                    )
                )
            
            # Batch create
            Fingerprint.objects.bulk_create(fingerprint_objects, batch_size=1000)
            
        print(f"   ✅ Stored {len(fingerprint_objects)} fingerprints")
        
    except Exception as e:
        print(f"   ❌ Fingerprinting error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    print(f"\n✅ Track ready for detection!")
    print(f"   Track ID: {track.track_id}")
    print(f"   Title: {track.title}")
    print(f"   Artist: {artist.user.username}")
    print(f"   Audio file: {track.audio_file.path}")
    print(f"   Fingerprints: {len(fingerprint_objects)}")
    print(f"   Algorithm: SIMPLE (matches detection algorithm)")
    
    print(f"\n🎧 Now play this audio file on your speakers and test mobile detection!")
    
    return track


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python prototype/upload_track_simple.py /path/to/audio.mp3")
        print("\nExample:")
        print("  python prototype/upload_track_simple.py /tmp/test_song.mp3")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    upload_and_fingerprint_track(audio_path)
