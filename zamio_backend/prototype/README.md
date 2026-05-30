# Prototype Scripts

This directory contains utility scripts for quickly setting up demo data and testing scenarios.

## Quick Start

```bash
# Create ALL account types (admin, artists, station, publisher) ⭐ RECOMMENDED
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_complete.py

# Or create individually
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_admin.py
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_self_publish.py
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_pro_artist.py --create-publisher
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_station.py
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_publisher.py
```

All accounts use the password: `Demo1234`

## Available Scripts

### onboard_complete.py ⭐ (RECOMMENDED)

Creates ALL account types (admin, self-published artist, pro artist, station, publisher) for complete platform testing.

### onboard_admin.py

Creates a Django superuser/admin account with full platform access.

### onboard_self_publish.py

Creates a fully onboarded self-published artist account.

### onboard_station.py

Creates a fully onboarded radio station account with staff members and stream configuration.

### onboard_publisher.py

Creates a fully onboarded music publisher account with revenue split configuration.

### onboard_pro_artist.py

Creates a professionally published artist linked to a publisher (requires publisher ID or creates one).

### setup_genres.py

Sets up default music genres in the database (HipHop, Gospel, Jazz, Afro Pop, Rock, HighLife, etc.).

### setup_mobile_testing.py

Displays your local IP and provides step-by-step instructions for connecting your mobile app to local Docker backend.

### onboard_all.py (Legacy)

Creates both an artist and a station account (use `onboard_complete.py` instead).

### Usage

From the project root:

```bash
# Using Docker (recommended)
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_self_publish.py

# Or directly if Django is set up locally
cd zamio_backend
python prototype/onboard_self_publish.py
```

### What it does

1. Creates a new user account with verified email
2. Creates an artist profile with complete information
3. Sets up payment preferences (Mobile Money)
4. Creates a wallet/bank account
5. Configures self-publishing settings
6. Marks all onboarding steps as complete

### Output

The script outputs the generated credentials:
- Email: `artist{random}@demo.zamio.com`
- Password: `Demo1234` (simple for demo purposes)
- Stage Name: `Demo Artist {random}`

You can immediately use these credentials to sign in to the artist portal.

### Notes

- The password is intentionally simple (`Demo1234`) for demo purposes
- Each run creates a new artist with a random suffix
- All onboarding steps are marked as complete
- The artist is set as self-published (no publisher relationship)
- Verification status is set to 'verified'

---

## onboard_station.py

Creates a fully onboarded radio station account, bypassing the normal registration/verification/onboarding flow.

### Usage

From the project root:

```bash
# Using Docker (recommended)
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_station.py

# Or directly if Django is set up locally
cd zamio_backend
python prototype/onboard_station.py
```

### What it does

1. Creates a new user account with verified email
2. Creates a station profile with complete information (license, frequency, coverage area)
3. Configures stream settings (URL, monitoring, format)
4. Adds 3 staff members (Manager, Presenter, DJ) with appropriate permissions
5. Sets up payment preferences (Bank Transfer + Mobile Money)
6. Creates a wallet/bank account
7. Marks all onboarding steps as complete

### Output

The script outputs the generated credentials:
- Email: `station{random}@demo.zamio.com`
- Password: `Demo1234` (simple for demo purposes)
- Station Name: `Demo FM {random}`
- Frequency: `101.5 FM`
- License: `NCA-FM-{random}`

You can immediately use these credentials to sign in to the station portal.

### Station Details Created

- **Profile**: Complete with tagline, founded year, contact information
- **License**: NCA license with issue/expiry dates
- **Stream**: Configured with primary and backup URLs, monitoring enabled
- **Staff**: 3 members with different roles and permissions
- **Compliance**: License number, regulatory body, coverage area
- **Payment**: Bank transfer and Mobile Money configured

### Notes

- The password is intentionally simple (`Demo1234`) for demo purposes
- Each run creates a new station with a random suffix
- All onboarding steps are marked as complete
- Stream monitoring is enabled by default
- Verification status is set to 'verified'
- Station class is set to 'Class B - Regional'
- Station type is 'Commercial'

---

## onboard_all.py ⭐

Creates both an artist and a station account for complete demo setup. This is the recommended script for setting up a full testing environment.

### Usage

From the project root:

```bash
# Using Docker (recommended)
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_all.py

# Or directly if Django is set up locally
cd zamio_backend
python prototype/onboard_all.py
```

### What it does

Runs both `onboard_self_publish.py` and `onboard_station.py` in sequence to create:
1. A fully onboarded self-published artist
2. A fully onboarded radio station with staff

### Output

The script outputs credentials for both accounts:
- **Artist**: Email, password, stage name, artist ID
- **Station**: Email, password, station name, station ID

### Use Case

Perfect for:
- Complete platform testing
- Demo presentations
- Integration testing between artists and stations
- Testing the full royalty flow (station plays → artist earnings)

### Notes

