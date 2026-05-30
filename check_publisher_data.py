#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, 'zamio_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from publishers.models import PublisherProfile, PublishingAgreement
from artists.models import Track
from music_monitor.models import PlayLog

publisher_id = '9fbea481-44b1-4ed0-a6a9-cfbecbd98392'

try:
    p = PublisherProfile.objects.get(publisher_id=publisher_id)
    print(f'\n✅ Publisher found: {p.company_name or p.user.email}')
    print(f'   Publisher ID: {p.publisher_id}')
    print(f'   Verified: {p.verified}')
    
    # Check all agreements
    all_agreements = PublishingAgreement.objects.filter(publisher=p)
    print(f'\n📝 Publishing Agreements:')
    print(f'   Total: {all_agreements.count()}')
    
    if all_agreements.exists():
        print(f'\n   Agreement details:')
        for agreement in all_agreements:
            print(f'   - Track: {agreement.track.title}')
            print(f'     Artist: {agreement.songwriter.stage_name}')
            print(f'     Status: {agreement.status}')
            print(f'     Writer Share: {agreement.writer_share}%')
            print(f'     Publisher Share: {agreement.publisher_share}%')
            print(f'     Created: {agreement.created_at}')
            print()
    
    # Check accepted agreements
    accepted = all_agreements.filter(status='accepted')
    print(f'   Accepted agreements: {accepted.count()}')
    print(f'   Unique tracks in accepted agreements: {accepted.values("track_id").distinct().count()}')
    
    # Check play logs
    playlogs = PlayLog.objects.filter(
        track__publishingagreement__publisher=p,
        track__publishingagreement__status='accepted',
    )
    print(f'\n🎵 Play Logs:')
    print(f'   Total: {playlogs.count()}')
    
    if playlogs.exists():
        print(f'   Recent plays:')
        for log in playlogs.order_by('-played_at')[:3]:
            print(f'   - {log.track.title} at {log.station.name if log.station else "Unknown"}')
            print(f'     Played: {log.played_at}')
            print(f'     Royalty: ₵{log.royalty_amount}')
    
    print(f'\n❓ Why worksInCatalog is 0:')
    if all_agreements.count() == 0:
        print(f'   ❌ No publishing agreements exist')
    elif accepted.count() == 0:
        print(f'   ❌ No agreements are in "accepted" status')
        print(f'   Current statuses: {list(all_agreements.values_list("status", flat=True))}')
    else:
        print(f'   ✅ Should show {accepted.values("track_id").distinct().count()} works')
        
except PublisherProfile.DoesNotExist:
    print(f'❌ Publisher not found: {publisher_id}')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
