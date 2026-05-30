import 'package:flutter/material.dart';
import 'services/offline_capture_service.dart';
import 'models/audio_capture.dart';

class QueuePage extends StatefulWidget {
  const QueuePage({super.key});

  @override
  State<QueuePage> createState() => _QueuePageState();
}

class _QueuePageState extends State<QueuePage> {
  final OfflineCaptureService _captureService = OfflineCaptureService();
  List<AudioCapture> _captures = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCaptures();
    _captureService.addListener(_onCaptureServiceChanged);
  }

  @override
  void dispose() {
    _captureService.removeListener(_onCaptureServiceChanged);
    super.dispose();
  }

  void _onCaptureServiceChanged() {
    if (mounted) {
      _loadCaptures();
    }
  }

  Future<void> _loadCaptures() async {
    setState(() => _isLoading = true);
    try {
      final captures = await _captureService.getAllCaptures(limit: 50);
      if (mounted) {
        setState(() {
          _captures = captures;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Failed to load captures: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteCapture(String captureId) async {
    try {
      await _captureService.deleteCapture(captureId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Upload deleted'), duration: Duration(seconds: 2)),
        );
      }
      _loadCaptures();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _retryCapture(String captureId) async {
    try {
      await _captureService.retryFailedCapture(captureId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Retrying upload...'), duration: Duration(seconds: 2)),
        );
      }
      _loadCaptures();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to retry: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Upload Queue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadCaptures,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _captures.isEmpty
              ? _buildEmptyState()
              : _buildQueueList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          const Text('Queue is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('All uploads completed!', style: TextStyle(color: Colors.grey.shade600)),
        ],
      ),
    );
  }

  Widget _buildQueueList() {
    final pending = _captures.where((c) => c.status.isPending).toList();
    final failed = _captures.where((c) => c.status == CaptureStatus.failed).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSummaryCard(pending.length, failed.length),
        const SizedBox(height: 16),
        if (pending.isNotEmpty) ...[
          _buildSectionHeader('Pending', pending.length, Colors.orange),
          ...pending.map((c) => _buildQueueItem(c)),
        ],
        if (failed.isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildSectionHeader('Failed', failed.length, Colors.red),
          ...failed.map((c) => _buildQueueItem(c)),
        ],
      ],
    );
  }

  Widget _buildSummaryCard(int pending, int failed) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem('Pending', pending, Icons.schedule, Colors.orange),
            _buildStatItem('Failed', failed, Icons.error, Colors.red),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, int count, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 4),
        Text('$count', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _buildSectionHeader(String title, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(width: 4, height: 20, color: color),
          const SizedBox(width: 8),
          Text('$title ($count)', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildQueueItem(AudioCapture capture) {
    return Dismissible(
      key: Key(capture.id),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(8)),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (direction) => _deleteCapture(capture.id),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: _buildStatusIcon(capture.status),
          title: Text(_formatTimestamp(capture.capturedAt)),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${_formatFileSize(capture.fileSizeBytes)} • ${capture.durationSeconds}s'),
              if (capture.errorMessage != null)
                Text(capture.errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 12), maxLines: 2),
            ],
          ),
          trailing: capture.status.canRetry
              ? IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => _retryCapture(capture.id),
                  color: Colors.blue,
                )
              : null,
        ),
      ),
    );
  }

  Widget _buildStatusIcon(CaptureStatus status) {
    switch (status) {
      case CaptureStatus.pending:
        return const Icon(Icons.schedule, color: Colors.orange, size: 32);
      case CaptureStatus.uploading:
        return const SizedBox(width: 32, height: 32, child: CircularProgressIndicator(strokeWidth: 3));
      case CaptureStatus.completed:
        return const Icon(Icons.check_circle, color: Colors.green, size: 32);
      case CaptureStatus.failed:
        return const Icon(Icons.error, color: Colors.red, size: 32);
      case CaptureStatus.retrying:
        return const Icon(Icons.refresh, color: Colors.blue, size: 32);
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final diff = DateTime.now().difference(timestamp);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
