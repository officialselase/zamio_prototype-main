# Mobile App Testing with Local Docker Backend

This guide explains how to connect your physical mobile device (Android/iOS) to your local Docker backend for testing audio detection and match making.

## Prerequisites

- Docker and Docker Compose installed
- Physical mobile device (Android or iOS)
- Mobile device and computer on the same WiFi network
- ZamIO mobile app installed on device

## Step 1: Find Your Local IP Address

### Windows:
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

### macOS/Linux:
```bash
ifconfig
# or
ip addr show
```
Look for your local IP (usually starts with 192.168.x.x or 10.0.x.x)

**Example:** `192.168.1.100`

## Step 2: Update Docker Configuration

You need to update the `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` in your Docker Compose file to include your local IP.

Edit `docker-compose.local.yml`:

```yaml
backend:
  environment:
    ALLOWED_HOSTS: localhost,127.0.0.1,backend,192.168.1.100  # Add your IP
    CSRF_TRUSTED_ORIGINS: http://localhost:8000,http://127.0.0.1:8000,http://192.168.1.100:8000  # Add your IP
    BASE_URL: http://192.168.1.100:8000  # Use your IP
```

**Replace `192.168.1.100` with your actual local IP address.**

## Step 3: Restart Docker Services

```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml up -d
```

## Step 4: Verify Backend is Accessible

From your mobile device's browser, navigate to:
```
http://192.168.1.100:8000/admin/
```
(Replace with your IP)

You should see the Django admin login page. If you can't access it:
- Check your firewall settings
- Ensure both devices are on the same network
- Verify the IP address is correct

## Step 5: Configure Mobile App

Update the API URL in your Flutter mobile app:

### Option A: Environment Variable (Recommended)
Create or update `zamio_app/lib/config/api_config.dart`:

```dart
class ApiConfig {
  // For local testing, use your computer's local IP
  static const String baseUrl = 'http://192.168.1.100:8000';
  
  // For production
  // static const String baseUrl = 'https://api.zamio.com';
  
  static const String apiUrl = '$baseUrl/api';
}
```

### Option B: Direct Update
Find where the API URL is defined in your Flutter app and update it to:
```dart
const String apiUrl = 'http://192.168.1.100:8000/api';
```

## Step 6: Setup Test Data

Run the complete onboarding script to create test accounts and data:

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_complete.py
```

This creates:
- Admin account
- Self-published artist with tracks
- Pro artist signed to publisher
- Radio station
- Publisher account
- Default genres

## Step 7: Upload Test Tracks

You need tracks in the database for the mobile app to detect. You can:

### Option A: Use Django Admin
1. Sign in to admin panel: `http://192.168.1.100:8000/admin/`
2. Use admin credentials from onboarding script
3. Navigate to Artists → Tracks
4. Upload audio files

### Option B: Use Artist Portal
1. Navigate to: `http://192.168.1.100:5173/`
2. Sign in with artist credentials from onboarding script
3. Upload tracks through the UI

## Step 8: Test Audio Detection

### On Your Mobile Device:

1. **Open the ZamIO mobile app**
2. **Sign in** with station credentials (or create a station account)
3. **Start audio capture/monitoring**
4. **Play music** from the uploaded tracks (from computer speakers or another device)
5. **Verify detection** - the app should:
   - Capture audio samplesic an
   - Send to backend for fingerprinting
   - Match against database
   - Display matched tracks

## Troubleshooting

### Mobile App Can't Connect to Backend

**Check Network:**
```bash
# From your computer, ping your IP
ping 192.168.1.100
```

**Check Firewall:**
- Windows: Allow port 8000 in Windows Firewall
- macOS: System Preferences → Security & Privacy → Firewall → Firewall Options
- Linux: `sudo ufw allow 8000`

**Verify Docker is Running:**
```bash
docker compose -f docker-compose.local.yml ps
```

### Audio Detection Not Working

**Check Backend Logs:**
```bash
docker compose -f docker-compose.local.yml logs -f backend
```

**Check Celery Worker (processes audio):**
```bash
docker compose -f docker-compose.local.yml logs -f celery_worker
```

**Verify Tracks are Fingerprinted:**
```bash
docker compose -f docker-compose.local.yml exec backend python manage.py shell
```
```python
from artists.models import Track
tracks = Track.objects.filter(fingerprinted=True)
print(f"Fingerprinted tracks: {tracks.count()}")
```

### CORS Issues

If you see CORS errors in mobile app logs, update Django settings:

```bash
docker compose -f docker-compose.local.yml exec backend python manage.py shell
```
```python
# Check CORS settings
from django.conf import settings
print(settings.CORS_ALLOWED_ORIGINS)
```

## API Endpoints for Mobile App

The mobile app will use these endpoints:

### Authentication:
- `POST /api/accounts/login/` - Login
- `POST /api/accounts/register-station/` - Register station

### Audio Detection:
- `POST /api/music-monitor/detect/` - Submit audio for detection
- `GET /api/music-monitor/matches/` - Get match results
- `POST /api/music-monitor/submit-playlog/` - Submit play log

### Sync:
- `GET /api/artists/tracks/` - Get track list
- `POST /api/stations/sync/` - Sync offline data

## Testing Workflow

1. **Upload tracks** via artist portal
2. **Wait for fingerprinting** (check Celery logs)
3. **Open mobile app** on physical device
4. **Start monitoring** in the app
5. **Play uploaded tracks** from computer/speakers
6. **Verify detection** in mobile app
7. **Check play logs** in station portal

## Network Configuration Summary

| Service | Port | URL |
|---------|------|-----|
| Backend API | 8000 | http://192.168.1.100:8000 |
| Artist Portal | 5173 | http://192.168.1.100:5173 |
| Station Portal | 5174 | http://192.168.1.100:5174 |
| Publisher Portal | 5175 | http://192.168.1.100:5175 |
| Admin Portal | 5176 | http://192.168.1.100:5176 |
| Django Admin | 8000 | http://192.168.1.100:8000/admin/ |

## Security Notes

⚠️ **This configuration is for LOCAL TESTING ONLY**

- Do NOT use in production
- Do NOT expose to the internet
- Keep on local network only
- Use proper authentication in production

## Quick Reference Commands

```bash
# Start services
docker compose -f docker-compose.local.yml up -d

# Stop services
docker compose -f docker-compose.local.yml down

# View logs
docker compose -f docker-compose.local.yml logs -f backend

# Create test accounts
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_complete.py

# Django shell
docker compose -f docker-compose.local.yml exec backend python manage.py shell

# Check fingerprinted tracks
docker compose -f docker-compose.local.yml exec backend python manage.py shell -c "from artists.models import Track; print(f'Fingerprinted: {Track.objects.filter(fingerprinted=True).count()}')"
```

## Next Steps

After successful testing:
1. Document any issues found
2. Test offline sync functionality
3. Test with poor network conditions
4. Verify battery usage during monitoring
5. Test with different audio qualities
