
from typing import List, Tuple
from numba import jit
import xxhash
from operator import itemgetter
from collections import Counter
import numpy as np
import librosa
import matplotlib.pyplot as plt
import logging
import os

from artists.utils.fingerprint_tracks import simple_fingerprint



def simple_match_mp3(clip_samples, clip_sr, song_fingerprints, min_match_threshold=15, plot=False):
    """
    Match a full audio file against stored song fingerprints.
    Suitable for uploaded MP3 or audio clips.
    
    min_match_threshold: Minimum number of matching hashes required.
    Recommended: 15-20 for reliable matches, reduces false positives.
    """
    if not clip_samples.any():
        return {"match": False, "reason": "No samples in clip", "hashes_matched": 0}

    clip_fingerprints = simple_fingerprint(clip_samples, clip_sr, plot=plot)
    if not clip_fingerprints or not song_fingerprints:
        return {"match": False, "reason": "No fingerprints to match", "hashes_matched": 0}

    hash_index = {}
    song_fingerprint_counts = Counter()
    
    for song_id, h, o in song_fingerprints:
        hash_index.setdefault(h, []).append((song_id, o))
        song_fingerprint_counts[song_id] += 1

    match_map = Counter()
    matched_hashes = 0

    for h, q_offset in clip_fingerprints:
        for song_id, db_offset in hash_index.get(h, []):
            delta = db_offset - q_offset
            match_map[(song_id, delta)] += 1
            matched_hashes += 1

    if not match_map:
        return {"match": False, "reason": "No matching hashes", "hashes_matched": 0}

    (song_id, offset), match_count = match_map.most_common(1)[0]
    
    # Improved confidence calculation:
    # 1. Consider both query and database fingerprint counts
    # 2. Use harmonic mean to penalize mismatched sizes
    # 3. Apply temporal clustering bonus for sequential matches
    query_fp_count = len(clip_fingerprints)
    db_fp_count = song_fingerprint_counts.get(song_id, 1)
    
    # Base confidence: harmonic mean of match ratios
    query_ratio = match_count / max(query_fp_count, 1)
    db_ratio = match_count / max(db_fp_count, 1)
    
    # Harmonic mean penalizes imbalanced matches more than arithmetic mean
    if query_ratio + db_ratio > 0:
        base_confidence = (2 * query_ratio * db_ratio) / (query_ratio + db_ratio)
    else:
        base_confidence = 0
    
    # Temporal clustering score: check if matches are sequential
    # Get all matches for this song_id with the same offset
    temporal_matches = []
    for h, q_offset in clip_fingerprints:
        for s_id, db_offset in hash_index.get(h, []):
            if s_id == song_id and (db_offset - q_offset) == offset:
                temporal_matches.append(q_offset)
    
    # Calculate clustering: sort and check for sequential patterns
    if len(temporal_matches) > 1:
        temporal_matches.sort()
        gaps = [temporal_matches[i+1] - temporal_matches[i] for i in range(len(temporal_matches)-1)]
        avg_gap = sum(gaps) / len(gaps) if gaps else 0
        # Bonus if matches are tightly clustered (small average gap)
        # Typical sequential matches have gaps < 50 frames
        clustering_bonus = min(0.15, 0.15 * (1 - min(avg_gap / 100, 1)))
    else:
        clustering_bonus = 0
    
    # Final confidence with clustering bonus
    confidence = (base_confidence + clustering_bonus) * 100
    confidence = min(confidence, 100)  # Cap at 100%

    if match_count >= min_match_threshold:
        return {
            "match": True,
            "song_id": song_id,
            "offset": offset,
            "hashes_matched": match_count,
            "confidence": round(confidence, 2)
        }
    else:
        return {
            "match": False,
            "reason": "Below match threshold",
            "hashes_matched": match_count,
            "confidence": round(confidence, 2)
        }
    




def simple_match(stream_samples, sr, song_fingerprints, chunk_duration=5, min_match_threshold=15):
    """
    Match against a streaming audio buffer in chunks.
    Suitable for radio streams or long continuous audio.
    
    min_match_threshold: Minimum number of matching hashes required.
    Recommended: 15-20 for reliable matches, reduces false positives.
    """
    chunk_size = int(chunk_duration * sr)
    total_samples = len(stream_samples)

    hash_index = {}
    song_fingerprint_counts = Counter()
    
    for song_id, h, o in song_fingerprints:
        hash_index.setdefault(h, []).append((song_id, o))
        song_fingerprint_counts[song_id] += 1

    matches = []
    i = 0

    while i + chunk_size < total_samples:
        chunk = stream_samples[i:i + chunk_size]
        clip_fingerprints = simple_fingerprint(chunk, sr)

        match_map = Counter()
        for h, q_offset in clip_fingerprints:
            for song_id, db_offset in hash_index.get(h, []):
                delta = db_offset - q_offset
                match_map[(song_id, delta)] += 1

        if match_map:
            (song_id, offset), match_count = match_map.most_common(1)[0]
            
            # Improved confidence calculation (same as simple_match_mp3)
            query_fp_count = len(clip_fingerprints)
            db_fp_count = song_fingerprint_counts.get(song_id, 1)
            
            query_ratio = match_count / max(query_fp_count, 1)
            db_ratio = match_count / max(db_fp_count, 1)
            
            if query_ratio + db_ratio > 0:
                base_confidence = (2 * query_ratio * db_ratio) / (query_ratio + db_ratio)
            else:
                base_confidence = 0
            
            # Temporal clustering
            temporal_matches = []
            for h, q_offset in clip_fingerprints:
                for s_id, db_offset in hash_index.get(h, []):
                    if s_id == song_id and (db_offset - q_offset) == offset:
                        temporal_matches.append(q_offset)
            
            if len(temporal_matches) > 1:
                temporal_matches.sort()
                gaps = [temporal_matches[i+1] - temporal_matches[i] for i in range(len(temporal_matches)-1)]
                avg_gap = sum(gaps) / len(gaps) if gaps else 0
                clustering_bonus = min(0.15, 0.15 * (1 - min(avg_gap / 100, 1)))
            else:
                clustering_bonus = 0
            
            confidence = (base_confidence + clustering_bonus) * 100
            confidence = min(confidence, 100)

            if match_count >= min_match_threshold:
                matches.append({
                    "match": True,
                    "song_id": song_id,
                    "offset": offset,
                    "confidence": round(confidence, 2),
                    "match_count": match_count,
                    "chunk_start": i / sr,
                    "chunk_end": (i + chunk_size) / sr
                })
                i += int(sr * 15)  # skip 15s ahead to avoid overlapping matches
                continue

        i += int(sr * 2)  # slide window by 2s otherwise

    return matches if matches else [{"match": False, "reason": "No valid matches found"}]