- Creates independent accounts (artist and station are not linked)
- Both accounts use the same simple password (`Demo1234`)
- All onboarding steps are completed for both accounts
- Both accounts are fully verified and ready to use

---

## onboard_admin.py

Creates a Django superuser/admin account with full platform access.

### Usage

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_admin.py
```

### What it does

Creates a superuser account with:
- Full Django admin panel access
- User management capabilities
- System configuration access
- All platform features unlocked

### Output

- Email: `admin{random}@demo.zamio.com`
- Password: `Demo1234`
- Django Admin URL: `http://localhost:8000/admin/`

### Use Case

Perfect for:
- Platform administration
- User management
- System configuration
- Testing admin workflows

---

## onboard_publisher.py

Creates a fully onboarded music publisher account.

### Usage

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_publisher.py
```

### What it does

1. Creates a verified user account
2. Creates a publisher profile with company details
3. Configures revenue split (50/50 writer/publisher split)
4. Sets up payment preferences (Bank Transfer + Mobile Money)
5. Creates account settings and wallet
6. Marks all onboarding steps as complete

### Output

- Email: `publisher{random}@demo.zamio.com`
- Password: `Demo1234`
- Company Name: `Demo Music Publishing {random}`

### Publisher Details Created

- **Profile**: Company name, type, industry, founded year, employee count
- **Compliance**: Tax ID, business registration, license number
- **Revenue Split**: 50/50 split with 15% administrative fee
- **Payment**: Bank transfer and Mobile Money configured
- **Contact**: Primary contact and compliance officer details

### Notes

- Revenue split is configured as 50% writer / 50% publisher
- Administrative fee is set to 15%
- All onboarding steps are marked as complete
- Account is fully verified and ready to sign artists

---

## onboard_complete.py ⭐

Creates ALL account types for complete platform testing. This is the most comprehensive setup script.

### Usage

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_complete.py
```

### What it does

Runs all onboarding scripts in sequence to create:
1. **Admin/Superuser** - Full platform access
2. **Self-Published Artist** - With complete profile and payment setup (100% royalties)
3. **Radio Station** - With staff, stream configuration, and compliance
4. **Publisher** - With revenue split and artist management capabilities
5. **Pro Artist** - Signed to the publisher (50/50 royalty split)

### Output

The script outputs credentials for all five account types:
- **Admin**: Email, password, admin panel access
- **Self-Published Artist**: Email, password, stage name, artist ID
- **Station**: Email, password, station name, station ID
- **Publisher**: Email, password, company name, publisher ID
- **Pro Artist**: Email, password, stage name, artist ID, publisher name

### Use Case

Perfect for:
- Complete platform testing
- Demo presentations
- Integration testing across all user types
- Testing the full ecosystem (artist → station → publisher → admin)
- Testing both self-published and publisher-signed artist workflows
- Comparing royalty flows between different artist types
- Training and onboarding new team members

### Notes

- Creates independent accounts (not linked to each other)
- All accounts use the same password (`Demo1234`)
- All onboarding steps are completed for all accounts
- All accounts are fully verified and ready to use
- Provides the most comprehensive testing environment

---

## onboard_pro_artist.py

Creates a professionally published artist linked to a publisher.

### Usage

```bash
# Link to existing publisher
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_pro_artist.py --publisher-id PUB_12345678

# Create both publisher and artist
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_pro_artist.py --create-publisher

# Use any existing publisher (or create if none exists)
docker compose -f docker-compose.local.yml exec backend python prototype/onboard_pro_artist.py
```

### What it does

1. Gets or creates a publisher account
2. Creates a verified user account
3. Creates an artist profile linked to the publisher
4. Creates a publisher-artist relationship with contract details
5. Configures payment (managed by publisher)
6. Creates a wallet

### Output

- Email: `proartist{random}@demo.zamio.com`
- Password: `Demo1234`
- Stage Name: `Pro Artist {random}`
- Linked to specified or created publisher

### Artist-Publisher Relationship Details

- **Relationship Type**: Exclusive Publishing
- **Territory**: Ghana
- **Royalty Split**: 50% to publisher (configurable)
- **Advance**: GHS 5,000
- **Contract Duration**: 3 years (1 year past, 2 years future)
- **Status**: Active and approved

### Key Differences from Self-Published Artist

- **Cannot withdraw royalties directly** - all payments go through publisher
- **Publisher manages payment distribution**
- **Royalties are split according to contract terms**
- **Artist profile shows publisher relationship**
- **Payment preferences set to "managed-by-publisher"**

### Use Case

Perfect for:
- Testing publisher-artist relationships
- Testing royalty split calculations
- Testing publisher payment workflows
- Demonstrating the difference between self-published and pro artists
- Testing contract management features

### Notes

- Artist is NOT self-published (`is_self_published=False`)
- Publisher field is set on the artist model
- Active relationship is created in `PublisherArtistRelationship` table
- Payment method is set to "managed-by-publisher"
- Artist cannot withdraw royalties independently

