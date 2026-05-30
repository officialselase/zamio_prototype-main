#!/usr/bin/env python
"""
Script to onboard a professionally published artist with publisher relationship.
This creates an artist linked to an existing publisher or creates both.

Usage:
    # Link to existing publisher
    python prototype/onboard_pro_artist.py --publisher-id PUB_12345678
    
    # Create both publisher and artist
    python prototype/onboard_pro_artist.py --create-publisher
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django environment
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from artists.models import Artist, Genre
from publishers.models import PublisherProfile, PublisherArtistRelationship
from bank_account.models import BankAccount

User = get_user_model()


def get_or_create_publisher(publisher_id=None, create_new=False):
    """Get existing publisher or create a new one"""
    
    if publisher_id:
        try:
            publisher = PublisherProfile.objects.get(publisher_id=publisher_id)
            print(f"   ✓ Found existing publisher: {publisher.company_name}")
            return publisher
        except PublisherProfile.DoesNotExist:
            print(f"   ❌ Publisher with ID {publisher_id} not found")
            sys.exit(1)
    
    if create_new:
        print("\n📚 Creating new publisher...")
        from onboard_publisher import onboard_publisher
        result = onboard_publisher()
        publisher = PublisherProfile.objects.get(publisher_id=result['publisher_id'])
        return publisher
    
    # Try to find any existing publisher
    publisher = PublisherProfile.objects.filter(active=True).first()
    if publisher:
        print(f"   ✓ Using existing publisher: {publisher.company_name}")
        return publisher
    
    # No publisher found, create one
    print("\n📚 No publisher found, creating new publisher...")
    from onboard_publisher import onboard_publisher
    result = onboard_publisher()
    publisher = PublisherProfile.objects.get(publisher_id=result['publisher_id'])
    return publisher


def onboard_pro_artist(publisher_id=None, create_publisher=False):
    """Create a professionally published artist linked to a publisher"""
    
    import random
    suffix = random.randint(1000, 9999)
    email = f"proartist{suffix}@demo.zamio.com"
    password = "Demo1234"
    stage_name = f"Pro Artist {suffix}"
    
    print("=" * 60)
    print("Creating Professionally Published Artist Account")
    print("=" * 60)
    
    # Step 1: Get or Create Publisher
    print("\n[1/6] Getting publisher...")
    publisher = get_or_create_publisher(publisher_id, create_publisher)
    
    # Step 2: Create User
    print("\n[2/6] Creating user account...")
    user = User.objects.create_user(
        email=email,
        first_name="Pro",
        last_name="Artist",
        password=password,
        is_active=True
    )
    user.user_type = "Artist"
    user.phone = "+233234567890"
    user.country = "ghana"
    user.location = "Accra, Ghana"
    user.email_verified = True
    user.verified = True
    user.profile_complete = True
    user.verification_status = 'verified'
    user.kyc_status = 'verified'
    user.save()
    print(f"   ✓ User created: {email}")
    
    # Step 3: Create Artist Profile
    print("\n[3/6] Creating artist profile...")
    
    # Get or create a default genre
    genre, _ = Genre.objects.get_or_create(
        name="Afrobeats",
        defaults={"description": "African pop music", "active": True}
    )
    
    artist = Artist.objects.create(
        user=user,
        stage_name=stage_name,
        bio=f"{stage_name} is a talented artist from Ghana, signed to {publisher.company_name}. Specializing in Afrobeats and contemporary African music.",
        location="Accra, Ghana",
        country="ghana",
        region="Greater Accra",
        primary_genre="Afrobeats",
        music_style="Contemporary Afrobeats",
        website="https://demo.zamio.com",
        instagram="https://instagram.com/proartist",
        twitter="https://twitter.com/proartist",
        facebook="https://facebook.com/proartist",
        youtube="https://youtube.com/proartist",
        spotify="https://spotify.com/artist/pro",
        verification_status='verified',
        is_self_published=False,  # NOT self-published
        publisher=publisher,  # Link to publisher
        onboarding_step='done',
        profile_completed=True,
        social_media_added=True,
        payment_info_added=True,
        publisher_added=True,
        active=True
    )
    print(f"   ✓ Artist profile created: {stage_name}")
    print(f"   ✓ Linked to publisher: {publisher.company_name}")
    
    # Step 4: Create Publisher-Artist Relationship
    print("\n[4/6] Creating publisher-artist relationship...")
    relationship = PublisherArtistRelationship.objects.create(
        publisher=publisher,
        artist=artist,
        relationship_type='exclusive',
        territory='Ghana',
        worldwide=False,
        royalty_split_percentage=publisher.publisher_split or Decimal("50.00"),
        advance_amount=Decimal("5000.00"),
        start_date=date.today() - timedelta(days=365),  # Started 1 year ago
        end_date=date.today() + timedelta(days=730),  # Ends in 2 years
        status='active',
        approved_by_admin=True,
        approved_by_artist=True,
        notes=f"Exclusive publishing agreement between {publisher.company_name} and {stage_name}"
    )
    print(f"   ✓ Relationship created: {relationship.relationship_type}")
    print(f"   ✓ Royalty split: {relationship.royalty_split_percentage}% to publisher")
    print(f"   ✓ Advance: GHS {relationship.advance_amount}")
    
    # Step 5: Add Payment Info (managed by publisher)
    print("\n[5/6] Setting up payment information...")
    artist.payment_preferences = {
        "preferred_method": "managed-by-publisher",
        "currency": "GHS",
        "publisher_id": str(publisher.publisher_id),
        "publisher_name": publisher.company_name,
        "note": "Payments managed through publisher"
    }
    artist.publisher_preferences = {
        "publisher_id": str(publisher.publisher_id),
        "publisher_name": publisher.company_name,
        "relationship_type": "exclusive",
        "royalty_split": float(relationship.royalty_split_percentage),
        "agreed_to_terms": True
    }
    artist.save()
    print("   ✓ Payment preferences configured (Managed by Publisher)")
    
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
    print("✓ PRO ARTIST ONBOARDING COMPLETE")
    print("=" * 60)
    print(f"\nArtist Details:")
    print(f"  Stage Name:    {artist.stage_name}")
    print(f"  Artist ID:     {artist.artist_id}")
    print(f"  Email:         {user.email}")
    print(f"  Password:      {password}")
    print(f"  User Type:     {user.user_type}")
    print(f"  Location:      {artist.location}")
    print(f"  Genre:         {artist.primary_genre}")
    print(f"  Publishing:    Professionally Published")
    print(f"  Verification:  {artist.verification_status}")
    print(f"  Onboarding:    {artist.onboarding_step}")
    print(f"\nPublisher Relationship:")
    print(f"  Publisher:        {publisher.company_name}")
    print(f"  Publisher ID:     {publisher.publisher_id}")
    print(f"  Relationship:     {relationship.relationship_type}")
    print(f"  Territory:        {relationship.territory}")
    print(f"  Royalty Split:    {relationship.royalty_split_percentage}% to publisher")
    print(f"  Advance:          GHS {relationship.advance_amount}")
    print(f"  Contract Start:   {relationship.start_date}")
    print(f"  Contract End:     {relationship.end_date}")
    print(f"  Status:           {relationship.status}")
    print(f"\nPayment Method:  Managed by Publisher")
    print(f"Wallet Balance:  {bank_account.balance} {bank_account.currency}")
    print("\n" + "=" * 60)
    print("\n💡 IMPORTANT:")
    print("   • This artist CANNOT withdraw royalties directly")
    print("   • All royalty payments go through the publisher")
    print("   • Publisher manages payment distribution")
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
        'user_id': str(user.user_id),
        'publisher_id': str(publisher.publisher_id),
        'publisher_name': publisher.company_name,
        'relationship_id': relationship.id
    }


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Onboard a professionally published artist')
    parser.add_argument('--publisher-id', type=str, help='Existing publisher ID to link to')
    parser.add_argument('--create-publisher', action='store_true', help='Create a new publisher')
    
    args = parser.parse_args()
    
    try:
        result = onboard_pro_artist(
            publisher_id=args.publisher_id,
            create_publisher=args.create_publisher
        )
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
