#!/usr/bin/env python
"""
Script to setup default genres in the database.

Usage:
    python prototype/setup_genres.py
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

from artists.models import Genre

# Define genres to create
GENRES = [
    {"name": "HipHop", "description": "Hip-Hop and Rap music"},
    {"name": "Gospel", "description": "Gospel and Christian music"},
    {"name": "Jazz", "description": "Jazz and Blues music"},
    {"name": "Afro Pop", "description": "Afro Pop and Afrobeats music"},
    {"name": "Rock", "description": "Rock and Alternative music"},
    {"name": "HighLife", "description": "HighLife and traditional African music"},
    {"name": "Afrobeats", "description": "Contemporary Afrobeats music"},
    {"name": "Reggae", "description": "Reggae and Dancehall music"},
    {"name": "R&B", "description": "Rhythm and Blues music"},
    {"name": "Pop", "description": "Pop music"},
    {"name": "Electronic", "description": "Electronic and Dance music"},
    {"name": "Country", "description": "Country and Folk music"},
]


def setup_genres():
    """Create default genres if they don't exist"""
    
    print("=" * 60)
    print("Setting Up Music Genres")
    print("=" * 60)
    
    created_count = 0
    existing_count = 0
    updated_count = 0
    
    print(f"\n📚 Processing {len(GENRES)} genres...\n")
    
    for genre_data in GENRES:
        genre_name = genre_data["name"]
        genre_desc = genre_data["description"]
        
        genre, created = Genre.objects.get_or_create(
            name=genre_name,
            defaults={
                'description': genre_desc,
                'active': True
            }
        )
        
        if created:
            created_count += 1
            print(f"   ✓ Created: {genre_name}")
        else:
            existing_count += 1
            # Update description if it's different
            if genre.description != genre_desc:
                genre.description = genre_desc
                genre.save()
                updated_count += 1
                print(f"   ↻ Updated: {genre_name}")
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ GENRE SETUP COMPLETE")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  Created:  {created_count} new genre(s)")
    print(f"  Existing: {existing_count} genre(s) already in database")
    if updated_count > 0:
        print(f"  Updated:  {updated_count} genre(s)")
    print(f"  Total:    {Genre.objects.filter(active=True).count()} active genres")
    print("\n" + "=" * 60)
    
    # List all genres
    print("\n📋 Available Genres:\n")
    for genre in Genre.objects.filter(active=True).order_by('name'):
        print(f"   • {genre.name} - {genre.description}")
    print("\n" + "=" * 60 + "\n")
    
    return {
        'created': created_count,
        'existing': existing_count,
        'updated': updated_count,
        'total': Genre.objects.filter(active=True).count()
    }


if __name__ == '__main__':
    try:
        result = setup_genres()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
