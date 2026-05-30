class DetectionResult {
  final String id;
  final DateTime timestamp;
  final bool matched;
  final String? trackTitle;
  final String? artistName;
  final double? confidence;
  final int? hashesMatched;
  final String? reason;
  final int? trackId;

  DetectionResult({
    required this.id,
    required this.timestamp,
    required this.matched,
    this.trackTitle,
    this.artistName,
    this.confidence,
    this.hashesMatched,
    this.reason,
    this.trackId,
  });

  factory DetectionResult.fromJson(Map<String, dynamic> json) {
    return DetectionResult(
      id: json['detection_id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      timestamp: DateTime.now(),
      matched: json['match'] ?? false,
      trackTitle: json['track_title'],
      artistName: json['artist_name'],
      confidence: json['confidence']?.toDouble(),
      hashesMatched: json['hashes_matched'],
      reason: json['reason'],
      trackId: json['song_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp.toIso8601String(),
      'matched': matched,
      'track_title': trackTitle,
      'artist_name': artistName,
      'confidence': confidence,
      'hashes_matched': hashesMatched,
      'reason': reason,
      'track_id': trackId,
    };
  }

  String get displayText {
    if (matched && trackTitle != null) {
      return '$trackTitle${artistName != null ? " - $artistName" : ""}';
    }
    return reason ?? 'No match found';
  }

  String get confidenceText {
    if (confidence != null) {
      return '${confidence!.toStringAsFixed(1)}% confidence';
    }
    return '';
  }
}
