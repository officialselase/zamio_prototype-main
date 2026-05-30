#!/usr/bin/env python
"""
Quick test script to verify publisher dashboard data
Run from zamio_backend directory:
    python ../test_publisher_dashboard.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'zamio_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from publishers.models import PublisherProfile, PublishingAgreement
from music_monitor.models import PlayLog
from django.contrib.auth import get_user_model

User = get_user_model()

def test_publisher_data():
    print("\n=== PUBLISHER DASHBOARD DATA TEST ===\n")
    
    # Get all publishers
    publishers = PublisherProfile.objects.filter(is_archived=False)
    
    if not publishers.exists():
        print("❌ No publishers found in database")
        return
    
    for publisher in publishers:
        print(f"\n📊 Publisher: {publisher.company_name or publisher.user.email}")
        print(f"   ID: {publisher.publisher_id}")
        print(f"   Verified: {publisher.verified}")
        
        # Check agreements
        agreements = PublishingAgreement.objects.filter(
            publisher=publisher,
            status='accepted'
        )
        total_agreements = agreements.count()
        unique_tracks = agreements.values('track_id').distinct().count()
        
        print(f"\n   📝 Agreements:")
        print(f"      Total: {total_agreements}")
        print(f"      Unique Tracks: {unique_tracks}")
        
        if total_agreements > 0:
            print(f"\n      Sample agreements:")
            for agreement in agreements[:3]:
                print(f"        - {agreement.track.title} by {agreement.songwriter.stage_name}")
        
        # Check play logs
        playlogs = PlayLog.objects.filter(
            track__publishingagreement__publisher=publisher,
            track__publishingagreement__status='accepted',
        )
        total_plays = playlogs.count()
        
        print(f"\n   🎵 Play Logs:")
        print(f"      Total: {total_plays}")
        
        if total_plays > 0:
            from django.db.models import Sum
            from decimal import Decimal
            total_earnings = playlogs.aggregate(total=Sum('royalty_amount'))['total'] or Decimal('0')
            unique_stations = playlogs.values('station_id').distinct().count()
            
            print(f"      Total Earnings: ₵{float(total_earnings):,.2f}")
            print(f"      Unique Stations: {unique_stations}")
            
            print(f"\n      Recent plays:")
            for log in playlogs.order_by('-played_at')[:3]:
                print(f"        - {log.track.title} at {log.station.name if log.station else 'Unknown'}")
        
        # Expected dashboard values
        print(f"\n   ✅ Expected Dashboard Values:")
        print(f"      Works in Catalog: {unique_tracks}")
        print(f"      Total Performances: {total_plays}")
        
        if unique_tracks == 0 and total_agreements > 0:
            print(f"\n   ⚠️  WARNING: {total_agreements} agreements but 0 unique tracks!")
            print(f"      This might indicate a data issue.")
        
        print("\n" + "="*50)

if __name__ == '__main__':
    test_publisher_data()
    print("\n✅ Test complete!\n")
