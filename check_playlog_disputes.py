#!/usr/bin/env python
"""Check disputed playlogs"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'zamio_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from music_monitor.models import PlayLog

print("=" * 60)
print("CHECKING DISPUTED PLAYLOGS")
print("=" * 60)

disputed = PlayLog.objects.filter(status='disputed')
print(f"\nTotal disputed playlogs: {disputed.count()}")

for p in disputed[:10]:
    print(f"\nPlayLog ID: {p.id}")
    print(f"Track: {p.track_title}")
    print(f"Artist: {p.artist_name}")
    print(f"Station: {p.station.name if p.station else 'N/A'}")
    print(f"Status: {p.status}")
    print(f"Dispute reason: {p.dispute_reason if hasattr(p, 'dispute_reason') else 'N/A'}")
    print(f"Played at: {p.played_at}")
