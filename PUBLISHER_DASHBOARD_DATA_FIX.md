# Publisher Dashboard Data Fix

## Issue
Publisher dashboard showing incorrect data - "Works in Catalog" showing 0 even when publisher has catalog items.

## Root Cause
The `worksInCatalog` change calculation was comparing distinct tracks with total agreements count, which was incorrect.

## Fix Applied

### Backend (`zamio_backend/publishers/views/publisher_dashboard_views.py`)

1. **Fixed catalog count calculation**:
   - Now correctly counts ALL accepted agreements' unique tracks
   - Not limited to only tracks with play logs

2. **Fixed growth calculation**:
   - Now compares current catalog size with previous period's catalog size
   - Uses `created_at` timestamp to determine when agreements were added

3. **Added debug logging**:
   - Logs all calculated stats to help identify data issues
   - Shows period, date range, and all metric values

### Frontend (`zamio_publisher/src/pages/Dashboard.tsx`)

1. **Enhanced debug logging**:
   - Logs full API response
   - Shows all stats values for verification
   - Helps identify data mismatches

2. **Added publisher ID fallback**:
   - Checks both `publisher_id` and `publisherId` fields
   - Better error messages

## Testing

Run the test script to verify data:
```bash
cd zamio_backend
python ../test_publisher_dashboard.py
```

Check browser console and backend logs when loading dashboard to see calculated values.

## Expected Behavior

- **Works in Catalog**: Shows count of unique tracks with accepted publishing agreements
- **Total Performances**: Shows count of play logs for publisher's tracks in selected period
- **Total Earnings**: Shows sum of royalty amounts in selected period
- **Active Stations**: Shows count of unique stations that played publisher's tracks in selected period
