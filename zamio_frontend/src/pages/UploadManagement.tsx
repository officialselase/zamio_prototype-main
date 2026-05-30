import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  Upload,
  FileAudio,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Pause,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Album
} from 'lucide-react';
import {
  fetchUploadManagement,
  initiateUpload,
  fetchUploadStatusById,
  cancelUploadRequest,
  deleteUploadRequest,
  createAlbumForUploads,
  type UploadLifecycleStatus,
  type UploadManagementPagination,
  type ApiEnvelope,
  resolveApiBaseUrl,
} from '../lib/api';
import ProtectedImage from '../components/ProtectedImage';
import { sanitizeMediaUrl } from '../utils/media';

interface UploadData {
  id: string;
  uploadId: string;
  status: UploadLifecycleStatus;
  rawStatus?: string;
  progress: number;
  filename: string;
  fileSize: number;
  fileType?: string | null;
  uploadDate: string;
  error?: string | null;
  retryCount?: number;
  duration?: string | null;
  artist?: string | null;
  album?: string | null;
  title?: string | null;
  station?: string | null;
  entityId?: number | null;
  uploadType?: string | null;
  entityType?: string | null;
  entityTrackId?: string | null;
  coverArtUrl?: string | null;
  albumCoverUrl?: string | null;
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const axiosError = error as AxiosError<ApiEnvelope>;
    const responseData = axiosError.response?.data;

    if (responseData) {
      const message = typeof responseData.message === 'string' ? responseData.message.trim() : '';
      if (message) {
        return message;
      }

      const errors = responseData.errors;
      if (errors && typeof errors === 'object') {
        for (const key of Object.keys(errors)) {
          const value = errors[key];
          if (Array.isArray(value)) {
            const text = value.find((item) => typeof item === 'string' && item.trim());
            if (text) {
              return text;
            }
          } else if (typeof value === 'string' && value.trim()) {
            return value;
          }
        }
      }
    }

