
import logging
from typing import List, Tuple, Optional
from operator import itemgetter
from collections import Counter

import numpy as np
import librosa
import xxhash
from numba import jit
import matplotlib.pyplot as plt

try:
    from scipy.ndimage import maximum_filter
except ImportError:  # pragma: no cover - scipy is installed through librosa in normal environments.
    maximum_filter = None


# Default configuration
DEFAULT_CONFIG = {
    'DEFAULT_FS': 44100,
    'DEFAULT_WINDOW_SIZE': 2048,
    'DEFAULT_OVERLAP_RATIO': 0.5,
    'DEFAULT_FAN_VALUE': 15,
    'DEFAULT_AMP_MIN_PERCENTILE': 90,  # Use adaptive amplitude threshold via percentile
    'PEAK_NEIGHBORHOOD_SIZE': 10,
    'MIN_HASH_TIME_DELTA': 0,
    'MAX_HASH_TIME_DELTA': 500,
    'FINGERPRINT_REDUCTION': 20,  # Number of chars if using hex (not used here, int stored)
    'PEAK_SORT': True
}

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@jit(nopython=True)
def get_2D_peaks_numba(arr2D: np.ndarray, amp_min: float, peak_neighborhood_size: int) -> List[Tuple[int, int]]:
    """Optimized peak detection with numba."""
    peaks = []
    rows, cols = arr2D.shape
    neighborhood_size = peak_neighborhood_size // 2
    for i in range(neighborhood_size, rows - neighborhood_size):
        for j in range(neighborhood_size, cols - neighborhood_size):
            if arr2D[i, j] > amp_min:
                is_max = True
                for di in range(-neighborhood_size, neighborhood_size + 1):
                    for dj in range(-neighborhood_size, neighborhood_size + 1):
                        if di == 0 and dj == 0:
                            continue
                        if arr2D[i + di, j + dj] > arr2D[i, j]:
                            is_max = False
                            break
                    if not is_max:
                        break
                if is_max:
                    peaks.append((i, j))
    return peaks


def get_2D_peaks(arr2D: np.ndarray, plot: bool = False,
                 amp_min: Optional[float] = None,
                 amp_min_percentile: Optional[int] = None,
                 peak_neighborhood_size: int = DEFAULT_CONFIG['PEAK_NEIGHBORHOOD_SIZE']) -> List[Tuple[int, int]]:
    """
    Extract peaks from spectrogram with optional adaptive amplitude thresholding.

    Parameters:
        amp_min: absolute amplitude threshold in dB
        amp_min_percentile: if set, computes amplitude threshold as this percentile of arr2D values

    Returns:
        List of (freq_bin, time_bin) tuples representing peaks.
    """
    try:
        if amp_min is None and amp_min_percentile is not None:
            amp_min = np.percentile(arr2D, amp_min_percentile)
            logger.debug(f"Adaptive amplitude min threshold at {amp_min_percentile} percentile: {amp_min:.2f} dB")
        elif amp_min is None:
            amp_min = -20  # Fallback default

        if maximum_filter is not None:
            local_max = arr2D == maximum_filter(
                arr2D,
                size=(peak_neighborhood_size, peak_neighborhood_size),
                mode='nearest',
            )
            peak_mask = local_max & (arr2D > amp_min)
            freq_bins, time_bins = np.where(peak_mask)
            peaks = list(zip(freq_bins.astype(int).tolist(), time_bins.astype(int).tolist()))
        else:
            peaks = get_2D_peaks_numba(arr2D, amp_min, peak_neighborhood_size)

        if plot:
            plt.figure(figsize=(10, 6))
            plt.imshow(arr2D, origin='lower', aspect='auto', cmap='viridis')
            if peaks:
                freqs, times = zip(*peaks)
                plt.scatter(times, freqs, c='r', s=10, label='Peaks')
            plt.colorbar(label='Amplitude (dB)')
            plt.xlabel('Time (frames)')
            plt.ylabel('Frequency (bins)')
            plt.title(f'Spectrogram with Detected Peaks (amp_min={amp_min:.2f} dB)')
            plt.legend()
            plt.show()

        return peaks
    except Exception as e:
        logger.error(f"Peak detection failed: {e}")
        return []


