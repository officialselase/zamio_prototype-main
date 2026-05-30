# 🎵 ZamIO Demo Setup Guide - Complete Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       MOBILE APP (Flutter)                      │
│  • Audio Capture & Fingerprinting                               │
│  • Sync Service (uploads captured audio)                        │
│  • Foreground Service for background listening                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Django + Celery)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LISTENING PIPELINE (music_monitor app)                 │  │
│  │  • Stream Monitoring Service                            │  │
│  │  • Audio Detection (ACRCloud + Hybrid)                  │  │
│  │  • Fingerprint Matching                                 │  │
│  │  • MatchCache (raw detections)                          │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  PLAYLOG PROCESSING                                      │  │
│  │  • PlayLog model (confirmed plays)                      │  │
│  │  • Verification & Dispute Handling                      │  │
│  │  • Audio Detection records                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  ROYALTY SYSTEM (royalties app)                          │  │
│  │  • RoyaltyCalculator (calculates splits)                │  │
│  │  • RoyaltyDistribution (routes payments)                │  │
│  │  • PublisherArtistSubDistribution (publisher splits)    │  │
│  │  • RoyaltyLineItem (line-by-line tracking)              │  │
│  │  • PartnerPRO & ReciprocalAgreement (PRO integration)   │  │
│  │  • RoyaltyWithdrawal (withdrawal processing)            │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  PAYMENT INFRASTRUCTURE                                  │  │
│  │  • Station wallets & deposits                           │  │
│  │  • Publisher/Artist wallets                             │  │
│  │  • Withdrawal queues                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  🗄️  PostgreSQL + Redis (Celery tasks)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Start Docker Backend

```bash
# Navigate to project root
cd /Users/samawyna/Downloads/zamio_prototype-main

# Start all services (postgres, redis, django, celery worker, celery beat)
docker compose -f docker-compose.local.yml up -d

# Verify services are running
docker compose -f docker-compose.local.yml ps
```

Expected output:

```
NAME                          STATUS
zamio_postgres               Up (healthy)
zamio_redis                  Up (healthy)
zamio_backend                Up
zamio_celery_worker          Up
zamio_celery_beat            Up
```

**Check Docker logs:**

```bash
# Backend logs
docker logs zamio_backend

# Celery worker logs
docker logs zamio_celery_worker

# Look for these indicators:
# ✅ "Django version 5.x..."
# ✅ "Starting development server at http://0.0.0.0:8000/"
# ✅ "celery@... ready"
```

---

## Phase 2: Build & Configure Mobile App APK

### Option A: Build APK from Source (Recommended for Demo)

```bash
# Navigate to mobile app
cd zamio_app

# Ensure Flutter is installed
flutter --version

# Get dependencies
flutter pub get

# Build APK (debug for faster builds)
flutter build apk --debug

# APK location
# Build outputs to: zamio_app/build/app/outputs/flutter-apk/app-debug.apk
```

### Option B: Download Pre-built APK

If available in release artifacts or CI/CD pipeline:

```bash
# Check if pre-built APK exists
ls -la build/app/outputs/flutter-apk/
```

### Option C: Use Local Network for Testing

If building locally, you can test on Android Studio emulator:

```bash
flutter run -d emulator-5554
```

---

## Phase 3: Connect Mobile App to Backend

### Update Backend IP in Docker Compose

Get your local IP:

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1

# Example output: 192.168.1.100
```

Update `docker-compose.local.yml`:

```yaml
backend:
  environment:
    ALLOWED_HOSTS: localhost,127.0.0.1,backend,192.168.1.100 # ← YOUR IP
    CSRF_TRUSTED_ORIGINS: http://localhost:8000,http://127.0.0.1:8000,http://192.168.1.100:8000
    BASE_URL: http://192.168.1.100:8000
```

Then restart:

```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml up -d
```

### Mobile App Backend Configuration

Edit `zamio_app/lib/services/sync_service.dart`:

```dart
// Look for API_BASE_URL constant
const String API_BASE_URL = 'http://192.168.1.100:8000';  // ← YOUR IP

// Or check if using environment config
final String backendUrl = '192.168.1.100:8000';
```

Also check `zamio_app/lib/auth_store.dart` for backend endpoint configuration.

---

## Phase 4: Verify Data Flow - Listening Pipeline

The listening pipeline has these key components:

### 1. **Audio Capture & Fingerprinting** (Music Monitor)

**Endpoint:** `POST /api/music-monitor/detect/`

```bash
curl -X POST http://192.168.1.100:8000/api/music-monitor/detect/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "audio=@test_audio.wav" \
  -F "station_id=1"
