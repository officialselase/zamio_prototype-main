# PlayLog Status Refactor - Implementation Guide

## Overview

This refactor improves the PlayLog and MatchCache status tracking system by introducing clear, separate status fields for different concerns:

- **Verification Status**: Is the match verified? (Artist/Publisher perspective)
- **Payment Status**: Has the station been charged? (Station perspective)
- **Royalty Status**: Have royalties been distributed? (Financial perspective)

## Changes Made

### 1. MatchCache Model Updates

**New Fields:**
- `status`: Enum field tracking match processing state
  - `pending`: Awaiting processing
  - `verified`: Match verified, ready for PlayLog conversion
  - `processed`: Successfully converted to PlayLog
  - `failed`: Processing failed
  - `low_confidence`: Low confidence score, needs review

**Benefits:**
- Clear state machine for match processing
- Easy to query matches by status
- Better error tracking

### 2. PlayLog Model Updates

**New Fields:**
- `verification_status`: Track verification state
  - `verified`: Confirmed match, good confidence
  - `pending`: Low confidence or needs manual review
  - `disputed`: Has active dispute
  - `rejected`: Failed verification or dispute resolved against

- `royalty_status`: Track royalty distribution
  - `pending`: Awaiting distribution
  - `calculated`: Royalties calculated
  - `distributed`: Royalties paid out
  - `failed`: Distribution failed
  - `withheld`: Royalties withheld (e.g., dispute)

- `royalty_distributed_at`: Timestamp of royalty distribution

**Updated Fields:**
- `payment_status`: Added `refunded` option
- `claimed`: Marked as DEPRECATED, kept for backward compatibility
- `active`: Default changed to `True`

**New Properties:**
- `is_verified`: Check if playlog is verified and ready for royalty calculation
- `is_paid`: Check if station has been charged
- `is_royalty_distributed`: Check if royalties have been distributed

**New Methods:**
- `mark_as_disputed()`: Mark playlog as disputed
- `mark_as_verified()`: Mark playlog as verified
- `mark_payment_charged()`: Mark station payment as charged
- `mark_royalty_distributed()`: Mark royalties as distributed

### 3. Serializer Updates

**Created Base Serializer:**
- `BasePlayLogSerializer`: Unified status logic for all portals
- Consistent status determination based on `verification_status`
- All portal-specific serializers inherit from base

**Status Logic:**
```python
def get_status(self, obj):
    if obj.flagged or obj.verification_status == 'disputed':
        return 'Disputed'
    if obj.verification_status == 'rejected':
        return 'Rejected'
    if obj.verification_status == 'verified':
        return 'Verified'
    return 'Pending'
```

**Portal-Specific Behavior:**
- **Artist Portal**: Shows verification status
- **Publisher Portal**: Shows verification status
- **Station Portal**: Shows both verification AND payment status

### 4. Task Updates

**Match to PlayLog Conversion:**
- Automatically sets `verification_status` based on confidence score
- Confidence >= 70% → `verified`
- Confidence < 70% → `pending`
- Sets `payment_status='pending'` and `royalty_status='pending'`
- Updates match `status='processed'`

## Migration Steps

### 1. Run Schema Migration
```bash
docker compose -f docker-compose.local.yml exec backend python manage.py migrate music_monitor 0002_add_status_fields
```

This adds the new fields to the database.

### 2. Run Data Migration
```bash
docker compose -f docker-compose.local.yml exec backend python manage.py migrate music_monitor 0003_migrate_existing_status_data
```

This updates existing records:
- Sets `verification_status='verified'` for playlogs with tracks
- Sets `verification_status='disputed'` for flagged playlogs
- Sets `status='processed'` for processed matches
- Sets `claimed=True` for all playlogs with tracks

### 3. Optional: Fix Any Remaining Issues
```bash
docker compose -f docker-compose.local.yml exec backend python manage.py fix_playlog_claimed_status
```

## Status Flow Diagrams

### Match Processing Flow
```
Audio Detection
    ↓
MatchCache (status='pending')
    ↓
Verification (confidence check)
    ↓
MatchCache (status='verified' or 'low_confidence')
    ↓
PlayLog Creation
    ↓
MatchCache (status='processed')
```

### PlayLog Lifecycle
```
PlayLog Created
    ↓
verification_status='verified' (if confidence >= 70%)
payment_status='pending'
royalty_status='pending'
    ↓
Station Charged
    ↓
payment_status='charged'
    ↓
Royalty Calculated
    ↓
royalty_status='calculated'
    ↓
Royalty Distributed
    ↓
royalty_status='distributed'
```

### Dispute Flow
```
PlayLog (verified)
    ↓
Dispute Raised
    ↓
verification_status='disputed'
flagged=True
royalty_status='withheld'
    ↓
Resolution
    ↓
verification_status='verified' or 'rejected'
flagged=False
royalty_status='pending' or 'withheld'
```

## API Response Changes

### Before (Inconsistent)
```json
{
  "status": "Confirmed",  // Artist portal
  "status": "Pending"     // Publisher portal (same playlog!)
}
```

### After (Consistent)
```json
{
  "status": "Verified",           // All portals show same verification status
  "payment_status": "pending",    // Station portal also shows payment status
  "royalty_status": "pending"     // Backend tracking
}
```

## Benefits

1. **Consistency**: All portals show the same verification status
2. **Clarity**: Separate concerns (verification vs payment vs royalty)
3. **Flexibility**: Easy to add new statuses or workflows
4. **Performance**: Indexed status fields for fast queries
5. **Maintainability**: Single source of truth for status logic
6. **Backward Compatible**: Legacy `claimed` field still works

## Querying Examples

### Get all verified playlogs ready for royalty calculation
```python
PlayLog.objects.filter(
    verification_status='verified',
    payment_status='charged',
    royalty_status='pending'
)
```

### Get all disputed playlogs
```python
PlayLog.objects.filter(
    verification_status='disputed'
)
```

### Get all pending matches
```python
MatchCache.objects.filter(
    status='pending'
)
```

### Get playlogs needing payment
```python
PlayLog.objects.filter(
    verification_status='verified',
    payment_status='pending'
)
```

## Future Improvements

1. **Remove `claimed` field**: After confirming all code uses `verification_status`
2. **Add state machine validation**: Prevent invalid status transitions
3. **Add status change logging**: Track who changed status and when
4. **Add webhooks**: Notify external systems on status changes
5. **Add bulk status updates**: Admin tools for batch operations

## Testing

After migration, verify:

1. ✅ Artist portal shows "Verified" for confirmed matches
2. ✅ Publisher portal shows "Verified" for confirmed matches
3. ✅ Station portal shows "Pending Payment" for unpaid plays
4. ✅ Station portal shows "Paid" for charged plays
5. ✅ Disputed playlogs show "Disputed" in all portals
6. ✅ New playlogs are created with correct status
7. ✅ Status changes are reflected immediately

## Rollback Plan

If issues arise:

```bash
# Rollback migrations
docker compose -f docker-compose.local.yml exec backend python manage.py migrate music_monitor 0001_initial

# Restore code from git
git checkout HEAD~1 zamio_backend/music_monitor/models.py
git checkout HEAD~1 zamio_backend/music_monitor/tasks.py
git checkout HEAD~1 zamio_backend/artists/serializers.py
git checkout HEAD~1 zamio_backend/publishers/serializers.py
git checkout HEAD~1 zamio_backend/stations/serializers.py
```

## Support

For questions or issues, contact the development team.