def fallback_fingerprint(channel_samples: np.ndarray, Fs: int,
                         window_seconds: float = 1.0,
                         hop_seconds: float = 0.5,
                         bands: int = 32,
                         top_bands: int = 6) -> List[Tuple[int, int]]:
    """
    Generate coarse audio fingerprints from spectral-band energy.

    This is intentionally simpler than the peak-pair algorithm, but it ensures
    uploaded tracks still produce matchable database fingerprints for prototype
    workflows when peak extraction is too sparse for a particular file.
    """
    samples = channel_samples.astype(np.float32)
    if samples.size == 0:
        return []

    max_abs = np.max(np.abs(samples))
    if max_abs > 0:
        samples = samples / max_abs

    window_size = max(int(Fs * window_seconds), 2048)
    hop_size = max(int(Fs * hop_seconds), 1024)
    if samples.size < window_size:
        samples = np.pad(samples, (0, window_size - samples.size))

    fingerprints = []
    window = np.hanning(window_size).astype(np.float32)

    for offset, start in enumerate(range(0, samples.size - window_size + 1, hop_size)):
        chunk = samples[start:start + window_size] * window
        spectrum = np.abs(np.fft.rfft(chunk))
        if not np.any(spectrum):
            continue

        band_edges = np.linspace(0, spectrum.size, bands + 1, dtype=int)
        energies = [
            float(np.mean(spectrum[band_edges[i]:band_edges[i + 1]]))
            for i in range(bands)
            if band_edges[i + 1] > band_edges[i]
        ]
        if not energies:
            continue

        energy_array = np.asarray(energies)
        strongest = np.argsort(energy_array)[-top_bands:]
        quantized = tuple(
            int(round(np.log1p(energy_array[index]) * 10))
            for index in strongest
        )
        h = xxhash.xxh64()
        h.update(f"{tuple(sorted(strongest.tolist()))}|{quantized}".encode('utf-8'))
        fingerprints.append((h.intdigest(), offset))

    return fingerprints


def generate_hashes(peaks: List[Tuple[int, int]],
                    fan_value: int = DEFAULT_CONFIG['DEFAULT_FAN_VALUE'],
                    min_hash_time_delta: int = DEFAULT_CONFIG['MIN_HASH_TIME_DELTA'],
                    max_hash_time_delta: int = DEFAULT_CONFIG['MAX_HASH_TIME_DELTA'],
                    peak_sort: bool = DEFAULT_CONFIG['PEAK_SORT']) -> List[Tuple[int, int]]:
    """
    Generate integer hashes from peaks using fan-out method.

    Returns:
        List of tuples: (hash_int, t1_offset)
    """
    try:
        if peak_sort:
            peaks.sort(key=itemgetter(1))

        hashes = []
        valid_pairs = 0

        for i in range(len(peaks)):
            freq1, t1 = peaks[i]
            for j in range(1, fan_value):
                if (i + j) >= len(peaks):
                    break
                freq2, t2 = peaks[i + j]
                t_delta = t2 - t1
                if min_hash_time_delta <= t_delta <= max_hash_time_delta:
                    valid_pairs += 1
                    h = xxhash.xxh64()
                    h.update(f"{freq1}|{freq2}|{t_delta}".encode('utf-8'))
                    hash_int = h.intdigest()
                    hashes.append((hash_int, t1))

        logger.debug(f"Generated {valid_pairs} valid peak pairs for hashing")
        return hashes

    except Exception as e:
        logger.error(f"Hash generation failed: {e}")
        return []


def simple_fingerprint(channel_samples: np.ndarray, Fs: int,
                       config: dict = DEFAULT_CONFIG,
                       plot: bool = False) -> List[Tuple[int, int]]:
    """
    Generate fingerprints from audio samples.

    Parameters:
        channel_samples: np.array audio samples (mono)
        Fs: sampling rate
        config: dict of fingerprinting params (overrides defaults)
        plot: whether to plot intermediate results

    Returns:
        List of (hash_int, offset) tuples representing the fingerprint.
    """
    try:
        samples = channel_samples.astype(np.float32)
        if samples.max() > 1.0 or samples.min() < -1.0:
            samples /= np.abs(samples).max()  # Normalize to [-1,1]

        wsize = config.get('DEFAULT_WINDOW_SIZE', 2048)
        wratio = config.get('DEFAULT_OVERLAP_RATIO', 0.5)
        hop_length = int(wsize * (1 - wratio))

        S = librosa.stft(samples, n_fft=wsize, hop_length=hop_length, window='hann')
        arr2D = librosa.amplitude_to_db(np.abs(S), ref=np.max)

        amp_min_percentile = config.get('DEFAULT_AMP_MIN_PERCENTILE', None)
        amp_min = config.get('DEFAULT_AMP_MIN', None)
        peak_neighborhood_size = config.get('PEAK_NEIGHBORHOOD_SIZE', 10)

        peaks = get_2D_peaks(arr2D, plot=plot, amp_min=amp_min,
                             amp_min_percentile=amp_min_percentile,
                             peak_neighborhood_size=peak_neighborhood_size)

        hashes = generate_hashes(peaks,
                                 fan_value=config.get('DEFAULT_FAN_VALUE', 15),
                                 min_hash_time_delta=config.get('MIN_HASH_TIME_DELTA', 0),
                                 max_hash_time_delta=config.get('MAX_HASH_TIME_DELTA', 500),
                                 peak_sort=config.get('PEAK_SORT', True))

        if hashes:
            return hashes

        logger.warning("Peak fingerprinting produced no hashes; using fallback fingerprints")
        return fallback_fingerprint(samples, Fs)

    except Exception as e:
        logger.error(f"Simple fingerprinting failed: {e}")
        return fallback_fingerprint(channel_samples, Fs)