```

**Response includes:**

```json
{
  "match_status": "matched",
  "track_id": 123,
  "track": {
    "title": "Song Name",
    "artist": "Artist Name",
    "isrc": "ISRC123456"
  },
  "confidence": 0.95,
  "audio_detection_id": "uuid",
  "match_cache_id": "uuid"
}
```

### 2. **Stream Monitoring** (Listening Pipeline)

**Endpoint:** `POST /api/music-monitor/start-monitoring/`

```bash
# Start monitoring a radio stream
curl -X POST http://192.168.1.100:8000/api/music-monitor/start-monitoring/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stream_url": "http://stream.example.com/radio.m3u8",
    "station_id": 1
  }'

# Response
{
  "session_id": "uuid-of-monitoring-session",
  "message": "Stream monitoring started successfully"
}
```

**Monitor the detection pipeline:**

```bash
# Check active MatchCache records (raw detections)
curl http://192.168.1.100:8000/api/music-monitor/match-logs/ \
  -H "Authorization: Token YOUR_TOKEN"

# Should show recent matches with status 'pending' or 'verified'
```

### 3. **PlayLog Processing** (Verified Plays)

Once matches are verified, they convert to PlayLog records:

```bash
# View PlayLogs (only verified plays generate royalties)
curl http://192.168.1.100:8000/api/playlog/ \
  -H "Authorization: Token YOUR_TOKEN"

# Response includes:
# - track: which song was played
# - station: where it was played
# - played_at: when
# - royalty_amount: how much it earned
# - verification_status: 'verified', 'pending', 'disputed', 'rejected'
```

---

## Phase 5: Verify Royalty System Connected

### 1. **Check Royalty Calculation Pipeline**

```bash
# Trigger royalty calculation (usually done by Celery beat on schedule)
curl -X POST http://192.168.1.100:8000/api/royalties/calculate-cycle/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": 1,
    "start_date": "2024-04-01",
    "end_date": "2024-04-30"
  }'

# Response
{
  "cycle_id": 123,
  "total_plays": 450,
  "total_royalties": "1250.50",
  "distributions": [
    {
      "recipient": "artist@example.com",
      "amount": "1062.93",
      "type": "artist"
    },
    {
      "recipient": "publisher@example.com",
      "amount": "187.57",
      "type": "publisher"
    }
  ]
}
```

### 2. **View Royalty Distributions**

```bash
# Get royalty line items for a specific cycle
curl http://192.168.1.100:8000/api/royalties/line-items/?cycle_id=123 \
  -H "Authorization: Token YOUR_TOKEN"

# Response shows:
# - Each PlayLog's contribution to royalties
# - Split between artist/publisher/PRO
# - Currency and exchange rates
# - Recipient routing information
```

### 3. **Check Publisher Splits** (Publisher-Artist Sub-Distribution)

```bash
# Get publisher's sub-distributions (how publisher splits with artists)
curl http://192.168.1.100:8000/api/royalties/publisher-splits/ \
  -H "Authorization: Token YOUR_TOKEN"

# Shows:
# - Total received by publisher
# - Publisher fee (typically 15%)
# - Net paid to artists
# - Payment status
```

### 4. **Partner PRO Integration**

```bash
# List configured PRO partners
curl http://192.168.1.100:8000/api/royalties/partners/ \
  -H "Authorization: Token YOUR_TOKEN"

# Should show:
# - PartnerPRO records (ASCAP, BMI, GHAMRO, etc.)
# - Reporting standards
# - API integration settings
# - Last sync information
```

---

## Phase 6: Complete Data Flow Test

### Test Scenario: Single Play Detection to Royalty

```
1. Mobile App Captures Audio
   └─> /api/music-monitor/detect/
   └─> Creates AudioDetection + MatchCache
   └─> Confidence: 0.95

2. Backend Verifies Match
   └─> MatchCache status: "verified"
   └─> Creates PlayLog
   └─> Sets verification_status: "verified"

3. Celery Task: Calculate Royalties
   └─> Finds all verified PlayLogs
   └─> RoyaltyCalculator determines:
       • Base rate per second
       • Station class multiplier (A/B/C/Online)
       • Time-of-day multiplier (prime/regular/off-peak)
       • Track duration
       └─> Total: 50 GHS gross

4. Royalty Distribution
   └─> Artist gets 85% (42.5 GHS)
   └─> Publisher gets 15% (7.5 GHS)
   └─> Or if PRO partner: routes via PartnerPRO logic

