# Dispute System Integration Fix

## Problem
Tracks flagged as disputed in `zamio_frontend`, `zamio_publisher`, and `zamio_stations` were not appearing in the `zamio_admin` dispute page.

## Root Cause
The platform has **two separate dispute systems**:

1. **Old System** (`music_monitor.models.Dispute`) - Used by stations/artists/publishers when flagging playlogs
2. **New System** (`disputes.models.Dispute`) - Formal dispute management system used by admin panel

When stations flagged playlogs, only the old dispute system was updated. The admin panel queries the new dispute system, so it showed no records.

## Solution Implemented

### 1. Updated `flag_match_for_dispute` View
**File**: `zamio_backend/music_monitor/views/dispute_views.py`

Modified the view to create records in BOTH dispute systems when a playlog is flagged:
- Creates/updates old `music_monitor.Dispute` (for backward compatibility)
- Creates/updates new `disputes.Dispute` (for admin panel visibility)
- Links both records via metadata for future reference

### 2. Updated `review_match_for_dispute` View
**File**: `zamio_backend/music_monitor/views/dispute_views.py`

Modified the view to update BOTH dispute systems when a dispute is resolved:
- Updates old dispute status to "Resolved"
- Updates formal dispute status to `DisputeStatus.RESOLVED`
- Sets resolution timestamps on both records

### 3. Created Migration Command
**File**: `zamio_backend/disputes/management/commands/migrate_old_disputes.py`

Created a Django management command to migrate existing old disputes to the new system:

```bash
# Dry run (preview what would be migrated)
python manage.py migrate_old_disputes --dry-run

# Actual migration
python manage.py migrate_old_disputes

# Force re-migration of already migrated disputes
python manage.py migrate_old_disputes --force
```

The command:
- Finds all active, non-archived old disputes
- Creates corresponding formal dispute records
- Maps old statuses to new statuses
- Preserves timestamps and metadata
- Links records via `metadata.old_dispute_id`

### 4. Added Missing Imports
**File**: `zamio_backend/music_monitor/views/dispute_views.py`

Added required imports for analytics views:
```python
from django.db.models import Q, Count, Sum, Avg
from django.db.models.functions import TruncDate
```

## How to Deploy

### Step 1: Run Migrations (if needed)
```bash
docker compose -f docker-compose.local.yml exec backend python manage.py migrate
```

### Step 2: Migrate Existing Disputes
```bash
# Preview migration
docker compose -f docker-compose.local.yml exec backend python manage.py migrate_old_disputes --dry-run

# Execute migration
docker compose -f docker-compose.local.yml exec backend python manage.py migrate_old_disputes
```

### Step 3: Verify in Admin Panel
1. Log into `zamio_admin` (port 5176)
2. Navigate to Disputes page
3. Verify that previously flagged disputes now appear

## Data Flow

### When Station Flags a Playlog:
1. Station calls `/api/music-monitor/flag-playlog/`
2. Backend creates `music_monitor.Dispute` (old system)
3. Backend creates `disputes.Dispute` (new system)
4. Both records are linked via metadata
5. Playlog is marked as `flagged=True`

### When Admin Views Disputes:
1. Admin panel calls `/api/disputes/api/disputes/`
2. Backend queries `disputes.Dispute` (new system)
3. Disputes appear in admin panel with full details

### When Dispute is Resolved:
1. Station/Admin calls `/api/music-monitor/review-match-for-dispute/`
2. Backend updates `music_monitor.Dispute` status to "Resolved"
3. Backend updates `disputes.Dispute` status to "resolved"
4. Playlog `flagged` flag is cleared
5. Resolution timestamps are set on both records

## Metadata Structure

The new formal disputes store metadata linking to old disputes:

```json
{
  "old_dispute_id": 123,
  "playlog_id": 456,
  "flagged_from": "station_playlog",
  "migrated_at": "2024-12-07T10:30:00",
  "old_status": "Flagged"
}
```

## Status Mapping

Old System → New System:
- `Flagged` → `submitted`
- `Pending` → `under_review`
- `Resolved` → `resolved`
- `Rejected` → `rejected`

## Future Considerations

1. **Deprecate Old System**: Eventually migrate all functionality to use only the new dispute system
2. **Add Signals**: Consider adding Django signals to automatically sync between systems
3. **API Consolidation**: Update frontend apps to use the new dispute API endpoints
4. **Data Cleanup**: After migration is stable, archive old dispute records

## Testing

### Test Flagging a Playlog:
1. Log into station interface
2. Flag a playlog for dispute
3. Check admin panel - dispute should appear immediately

### Test Resolving a Dispute:
1. Resolve a dispute from station interface
2. Check admin panel - status should update to "Resolved"
3. Check playlog - `flagged` should be `False`

### Test Migration Command:
1. Create test disputes in old system
2. Run migration command with `--dry-run`
3. Verify output shows correct mapping
4. Run actual migration
5. Verify disputes appear in admin panel

## Files Modified

1. `zamio_backend/music_monitor/views/dispute_views.py` - Updated flag and review views
2. `zamio_backend/disputes/management/commands/migrate_old_disputes.py` - New migration command
3. `zamio_backend/disputes/management/__init__.py` - Created directory structure
4. `zamio_backend/disputes/management/commands/__init__.py` - Created directory structure

## No Breaking Changes

This fix is backward compatible:
- Old dispute system continues to work
- Existing API endpoints unchanged
- Frontend apps require no modifications
- Data is synced automatically going forward
