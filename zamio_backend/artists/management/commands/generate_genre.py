from decimal import Decimal
import random
from artists.models import Album, Artist, Contributor, Fingerprint, Genre, Track, TrackFeedback
from bank_account.models import BankAccount
from faker import Faker
from django.core.management.base import BaseCommand
from django.utils.crypto import get_random_string
from datetime import timedelta, datetime, timedelta as dt
from django.db import transaction

from django.contrib.auth import get_user_model

from fan.models import Fan
User = get_user_model()

fake = Faker()


GENRES = ["HipHop", "Gospel", "Jazz", "Afro Pop", "Rock", "HighLife"]

class Command(BaseCommand):
    help = 'Generate genres in the database'


    def handle(self, *args, **options):
        created_count = 0
        for genre in GENRES:
            genre_obj, created = Genre.objects.get_or_create(
                name=genre,
                defaults={'description': f'{genre} music genre'}
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created genre: {genre}"))
            else:
                self.stdout.write(f"Genre already exists: {genre}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Successfully created {created_count} new genres"
        ))