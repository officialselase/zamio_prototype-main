import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../models/audio_capture.dart';
import '../models/capture_settings.dart';
import 'database_service.dart';
import 'connectivity_service.dart';

class OfflineCaptureService extends ChangeNotifier {
  static final OfflineCaptureService _instance =
      OfflineCaptureService._internal();
  factory OfflineCaptureService() => _instance;
  OfflineCaptureService._internal();

  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  final DatabaseService _db = DatabaseService();
  final ConnectivityService _connectivity = ConnectivityService();
  final Uuid _uuid = const Uuid();

  Timer? _captureTimer;
  Timer? _cleanupTimer;
  bool _isInitialized = false;
  bool _isCapturing = false;
  String? _currentStationId;
  CaptureSettings _settings = const CaptureSettings();

  // Current capture state
  AudioCapture? _currentCapture;
  String? _currentFilePath;
  DateTime? _currentCaptureStartTime;

  // Statistics
  int _totalCapturesCreated = 0;
  int _totalCapturesCompleted = 0;
  int _totalCapturesFailed = 0;
  int _currentStorageUsedMB = 0;

  // Detection results
  int _detectionsToday = 0;
  int _successfulDetectionsToday = 0;
  String? _lastDetectionStatus;
  String? _lastMatchedSong;

  // Getters
  bool get isInitialized => _isInitialized;
  bool get isCapturing => _isCapturing;
  String? get currentStationId => _currentStationId;
  CaptureSettings get settings => _settings;
  AudioCapture? get currentCapture => _currentCapture;
  DateTime? get currentCaptureStartTime => _currentCaptureStartTime;

  int get totalCapturesCreated => _totalCapturesCreated;
  int get totalCapturesCompleted => _totalCapturesCompleted;
  int get totalCapturesFailed => _totalCapturesFailed;
  int get currentStorageUsedMB => _currentStorageUsedMB;

  // Detection stats
  int get detectionsToday => _detectionsToday;
  int get successfulDetectionsToday => _successfulDetectionsToday;
  String? get lastDetectionStatus => _lastDetectionStatus;
  String? get lastMatchedSong => _lastMatchedSong;

