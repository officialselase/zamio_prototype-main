#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = script_dir
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from artists.models import Genre

genres_to_add = [
    'HipHop', 'Gospel', 'Jazz', 'Afro Pop', 'Rock', 'HighLife', 'Afrobeats',
    'Reggae', 'R&B', 'Pop', 'Electronic', 'Country'
]

for name in genres_to_add:
    genre, created = Genre.objects.get_or_create(
        name=name,
        defaults={'active': True, 'is_archived': False}
    )
    if created:
        print(f"Created genre: {name}")
    else:
        print(f"Genre already exists: {name}")

print("Genres seeded.")