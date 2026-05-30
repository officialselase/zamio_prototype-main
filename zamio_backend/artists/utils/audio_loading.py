import subprocess

import numpy as np


class AudioLoadError(Exception):
    """Raised when decoded audio samples cannot be produced."""


def load_audio_samples(path, sample_rate=44100, timeout=120):
    """
    Decode audio through FFmpeg into mono float32 PCM samples.

    This avoids librosa's file-loading backend, which can fail in some
    environments even after FFmpeg has successfully converted the upload.
    """
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                path,
                "-f",
                "f32le",
                "-acodec",
                "pcm_f32le",
                "-ac",
                "1",
                "-ar",
                str(sample_rate),
                "pipe:1",
            ],
            check=True,
            capture_output=True,
            timeout=timeout,
        )
    except subprocess.CalledProcessError as exc:
        details = (exc.stderr or b"").decode("utf-8", errors="replace").strip()
        raise AudioLoadError(details or "FFmpeg could not decode audio") from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioLoadError(f"FFmpeg audio decoding exceeded {timeout} seconds") from exc

    samples = np.frombuffer(result.stdout, dtype=np.float32).copy()
    if samples.size == 0:
        raise AudioLoadError("Decoded audio contained no samples")

    return samples, sample_rate
