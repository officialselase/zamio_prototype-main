# Dispute System Integration Fix

## Problem
Tracks disputed in `zamio_frontend`, `zamio_publisher`, and `zamio_stations` were not appearing in the `zamio_admin` dispute page.

## Root Cause
The platform had **two separate dispute systems**:

1. **Old System** (`music_monitor.models.Dispute`) - Used by stations/artists/publishers for flagging playlogs
2. **New System** (`disputes.models.Dispute`) - Formal dispute management system used by admin panel

When stations flagged playlogs, records were only created in the old system, so the admin panel (which queries the new system) couldn't see them.

## Solution Implemented

### 1. Updated Flag Playlog View
Modified `zamio_backend/music_monitor/views/dispute_views.py` to create records in **both** dispute systems when a playlog is flagged:

```python
# Creates old dispute (backward compatibility)
dispute, created = Dispute.objects.get_or_create(...)

# Also creates formal dispute for admin panel
from disputes.models import Dispute as FormalDispute
formal_dispute, formal_created = FormalDispute.objects.get_or_create(...)
```

### 2. Updated Review Dispute View
Modified the `review_match_for_dispute` function to update both systems when a dispute is resolved:

```python
# Update old dispute
dispute.dispute_status = "Resolved"
dispute.save()

# Also update formal dispute
formal_dispute = FormalDispute.objects.filter(
    metadata__old_dispute_id=dispute.id
).first()
if formal_dispute:
    formal_dispute.status = DisputeStatus.RESOLVED
    formal_dispute.save()
```

### 3. Created Migration Command
Created `zamio_backend/disputes/management/commands/migrate_old_disputes.py` to migrate existing old disputes to the new system.

## Usage

### Migrate Existing Disputes
To migrate all existing old disputes to the new formal dispute system:

```bash
# Dry run (preview what will be migrated)
docker compose -f docker-compose.local.yml exec backend python manage.py migrate_old_disputes --dry-run

# Actual migration
docker compose -f docker-compose.local.yml exec backend python manage.py migrate_old_disputes

# Force re-migration (update existing formal disputes)
docker compose -f docker-compose.local.yml exec backend python manage.py migrate_old_disputes --force
```

### Verify Migration
Check that disputes appear in the admin panel:

```bash
# Check dispute count
docker compose -f docker-compose.local.yml exec backend python manage.py shell -c "from disputes.models import Dispute; print(f'Total disputes: {Dispute.objects.count()}')"

# List all disputes
docker compose -f docker-compose.local.yml exec backend python manage.py shell -c "from disputes.models import Dispute; [print(f'{d.dispute_id}: {d.title} - {d.status}') for d in Dispute.objects.all()]"
```

## Data Flow

### When a Station Flags a Playlog:

1. Station calls `/api/music-monitor/flag-playlog/` with playlog_id and comment
2. Backend creates/updates `music_monitor.Dispute` (old system)
3. Backend creates/updates `disputes.Dispute` (new system) with metadata linking to old dispute
4. Playlog is marked as `flagged=True`
5. Admin panel can now see the dispute via `/api/disputes/api/disputes/`

### When a Dispute is Resolved:

1. Admin/reviewer calls the review endpoint
2. Backend updates `music_monitor.Dispute` status to "Resolved"
3. Backend updates `disputes.Dispute` status to "resolved"
4. Playlog `flagged` flag is cleared
5. Both systems stay in sync

## Metadata Linking

Formal disputes store a reference to the old dispute in their metadata:

```json
{
  "old_dispute_id": 1,
  "playlog_id": 123,
  "flagged_from": "station_playlog",
  "migrated_at": "2024-12-07T10:30:00Z"
}
```

This allows:
- Bidirectional lookups between old and new systems
- Audit trail of migration
- Future consolidation if needed

## Status Mapping

Old System → New System:
- `Flagged` → `submitted`
- `Pending` → `under_review`
- `Resolved` → `resolved`
- `Rejected` → `rejected`

## Testing

After migration, verify:

1. ✅ Existing disputes appear in admin panel
2. ✅ New flagged playlogs create disputes in both systems
3. ✅ Resolving disputes updates both systems
4. ✅ Station/artist/publisher views still work (backward compatibility)
5. ✅ Admin panel shows all dispute details correctly

## Future Improvements

Consider:
- Deprecating the old dispute system entirely
- Migrating all old dispute views to use the new system
- Adding a background task to periodically sync any missed disputes
- Creating a unified dispute API that abstracts both systems
