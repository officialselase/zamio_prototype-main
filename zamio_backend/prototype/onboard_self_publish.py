#!/usr/bin/env python
"""
Script to onboard a self-published artist directly into the database.
This bypasses the normal registration/verification/onboarding flow for demo purposes.

Usage:
    python prototype/onboard_self_publish.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
# Get the directory containing this script
script_dir = os.path.dirname(os.path.abspath(__file__))
# Go up one level to zamio_backend directory
backend_dir = os.path.dirname(script_dir)
# Add to path if not already there
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from artists.models import Artist, Genre
from bank_account.models import BankAccount

User = get_user_model()


def generate_demo_credentials():
    """Generate simple demo credentials"""
    import random
    suffix = random.randint(1000, 9999)
    email = f"artist{suffix}@demo.zamio.com"
    password = "Demo1234"  # Simple password for demo
    stage_name = f"Demo Artist {suffix}"
    return email, password, stage_name


def onboard_self_published_artist():
    """Create a fully onboarded self-published artist"""
    
    email, password, stage_name = generate_demo_credentials()
    
    print("=" * 60)
    print("Creating Self-Published Artist Account")
    print("=" * 60)
    
    # Step 1: Create User
    print("\n[1/5] Creating user account...")
    user = User.objects.create_user(
        email=email,
        first_name="Demo",
        last_name="Artist",
        password=password,
        is_active=True
    )
    user.user_type = "Artist"
    user.phone = "+233123456789"
    user.country = "ghana"
    user.location = "Accra, Ghana"
    user.email_verified = True
    user.verified = True
    user.profile_complete = True
    user.verification_status = 'verified'
    user.kyc_status = 'verified'
    user.save()
    print(f"   ✓ User created: {email}")
    
    # Step 2: Create Artist Profile
    print("\n[2/5] Creating artist profile...")
    
    # Get or create a default genre
    genre, _ = Genre.objects.get_or_create(
        name="Afrobeats",
        defaults={"description": "African pop music", "active": True}
    )
    
    artist = Artist.objects.create(
        user=user,
        stage_name=stage_name,
        bio=f"{stage_name} is a talented artist from Ghana, specializing in Afrobeats and contemporary African music.",
        location="Accra, Ghana",
        country="ghana",
        region="Greater Accra",
        primary_genre="Afrobeats",
        music_style="Contemporary Afrobeats",
        website="https://demo.zamio.com",
        instagram="https://instagram.com/demoartist",
        twitter="https://twitter.com/demoartist",
        facebook="https://facebook.com/demoartist",
        youtube="https://youtube.com/demoartist",
        spotify="https://spotify.com/artist/demo",
        verification_status='verified',
        is_self_published=True,
        publisher=None,
        onboarding_step='done',
        profile_completed=True,
        social_media_added=True,
        payment_info_added=True,
        publisher_added=True,
        active=True
    )
    print(f"   ✓ Artist profile created: {stage_name}")
    
    # Step 3: Add Payment Info
    print("\n[3/5] Setting up payment information...")
    artist.payment_preferences = {
        "preferred_method": "mobile-money",
        "currency": "GHS",
        "mobile_provider": "MTN",
        "mobile_number": "+233123456789",
        "mobile_account_name": f"{user.first_name} {user.last_name}"
    }
    artist.save()
    print("   ✓ Payment preferences configured (Mobile Money)")
    
    # Step 4: Create Bank Account/Wallet
    print("\n[4/5] Creating wallet...")
    bank_account, created = BankAccount.objects.get_or_create(
        user=user,
        defaults={
            'balance': Decimal('0.00'),
            'currency': "GHS",
        }
    )
    print(f"   ✓ Wallet created with balance: {bank_account.balance} {bank_account.currency}")
    
    # Step 5: Set Publisher Preferences (Self-Published)
    print("\n[5/5] Configuring self-publishing settings...")
    artist.publisher_preferences = {
        "self_publish": True,
        "publisher_id": None,
        "publisher_name": None,
        "agreed_to_terms": True
    }
    artist.save()
    print("   ✓ Self-publishing configured")
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ ARTIST ONBOARDING COMPLETE")
    print("=" * 60)
    print(f"\nArtist Details:")
    print(f"  Stage Name:    {artist.stage_name}")
    print(f"  Artist ID:     {artist.artist_id}")
    print(f"  Email:         {user.email}")
    print(f"  Password:      {password}")
    print(f"  User Type:     {user.user_type}")
    print(f"  Location:      {artist.location}")
    print(f"  Genre:         {artist.primary_genre}")
    print(f"  Publishing:    Self-Published")
    print(f"  Verification:  {artist.verification_status}")
    print(f"  Onboarding:    {artist.onboarding_step}")
    print(f"\nPayment Method:  {artist.payment_preferences.get('preferred_method', 'N/A')}")
    print(f"Wallet Balance:  {bank_account.balance} {bank_account.currency}")
    print("\n" + "=" * 60)
    print("\nYou can now use these credentials to sign in:")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    print("=" * 60 + "\n")
    
    return {
        'email': email,
        'password': password,
        'stage_name': stage_name,
        'artist_id': artist.artist_id,
        'user_id': str(user.user_id)
    }


if __name__ == '__main__':
    try:
        result = onboard_self_published_artist()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