5. Payment Records Created
   └─> RoyaltyLineItem (accounting)
   └─> RoyaltyDistribution (payment routing)
   └─> PublisherArtistSubDistribution (if applicable)
   └─> PartnerRemittance (if PRO involved)

6. Withdrawal Processing
   └─> Artist/Publisher can withdraw earnings
   └─> Creates RoyaltyWithdrawal record
   └─> Status: pending → processing → completed
```

---

## Phase 7: Key Files & Connection Points

### Mobile App (Flutter)

- **Entry:** `lib/main.dart` - App initialization
- **Services:** `lib/services/sync_service.dart` - Backend sync
- **Backend config:** Check for `API_BASE_URL` or `backend_url`
- **Audio capture:** `lib/RadioSniffer.dart` - Main listening logic
- **Database:** `lib/services/database_service.dart` - Local storage

### Backend (Django)

- **Listening Pipeline:** `zamio_backend/music_monitor/`
  - `services/stream_monitoring_service.py` - Real-time stream monitoring
  - `views/match_log_views.py` - Match detection endpoints
  - `models.py` - MatchCache, PlayLog, AudioDetection
- **Royalty System:** `zamio_backend/royalties/`
  - `calculator.py` - RoyaltyCalculator (main logic)
  - `views.py` - Royalty endpoints
  - `models.py` - RoyaltyLineItem, Distribution, PRO models
- **Task Queue:** `zamio_backend/royalties/tasks.py`
  - Celery tasks for async royalty calculation
- **Database:** PostgreSQL (docker service)
- **Cache/Queue:** Redis (docker service)

### Docker Compose Setup

- `docker-compose.local.yml` - Local development stack
  - All 5 services must be healthy before testing

---

## Phase 8: Troubleshooting Connection Issues

### Backend Won't Start

```bash
# Check logs
docker logs zamio_backend

# Common issues:
# • Migration errors: docker exec zamio_backend python manage.py migrate
# • Static files: docker exec zamio_backend python manage.py collectstatic --noinput
# • Permissions: docker exec zamio_backend chown -R app:app /app
```

### Mobile App Can't Connect to Backend

```bash
# 1. Verify backend is reachable
ping 192.168.1.100

# 2. Check if port 8000 is open
nc -zv 192.168.1.100 8000

# 3. Test API directly
curl http://192.168.1.100:8000/api/health/

# 4. Check ALLOWED_HOSTS in docker-compose.local.yml
# 5. Verify BASE_URL matches mobile app config
```

### Audio Detection Not Working

```bash
# Check if music_monitor service is running
docker exec zamio_backend python manage.py shell
>>> from music_monitor.models import MatchCache
>>> MatchCache.objects.count()  # Should have records

# Verify stream monitoring session is active
docker exec zamio_backend python manage.py shell
>>> from music_monitor.utils.stream_monitor import active_sessions
>>> len(active_sessions)  # Should be > 0 if monitoring

# Check Celery worker is processing tasks
docker logs zamio_celery_worker | grep -i "received\|completed"
```

### Royalty Calculation Failing

```bash
# Check if there are verified PlayLogs
curl http://192.168.1.100:8000/api/playlog/?verification_status=verified \
  -H "Authorization: Token YOUR_TOKEN"

# If empty, matches aren't being verified
# Check MatchCache status
curl http://192.168.1.100:8000/api/music-monitor/match-logs/ \
  -H "Authorization: Token YOUR_TOKEN"

# Should see recent matches with 'verified' status
```

---

## Demo Checklist

- [ ] Docker services running (`docker compose -f docker-compose.local.yml ps`)
- [ ] Backend accessible (`curl http://192.168.1.100:8000/api/health/`)
- [ ] Mobile app built (`flutter build apk --debug`)
- [ ] Mobile app configured with backend IP
- [ ] Audio test file created or stream available
- [ ] Audio detection working (test with `/api/music-monitor/detect/`)
- [ ] PlayLog records created
- [ ] Royalty calculation triggered
- [ ] Royalty distributions visible in API
- [ ] Publisher splits calculated correctly
- [ ] PRO partner sync working (if applicable)

---

## Next Steps for Full Demo

1. **Seed test data** - Create test stations, artists, tracks
2. **Test end-to-end flow** - Capture audio → detect → create PlayLog → calculate royalties
3. **Test mobile app flow** - Install APK → capture → upload → see results
4. **Test withdrawal system** - Create withdrawal request → process → verify payment
5. **Test dispute system** - Create dispute → resolution → impact on royalties
