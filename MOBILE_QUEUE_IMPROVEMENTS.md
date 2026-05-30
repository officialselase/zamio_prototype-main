# 📤 Mobile App - Upload Queue Improvements

## Current State

**What exists:**
- Simple queue counter showing number of pending uploads
- "Retry Pending" button to manually trigger uploads
- No visibility into what's in the queue
- No individual file management

**Issues:**
- Users don't know what's pending
- Can't see upload progress
- Can't cancel or delete failed uploads
- No way to prioritize uploads
- No error details

---

## 🎯 Recommended Improvements

### Priority 1: Queue Details Page (HIGH VALUE)

**Add a dedicated page showing:**
- List of all pending/failed uploads
- File size and timestamp
- Upload status (pending, uploading, failed, completed)
- Error messages for failed uploads
- Individual retry/delete actions

**Implementation: 1-2 hours**

```dart
class QueuePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Upload Queue'),
        actions: [
          IconButton(
            icon: Icon(Icons.delete_sweep),
            onPressed: () => _clearCompleted(),
            tooltip: 'Clear completed',
          ),
        ],
      ),
      body: StreamBuilder<List<AudioCapture>>(
        stream: _captureService.getPendingCapturesStream(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return CircularProgressIndicator();
          
          final captures = snapshot.data!;
          if (captures.isEmpty) {
            return _EmptyQueueView();
          }
          
          return ListView.builder(
            itemCount: captures.length,
            itemBuilder: (context, index) {
              final capture = captures[index];
              return _QueueItemCard(
                capture: capture,
                onRetry: () => _retryUpload(capture.id),
                onDelete: () => _deleteCapture(capture.id),
              );
            },
          );
        },
      ),
    );
  }
}

class _QueueItemCard extends StatelessWidget {
  final AudioCapture capture;
  final VoidCallback onRetry;
  final VoidCallback onDelete;
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: _StatusIcon(status: capture.status),
        title: Text(_formatTimestamp(capture.capturedAt)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${_formatFileSize(capture.fileSizeBytes)} • ${capture.durationSeconds}s'),
            if (capture.errorMessage != null)
              Text(
                capture.errorMessage!,
                style: TextStyle(color: Colors.red, fontSize: 12),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (capture.status.canRetry)
              IconButton(
                icon: Icon(Icons.refresh),
                onPressed: onRetry,
                tooltip: 'Retry',
              ),
            IconButton(
              icon: Icon(Icons.delete),
              onPressed: onDelete,
              tooltip: 'Delete',
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### Priority 2: Upload Progress Indicator (MEDIUM VALUE)

**Show real-time upload progress:**
- Progress bar for current upload
- Upload speed (KB/s)
- Estimated time remaining
- Current file being uploaded

**Implementation: 1 hour**

```dart
class _UploadProgressCard extends StatelessWidget {
  final AudioCapture currentUpload;
  final double progress; // 0.0 to 1.0
  final int uploadSpeed; // bytes per second
  
  @override
  Widget build(BuildContext context) {
    final remaining = _calculateTimeRemaining(
      currentUpload.fileSizeBytes,
      progress,
      uploadSpeed,
    );
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.upload, color: Colors.blue),
                SizedBox(width: 8),
                Text('Uploading...', style: TextStyle(fontWeight: FontWeight.bold)),
                Spacer(),
                Text('${(progress * 100).toInt()}%'),
              ],
            ),
            SizedBox(height: 8),
            LinearProgressIndicator(value: progress),
            SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${_formatSpeed(uploadSpeed)}', style: TextStyle(fontSize: 12)),
                Text('${remaining}s remaining', style: TextStyle(fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### Priority 3: Smart Queue Management (MEDIUM VALUE)

**Auto-cleanup features:**
- Auto-delete completed uploads after 24 hours
- Auto-retry failed uploads (with exponential backoff)
- Pause/resume queue
- WiFi-only mode

**Implementation: 1-2 hours**

```dart
class QueueSettings {
  bool autoDeleteCompleted;
  bool autoRetryFailed;
  bool wifiOnly;
  int maxRetries;
  Duration retryDelay;
  
  // Auto-cleanup old files
  Future<void> performAutoCleanup() async {
    final cutoff = DateTime.now().subtract(Duration(hours: 24));
    final oldCaptures = await _db.getCompletedCapturesBefore(cutoff);
    
    for (final capture in oldCaptures) {
      await _captureService.deleteCapture(capture.id);
    }
  }
  
  // Smart retry with backoff
  Future<void> retryWithBackoff(String captureId) async {
    final capture = await _db.getCaptureById(captureId);
    if (capture == null) return;
    
    final delay = Duration(
      seconds: math.pow(2, capture.retryCount).toInt() * 30,
    );
    
    await Future.delayed(delay);
    await _uploadCapture(capture);
  }
}
```

---

### Priority 4: Queue Statistics (LOW VALUE)

**Show useful metrics:**
- Total pending uploads
- Total size of queue
- Success rate
- Average upload time
- Failed uploads count

**Implementation: 30 minutes**

```dart
class QueueStats extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Text('Queue Statistics', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatItem(
                  label: 'Pending',
                  value: '$pendingCount',
                  icon: Icons.pending,
                ),
                _StatItem(
                  label: 'Failed',
                  value: '$failedCount',
                  icon: Icons.error,
                  color: Colors.red,
                ),
                _StatItem(
                  label: 'Success Rate',
                  value: '${successRate}%',
                  icon: Icons.check_circle,
                  color: Colors.green,
                ),
              ],
            ),
            SizedBox(height: 12),
            Text(
              'Total queue size: ${_formatFileSize(totalSize)}',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🚀 Quick Wins (Implement Now)

### 1. Add "View Queue" Button (15 minutes)

**In RadioSniffer.dart:**
```dart
// Replace "Retry Pending" button with "View Queue"
TextButton.icon(
  onPressed: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (context) => QueuePage()),
  ),
  icon: Icon(Icons.list),
  label: Text('View Queue ($backlogCount)'),
)
```

### 2. Show Last Upload Status (10 minutes)

**Add to status card:**
```dart
if (_lastUploadStatus != null)
  Text(
    _lastUploadStatus!,
    style: TextStyle(
      fontSize: 12,
      color: _lastUploadSuccess ? Colors.green : Colors.orange,
    ),
  )
