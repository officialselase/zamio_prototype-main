#!/usr/bin/env python
"""
Script to onboard a radio station directly into the database.
This bypasses the normal registration/verification/onboarding flow for demo purposes.

Usage:
    python prototype/onboard_station.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, time

# Setup Django environment
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone as django_timezone
from stations.models import Station, StationStaff
from bank_account.models import BankAccount

User = get_user_model()


def onboard_station():
    """Create a fully onboarded radio station"""
    
    import random
    suffix = random.randint(1000, 9999)
    email = f"station{suffix}@demo.zamio.com"
    password = "Demo1234"
    station_name = f"Demo FM {suffix}"
    
    print("=" * 60)
    print("Creating Radio Station Account")
    print("=" * 60)
    
    # Step 1: Create User
    print("\n[1/6] Creating user account...")
    user = User.objects.create_user(
        email=email,
        first_name="Station",
        last_name="Manager",
        password=password,
        is_active=True
    )
    user.user_type = "Station"
    user.phone = "+233244567890"
    user.country = "ghana"
    user.location = "Accra, Ghana"
    user.email_verified = True
    user.verified = True
    user.profile_complete = True
    user.verification_status = 'verified'
    user.kyc_status = 'verified'
    user.save()
    print(f"   ✓ User created: {email}")
    
    # Step 2: Create Station Profile
    print("\n[2/6] Creating station profile...")
    station = Station.objects.create(
        user=user,
        name=station_name,
        phone="+233244567890",
        country="ghana",
        region="Greater Accra",
        city="Accra",
        tagline="Your Number One Hit Station",
        founded_year=2020,
        primary_contact_name=f"{user.first_name} {user.last_name}",
        primary_contact_title="Station Manager",
        primary_contact_email=email,
        primary_contact_phone="+233244567890",
        station_class="class_b",
        station_type="commercial",
        station_category="Music & Entertainment",
        license_number=f"NCA-FM-{suffix}",
        license_issuing_authority="National Communications Authority (NCA)",
        license_issue_date=date(2020, 1, 1),
        license_expiry_date=date(2025, 12, 31),
        coverage_area="Greater Accra Region",
        estimated_listeners=50000,
        broadcast_frequency="101.5 FM",
        transmission_power="10kW",
        regulatory_body="GHAMRO, COSGA",
        website_url="https://demo.zamio.com",
        social_media_links={
            "facebook": "https://facebook.com/demofm",
            "twitter": "https://twitter.com/demofm",
            "instagram": "https://instagram.com/demofm"
        },
        about=f"{station_name} is a leading radio station in Ghana, broadcasting the best music and entertainment 24/7.",
        location_name="Accra, Ghana",
        operating_hours_start=time(6, 0),
        operating_hours_end=time(23, 0),
        timezone="Africa/Accra",
        verification_status='verified',
        verified_at=django_timezone.now(),
        onboarding_step='done',
        profile_completed=True,
        stream_setup_completed=True,
        staff_completed=True,
        compliance_completed=True,
        payment_info_added=True,
        active=True
    )
    print(f"   ✓ Station profile created: {station_name}")
    
    # Step 3: Configure Stream
    print("\n[3/6] Setting up stream configuration...")
    station.stream_url = "https://stream.demo.zamio.com/live"
    station.backup_stream_url = "https://backup.stream.demo.zamio.com/live"
    station.stream_type = "Icecast"
    station.stream_bitrate = "128kbps"
    station.stream_format = "MP3"
    station.stream_mount_point = "/live"
    station.monitoring_enabled = True
    station.monitoring_interval_seconds = 60
    station.stream_auto_restart = True
    station.stream_quality_check_enabled = True
    station.stream_status = 'active'
    station.save()
    print("   ✓ Stream configuration completed")
    
    # Step 4: Add Staff Members
    print("\n[4/6] Adding station staff...")
    staff_members = [
        {
            "name": "John Mensah",
            "first_name": "John",
            "last_name": "Mensah",
            "email": f"john.mensah@{station_name.lower().replace(' ', '')}.com",
            "phone": "+233201234567",
            "role": "manager",
            "permission_level": "admin",
            "can_upload_playlogs": True,
            "can_manage_streams": True,
            "can_view_analytics": True,
            "can_view_reports": True,
            "can_monitor_streams": True,
            "can_manage_staff": True,
            "can_manage_settings": True,
        },
        {
            "name": "Sarah Osei",
            "first_name": "Sarah",
            "last_name": "Osei",
            "email": f"sarah.osei@{station_name.lower().replace(' ', '')}.com",
            "phone": "+233202345678",
            "role": "presenter",
            "permission_level": "view",
            "can_upload_playlogs": False,
            "can_view_analytics": True,
        },
        {
            "name": "Kwame Asante",
            "first_name": "Kwame",
            "last_name": "Asante",
            "email": f"kwame.asante@{station_name.lower().replace(' ', '')}.com",
            "phone": "+233203456789",
            "role": "dj",
            "permission_level": "view",
            "can_upload_playlogs": False,
            "can_view_analytics": True,
        }
    ]
    
    for staff_data in staff_members:
        StationStaff.objects.create(
            station=station,
            **staff_data,
            active=True
        )
    print(f"   ✓ Added {len(staff_members)} staff members")
    
    # Step 5: Add Payment Info
    print("\n[5/6] Setting up payment information...")
    station.preferred_payout_method = "bank-transfer"
    station.preferred_currency = "GHS"
    station.payout_frequency = "monthly"
    station.minimum_payout_amount = Decimal("100.00")
    station.tax_identification_number = f"TIN-{suffix}"
    station.business_registration_number = f"BRN-{suffix}"
    station.bank_name = "GCB Bank"
    station.bank_account_number = f"1234567890{suffix}"
    station.bank_account_name = station_name
    station.bank_branch_code = "GCB-ACC-001"
    station.bank_swift_code = "GCBIGHAC"
    station.momo_provider = "MTN"
    station.momo_account = "+233244567890"
    station.momo_account_name = station_name
    station.save()
    print("   ✓ Payment preferences configured (Bank Transfer)")
    
    # Step 6: Create Bank Account/Wallet
    print("\n[6/6] Creating wallet...")
    bank_account, created = BankAccount.objects.get_or_create(
        user=user,
        defaults={
            'balance': Decimal('0.00'),
            'currency': "GHS",
        }
    )
    print(f"   ✓ Wallet created with balance: {bank_account.balance} {bank_account.currency}")
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ STATION ONBOARDING COMPLETE")
    print("=" * 60)
    print(f"\nStation Details:")
    print(f"  Station Name:  {station.name}")
    print(f"  Station ID:    {station.station_id}")
    print(f"  Email:         {user.email}")
    print(f"  Password:      {password}")
    print(f"  User Type:     {user.user_type}")
    print(f"  Location:      {station.city}, {station.region}")
    print(f"  Frequency:     {station.broadcast_frequency}")
    print(f"  License:       {station.license_number}")
    print(f"  Station Type:  {station.station_type}")
    print(f"  Station Class: {station.station_class}")
    print(f"  Verification:  {station.verification_status}")
    print(f"  Onboarding:    {station.onboarding_step}")
    print(f"\nStream Configuration:")
    print(f"  Stream URL:    {station.stream_url}")
    print(f"  Stream Status: {station.stream_status}")
    print(f"  Monitoring:    {'Enabled' if station.monitoring_enabled else 'Disabled'}")
    print(f"\nPayment Method:  {station.preferred_payout_method}")
    print(f"Bank Account:    {station.bank_name} - {station.bank_account_number}")
    print(f"Wallet Balance:  {bank_account.balance} {bank_account.currency}")
    print(f"\nStaff Members:   {StationStaff.objects.filter(station=station, active=True).count()}")
    print("\n" + "=" * 60)
    print("\nYou can now use these credentials to sign in:")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    print("=" * 60 + "\n")
    
    return {
        'email': email,
        'password': password,
        'station_name': station_name,
        'station_id': station.station_id,
        'user_id': str(user.user_id)
    }


if __name__ == '__main__':
    try:
        result = onboard_station()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
