#!/usr/bin/env python
import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zamio_backend.settings')
django.setup()

from artists.models import Track, Fingerprint

tracks = Track.objects.all()
for t in tracks:
    fp_count = Fingerprint.objects.filter(track=t).count()
    fp = Fingerprint.objects.filter(track=t).first()
    algo = fp.algorithm_version if fp else "None"
    print(f"Track {t.id}: {t.title}, Active: {t.active}, Fingerprints: {fp_count}, Algorithm: {algo}, Audio: {bool(t.audio_file)}")
