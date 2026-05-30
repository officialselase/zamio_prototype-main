# Mobile App Detection Improvements

## 🚨 CRITICAL FIX: Empty Capture Files (Nov 20, 2025)

### Problem
Mobile app was creating 0-byte capture files that failed to upload:
- Logs showed "Capture completed: xxx (0 bytes)"
- Backend received empty files causing FFmpeg "End of file" errors
- All upload retries failed with conversion errors

### Root Cause
1. **Race condition**: `_stopCurrentRecording()` called before file fully written to disk
2. **No validation**: File size wasn't checked before saving to database
3. **Insufficient delay**: No buffer time after `stopRecorder()` for file system flush
4. **Type mismatch**: sampleRate passed as int instead of double

### Fixes Applied to `offline_capture_service.dart`

1. **Added file flush delay**:
   ```dart
   await _recorder.stopRecorder();
   await Future.delayed(const Duration(milliseconds: 100)); // Allow file flush
   ```

2. **Added file size validation**:
   ```dart
   final fileSize = await file.length();
   if (fileSize == 0) {
     throw Exception('Recorded file is empty (0 bytes)');
   }
   ```

3. **Delete invalid files**:
   ```dart
   // Clean up the empty/invalid file
   if (file.existsSync()) {
     await file.delete();
   }
   ```

4. **Verify recording started**:
   ```dart
   await _recorder.startRecorder(...);
   if (!_recorder.isRecording) {
     throw Exception('Recorder failed to start');
   }
   ```

5. **Fixed type conversion**:
   ```dart
   sampleRate: _settings.quality.sampleRate.toDouble(), // flutter_sound expects double
   ```

6. **Enhanced debug logging**:
   - Log recording start with parameters
   - Log timer triggers
   - Log file sizes and validation results

### Testing Required
- ✅ Verify captures are now > 0 bytes
- ✅ Check that invalid files are cleaned up automatically
- ✅ Monitor debug logs for recording lifecycle
- ✅ Confirm uploads succeed with valid audio data

---

## Changes Made to Improve Audio Detection Quality

### 1. Audio Quality Settings (`zamio_app/lib/models/capture_settings.dart`)

#### Before:
- **Low**: 8kHz, 16kbps, mono
- **Standard**: 16kHz, 24kbps, mono ❌
- **High**: 22kHz, 32kbps, mono

#### After:
- **Low**: 22kHz, 64kbps, mono (Battery saving)
- **Standard**: 44.1kHz, 96kbps, mono ✅ (Recommended)
- **High**: 44.1kHz, 128kbps, mono (Best quality)

**Why**: Backend fingerprinting expects 44.1kHz sample rate. Lower sample rates miss high-frequency content needed for accurate matching.

### 2. Capture Duration

#### Before:
- Duration: 10 seconds
- Interval: 10 seconds

#### After:
- Duration: 15 seconds ✅
- Interval: 15 seconds

**Why**: Longer captures provide more audio data for fingerprint matching, improving detection accuracy.

### 3. Compression Settings

#### Before:
- `compressBeforeStorage`: true
- `batteryOptimized`: true

#### After:
- `compressBeforeStorage`: false ✅
- `batteryOptimized`: false

**Why**: Compression can degrade audio quality. For detection, we prioritize quality over storage/battery.

### 4. Storage & Retries

#### Before:
- `maxStorageMB`: 100
- `maxRetries`: 3

#### After:
- `maxStorageMB`: 200 ✅
- `maxRetries`: 5 ✅

**Why**: More storage for higher quality audio, more retries for reliability.

## Backend Improvements

### 1. Track Active Status (`zamio_backend/artists/models.py`)

#### Before:
```python
active = models.BooleanField(default=False)  # ❌ Tracks inactive by default
```

#### After:
```python
active = models.BooleanField(default=True)  # ✅ Tracks active by default
```

**Why**: Inactive tracks are excluded from fingerprint matching. All uploaded tracks should be active by default.

### 2. FFmpeg Conversion (`zamio_backend/music_monitor/views/match_log_views.py`)

#### Improvements:
- Better error handling for AAC conversion
- Explicit codec specification (`pcm_s16le`)
- File size validation
- Detailed logging

**Why**: Mobile app sends AAC files that need proper conversion to WAV for librosa processing.

## Testing Recommendations

### 1. Audio Capture Quality
- **Volume**: Play music at moderate to loud volume
- **Distance**: Keep phone within 1-2 meters of speakers
- **Background Noise**: Minimize ambient noise
- **Duration**: Let capture run for full 15 seconds

### 2. Track Requirements
- **Active**: Ensure tracks are marked as active
- **Fingerprinted**: Verify tracks have fingerprints in database
- **Quality**: Upload high-quality audio files (not compressed/low bitrate)

### 3. Detection Thresholds
- **Minimum matches**: 5 hashes for MP3, 10 for streaming
- **Confidence**: Higher confidence = better match
- **Sample rate**: Both capture and track should be 44.1kHz

## Diagnostic Tools

### Check Track Status:
```bash
docker compose -f docker-compose.local.yml exec backend python prototype/diagnose_fingerprints.py
```

### Activate Tracks:
```bash
docker compose -f docker-compose.local.yml exec backend python prototype/activate_tracks.py
```

### Check Backend Logs:
```bash
docker compose -f docker-compose.local.yml logs -f backend
```

## Expected Results

With these improvements:
- ✅ Better audio quality (44.1kHz vs 16kHz)
- ✅ Longer capture duration (15s vs 10s)
- ✅ No compression artifacts
- ✅ Tracks active by default
- ✅ Proper AAC to WAV conversion
- ✅ More reliable detection

## Troubleshooting

### Still No Detection?

1. **Check track is active**:
   ```bash
   docker compose -f docker-compose.local.yml exec backend python prototype/diagnose_fingerprints.py
   ```

2. **Check fingerprint count**: Should have 100,000+ fingerprints for a 3-minute song

3. **Check audio quality**: Play music clearly, not too quiet

4. **Check backend logs**: Look for conversion errors or matching issues

5. **Verify sample rate**: Mobile app should now capture at 44.1kHz

6. **Test with known track**: Play the exact track you uploaded

## Performance Impact

### Battery Usage:
- Higher sample rate = more battery usage
- 15-second captures = slightly more battery than 10s
- **Recommendation**: Use "Low" quality (22kHz) for battery saving if needed

### Storage Usage:
- 44.1kHz, 96kbps, 15s ≈ 180KB per capture
- 200MB limit ≈ 1,100 captures
- Auto-delete after 24 hours keeps storage manageable

### Network Usage:
- Larger files = more data usage
- Only uploads when connected (offline queue works)
- **Recommendation**: Use WiFi for initial testing

## Next Steps

1. **Rebuild mobile app** with new settings
2. **Activate existing tracks** in database
3. **Test detection** with known tracks
4. **Monitor backend logs** for issues
5. **Adjust settings** based on results

## Settings UI (Future Enhancement)

Consider adding a settings page in the app to let users adjust:
- Audio quality (Low/Standard/High)
- Capture duration (10s/15s/20s)
- Capture interval
- Battery optimization toggle
- Storage limit

This allows users to balance quality vs battery/storage based on their needs.
