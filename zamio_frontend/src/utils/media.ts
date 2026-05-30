const BROKEN_TRACK_COVER_FRAGMENTS = [
  '/media/defaults/track_cover.png',
  'defaults/track_cover.png',
];

export const isBrokenTrackCoverUrl = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  return BROKEN_TRACK_COVER_FRAGMENTS.some((fragment) => normalized.includes(fragment));
};

export const shouldSuppressProtectedImageFetch = (value?: string | null): boolean => {
  return isBrokenTrackCoverUrl(value);
};

export const sanitizeMediaUrl = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (isBrokenTrackCoverUrl(normalized)) {
    return null;
  }

  return normalized;
};

export const brokenTrackCoverFragments = BROKEN_TRACK_COVER_FRAGMENTS;