```

### 3. Add Swipe-to-Delete (30 minutes)

**In queue list:**
```dart
Dismissible(
  key: Key(capture.id),
  direction: DismissDirection.endToStart,
  background: Container(
    color: Colors.red,
    alignment: Alignment.centerRight,
    padding: EdgeInsets.only(right: 16),
    child: Icon(Icons.delete, color: Colors.white),
  ),
  onDismissed: (direction) {
    _captureService.deleteCapture(capture.id);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Upload deleted')),
    );
  },
  child: _QueueItemCard(capture: capture),
)
```

---

## 📋 Implementation Priority

### For Pilot Launch (Do Now - 1 hour)
1. ✅ **View Queue Button** - Navigate to queue page (15 min)
2. ✅ **Basic Queue List** - Show pending uploads (30 min)
3. ✅ **Delete Action** - Remove failed uploads (15 min)

**Total: 1 hour, High impact**

### After Pilot (Based on Feedback)
4. ⏳ Upload progress indicator (1 hour)
5. ⏳ Smart queue management (2 hours)
6. ⏳ Queue statistics (30 min)
7. ⏳ Batch operations (1 hour)

---

## 🎨 UI/UX Improvements

### Visual Status Indicators

```dart
Widget _StatusIcon(CaptureStatus status) {
  switch (status) {
    case CaptureStatus.pending:
      return Icon(Icons.schedule, color: Colors.orange);
    case CaptureStatus.uploading:
      return CircularProgressIndicator(strokeWidth: 2);
    case CaptureStatus.completed:
      return Icon(Icons.check_circle, color: Colors.green);
    case CaptureStatus.failed:
      return Icon(Icons.error, color: Colors.red);
    case CaptureStatus.retrying:
      return Icon(Icons.refresh, color: Colors.blue);
  }
}
```

### Color-Coded Status

- **Pending**: Orange (waiting)
- **Uploading**: Blue (in progress)
- **Completed**: Green (success)
- **Failed**: Red (error)
- **Retrying**: Purple (attempting again)

### Empty State

```dart
class _EmptyQueueView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'Queue is empty',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          Text(
            'All uploads completed successfully!',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
```

---

## 🧪 Testing Checklist

### Queue Page
- [ ] Shows all pending uploads
- [ ] Displays file sizes correctly
- [ ] Shows timestamps
- [ ] Error messages visible
- [ ] Retry button works
- [ ] Delete button works
- [ ] Empty state shows correctly

### Upload Progress
- [ ] Progress bar updates
- [ ] Speed calculation accurate
- [ ] Time remaining reasonable
- [ ] Completes at 100%

### Auto-Cleanup
- [ ] Old files deleted
- [ ] Completed uploads removed
- [ ] Failed uploads retained
- [ ] Settings respected

---

## 📊 Success Metrics

### Track During Pilot
- **Queue visibility**: Do users check the queue?
- **Manual management**: Do users delete/retry uploads?
- **Error understanding**: Do users understand failures?
- **Trust**: Does queue visibility increase confidence?

### Expected Improvements
- 📈 Fewer support questions about "is it working?"
- 📈 Better error recovery (users retry failed uploads)
- 📈 Cleaner storage (users delete old files)

---

## 💡 Advanced Features (Future)

### Phase 3 Enhancements
1. **Priority Queue** - Mark important uploads
2. **Scheduled Uploads** - Upload during off-peak hours
3. **Bandwidth Limiting** - Control upload speed
4. **Batch Operations** - Select multiple, delete/retry all
5. **Export Queue** - Save queue state for debugging
6. **Upload History** - View past uploads with results

---

## 🎯 Recommendation

**Implement the Quick Wins (1 hour):**
1. Add "View Queue" button
2. Create basic queue list page
3. Add delete functionality

**Result:**
- Users can see what's pending
- Users can manage failed uploads
- Professional, transparent experience
- Minimal development time

**Launch pilot, gather feedback, then add:**
- Upload progress (if users ask for it)
- Auto-cleanup (if storage becomes an issue)
- Statistics (if users want metrics)

Don't over-engineer before you have real usage data! 🚀

---

**Status:** Ready to implement
**Time Required:** 1 hour for essentials
**Impact:** High - transparency builds trust
**Risk:** Low - non-breaking additions
