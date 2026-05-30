import React, { useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../lib/api';
import { shouldSuppressProtectedImageFetch } from '../utils/media';

export interface ProtectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallback?: React.ReactNode;
}

const isDataUrl = (value: string) => value.startsWith('data:') || value.startsWith('blob:');

const getEnvironmentMode = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.MODE === 'string') {
    return import.meta.env.MODE;
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV;
  }
  return undefined;
};

const ProtectedImage: React.FC<ProtectedImageProps> = ({ src: inputSrc, fallback = null, alt, ...imgProps }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [directSrc, setDirectSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const normalizedSrc = useMemo(() => {
    if (!inputSrc || typeof inputSrc !== 'string') {
      return '';
    }
    return inputSrc.trim();
  }, [inputSrc]);

  const envMode = getEnvironmentMode();
  const isTestEnv = envMode === 'test';
  const isBrowser = typeof window !== 'undefined';

  const shouldSuppressRequest = useMemo(() => shouldSuppressProtectedImageFetch(normalizedSrc), [normalizedSrc]);

  useEffect(() => {
    if (!normalizedSrc || shouldSuppressRequest) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
      setDirectSrc(null);
      setHasError(Boolean(shouldSuppressRequest));
      setIsLoading(false);
      return;
    }

    if (!isBrowser || isTestEnv || isDataUrl(normalizedSrc)) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
      setDirectSrc(normalizedSrc);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    let resolvedUrl = normalizedSrc;
    try {
      resolvedUrl = new URL(normalizedSrc, window.location.origin).toString();
    } catch (_error) {
      resolvedUrl = normalizedSrc;
    }

    let isSameOrigin = false;
    try {
      const targetUrl = new URL(resolvedUrl);
      isSameOrigin = targetUrl.origin === window.location.origin;
    } catch (_error) {
      isSameOrigin = !/^https?:\/\//i.test(resolvedUrl);
    }

    if (isSameOrigin) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
      setDirectSrc(resolvedUrl);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const fetchImage = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await authApi.get<Blob>(resolvedUrl, {
          responseType: 'blob',
          signal: controller.signal,
          headers: {
            Accept: 'image/*',
          },
        });

        if (isCancelled) {
          return;
        }

        const blob = response.data;
        if (!blob) {
          throw new Error('Empty image response');
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        const nextObjectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = nextObjectUrl;
        setObjectUrl(nextObjectUrl);
        setDirectSrc(null);
      } catch (error) {
        if (isCancelled) {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        setHasError(true);
        setObjectUrl(null);
        setDirectSrc(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isCancelled = true;
      controller.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [normalizedSrc, shouldSuppressRequest, isBrowser, isTestEnv]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  if (!normalizedSrc || hasError || (isLoading && !objectUrl && fallback)) {
    return <>{fallback}</>;
  }

  const finalSrc = objectUrl || directSrc || normalizedSrc;

  return <img src={finalSrc} alt={alt} {...imgProps} data-protected-image data-original-src={normalizedSrc} />;
};

export default ProtectedImage;
