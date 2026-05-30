# Fingerprinting Troubleshooting Guide

## The Problem You're Experiencing

✅ Upload shows **100% complete**  
❌ But fingerprints don't appear in the backend

## Root Cause

Fingerprinting is **asynchronous**—it happens in a background Celery worker, NOT in the upload request itself.

The workflow:

1. You upload a song
2. Backend immediately returns "100% complete"
3. Meanwhile, the Celery worker should process the audio in the background
4. Fingerprints get generated and saved to database

**Your issue:** The Celery worker likely isn't running or isn't processing tasks.

---

## 🔍 How to Diagnose

### Step 1: Check if Celery Worker is Running

```bash
# From your laptop (in the zamio_prototype-main directory)
docker compose -f docker-compose.local.yml ps

# Look for "celery_worker" - it should show "Up" status
# If it shows "Exited" or doesn't exist, that's the problem
```

### Step 2: Check Celery Worker Logs

```bash
# Monitor worker in real-time
docker compose -f docker-compose.local.yml logs -f celery_worker

# You should see messages like:
# - "celery@zamio_celery_worker ready"
# - "Received task: artists.tasks.process_track_upload" (when processing uploads)
```

### Step 3: Check Database for Fingerprints

```bash
# Open Django shell in the backend
docker compose -f docker-compose.local.yml exec backend python manage.py shell

# Then run:
from artists.models import Track, Fingerprint

# See all uploaded tracks
all_tracks = Track.objects.all()
print(f"Total tracks: {all_tracks.count()}")

for track in all_tracks[:5]:
    fp_count = Fingerprint.objects.filter(track=track).count()
    print(f"  {track.title} - Fingerprints: {fp_count}, Fingerprinted: {track.fingerprinted}")

# Exit with: exit()
```

### Step 4: Run the Built-in Diagnostic

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/diagnose_fingerprints.py
```

This will show you:

- How many tracks are uploaded
- How many have fingerprints
- What's wrong (if anything)

---

## 🛠️ How to Fix

### Issue A: Celery Worker Container Not Running

```bash
# Restart all services
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml up -d

# Verify the worker is running
docker compose -f docker-compose.local.yml ps
```

### Issue B: Celery Worker Running but Not Processing

Check the logs for errors:

```bash
docker compose -f docker-compose.local.yml logs celery_worker --tail=100
```

Common problems:

- **"Connection refused"** → Redis isn't running (check with `docker compose -f docker-compose.local.yml ps`)
- **"ModuleNotFoundError"** → Dependencies need reinstalling

If there's an issue, rebuild and restart:

```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up -d
```

### Issue C: Manually Trigger Fingerprinting (if Celery fails)

If you need to fingerprint manually (not ideal, but testing):

```bash
# Upload a test song first via the artist frontend

# Then run:
docker compose -f docker-compose.local.yml exec backend python manage.py shell

# In the shell:
from artists.models import Track
from artists.tasks import process_track_upload
from django.contrib.auth import get_user_model

# Get the last uploaded track
track = Track.objects.last()
User = get_user_model()
user = User.objects.first()

# Manually trigger the task
process_track_upload(
    upload_id='manual-test',
    track_id=track.id,
    source_file_path=f'temp/{track.audio_file.name}',  # May need adjustment
    original_filename=track.audio_file.name,
    user_id=user.id
)

# exit()

# Then verify:
docker compose -f docker-compose.local.yml exec backend python prototype/diagnose_fingerprints.py
```

---

## 🔄 Full Workflow Verification

### To test the complete flow:

1. **Upload a song** via artist frontend
   - Wait ~5 seconds

2. **Check if fingerprints were created**

   ```bash
   docker compose -f docker-compose.local.yml exec backend python manage.py shell
   from artists.models import Track, Fingerprint
   track = Track.objects.last()
   fp_count = Fingerprint.objects.filter(track=track).count()
   print(f"Fingerprints for '{track.title}': {fp_count}")
   ```

3. **Capture audio on mobile app**
   - The mobile app should now detect the fingerprints

4. **Check detection results**
   ```bash
   docker compose -f docker-compose.local.yml exec backend python manage.py shell
   from music_monitor.models import AudioDetection
   recent = AudioDetection.objects.order_by('-created_at')[:3]
   for det in recent:
       print(f"Detection: {det.track.title if det.track else 'NO MATCH'} - Confidence: {det.confidence}%")
   ```

---

## ⚡ Performance Note: Your Laptop Speed

Your slow laptop **CAN be a bottleneck**, but only for:

- **Converting audio** (FFmpeg conversion from MP3 → WAV takes time)
- **Generating fingerprints** (Creating ~268,000 fingerprints for a 3-min song takes ~30-60 seconds on slow hardware)

This means:

- A 3-minute song might take **2-5 minutes** to fingerprint on a slow laptop
- Check Celery logs to see the actual processing time

**It's NOT a bottleneck for:**

- Upload completion (returns instantly)
- Database storage (milliseconds)
- Mobile detection (fast)

---

## 📋 Checklist

- [ ] `docker compose ps` shows `celery_worker` as "Up"
- [ ] `docker compose logs celery_worker` shows no error messages
- [ ] Database has fingerprints: `Fingerprint.objects.count() > 0`
- [ ] Track is marked as `fingerprinted=True`
- [ ] Track is marked as `active=True` (required for matching)
- [ ] Mobile app can detect uploaded songs

If all checkboxes pass, your system is working correctly!

---

## 🆘 Still Stuck?

Run this comprehensive diagnostic:

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/diagnose_fingerprints.py
```

Share the output, and it will tell you exactly what's missing.