---

## setup_genres.py

Sets up default music genres in the database.

### Usage

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/setup_genres.py
```

### What it does

Creates or updates the following genres:
- HipHop
- Gospel
- Jazz
- Afro Pop
- Rock
- HighLife
- Afrobeats
- Reggae
- R&B
- Pop
- Electronic
- Country

### Output

Shows:
- Number of genres created
- Number of genres already existing
- Number of genres updated
- List of all available genres

### Notes

- Automatically called by `onboard_complete.py`
- Safe to run multiple times (won't create duplicates)
- Updates descriptions if they've changed
- Can be run independently before creating accounts

---

## setup_mobile_testing.py

Helps configure your local environment for mobile app testing by detecting your local IP and providing setup instructions.

### Usage

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/setup_mobile_testing.py
```

### What it does

- Detects your local IP address automatically
- Provides Docker Compose configuration updates
- Shows mobile app API configuration
- Lists test URLs for verification
- Includes firewall configuration instructions
- Displays step-by-step setup guide

### Output

Shows:
- Your local IP address
- Docker Compose environment variables to update
- Flutter app API configuration
- Test URLs to verify connectivity
- Firewall configuration steps (if needed)

### Use Case

Perfect for:
- Setting up mobile app testing with local Docker backend
- Testing audio detection from physical device
- Debugging mobile app connectivity issues
- Quick reference for network configuration

### Notes

- Automatically detects your primary network IP
- Shows all available network interfaces
- Provides platform-specific firewall instructions (Windows/macOS/Linux)
- Security warnings for local testing only

---

---

## 🎵 Audio Fingerprinting & Detection

### ⚠️ CRITICAL: Algorithm Consistency

The system uses the **SIMPLE fingerprinting algorithm** for both:
- **Creating fingerprints** (when uploading tracks)
- **Matching audio** (when detecting music from mobile app)

**DO NOT mix algorithms** - fingerprints created with one algorithm won't match audio processed with another!

### upload_track_simple.py ✅ (CORRECT)

Upload and fingerprint tracks using the SIMPLE algorithm (matches detection algorithm).

```bash
# Copy audio file to Docker container
docker cp "/path/to/song.mp3" zamio_backend:/tmp/song.mp3

# Upload and fingerprint
docker compose -f docker-compose.local.yml exec backend python prototype/upload_track_simple.py /tmp/song.mp3
```

**What it does:**
1. Creates a track in the database
2. Attaches the audio file
3. Generates fingerprints using **SIMPLE algorithm**
4. Stores ~268,000 fingerprints per 3-minute song
5. Track is immediately ready for mobile detection

**Use this for:**
- Testing mobile audio detection
- Adding tracks to the detection database
- Demo purposes

### diagnose_fingerprints.py

Diagnostic tool to check fingerprint status and recent detection attempts.

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/diagnose_fingerprints.py
```

**Shows:**
- Total tracks and fingerprint counts
- Active vs inactive tracks
- Recent detection attempts and results
- Matching configuration
- Sample fingerprints from database

### list_tracks.py

Quick view of all tracks and their fingerprint algorithms.

```bash
docker compose -f docker-compose.local.yml exec backend python prototype/list_tracks.py
```

**Shows:**
- Track ID, title, active status
- Fingerprint count
- Algorithm used (simple_v1 = correct, v1.0 = old/incompatible)
- Whether audio file exists

### Key Files

**Core Algorithm (DO NOT MODIFY):**
- `zamio_backend/artists/utils/fingerprint_tracks.py` - Simple fingerprinting algorithm
- `zamio_backend/music_monitor/utils/match_engine.py` - Matching logic

**Detection Endpoint:**
- `zamio_backend/music_monitor/views/match_log_views.py` - Handles mobile uploads

**Important Notes:**
- Fingerprints are stored as strings in DB but converted to integers for matching
- Hash comparison must be exact (integer to integer)
- ~268,000 fingerprints per 3-minute song is normal
- Minimum 5 matching hashes required for detection

---

## Mobile App Testing

For detailed instructions on testing the mobile app with your local Docker backend, see [MOBILE_APP_TESTING.md](../MOBILE_APP_TESTING.md).

### Quick Start:

1. **Get your local IP:**
   ```bash
   docker compose -f docker-compose.local.yml exec backend python prototype/setup_mobile_testing.py
   ```

2. **Update docker-compose.local.yml** with your IP in `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`

3. **Restart Docker:**
   ```bash
   docker compose -f docker-compose.local.yml down
   docker compose -f docker-compose.local.yml up -d
   ```

4. **Update mobile app** API configuration with your local IP

5. **Test connectivity** from mobile browser: `http://YOUR_IP:8000/admin/`

6. **Create test data:**
   ```bash
   docker compose -f docker-compose.local.yml exec backend python prototype/onboard_complete.py
   ```

7. **Start testing** audio detection!
