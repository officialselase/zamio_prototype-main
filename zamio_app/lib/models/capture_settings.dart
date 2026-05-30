class CaptureSettings {
  final int intervalSeconds;
  final int durationSeconds;
  final AudioQuality quality;
  final bool batteryOptimized;
  final int maxRetries;
  final int retryDelaySeconds;
  final bool compressBeforeStorage;
  final int maxStorageMB;
  final bool autoDeleteCompleted;

  const CaptureSettings({
    this.intervalSeconds = 15,           // Capture every 15 seconds (reduced overlap)
    this.durationSeconds = 15,           // 15 second captures (better for detection)
    this.quality = AudioQuality.standard, // 44.1kHz recommended
    this.batteryOptimized = false,       // Prioritize detection quality over battery
    this.maxRetries = 5,                 // Increased retries for reliability
    this.retryDelaySeconds = 30,
    this.compressBeforeStorage = false,  // Don't compress - maintain quality
    this.maxStorageMB = 200,             // Increased storage limit
    this.autoDeleteCompleted = true,
  });

  Map<String, dynamic> toMap() {
    return {
      'interval_seconds': intervalSeconds,
      'duration_seconds': durationSeconds,
      'quality': quality.name,
      'battery_optimized': batteryOptimized,
      'max_retries': maxRetries,
      'retry_delay_seconds': retryDelaySeconds,
      'compress_before_storage': compressBeforeStorage,
      'max_storage_mb': maxStorageMB,
      'auto_delete_completed': autoDeleteCompleted,
    };
  }

  factory CaptureSettings.fromMap(Map<String, dynamic> map) {
    return CaptureSettings(
      intervalSeconds: map['interval_seconds'] ?? 10,
      durationSeconds: map['duration_seconds'] ?? 10,
      quality: AudioQuality.values.byName(map['quality'] ?? 'standard'),
      batteryOptimized: map['battery_optimized'] ?? true,
      maxRetries: map['max_retries'] ?? 3,
      retryDelaySeconds: map['retry_delay_seconds'] ?? 30,
      compressBeforeStorage: map['compress_before_storage'] ?? true,
      maxStorageMB: map['max_storage_mb'] ?? 100,
      autoDeleteCompleted: map['auto_delete_completed'] ?? true,
    );
  }

  CaptureSettings copyWith({
    int? intervalSeconds,
    int? durationSeconds,
    AudioQuality? quality,
    bool? batteryOptimized,
    int? maxRetries,
    int? retryDelaySeconds,
    bool? compressBeforeStorage,
    int? maxStorageMB,
    bool? autoDeleteCompleted,
  }) {
    return CaptureSettings(
      intervalSeconds: intervalSeconds ?? this.intervalSeconds,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      quality: quality ?? this.quality,
      batteryOptimized: batteryOptimized ?? this.batteryOptimized,
      maxRetries: maxRetries ?? this.maxRetries,
      retryDelaySeconds: retryDelaySeconds ?? this.retryDelaySeconds,
      compressBeforeStorage: compressBeforeStorage ?? this.compressBeforeStorage,
      maxStorageMB: maxStorageMB ?? this.maxStorageMB,
      autoDeleteCompleted: autoDeleteCompleted ?? this.autoDeleteCompleted,
    );
  }
}

enum AudioQuality {
  // Optimized for music detection - backend expects 44.1kHz
  low(sampleRate: 22050, bitRate: 64000, channels: 1),      // Battery saving mode
  standard(sampleRate: 44100, bitRate: 96000, channels: 1), // Recommended for detection
  high(sampleRate: 44100, bitRate: 128000, channels: 1);    // Best quality

  const AudioQuality({
    required this.sampleRate,
    required this.bitRate,
    required this.channels,
  });

  final int sampleRate;
  final int bitRate;
  final int channels;

  String get displayName {
    switch (this) {
      case AudioQuality.low:
        return 'Low (22kHz, 64kbps) - Battery Saving';
      case AudioQuality.standard:
        return 'Standard (44kHz, 96kbps) - Recommended';
      case AudioQuality.high:
        return 'High (44kHz, 128kbps) - Best Quality';
    }
  }
}