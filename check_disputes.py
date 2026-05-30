#!/usr/bin/env python
"""Check disputes in database and admin user type"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'zamio_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import User

print("=" * 60)
print("CHECKING DISPUTES IN DATABASE")
print("=" * 60)

# Try new disputes app first
try:
    from disputes.models import Dispute as NewDispute
    disputes = NewDispute.objects.all()
    print(f"\nNew disputes app - Total disputes: {disputes.count()}")
    
    for dispute in disputes:
        print(f"\nDispute ID: {dispute.dispute_id}")
        print(f"Title: {dispute.title}")
        print(f"Type: {dispute.dispute_type}")
        print(f"Status: {dispute.status}")
        print(f"Priority: {dispute.priority}")
        print(f"Submitted by: {dispute.submitted_by.email} (user_type: {dispute.submitted_by.user_type})")
        print(f"Created at: {dispute.created_at}")
except Exception as e:
    print(f"\nNew disputes app error: {e}")

# Try old music_monitor Dispute model
try:
    from music_monitor.models import Dispute as OldDispute
    old_disputes = OldDispute.objects.all()
    print(f"\nOld music_monitor app - Total disputes: {old_disputes.count()}")
    
    for dispute in old_disputes:
        print(f"\nDispute ID: {dispute.id}")
        print(f"PlayLog ID: {dispute.playlog_id}")
        print(f"Reason: {dispute.reason}")
        print(f"Status: {dispute.status}")
        print(f"Disputer: {dispute.disputer.email if dispute.disputer else 'N/A'}")
        print(f"Created at: {dispute.created_at}")
except Exception as e:
    print(f"\nOld music_monitor app error: {e}")

print("\n" + "=" * 60)
print("CHECKING ADMIN USERS")
print("=" * 60)

# Check admin users
admins = User.objects.filter(user_type='Admin')
print(f"\nTotal admin users: {admins.count()}")

for admin in admins:
    print(f"\nAdmin: {admin.email}")
    print(f"User ID: {admin.user_id}")
    print(f"User type: {admin.user_type}")
    print(f"Is active: {admin.is_active}")

print("\n" + "=" * 60)
