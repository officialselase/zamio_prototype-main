#!/usr/bin/env python
"""
Create a test publishing agreement for the publisher
Run with: docker exec zamio_backend python /app/../create_test_agreement.py
"""
import os
import sys
import django

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from publishers.models import PublisherProfile, PublishingAgreement
from artists.models import Artist, Track
from decimal import Decimal
from django.utils import timezone

publisher_id = '9fbea481-44b1-4ed0-a6a9-cfbecbd98392'

try:
    publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
    print(f'✅ Found publisher: {publisher.company_name or publisher.user.email}')
    
    # Get an artist (any artist)
    artist = Artist.objects.filter(is_archived=False).first()
    if not artist:
        print('❌ No artists found in database')
        sys.exit(1)
    
    print(f'✅ Found artist: {artist.stage_name}')
    
    # Get a track from this artist
    track = Track.objects.filter(artist=artist, is_archived=False).first()
    if not track:
        print('❌ No tracks found for this artist')
        sys.exit(1)
    
    print(f'✅ Found track: {track.title}')
    
    # Check if agreement already exists
    existing = PublishingAgreement.objects.filter(
        publisher=publisher,
        track=track,
        songwriter=artist
    ).first()
    
    if existing:
        print(f'⚠️  Agreement already exists with status: {existing.status}')
        if existing.status != 'accepted':
            existing.status = 'accepted'
            existing.save()
            print(f'✅ Updated agreement status to accepted')
    else:
        # Create new agreement
        agreement = PublishingAgreement.objects.create(
            publisher=publisher,
            track=track,
            songwriter=artist,
            writer_share=Decimal('50.00'),
            publisher_share=Decimal('50.00'),
            status='accepted',
            agreement_date=timezone.now().date(),
            verified_by_admin=True
        )
        print(f'✅ Created new publishing agreement')
        print(f'   Track: {track.title}')
        print(f'   Artist: {artist.stage_name}')
        print(f'   Writer Share: 50%')
        print(f'   Publisher Share: 50%')
        print(f'   Status: accepted')
    
    # Verify
    total_agreements = PublishingAgreement.objects.filter(publisher=publisher).count()
    accepted_agreements = PublishingAgreement.objects.filter(publisher=publisher, status='accepted').count()
    
    print(f'\n📊 Publisher now has:')
    print(f'   Total agreements: {total_agreements}')
    print(f'   Accepted agreements: {accepted_agreements}')
    print(f'\n✅ Done! Refresh the publisher dashboard to see the data.')
    
except PublisherProfile.DoesNotExist:
    print(f'❌ Publisher not found: {publisher_id}')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