    if (axiosError.message) {
      return axiosError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const mapBackendStatus = (status?: string): UploadLifecycleStatus => {
  switch (status) {
    case 'processing':
    case 'deleting':
      return 'processing';
    case 'completed':
    case 'deleted':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'uploading':
    case 'pending':
    case 'queued':
    default:
      return 'uploading';
  }
};

const UploadManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedAlbum, setSelectedAlbum] = useState('all');
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isAddAlbumModalOpen, setIsAddAlbumModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [newAlbumData, setNewAlbumData] = useState({
    title: '',
    artist: '',
    genre: '',
    releaseDate: '',
    description: '',
  });
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, uploading: 0, processing: 0, completed: 0, failed: 0 });
  const [pagination, setPagination] = useState<UploadManagementPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UploadData | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Upload State Management
  const [bulkUploadStep, setBulkUploadStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState<{[key: string]: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    duration?: string;
    isrc?: string;
    composer?: string;
    producer?: string;
    bpm?: string;
    key?: string;
    mood?: string;
    language?: string;
    explicit?: boolean;
    featured?: boolean;
    tags?: string[];
  }}>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadLifecycleStatus>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadIdentifiers, setUploadIdentifiers] = useState<Record<string, string>>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const apiBaseUrl = useMemo(() => resolveApiBaseUrl().replace(/\/$/, ''), []);

  const resolveMediaUrl = useCallback(
    (input?: string | null): string | null => {
      const sanitizedInput = sanitizeMediaUrl(input);
      if (!sanitizedInput) {
        return null;
      }

      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(sanitizedInput) || sanitizedInput.startsWith('//')) {
        return sanitizeMediaUrl(sanitizedInput);
      }

      if (/^[a-z][a-z0-9+.-]*:/i.test(sanitizedInput)) {
        return sanitizeMediaUrl(sanitizedInput);
      }

      if (!apiBaseUrl) {
        return sanitizeMediaUrl(sanitizedInput);
      }

      if (sanitizedInput.startsWith('/')) {
        return sanitizeMediaUrl(`${apiBaseUrl}${sanitizedInput}`);
      }

      return sanitizeMediaUrl(`${apiBaseUrl}/${sanitizedInput}`);
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }
    const timer = window.setTimeout(() => setActionMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  const fetchUploads = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchUploadManagement({
          page: pageToLoad,
          page_size: itemsPerPage,
          status: activeTab !== 'all' ? activeTab : undefined,
          search: debouncedSearch || undefined,
          album: selectedAlbum !== 'all' ? selectedAlbum : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        const payload = response?.data;
        const remoteUploads = payload?.uploads ?? [];
        const normalizedUploads: UploadData[] = remoteUploads.map((item) => {
          const metadata = (item?.metadata ?? {}) as Record<string, unknown>;
          const extractString = (value: unknown) =>
            typeof value === 'string' && value.trim().length > 0 ? value : null;

          const coverArtUrl =
            extractString(item?.cover_art_url) ??
            extractString(metadata['cover_art_url']) ??
            extractString(metadata['cover_url']);

          const albumCoverUrl =
            extractString(item?.album_cover_url) ??
            extractString(metadata['album_cover_url']) ??
            extractString(metadata['album_cover']);

          const normalizedCoverArtUrl = resolveMediaUrl(coverArtUrl);
          const normalizedAlbumCoverUrl = resolveMediaUrl(albumCoverUrl);

          const normalizeIdValue = (value: unknown): string | null => {
            if (typeof value === 'number' && Number.isFinite(value)) {
              return value.toString();
            }
            if (typeof value === 'string' && value.trim().length > 0) {
              return value.trim();
            }
            return null;
          };

          const uploadIdValue =
            normalizeIdValue(item?.upload_id) ??
            normalizeIdValue(item?.id) ??
            normalizeIdValue(metadata['upload_id']) ??
            '';
          const rawStatusValue = extractString(item?.raw_status) ?? extractString(item?.status);
          const progressValue =
            typeof item?.progress === 'number'
              ? item.progress
              : typeof item?.progress_percentage === 'number'
                ? item.progress_percentage
                : typeof item?.progressPercentage === 'number'
                  ? item.progressPercentage
                  : 0;

          const fileSizeValue = Number(
            item?.file_size ?? metadata['file_size_bytes'] ?? metadata['file_size'] ?? 0,
          );

          const uploadDateValue =
            extractString(item?.upload_date) ?? extractString(item?.created_at) ?? new Date().toISOString();

          const entityIdValue = (() => {
            if (typeof item?.entity_id === 'number') {
              return item.entity_id;
            }
            if (typeof item?.entity_id === 'string') {
              const parsed = Number(item.entity_id);
              return Number.isFinite(parsed) ? parsed : null;
            }
            return null;
          })();

          const entityTrackIdValue =
            extractString(metadata['track_id']) ??
            extractString(metadata['track_identifier']) ??
            extractString(metadata['trackId']) ??
            (typeof item?.entity_id === 'string' && item.entity_id.trim().length > 0
              ? item.entity_id.trim()
              : null);

          return {
            id: uploadIdValue || '',
            uploadId: uploadIdValue || '',
            status: mapBackendStatus(rawStatusValue ?? item?.status),
            rawStatus: rawStatusValue ?? undefined,
            progress: progressValue,
            filename:
              extractString(item?.filename) ??
              extractString(item?.original_filename) ??
              extractString(metadata['filename']) ??
              'Unknown file',
            fileSize: fileSizeValue,
            fileType: extractString(item?.file_type) ?? extractString(metadata['file_type']),
            uploadDate: uploadDateValue,
            error: extractString(item?.error) ?? extractString(metadata['error_message']),
            retryCount: typeof item?.retry_count === 'number' ? item.retry_count : undefined,
            duration: extractString(item?.duration) ?? extractString(metadata['duration']),
            artist: extractString(item?.artist) ?? extractString(metadata['artist_name']) ?? extractString(metadata['artist']),
            album: extractString(item?.album) ?? extractString(metadata['album_title']) ?? extractString(metadata['album']),
            title: extractString(item?.title) ?? extractString(metadata['title']),
            station: extractString(item?.station) ?? extractString(metadata['station_name']),
            entityId: entityIdValue,
            uploadType: extractString(item?.upload_type),
            entityType: extractString(item?.entity_type),
            entityTrackId: entityTrackIdValue,
            coverArtUrl: normalizedCoverArtUrl,
            albumCoverUrl: normalizedAlbumCoverUrl,
          };
        });

        setUploads(normalizedUploads);
        setStats(payload?.stats ?? { total: 0, uploading: 0, processing: 0, completed: 0, failed: 0 });
        setAvailableAlbums(payload?.filters?.albums ?? []);

        if (payload?.pagination) {
          setPagination(payload.pagination);
          if (payload.pagination.page !== pageToLoad) {
            setCurrentPage(payload.pagination.page);
          }
        } else {
          setPagination(null);
        }

        setSelectedUploads((prev) => prev.filter((id) => normalizedUploads.some((upload) => upload.id === id)));
      } catch (err) {
        setError('Failed to load uploads. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, debouncedSearch, selectedAlbum, sortBy, sortOrder, itemsPerPage, resolveMediaUrl]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, selectedAlbum, sortBy, sortOrder]);

  useEffect(() => {
    fetchUploads(currentPage);
  }, [currentPage, fetchUploads]);

  const resetBulkUpload = () => {
    setBulkUploadStep(1);
    setSelectedFiles([]);
    setUploadMetadata({});
    setUploadProgress({});
    setUploadStatus({});
    setIsBulkUploading(false);
    setIsBulkUploadModalOpen(false);
  };

  const handleBulkFileSelect = (files: FileList | null) => {
    if (!files) return;

    const audioFiles = Array.from(files).filter(
      (file) => file.type.startsWith('audio/') && file.size <= 50 * 1024 * 1024,
    );

    if (audioFiles.length !== files.length) {
      setActionMessage('Some files were skipped. Only audio files under 50MB are supported.');
    }

    setSelectedFiles(audioFiles);

    const initialMetadata: Record<string, any> = {};
    const initialStatus: Record<string, UploadLifecycleStatus> = {};
    const initialProgress: Record<string, number> = {};

    audioFiles.forEach((file) => {
      initialMetadata[file.name] = {
        title: '',
        artist: '',
        album: '',
        genre: '',
        duration: '',
        isrc: '',
        composer: '',
        producer: '',
        bpm: '',
        key: '',
        mood: '',
        language: 'English',
        explicit: false,
        featured: false,
        tags: [],
      };
      initialStatus[file.name] = 'pending';
      initialProgress[file.name] = 0;
    });

    setUploadMetadata(initialMetadata);
    setUploadStatus(initialStatus);
    setUploadProgress(initialProgress);
    setUploadErrors({});
    setUploadIdentifiers({});
  };

  const handleMetadataChange = (fileName: string, field: string, value: any) => {
    setUploadMetadata(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [field]: value
      }
    }));
  };

  const pollUploadStatus = useCallback(async (uploadId: string, fileName: string) => {
    const poll = async (attempt: number): Promise<void> => {
      try {
        const response = await fetchUploadStatusById(uploadId);
        const payload: any = response?.data;

        if (payload) {
          const status = mapBackendStatus(payload.status);
          setUploadStatus((prev) => ({ ...prev, [fileName]: status }));
          setUploadProgress((prev) => ({ ...prev, [fileName]: payload.progress_percentage ?? prev[fileName] ?? 0 }));

          if (payload.error_message) {
            setUploadErrors((prev) => ({ ...prev, [fileName]: String(payload.error_message) }));
          }

          if (['completed', 'failed', 'cancelled'].includes(status)) {
            return;
          }
        }
      } catch (err) {
        if (attempt >= 5) {
          setUploadStatus((prev) => ({ ...prev, [fileName]: 'failed' }));
          setUploadErrors((prev) => ({ ...prev, [fileName]: 'Unable to update upload status' }));
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        return poll(attempt + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      return poll(0);
    };

    await poll(0);
  }, []);

  const startBulkUpload = useCallback(async () => {
    if (!selectedFiles.length) {
      return;
    }

    setIsBulkUploading(true);
    setBulkUploadStep(3);

    await Promise.all(
      selectedFiles.map(async (file) => {
        const metadata = uploadMetadata[file.name] || {};
        setUploadStatus((prev) => ({ ...prev, [file.name]: 'uploading' }));
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        setUploadErrors((prev) => ({ ...prev, [file.name]: '' }));

        const formData = new FormData();
        formData.append('upload_type', 'track_audio');
        formData.append('file', file);
        formData.append('title', metadata.title || file.name);
        if (metadata.artist) formData.append('artist_name', metadata.artist);
        if (metadata.album) formData.append('album_title', metadata.album);
        if (metadata.genre) formData.append('genre_name', metadata.genre);
        if (metadata.duration) formData.append('duration', metadata.duration);
        if (metadata.isrc) formData.append('isrc', metadata.isrc);
        if (metadata.composer) formData.append('composer', metadata.composer);
        if (metadata.producer) formData.append('producer', metadata.producer);
        if (metadata.bpm) formData.append('bpm', metadata.bpm);
        if (metadata.key) formData.append('key', metadata.key);
        if (metadata.mood) formData.append('mood', metadata.mood);
        if (metadata.language) formData.append('language', metadata.language);
        formData.append('explicit', metadata.explicit ? 'true' : 'false');
        formData.append('featured', metadata.featured ? 'true' : 'false');
        if (Array.isArray(metadata.tags)) {
          metadata.tags.forEach((tag: string) => {
            if (tag) {
              formData.append('tags', tag);
            }
          });
        }

        try {
          const response = await initiateUpload(formData);
          const uploadId = response?.data?.upload_id as string | undefined;
          if (!uploadId) {
            throw new Error('Upload identifier not returned.');
          }
          setUploadIdentifiers((prev) => ({ ...prev, [file.name]: uploadId }));
          await pollUploadStatus(uploadId, file.name);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setUploadStatus((prev) => ({ ...prev, [file.name]: 'failed' }));
          setUploadErrors((prev) => ({ ...prev, [file.name]: message }));
        }
      })
    );

    setIsBulkUploading(false);
    setBulkUploadStep(4);
    setActionMessage('Bulk upload completed.');
    fetchUploads(currentPage);
  }, [selectedFiles, uploadMetadata, pollUploadStatus, fetchUploads, currentPage]);

  const handlePauseUpload = async (upload: UploadData) => {
    try {
      await cancelUploadRequest(upload.uploadId);
      setActionMessage('Upload cancelled successfully.');
      await fetchUploads(currentPage);
    } catch (err) {
      setActionMessage('Unable to cancel upload.');
    }
  };

  const handleRefreshUpload = async (upload: UploadData) => {
    try {
      await fetchUploadStatusById(upload.uploadId);
      setActionMessage('Upload status refreshed.');
      await fetchUploads(currentPage);
    } catch (err) {
      setActionMessage('Unable to refresh upload status.');
    }
  };

  const handleDeleteUpload = (upload: UploadData) => {
    setPendingDelete(upload);
    setIsDeleteConfirmOpen(true);
  };

  const resolveEntityKind = useCallback((upload: UploadData | null): 'album' | 'track' | 'upload' => {
    if (!upload) {
      return 'upload';
    }

    const normalizedType = (upload.entityType ?? '').toLowerCase();
    if (normalizedType === 'album' || normalizedType === 'track') {
      return normalizedType;
    }

    const uploadType = (upload.uploadType ?? '').toLowerCase();
    if (uploadType.includes('album')) {
      return 'album';
    }
    if (uploadType.includes('track')) {
      return 'track';
    }
    return 'upload';
  }, []);

  const confirmDeleteUpload = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    setActionMessage(null);
    setIsDeleting(true);
    let succeeded = false;

    try {
      const entityKind = resolveEntityKind(pendingDelete);
      const response = await deleteUploadRequest(pendingDelete.uploadId);
      const responsePayload = (response?.data ?? {}) as Record<string, unknown>;
      const backendStatus = typeof responsePayload.status === 'string' ? responsePayload.status : undefined;

      if (backendStatus === 'deleted') {
        setActionMessage('Upload removed successfully.');
      } else {
        const noun = entityKind === 'track' ? 'track' : entityKind === 'album' ? 'album' : 'upload';
        setActionMessage(`Deletion scheduled. We'll remove this ${noun} shortly.`);
      }
      setSelectedUploads((prev) => prev.filter((id) => id !== pendingDelete.id));
      await fetchUploads(currentPage);
      succeeded = true;
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Unable to delete upload.');
      setActionMessage(message);
    } finally {
      setIsDeleting(false);
      if (succeeded) {
        setIsDeleteConfirmOpen(false);
        setPendingDelete(null);
      }
    }
  }, [currentPage, fetchUploads, pendingDelete, resolveEntityKind]);

  const cancelDeleteUpload = useCallback(() => {
    if (isDeleting) {
      return;
    }
    setIsDeleteConfirmOpen(false);
    setPendingDelete(null);
  }, [isDeleting]);

  const pendingDeleteKind = resolveEntityKind(pendingDelete);

  const sanitizeTrackIdentifier = (value: unknown): string | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      const normalized = trimmed.toLowerCase();
      if (['undefined', 'null', 'none', 'nan'].includes(normalized)) {
        return undefined;
      }

      return trimmed;
    }

    return undefined;
  };

  const handleViewTrack = (upload: UploadData) => {
    const normalizedEntityTrackId = sanitizeTrackIdentifier(upload.entityTrackId);
    const fallbackTrackId = sanitizeTrackIdentifier(upload.entityId);
    const fallbackTrackIdNumber =
      typeof upload.entityId === 'number' && Number.isFinite(upload.entityId) ? upload.entityId : undefined;

    const preferredIdentifier = normalizedEntityTrackId ?? fallbackTrackId;

    if (preferredIdentifier) {
      const searchParams = new URLSearchParams({ trackId: preferredIdentifier });
      navigate(`/dashboard/track-details?${searchParams.toString()}`, {
        state: {
          trackId: fallbackTrackIdNumber,
          trackKey: preferredIdentifier,
        },
      });
    } else {
      setActionMessage('Track details will be available once processing completes.');
    }
  };

  const handleCreateAlbum = async () => {
    const trimmedTitle = newAlbumData.title.trim();
    if (!trimmedTitle) {
      setActionMessage('Album title is required.');
      return;
    }

    try {
      setIsCreatingAlbum(true);
      const response = await createAlbumForUploads({
        title: trimmedTitle,
        release_date: newAlbumData.releaseDate || undefined,
        genre: newAlbumData.genre || undefined,
      });

      const createdTitle = response?.data?.title || trimmedTitle;
      setActionMessage(`Album "${createdTitle}" is ready for uploads.`);
      setAvailableAlbums((prev) => {
        if (prev.includes(createdTitle)) {
          return prev;
        }
        return [...prev, createdTitle].sort((a, b) => a.localeCompare(b));
      });
      setNewAlbumData({ title: '', artist: '', genre: '', releaseDate: '', description: '' });
      setIsAddAlbumModalOpen(false);
      await fetchUploads(currentPage);
    } catch (err) {
      setActionMessage('Unable to create album. Please try again.');
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const totalPages = pagination?.total_pages ?? 1;
  const startIndex = pagination ? (pagination.page - 1) * pagination.page_size : 0;
  const endIndex = pagination
    ? Math.min(pagination.page * pagination.page_size, pagination.total_count)
    : uploads.length;
  const totalCount = pagination?.total_count ?? uploads.length;
  const paginatedData = uploads;
  const pageSize = pagination?.page_size ?? itemsPerPage;

  const isAllSelected = paginatedData.length > 0 && paginatedData.every((upload) => selectedUploads.includes(upload.id));

  const handleToggleSelectUpload = (uploadId: string, checked: boolean) => {
    setSelectedUploads((prev) => {
      if (checked) {
        if (prev.includes(uploadId)) {
          return prev;
        }
        return [...prev, uploadId];
      }
      return prev.filter((id) => id !== uploadId);
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const merged = new Set([...selectedUploads, ...paginatedData.map((upload) => upload.id)]);
      setSelectedUploads(Array.from(merged));
    } else {
      setSelectedUploads((prev) => prev.filter((id) => !paginatedData.some((upload) => upload.id === id)));
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'uploading':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'uploading':
        return <Upload className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick, count }: {
    id: string;
    label: string;
    icon: any;
    isActive: boolean;
    onClick: (id: string) => void;
    count?: number;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          isActive
            ? 'bg-white/20 text-white'
            : 'bg-gray-600 text-gray-300'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  const statsData = {
    total: stats.total ?? 0,
    uploading: stats.uploading ?? 0,
    processing: stats.processing ?? 0,
    completed: stats.completed ?? 0,
    failed: stats.failed ?? 0,
  };

  return (
    <>
      {/* Page header - matching dashboard style */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Upload Management</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Manage your audio file uploads, processing status, and batch operations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsAddAlbumModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Album className="w-4 h-4" />
                <span>Add Album</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/album-list')}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Album className="w-4 h-4" />
                <span>Album Management</span>
              </button>
              <button
                onClick={() => {
                  setIsBulkUploadModalOpen(true);
                  setBulkUploadStep(1);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Upload</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/add-track')}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Upload className="w-4 h-4" />
                <span>Add Single Track</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Files</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {statsData.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <FileAudio className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Uploading</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  {statsData.uploading}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Processing</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {statsData.processing}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  {statsData.completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-red-300 dark:hover:border-red-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Failed</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                  {statsData.failed}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
            <TabButton
              id="all"
              label="All Files"
              icon={FileAudio}
              isActive={activeTab === 'all'}
              onClick={setActiveTab}
              count={statsData.total}
            />
            <TabButton
              id="uploading"
              label="Uploading"
              icon={Upload}
              isActive={activeTab === 'uploading'}
              onClick={setActiveTab}
              count={statsData.uploading}
            />
            <TabButton
              id="processing"
              label="Processing"
              icon={RefreshCw}
              isActive={activeTab === 'processing'}
              onClick={setActiveTab}
              count={statsData.processing}
            />
            <TabButton
              id="completed"
              label="Completed"
              icon={CheckCircle}
              isActive={activeTab === 'completed'}
              onClick={setActiveTab}
              count={statsData.completed}
            />
            <TabButton
              id="failed"
              label="Failed"
              icon={XCircle}
              isActive={activeTab === 'failed'}
              onClick={setActiveTab}
              count={statsData.failed}
            />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <FileAudio className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Upload Management
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Albums</option>
                {availableAlbums.map((album) => (
                  <option key={album} value={album}>
                    {album}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="uploadDate">Upload Date</option>
                <option value="filename">Filename</option>
                <option value="album">Album</option>
                <option value="fileSize">File Size</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {actionMessage && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700">
              {actionMessage}
            </div>
          )}

          {/* Upload Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 dark:border-slate-600"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>File Details</span>
                        <span className="text-xs">{getSortIcon('filename')}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                      <div className="flex items-center space-x-1">
                        <span>Album</span>
                        <span className="text-xs">{getSortIcon('album')}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                      <div className="flex items-center space-x-1">
                        <span>Size</span>
                        <span className="text-xs">{getSortIcon('fileSize')}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                      <div className="flex items-center space-x-1">
                        <span>Upload Date</span>
                        <span className="text-xs">{getSortIcon('uploadDate')}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Progress</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        <span className="text-xs">{getSortIcon('status')}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                        Loading uploads...
                      </td>
                    </tr>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((upload) => {
                      const coverImageUrl = upload.coverArtUrl ?? upload.albumCoverUrl ?? null;
                      const coverAlt = upload.title ? `${upload.title} cover art` : 'Upload cover art';

                      return (
                        <tr key={upload.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUploads.includes(upload.id)}
                              onChange={(e) => handleToggleSelectUpload(upload.id, e.target.checked)}
                              className="rounded border-gray-300 dark:border-slate-600"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0">
                                {coverImageUrl ? (
                                  <ProtectedImage
                                    src={coverImageUrl}
                                    alt={coverAlt}
                                    className="w-full h-full object-cover"
                                    fallback={<FileAudio className="w-5 h-5" aria-hidden="true" />}
                                  />
                                ) : (
                                  <FileAudio className="w-5 h-5" aria-hidden="true" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-900 dark:text-white font-medium text-sm truncate max-w-[200px]">
                                  {upload.filename}
                                </span>
                                {upload.artist && upload.album && upload.title && (
                                  <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                    {upload.artist} - {upload.album} - {upload.title}
                                  </span>
                                )}
                                {upload.station && (
                                  <span className="text-blue-600 dark:text-blue-400 text-xs">
                                    Station: {upload.station}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm hidden md:table-cell truncate max-w-[150px]">
                            {upload.album || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm hidden sm:table-cell">
                            {formatFileSize(upload.fileSize)}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm hidden md:table-cell">
                            {new Date(upload.uploadDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    upload.status === 'completed' ? 'bg-emerald-500' :
                                    upload.status === 'processing' ? 'bg-blue-500' :
                                    upload.status === 'uploading' ? 'bg-amber-500' :
                                    upload.status === 'failed' || upload.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                                  }`}
                                  style={{ width: `${upload.progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-300 w-12">
                                {upload.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusColor(upload.status)}`}>
                              {getStatusIcon(upload.status)}
                              <span className="ml-1 capitalize">{upload.status}</span>
                            </span>
                            {upload.error && (
                              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {upload.error}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {upload.status === 'uploading' && (
                                <button
                                  onClick={() => handlePauseUpload(upload)}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  aria-label="Cancel upload"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRefreshUpload(upload)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                aria-label="Refresh status"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleViewTrack(upload)}
                                className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                aria-label="View track details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUpload(upload)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                aria-label="Delete upload"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                        No uploads found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enhanced Pagination - More Visible */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/30 -mx-8 px-8 py-4 rounded-b-2xl">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Showing <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{totalCount === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{Math.min(startIndex + pageSize, totalCount)}</span> of{' '}
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{totalCount}</span> uploads
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Show pagination info even when only one page */}
          {totalPages === 1 && totalCount > 0 && (
            <div className="flex justify-center mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing all {totalCount} uploads
              </div>
            </div>
          )}
        </div>
      </div>

      {isDeleteConfirmOpen && pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm deletion</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {pendingDeleteKind === 'album'
                    ? 'This will archive the album and remove the associated upload record.'
                    : pendingDeleteKind === 'track'
                      ? 'This will permanently delete the track and remove the associated upload record.'
                      : 'This will remove the upload record from your history.'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-900 dark:text-gray-300">
              <p className="font-medium">{pendingDelete.title ?? pendingDelete.filename}</p>
              {pendingDelete.album && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Album: {pendingDelete.album}</p>
              )}
              {pendingDelete.artist && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Artist: {pendingDelete.artist}</p>
              )}
              {pendingDelete.error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{pendingDelete.error}</p>
              )}
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              This action cannot be undone. Please confirm you want to continue.
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelDeleteUpload}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUpload}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-red-400"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Album Modal */}
      {isAddAlbumModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Album</h2>
              <button
                onClick={() => setIsAddAlbumModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Album Title
                </label>
                <input
                  type="text"
                  value={newAlbumData.title}
                  onChange={(e) => setNewAlbumData({ ...newAlbumData, title: e.target.value })}
                  placeholder="Enter album title"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Artist Name
                </label>
                <input
                  type="text"
                  value={newAlbumData.artist}
                  onChange={(e) => setNewAlbumData({ ...newAlbumData, artist: e.target.value })}
                  placeholder="Enter artist name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genre
                </label>
                <select
                  value={newAlbumData.genre}
                  onChange={(e) => setNewAlbumData({ ...newAlbumData, genre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Genre</option>
                  <option value="Afrobeats">Afrobeats</option>
                  <option value="Afro Pop">Afro Pop</option>
                  <option value="Highlife">Highlife</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Gospel">Gospel</option>
                  <option value="Reggae">Reggae</option>
                  <option value="Dancehall">Dancehall</option>
                  <option value="R&B">R&B</option>
                  <option value="Traditional">Traditional</option>
                  <option value="Jazz">Jazz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release Date
                </label>
                <input
                  type="date"
                  value={newAlbumData.releaseDate}
                  onChange={(e) => setNewAlbumData({ ...newAlbumData, releaseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newAlbumData.description}
                  onChange={(e) => setNewAlbumData({ ...newAlbumData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the album (optional)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsAddAlbumModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAlbum}
                  disabled={isCreatingAlbum}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isCreatingAlbum
                      ? 'bg-purple-300 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  }`}
                >
                  {isCreatingAlbum ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal - Multi-Step Wizard */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Upload Tracks</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Step {bulkUploadStep} of 4: {bulkUploadStep === 1 ? 'Select Files' : bulkUploadStep === 2 ? 'Add Metadata' : bulkUploadStep === 3 ? 'Upload Progress' : 'Complete'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetBulkUpload}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                      step <= bulkUploadStep
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {step}
                    </div>
                    {step < 4 && (
                      <div className={`w-8 h-1 mx-2 transition-colors duration-200 ${
                        step < bulkUploadStep
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Content - Step 1: File Selection */}
            {bulkUploadStep === 1 && (
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8">
                  <div className="text-center">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Drop your audio files here
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Or click to browse and select multiple files
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Supports: MP3, WAV, FLAC, AIFF (max 50MB per file)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={(e) => handleBulkFileSelect(e.target.files)}
                      className="hidden"
                      id="bulk-upload-files"
                    />
                    <label
                      htmlFor="bulk-upload-files"
                      className="inline-flex items-center px-6 py-3 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors duration-200"
                    >
                      Choose Files
                    </label>
                  </div>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Selected Files ({selectedFiles.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileAudio className="w-5 h-5 text-indigo-600" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-6">
                  <button
                    onClick={() => setBulkUploadStep(2)}
                    disabled={selectedFiles.length === 0}
                    className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                      selectedFiles.length > 0
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                        : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next: Add Metadata
                  </button>
                </div>
              </div>
            )}

            {/* Modal Content - Step 2: Metadata Entry */}
            {bulkUploadStep === 2 && (
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <FileAudio className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Track Title
                          </label>
                          <input
                            type="text"
                            value={uploadMetadata[file.name]?.title || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'title', e.target.value)}
                            placeholder="Enter track title"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Artist
                          </label>
                          <input
                            type="text"
                            value={uploadMetadata[file.name]?.artist || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'artist', e.target.value)}
                            placeholder="Enter artist name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Album
                          </label>
                          <input
                            type="text"
                            value={uploadMetadata[file.name]?.album || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'album', e.target.value)}
                            placeholder="Enter album name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Genre
                          </label>
                          <select
                            value={uploadMetadata[file.name]?.genre || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'genre', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select Genre</option>
                            <option value="Afrobeats">Afrobeats</option>
                            <option value="Afro Pop">Afro Pop</option>
                            <option value="Highlife">Highlife</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Gospel">Gospel</option>
                            <option value="Reggae">Reggae</option>
                            <option value="Dancehall">Dancehall</option>
                            <option value="R&B">R&B</option>
                            <option value="Traditional">Traditional</option>
                            <option value="Jazz">Jazz</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={uploadMetadata[file.name]?.duration || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'duration', e.target.value)}
                            placeholder="3:45"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ISRC Code
                          </label>
                          <input
                            type="text"
                            value={uploadMetadata[file.name]?.isrc || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'isrc', e.target.value)}
                            placeholder="QZ1234567890"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    onClick={() => setBulkUploadStep(1)}
                    className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={startBulkUpload}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Start Upload
                  </button>
                </div>
              </div>
            )}

            {/* Modal Content - Step 3: Upload Progress */}
            {bulkUploadStep === 3 && (
              <div className="p-6">
                <div className="space-y-4">
                  {selectedFiles.map((file, index) => {
                    const fileId = file.name + '_' + Date.now();
                    const status = uploadStatus[fileId];
                    const progress = uploadProgress[fileId] || 0;

                    return (
                      <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <FileAudio className="w-5 h-5 text-indigo-600" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {status && (
                              <>
                                {status === 'uploading' && (
                                  <>
                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {progress}%
                                    </span>
                                  </>
                                )}
                                {status === 'processing' && (
                                  <>
                                    <Clock className="w-4 h-4 text-yellow-600 animate-spin" />
                                    <span className="text-sm text-yellow-600">Processing</span>
                                  </>
                                )}
                                {status === 'completed' && (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600">Complete</span>
                                  </>
                                )}
                                {status === 'failed' && (
                                  <>
                                    <XCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-red-600">Failed</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {status && (
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                status === 'completed' ? 'bg-green-500' :
                                status === 'processing' ? 'bg-blue-500' :
                                status === 'uploading' ? 'bg-indigo-500' :
                                status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isBulkUploading && (
                  <div className="flex justify-center items-center py-4">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Uploading files...</span>
                  </div>
                )}

                <div className="flex justify-between pt-6">
                  <button
                    onClick={() => setBulkUploadStep(2)}
                    disabled={isBulkUploading}
                    className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                      isBulkUploading
                        ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    onClick={startBulkUpload}
                    disabled={isBulkUploading}
                    className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                      isBulkUploading
                        ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isBulkUploading ? 'Uploading...' : 'Complete Upload'}
                  </button>
                </div>
              </div>
            )}

            {/* Modal Content - Step 4: Completion */}
            {bulkUploadStep === 4 && (
              <div className="p-6 text-center">
                <div className="mb-6">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Upload Complete!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedFiles.length} files have been successfully uploaded and processed.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {Object.values(uploadStatus).filter(status => status === 'completed').length}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {Object.values(uploadStatus).filter(status => status === 'failed').length}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Failed</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-3">
                  <button
                    onClick={resetBulkUpload}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      resetBulkUpload();
                      setBulkUploadStep(1);
                    }}
                    className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200"
                  >
                    Upload More Files
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UploadManagement;
