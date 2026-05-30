#!/usr/bin/env python
"""
Script to onboard all account types for complete platform demo setup.
This creates: Admin, Artist, Station, Publisher, and Pro Artist accounts.

Usage:
    python prototype/onboard_complete.py
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

# Import the individual onboarding functions
from onboard_admin import onboard_admin
from onboard_self_publish import onboard_self_published_artist
from onboard_station import onboard_station
from onboard_publisher import onboard_publisher
from onboard_pro_artist import onboard_pro_artist

# Import Genre model
from artists.models import Genre

# Define genres to create
GENRES = ["HipHop", "Gospel", "Jazz", "Afro Pop", "Rock", "HighLife"]


def setup_genres():
    """Create default genres if they don't exist"""
    print("\n📚 Setting up genres...")
    created_count = 0
    existing_count = 0
    
    for genre_name in GENRES:
        genre, created = Genre.objects.get_or_create(
            name=genre_name,
            defaults={
                'description': f'{genre_name} music genre',
                'active': True
            }
        )
        if created:
            created_count += 1
            print(f"   ✓ Created genre: {genre_name}")
        else:
            existing_count += 1
    
    if existing_count > 0:
        print(f"   ✓ {existing_count} genre(s) already exist")
    
    print(f"   ✓ Total genres available: {len(GENRES)}")


def onboard_complete_platform():
    """Create all account types for complete platform demo"""
    
    print("\n" + "=" * 60)
    print("ZAMIO PLATFORM - COMPLETE PLATFORM SETUP")
    print("=" * 60)
    print("\nThis will create:")
    print("  • Default Genres (HipHop, Gospel, Jazz, Afro Pop, Rock, HighLife)")
    print("  • 1 Admin/Superuser Account")
    print("  • 1 Self-Published Artist Account")
    print("  • 1 Radio Station Account (with 3 staff members)")
    print("  • 1 Publisher Account")
    print("  • 1 Pro Artist Account (signed to publisher)")
    print("\n" + "=" * 60 + "\n")
    
    results = {}
    
    # Setup genres first
    try:
        setup_genres()
    except Exception as e:
        print(f"\n⚠️  Warning: Failed to setup genres: {str(e)}")
        print("   Continuing with account creation...\n")
    
    # Create admin
    try:
        print("\n👤 CREATING ADMIN ACCOUNT...\n")
        admin_result = onboard_admin()
        results['admin'] = admin_result
    except Exception as e:
        print(f"\n❌ Failed to create admin: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    # Create artist
    try:
        print("\n🎵 CREATING ARTIST ACCOUNT...\n")
        artist_result = onboard_self_published_artist()
        results['artist'] = artist_result
    except Exception as e:
        print(f"\n❌ Failed to create artist: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    # Create station
    try:
        print("\n📻 CREATING STATION ACCOUNT...\n")
        station_result = onboard_station()
        results['station'] = station_result
    except Exception as e:
        print(f"\n❌ Failed to create station: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    # Create publisher
    try:
        print("\n📚 CREATING PUBLISHER ACCOUNT...\n")
        publisher_result = onboard_publisher()
        results['publisher'] = publisher_result
    except Exception as e:
        print(f"\n❌ Failed to create publisher: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    # Create pro artist (signed to the publisher we just created)
    try:
        print("\n🎤 CREATING PRO ARTIST ACCOUNT (SIGNED TO PUBLISHER)...\n")
        pro_artist_result = onboard_pro_artist(publisher_id=results['publisher']['publisher_id'])
        results['pro_artist'] = pro_artist_result
    except Exception as e:
        print(f"\n❌ Failed to create pro artist: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    # Final summary
    print("\n" + "=" * 60)
    print("✓ COMPLETE PLATFORM SETUP FINISHED")
    print("=" * 60)
    print("\n📋 SUMMARY OF CREATED ACCOUNTS:\n")
    
    print("👤 ADMIN ACCOUNT:")
    print(f"   Email:    {results['admin']['email']}")
    print(f"   Password: {results['admin']['password']}")
    print(f"   Access:   Full platform admin + Django admin panel")
    
    print("\n🎵 ARTIST ACCOUNT:")
    print(f"   Email:      {results['artist']['email']}")
    print(f"   Password:   {results['artist']['password']}")
    print(f"   Stage Name: {results['artist']['stage_name']}")
    print(f"   Artist ID:  {results['artist']['artist_id']}")
    
    print("\n📻 STATION ACCOUNT:")
    print(f"   Email:        {results['station']['email']}")
    print(f"   Password:     {results['station']['password']}")
    print(f"   Station Name: {results['station']['station_name']}")
    print(f"   Station ID:   {results['station']['station_id']}")
    
    print("\n📚 PUBLISHER ACCOUNT:")
    print(f"   Email:        {results['publisher']['email']}")
    print(f"   Password:     {results['publisher']['password']}")
    print(f"   Company Name: {results['publisher']['company_name']}")
    print(f"   Publisher ID: {results['publisher']['publisher_id']}")
    
    print("\n🎤 PRO ARTIST ACCOUNT (Signed to Publisher):")
    print(f"   Email:        {results['pro_artist']['email']}")
    print(f"   Password:     {results['pro_artist']['password']}")
    print(f"   Stage Name:   {results['pro_artist']['stage_name']}")
    print(f"   Artist ID:    {results['pro_artist']['artist_id']}")
    print(f"   Publisher:    {results['pro_artist']['publisher_name']}")
    
    print("\n" + "=" * 60)
    print("\n💡 NEXT STEPS:")
    print("   1. Sign in to Django admin panel with admin credentials")
    print("      URL: http://localhost:8000/admin/")
    print("   2. Sign in to self-published artist portal to upload tracks")
    print("   3. Sign in to pro artist portal (payments managed by publisher)")
    print("   4. Sign in to station portal to submit play logs")
    print("   5. Sign in to publisher portal to manage artists and royalties")
    print("   6. Test the complete royalty flow across all accounts")
    print("\n💰 ROYALTY FLOW TESTING:")
    print("   • Self-published artist receives 100% of royalties directly")
    print("   • Pro artist royalties go through publisher (50/50 split)")
    print("   • Publisher manages payments for signed artists")
    print("\n" + "=" * 60)
    print("\n🔑 ALL ACCOUNTS USE PASSWORD: Demo1234")
    print("=" * 60 + "\n")
    
    return results


if __name__ == '__main__':
    try:
        result = onboard_complete_platform()
        if result:
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