  double get captureProgress {
    if (_currentCaptureStartTime == null || !_isCapturing) return 0.0;
    final elapsed =
        DateTime.now().difference(_currentCaptureStartTime!).inSeconds;
    return math.min(elapsed / _settings.durationSeconds, 1.0);
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      debugPrint('Initializing OfflineCaptureService...');

      // Close recorder if it was previously opened
      try {
        await _recorder.closeRecorder();
      } catch (_) {
        // Ignore errors if recorder wasn't open
      }

      await _recorder.openRecorder();
      debugPrint('Recorder opened successfully');

      await _loadSettings();
      await _updateStatistics();

      // Start periodic cleanup
      _cleanupTimer = Timer.periodic(
        const Duration(hours: 1),
        (_) => _performCleanup(),
      );

      _isInitialized = true;
      debugPrint('OfflineCaptureService initialized');
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to initialize OfflineCaptureService: $e');
      rethrow;
    }
  }

  Future<void> dispose() async {
    await stopCapturing();
    _captureTimer?.cancel();
    _cleanupTimer?.cancel();
    await _recorder.closeRecorder();
    _isInitialized = false;
    super.dispose();
  }

  Future<void> updateSettings(CaptureSettings newSettings) async {
    _settings = newSettings;
    await _saveSettings();

    // Restart capturing with new settings if currently active
    if (_isCapturing) {
      await stopCapturing();
      await startCapturing(_currentStationId!);
    }

    notifyListeners();
  }

  Future<void> startCapturing(String stationId) async {
    if (!_isInitialized) {
      throw StateError('Service not initialized');
    }

    if (_isCapturing) {
      await stopCapturing();
    }

    _currentStationId = stationId;
    _isCapturing = true;

    // Start first capture immediately
    await _startSingleCapture();

    // Schedule subsequent captures
    _captureTimer = Timer.periodic(
      Duration(seconds: _settings.intervalSeconds),
      (_) => _startSingleCapture(),
    );

    notifyListeners();
  }

  Future<void> stopCapturing() async {
    if (!_isCapturing) return;

    _isCapturing = false;
    _captureTimer?.cancel();
    _captureTimer = null;

    // Stop current recording if active
    if (_recorder.isRecording) {
      await _stopCurrentRecording();
    }

    _currentStationId = null;
    _currentCapture = null;
    _currentFilePath = null;
    _currentCaptureStartTime = null;

    notifyListeners();
  }

  Future<void> _startSingleCapture() async {
    if (!_isCapturing || _currentStationId == null) return;

    try {
      // Double-check station ID is still valid (defensive against race conditions)
      final stationId = _currentStationId;
      if (stationId == null || stationId.isEmpty) {
        debugPrint('⚠️  Station ID became null during capture start, aborting');
        return;
      }

      // Stop previous recording if still active
      if (_recorder.isRecording) {
        await _stopCurrentRecording();
      }

      // Check storage limits
      if (_currentStorageUsedMB >= _settings.maxStorageMB) {
        debugPrint('Storage limit reached, skipping capture');
        return;
      }

      // Generate unique capture
      final captureId = _uuid.v4();
      final timestamp = DateTime.now();
      final fileName = 'capture_${timestamp.millisecondsSinceEpoch}.aac';
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/$fileName';

      // Create capture record
      final capture = AudioCapture(
        id: captureId,
        stationId: stationId,
        filePath: filePath,
        capturedAt: timestamp,
        durationSeconds: _settings.durationSeconds,
        fileSizeBytes: 0, // Will be updated after recording
        status: CaptureStatus.pending,
        metadata: {
          'quality': _settings.quality.name,
          'sample_rate': _settings.quality.sampleRate.toString(),
          'bit_rate': _settings.quality.bitRate.toString(),
          'battery_optimized': _settings.batteryOptimized.toString(),
        },
      );

      _currentCapture = capture;
      _currentFilePath = filePath;
      _currentCaptureStartTime = timestamp;

      // Start recording
      debugPrint(
          'Starting recording: $filePath (${_settings.durationSeconds}s, ${_settings.quality.sampleRate}Hz, ${_settings.quality.bitRate}bps)');

      await _recorder.startRecorder(
        toFile: filePath,
        codec: Codec.aacADTS,
        sampleRate: _settings.quality.sampleRate,
        numChannels: _settings.quality.channels,
        bitRate: _settings.quality.bitRate,
      );

      // Verify recording actually started
      if (!_recorder.isRecording) {
        throw Exception('Recorder failed to start');
      }

      debugPrint('Recording started successfully');

      // Schedule stop after duration
      Timer(Duration(seconds: _settings.durationSeconds), () async {
        if (_currentCapture?.id == captureId && _recorder.isRecording) {
          debugPrint(
              'Timer triggered - stopping recording for capture: $captureId');
          await _stopCurrentRecording();
        }
      });

      _totalCapturesCreated++;
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to start capture: $e');
      _totalCapturesFailed++;
      notifyListeners();
    }
  }

  Future<void> _stopCurrentRecording() async {
    if (!_recorder.isRecording ||
        _currentCapture == null ||
        _currentFilePath == null) {
      return;
    }

    try {
      // Stop the recorder and wait for it to complete
      await _recorder.stopRecorder();

      // Give the system a moment to flush the file
      await Future.delayed(const Duration(milliseconds: 100));

      final file = File(_currentFilePath!);
      if (!file.existsSync()) {
        throw Exception('Recorded file does not exist');
      }

      // Check file size before processing
      final fileSize = await file.length();
      if (fileSize == 0) {
        throw Exception('Recorded file is empty (0 bytes)');
      }

      // Validate and potentially compress the file
      final processedFile = await _processAudioFile(file);
      final finalFileSize = await processedFile.length();

      // Update capture with actual file size
      final updatedCapture = _currentCapture!.copyWith(
        fileSizeBytes: finalFileSize,
        filePath: processedFile.path,
      );

      // Save to database
      await _db.insertCapture(updatedCapture);

      // Update statistics
      await _updateStatistics();

      debugPrint(
          'Capture completed: ${updatedCapture.id} ($finalFileSize bytes)');
    } catch (e) {
      debugPrint('Failed to complete capture: $e');

      // Clean up the empty/invalid file
      if (_currentFilePath != null) {
        try {
          final file = File(_currentFilePath!);
          if (file.existsSync()) {
            await file.delete();
            debugPrint('Deleted invalid capture file: $_currentFilePath');
          }
        } catch (deleteError) {
          debugPrint('Failed to delete invalid file: $deleteError');
        }
      }

      // Mark as failed if we have a capture record
      if (_currentCapture != null) {
        final failedCapture = _currentCapture!.copyWith(
          status: CaptureStatus.failed,
          errorMessage: e.toString(),
        );

        try {
          await _db.insertCapture(failedCapture);
        } catch (dbError) {
          debugPrint('Failed to save failed capture to DB: $dbError');
        }
      }

      _totalCapturesFailed++;
    } finally {
      _currentCapture = null;
      _currentFilePath = null;
      _currentCaptureStartTime = null;
      notifyListeners();
    }
  }

  Future<File> _processAudioFile(File originalFile) async {
    if (!_settings.compressBeforeStorage) {
      return originalFile;
    }

    try {
      // For now, just return the original file
      // In a full implementation, you might use FFmpeg or similar
      // to compress the audio file further
      return originalFile;
    } catch (e) {
      debugPrint('Audio compression failed, using original: $e');
      return originalFile;
    }
  }

  Future<List<AudioCapture>> getPendingCaptures() async {
    return await _db.getPendingCaptures(stationId: _currentStationId);
  }

  Future<List<AudioCapture>> getFailedCaptures() async {
    return await _db.getFailedCaptures(stationId: _currentStationId);
  }

  Future<List<AudioCapture>> getAllCaptures({int? limit, int? offset}) async {
    return await _db.getAllCaptures(
      stationId: _currentStationId,
      limit: limit,
      offset: offset,
    );
  }

  Future<void> retryFailedCapture(String captureId) async {
    final capture = await _db.getCaptureById(captureId);
    if (capture == null || !capture.status.canRetry) return;

    if (capture.retryCount >= _settings.maxRetries) {
      debugPrint('Max retries exceeded for capture: $captureId');
      return;
    }

    await _db.incrementRetryCount(captureId);
    await _db.updateCaptureStatus(captureId, CaptureStatus.retrying);

    notifyListeners();
  }

  Future<void> deleteCapture(String captureId) async {
    final capture = await _db.getCaptureById(captureId);
    if (capture != null) {
      // Delete file if it exists
      final file = File(capture.filePath);
      if (file.existsSync()) {
        try {
          await file.delete();
        } catch (e) {
          debugPrint('Failed to delete capture file: $e');
        }
      }

      // Delete from database
      await _db.deleteCapture(captureId);
      await _updateStatistics();
      notifyListeners();
    }
  }

  void updateDetectionResult(Map<String, dynamic> response) {
    _detectionsToday++;

    final matched = response['match'] ?? false;
    if (matched) {
      _successfulDetectionsToday++;
      final trackTitle = response['track_title'] ?? 'Unknown';
      final artistName = response['artist_name'] ?? '';
      _lastMatchedSong =
          artistName.isNotEmpty ? '$trackTitle - $artistName' : trackTitle;
      _lastDetectionStatus = 'Match found!';
    } else {
      final reason = response['reason'] ?? 'No match';
      _lastDetectionStatus = reason;
      _lastMatchedSong = null;
    }

    notifyListeners();
  }

  void resetDailyStats() {
    _detectionsToday = 0;
    _successfulDetectionsToday = 0;
    notifyListeners();
  }

  Future<void> _performCleanup() async {
    try {
      // Delete old completed captures if auto-delete is enabled
      if (_settings.autoDeleteCompleted) {
        await _db.cleanupOldCaptures(
          maxAgeHours: 24, // Keep completed captures for 24 hours
          stationId: _currentStationId,
        );
      }

      // Clean up orphaned files (files without database records)
      await _cleanupOrphanedFiles();

      await _updateStatistics();
      notifyListeners();
    } catch (e) {
      debugPrint('Cleanup failed: $e');
    }
  }

  Future<void> _cleanupOrphanedFiles() async {
    try {
      final directory = await getTemporaryDirectory();
      final files = directory
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith('.aac'))
          .toList();

      for (final file in files) {
        // Check if file has corresponding database record
        final captures = await _db.getAllCaptures();
        final hasRecord = captures.any((c) => c.filePath == file.path);

        if (!hasRecord) {
          try {
            await file.delete();
            debugPrint('Deleted orphaned file: ${file.path}');
          } catch (e) {
            debugPrint('Failed to delete orphaned file: $e');
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to cleanup orphaned files: $e');
    }
  }

  Future<void> _updateStatistics() async {
    try {
      final stats = await _db.getCaptureStats(stationId: _currentStationId);
      final storageUsed =
          await _db.getTotalStorageUsed(stationId: _currentStationId);

      _totalCapturesCompleted = stats[CaptureStatus.completed.name] ?? 0;
      _totalCapturesFailed = stats[CaptureStatus.failed.name] ?? 0;
      _currentStorageUsedMB = (storageUsed / (1024 * 1024)).round();
    } catch (e) {
      debugPrint('Failed to update statistics: $e');
    }
  }

  Future<void> _loadSettings() async {
    // Load settings from SharedPreferences or use defaults
    // For now, using defaults
    _settings = const CaptureSettings();
  }

  Future<void> _saveSettings() async {
    // Save settings to SharedPreferences
    // Implementation would go here
  }
}
