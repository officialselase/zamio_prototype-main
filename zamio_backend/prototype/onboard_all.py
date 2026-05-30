#!/usr/bin/env python
"""
Script to onboard both an artist and a station for complete demo setup.
This creates a full ecosystem for testing the platform.

Usage:
    python prototype/onboard_all.py
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
from onboard_self_publish import onboard_self_published_artist
from onboard_station import onboard_station


def onboard_complete_demo():
    """Create both artist and station accounts for complete demo"""
    
    print("\n" + "=" * 60)
    print("ZAMIO PLATFORM - COMPLETE DEMO SETUP")
    print("=" * 60)
    print("\nThis will create:")
    print("  • 1 Self-Published Artist Account")
    print("  • 1 Radio Station Account (with 3 staff members)")
    print("\n" + "=" * 60 + "\n")
    
    results = {}
    
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
    
    # Final summary
    print("\n" + "=" * 60)
    print("✓ COMPLETE DEMO SETUP FINISHED")
    print("=" * 60)
    print("\n📋 SUMMARY OF CREATED ACCOUNTS:\n")
    
    print("🎵 ARTIST ACCOUNT:")
    print(f"   Email:      {results['artist']['email']}")
    print(f"   Password:   {results['artist']['password']}")
    print(f"   Stage Name: {results['artist']['stage_name']}")
    print(f"   Artist ID:  {results['artist']['artist_id']}")
    
    print("\n📻 STATION ACCOUNT:")
    print(f"   Email:        {results['station']['email']}")
    print(f"   Password:     {results['station']['password']}")
    print(f"   Station Name: {results['station']['station_name']}")
    print(f"   Station ID:   {results['station']['station_id']}")
    
    print("\n" + "=" * 60)
    print("\n💡 NEXT STEPS:")
    print("   1. Sign in to the artist portal with the artist credentials")
    print("   2. Upload tracks and view your artist dashboard")
    print("   3. Sign in to the station portal with the station credentials")
    print("   4. Submit play logs and monitor your stream")
    print("   5. View analytics and royalty calculations")
    print("\n" + "=" * 60 + "\n")
    
    return results


if __name__ == '__main__':
    try:
        result = onboard_complete_demo()
        if result:
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
