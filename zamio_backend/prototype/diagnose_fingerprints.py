#!/usr/bin/env python
"""
Script to diagnose fingerprint matching issues.
Checks if tracks are properly fingerprinted and can be matched.

Usage:
    python prototype/diagnose_fingerprints.py
"""

import os
import sys
import django

# Setup Django environment
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from artists.models import Track, Fingerprint
from music_monitor.models import AudioDetection


def diagnose_fingerprints():
    """Diagnose fingerprint status and matching capability"""
    
    print("\n" + "=" * 70)
    print("FINGERPRINT DIAGNOSTIC TOOL")
    print("=" * 70)
    
    # Check total tracks
    total_tracks = Track.objects.count()
    fingerprinted_tracks = Track.objects.filter(fingerprinted=True).count()
    active_tracks = Track.objects.filter(active=True).count()
    
    print(f"\n📊 TRACK STATISTICS:")
    print(f"   Total tracks:         {total_tracks}")
    print(f"   Active tracks:        {active_tracks}")
    print(f"   Fingerprinted tracks: {fingerprinted_tracks}")
    print(f"   Not fingerprinted:    {total_tracks - fingerprinted_tracks}")
    
    if fingerprinted_tracks == 0:
        print("\n❌ NO FINGERPRINTED TRACKS FOUND!")
        print("   You need to upload and fingerprint tracks before testing detection.")
        print("\n💡 To fingerprint tracks:")
        print("   1. Upload tracks via artist portal")
        print("   2. Wait for Celery worker to process them")
        print("   3. Check Celery logs: docker compose -f docker-compose.local.yml logs -f celery_worker")
        print("\n" + "=" * 70 + "\n")
        return
    
    # Check fingerprint counts
    print(f"\n🔍 FINGERPRINT DETAILS:")
    
    for track in Track.objects.filter(fingerprinted=True)[:10]:  # Show first 10
        fp_count = Fingerprint.objects.filter(track=track).count()
        print(f"\n   Track: {track.title}")
        print(f"   Artist: {track.artist.stage_name}")
        print(f"   Track ID: {track.track_id}")
        print(f"   Fingerprints: {fp_count}")
        print(f"   Active: {track.active}")
        print(f"   Audio file: {track.audio_file.name if track.audio_file else 'None'}")
        
        if fp_count == 0:
            print(f"   ⚠️  WARNING: Track marked as fingerprinted but has 0 fingerprints!")
        elif fp_count < 100:
            print(f"   ⚠️  WARNING: Very few fingerprints ({fp_count}). Track might be too short or quiet.")
        else:
            print(f"   ✅ Good fingerprint count")
    
    # Check recent detections
    recent_detections = AudioDetection.objects.order_by('-created_at')[:5]
    
    print(f"\n🎵 RECENT DETECTION ATTEMPTS:")
    if recent_detections.count() == 0:
        print("   No detection attempts yet")
    else:
        for detection in recent_detections:
            print(f"\n   Detection ID: {detection.id}")
            print(f"   Created: {detection.created_at}")
            # Check if track is matched
            has_match = detection.track is not None
            print(f"   Matched: {has_match}")
            if has_match:
                print(f"   Track: {detection.track.title}")
                print(f"   Confidence: {detection.confidence}%")
            else:
                print(f"   Reason: No match found")
    
    # Matching configuration
    print(f"\n⚙️  MATCHING CONFIGURATION:")
    print(f"   Min match threshold (mp3): 5 hashes")
    print(f"   Min match threshold (stream): 10 hashes")
    print(f"   Fingerprint algorithm: xxhash with peak detection")
    print(f"   Sample rate: 44100 Hz")
    print(f"   Window size: 2048")
    print(f"   Overlap ratio: 0.5")
    
    # Recommendations
    print(f"\n💡 TROUBLESHOOTING TIPS:")
    print(f"   1. Ensure audio quality is good (not too quiet or distorted)")
    print(f"   2. Play audio at reasonable volume (not too quiet)")
    print(f"   3. Minimize background noise during capture")
    print(f"   4. Capture at least 5-10 seconds of audio")
    print(f"   5. Check that the track is marked as 'active'")
    print(f"   6. Verify fingerprints exist in database")
    
    # Check if tracks are active
    inactive_fingerprinted = Track.objects.filter(fingerprinted=True, active=False).count()
    if inactive_fingerprinted > 0:
        print(f"\n⚠️  WARNING: {inactive_fingerprinted} fingerprinted tracks are INACTIVE!")
        print(f"   Inactive tracks won't be matched. Activate them in Django admin.")
    
    print("\n" + "=" * 70)
    
    # Test fingerprint retrieval
    print(f"\n🧪 TESTING FINGERPRINT RETRIEVAL:")
    
    try:
        # Get all fingerprints for matching
        all_fingerprints = list(
            Fingerprint.objects.filter(track__active=True, track__fingerprinted=True)
            .values_list('track_id', 'hash', 'offset')
        )
        
        print(f"   Total fingerprints available for matching: {len(all_fingerprints)}")
        
        if len(all_fingerprints) == 0:
            print(f"   ❌ No fingerprints available for matching!")
            print(f"   Check that tracks are both fingerprinted AND active")
        else:
            print(f"   ✅ Fingerprints loaded successfully")
            
            # Show sample
            if len(all_fingerprints) > 0:
                sample = all_fingerprints[0]
                print(f"   Sample fingerprint: track_id={sample[0]}, hash={sample[1]}, offset={sample[2]}")
        
    except Exception as e:
        print(f"   ❌ Error retrieving fingerprints: {str(e)}")
    
    print("\n" + "=" * 70 + "\n")


if __name__ == '__main__':
    try:
        diagnose_fingerprints()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
