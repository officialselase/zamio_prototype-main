import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Music,
  Disc,
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  Volume2,
  User,
  Users,
  Globe,
  Award,
  CheckCircle,
  AlertCircle,
  Settings,
  Activity,
  Star,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Zap,
  Target,
  DollarSign,
  PiggyBank,
  Wallet,
  Bell,
  RefreshCw,
  Minus,
  X,
  Check,
  Info,
  FileText,
  Radio,
  Headphones,
  Mic,
  Crown,
  Gem,
  Wifi,
  Lock,
  EyeOff,
  Tag,
  MapPin,
  Smartphone,
  Monitor,
  Key,
  FileAudio,
  XCircle,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchPublisherCatalog,
  type PublisherCatalogTrack,
  type PublisherCatalogFilters,
  type PublisherCatalogSummary,
  type PublisherCatalogPagination,
  type PublisherCatalogPayload,
  type PublisherCatalogArtistFilter,
} from '../lib/api';

const resolveCatalogError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to load catalog data. Please try again later.';
  }

  if (typeof maybeError === 'object' && maybeError !== null) {
    const response = (maybeError as { response?: unknown }).response;
    if (response && typeof response === 'object') {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === 'object') {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
          return message;
        }

        const errors = (data as { errors?: unknown }).errors;
        if (errors && typeof errors === 'object') {
          const [firstKey, firstValue] = Object.entries(errors as Record<string, unknown>)[0] || [];
          if (typeof firstValue === 'string' && firstValue.length > 0) {
            return firstValue;
          }
          if (Array.isArray(firstValue) && firstValue.length > 0) {
            const candidate = firstValue[0];
            if (typeof candidate === 'string' && candidate.length > 0) {
              return candidate;
            }
          }
          if (typeof firstKey === 'string' && firstKey.length > 0) {
            return `${firstKey} is invalid.`;
          }
        }
      }
    }

    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Unable to load catalog data. Please try again later.';
};

const CatalogManagement: React.FC = () => {
  const { user } = useAuth();

  const publisherId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = (user as Record<string, unknown>)['publisher_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [artistFilter, setArtistFilter] = useState('all');
  const [tracks, setTracks] = useState<PublisherCatalogTrack[]>([]);
  const [summary, setSummary] = useState<PublisherCatalogSummary | null>(null);
  const [catalogFilters, setCatalogFilters] = useState<PublisherCatalogFilters>({});
  const [pagination, setPagination] = useState<PublisherCatalogPagination | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<PublisherCatalogTrack | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTrackDetails, setShowTrackDetails] = useState(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Track Form State
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    album: '',
    duration: '',
    genre: '',
    releaseDate: '',
    isrc: '',
    composer: '',
    producer: '',
    bpm: '',
    key: '',
    mood: '',
    language: 'English',
    explicit: false,
    featured: false,
    tags: [] as string[],
    coverArt: '',
    audioFile: null as File | null,
    collaborators: [] as string[]
  });

  const [trackErrors, setTrackErrors] = useState<{[key: string]: string}>({});
  const [isTrackSubmitting, setIsTrackSubmitting] = useState(false);

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
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadStatus, setUploadStatus] = useState<{[key: string]: 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled'}>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const selectedTrackDisplay = useMemo(() => {
    if (!selectedTrack) {
      return null;
    }

    const releaseDateLabel = selectedTrack.releaseDate
      ? new Date(selectedTrack.releaseDate).toLocaleDateString()
      : '—';

    return {
      artist: selectedTrack.artist || 'Unknown Artist',
      album: selectedTrack.album || 'Single',
      duration: selectedTrack.duration || '—',
      releaseDate: releaseDateLabel,
      genre: selectedTrack.genre || 'Uncategorized',
      bpm: typeof selectedTrack.bpm === 'number' ? selectedTrack.bpm : null,
      key: selectedTrack.key || null,
      mood: selectedTrack.mood || null,
      language: selectedTrack.language || null,
      composer: selectedTrack.composer || '—',
      producer: selectedTrack.producer || '—',
      label: selectedTrack.label || 'Independent',
      isrc: selectedTrack.isrc_code || selectedTrack.publisherCatalogId || '—',
      coverArt: selectedTrack.coverArt || '/api/placeholder/640/360',
      platforms: Array.isArray(selectedTrack.platforms) ? selectedTrack.platforms : [],
      tags: Array.isArray(selectedTrack.tags) ? selectedTrack.tags : [],
      collaborators: Array.isArray(selectedTrack.collaborators)
        ? selectedTrack.collaborators
        : [],
      performance: selectedTrack.performance ?? null,
      streams: selectedTrack.streams,
      downloads: selectedTrack.downloads,
      revenue: selectedTrack.revenue,
      explicit: Boolean(selectedTrack.explicit),
      featured: Boolean(selectedTrack.featured),
    };
  }, [selectedTrack]);

  const selectedPerformance = selectedTrackDisplay?.performance;
  const selectedTopCountries = Array.isArray(selectedPerformance?.topCountries)
    ? selectedPerformance?.topCountries ?? []
    : [];
  const selectedPlatforms = selectedTrackDisplay?.platforms ?? [];
  const selectedTags = selectedTrackDisplay?.tags ?? [];
  const selectedCollaborators = selectedTrackDisplay?.collaborators ?? [];
  const selectedPeakPosition = selectedPerformance?.peakPosition ?? '—';
  const selectedChartPerformance = selectedPerformance?.chartPerformance ?? 'Stable';

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const loadCatalog = useCallback(async () => {
    if (!publisherId) {
      setError('Your publisher ID is missing. Please sign out and sign in again.');
      setTracks([]);
      setSummary(null);
      setCatalogFilters({});
      setPagination(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchPublisherCatalog({
        publisherId,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        genre: genreFilter !== 'all' ? genreFilter : undefined,
        artistId: artistFilter !== 'all' ? artistFilter : undefined,
        page: 1,
        pageSize: 40,
      });

      const payload = (envelope?.data ?? null) as PublisherCatalogPayload | null;
      const trackResults = payload?.tracks?.results ?? [];
      const paginationInfo = payload?.tracks?.pagination ?? null;

      setTracks(trackResults);
      setSummary(payload?.summary ?? null);
      setCatalogFilters(payload?.filters ?? {});
      setPagination(paginationInfo);
    } catch (catalogError) {
      setError(resolveCatalogError(catalogError));
      setTracks([]);
      setSummary(null);
      setCatalogFilters({});
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    publisherId,
    debouncedSearch,
    statusFilter,
    genreFilter,
    artistFilter,
  ]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!selectedTrack) {
      return;
    }
    const nextTrack = tracks.find((track) => track.id === selectedTrack.id);
    if (!nextTrack) {
      setShowTrackDetails(false);
      setSelectedTrack(null);
    } else if (nextTrack !== selectedTrack) {
      setSelectedTrack(nextTrack);
    }
  }, [tracks, selectedTrack]);

  const resetBulkUpload = () => {
    setBulkUploadStep(1);
    setSelectedFiles([]);
    setUploadMetadata({});
    setUploadProgress({});
    setUploadStatus({});
    setIsBulkUploading(false);
    setShowBulkUploadModal(false);
  };

  const handleBulkFileSelect = (files: FileList | null) => {
    if (!files) return;

    const audioFiles = Array.from(files).filter(file =>
      file.type.startsWith('audio/') && file.size <= 50 * 1024 * 1024 // 50MB limit
    );

    if (audioFiles.length !== files.length) {
      alert('Some files were skipped. Only audio files under 50MB are supported.');
    }

    setSelectedFiles(audioFiles);

    // Initialize metadata for each file
    const initialMetadata: {[key: string]: any} = {};
    audioFiles.forEach(file => {
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
        tags: []
      };
    });
    setUploadMetadata(initialMetadata);
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

  const simulateBulkUpload = async () => {
    setIsBulkUploading(true);
    setBulkUploadStep(3);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileId = file.name + '_' + Date.now();

      setUploadStatus(prev => ({ ...prev, [fileId]: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
      }

      setUploadStatus(prev => ({ ...prev, [fileId]: 'processing' }));

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Random success/failure for demo
      const success = Math.random() > 0.1; // 90% success rate
      setUploadStatus(prev => ({
        ...prev,
        [fileId]: success ? 'completed' : 'failed'
      }));
    }

    setIsBulkUploading(false);
  };

  const filteredTracks = useMemo(() => {
    const normalizedSearch = debouncedSearch.toLowerCase();
    const normalizedStatus = statusFilter.toLowerCase();
    const normalizedGenre = genreFilter.toLowerCase();

    return tracks.filter((track) => {
      const title = (track.title || '').toLowerCase();
      const artistName = (track.artist || '').toLowerCase();
      const albumName = (track.album || '').toLowerCase();
      const trackStatus = (track.status || '').toLowerCase();
      const trackGenre = (track.genre || '').toLowerCase();
      const trackArtistId = (track.artistId ?? '').toString();

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        artistName.includes(normalizedSearch) ||
        albumName.includes(normalizedSearch);

      const matchesStatus =
        normalizedStatus === 'all' || trackStatus === normalizedStatus;

      const matchesGenre =
        normalizedGenre === 'all' || trackGenre === normalizedGenre;

      const matchesArtist =
        artistFilter === 'all' || trackArtistId === artistFilter;

      return matchesSearch && matchesStatus && matchesGenre && matchesArtist;
    });
  }, [tracks, debouncedSearch, statusFilter, genreFilter, artistFilter]);

  const allGenres = useMemo(
    () =>
      (catalogFilters.genres ?? []).filter(
        (genre): genre is string => typeof genre === 'string' && genre.trim().length > 0,
      ),
    [catalogFilters],
  );
  const artistOptions = useMemo(() => {
    const options = catalogFilters.artists ?? [];
    return options.filter(
      (artist): artist is PublisherCatalogArtistFilter =>
        Boolean(
          artist &&
            typeof artist.id === 'string' &&
            artist.id.length > 0 &&
            typeof artist.name === 'string',
        ),
    );
  }, [catalogFilters]);
  useEffect(() => {
    if (genreFilter === 'all') {
      return;
    }
    if (!allGenres.includes(genreFilter)) {
      setGenreFilter('all');
    }
  }, [allGenres, genreFilter]);

  useEffect(() => {
    if (artistFilter === 'all') {
      return;
    }
    const hasArtist = artistOptions.some((artist) => String(artist.id) === artistFilter);
    if (!hasArtist) {
      setArtistFilter('all');
    }
  }, [artistOptions, artistFilter]);

  const totalTracks = useMemo(() => summary?.totalTracks ?? tracks.length, [summary, tracks]);
  const publishedTracksCount = useMemo(() => {
    if (typeof summary?.publishedTracks === 'number') {
      return summary.publishedTracks;
    }
    return tracks.filter((track) => (track.status || '').toLowerCase() === 'published').length;
  }, [summary, tracks]);
  const totalStreams = useMemo(() => {
    if (typeof summary?.totalStreams === 'number') {
      return summary.totalStreams;
    }
    return tracks.reduce((acc, track) => acc + (Number(track.streams) || 0), 0);
  }, [summary, tracks]);
  const totalRevenue = useMemo(() => {
    if (typeof summary?.totalRevenue === 'number') {
      return summary.totalRevenue;
    }
    return tracks.reduce((acc, track) => acc + (Number(track.revenue) || 0), 0);
  }, [summary, tracks]);

  // Form handling functions
  const handleTrackInputChange = (field: string, value: string | number | boolean) => {
    setNewTrack(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (trackErrors[field]) {
      setTrackErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTagToggle = (tag: string) => {
    setNewTrack(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const validateTrackForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!newTrack.title.trim()) newErrors.title = 'Track title is required';
    if (!newTrack.artist.trim()) newErrors.artist = 'Artist name is required';
    if (!newTrack.album.trim()) newErrors.album = 'Album name is required';
    if (!newTrack.duration.trim()) newErrors.duration = 'Duration is required';
    if (!newTrack.genre.trim()) newErrors.genre = 'Genre is required';
    if (!newTrack.releaseDate) newErrors.releaseDate = 'Release date is required';
    if (!newTrack.audioFile) newErrors.audioFile = 'Audio file is required';

    setTrackErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTrackForm()) return;

    setIsTrackSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      await loadCatalog();

      // Reset form
      setNewTrack({
        title: '',
        artist: '',
        album: '',
        duration: '',
        genre: '',
        releaseDate: '',
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
        coverArt: '',
        audioFile: null,
        collaborators: []
      });

      setTrackErrors({});
      setShowAddTrackModal(false);

      // Show success message
      alert('Track added successfully!');

    } catch (error) {
      setTrackErrors({ submit: 'Failed to add track. Please try again.' });
    } finally {
      setIsTrackSubmitting(false);
    }
  };

  const resetTrackForm = () => {
    setNewTrack({
      title: '',
      artist: '',
      album: '',
      duration: '',
      genre: '',
      releaseDate: '',
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
      coverArt: '',
      audioFile: null,
      collaborators: []
    });
    setTrackErrors({});
    setShowAddTrackModal(false);
  };

  const handleViewTrack = (track: PublisherCatalogTrack) => {
    setSelectedTrack(track);
    setShowTrackDetails(true);
  };

  const formatNumber = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);
    if (!Number.isFinite(numericValue)) {
      return '0';
    }
    if (numericValue >= 1_000_000) {
      return (numericValue / 1_000_000).toFixed(1) + 'M';
    }
    if (numericValue >= 1_000) {
      return (numericValue / 1_000).toFixed(1) + 'K';
    }
    return numericValue.toString();
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numericValue = Number(amount ?? 0);
    const safeAmount = Number.isFinite(numericValue) ? numericValue : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(safeAmount);
  };

  const getStatusColor = (status?: string | null) => {
    const normalized = (status || 'draft').toLowerCase();
    switch (normalized) {
      case 'published':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'scheduled':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'archived':
        return 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  };

  const resolveStatusLabel = (status?: string | null) => {
    const normalized = (status || 'draft').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Catalog Management</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Organize and manage your music catalog, track releases, and monitor performance across all platforms
                  </p>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {totalTracks}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Tracks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {publishedTracksCount}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Published</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatNumber(totalStreams)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Streams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddTrackModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Add Track</span>
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Upload</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
      </div>
    </div>
  </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tracks, artists, or albums..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Music className="w-4 h-4 text-gray-400" />
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Genres</option>
                {allGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <select
                value={artistFilter}
                onChange={(e) => setArtistFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Artists</option>
                {artistOptions.map((artist) => {
                  const value = String(artist.id);
                  const label = artist.name || 'Unknown Artist';
                  const countSuffix =
                    typeof artist.trackCount === 'number' ? ` (${artist.trackCount})` : '';
                  return (
                    <option key={value} value={value}>
                      {`${label}${countSuffix}`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'list'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex flex-col space-y-1 w-4">
                <div className="bg-current h-1 rounded-sm"></div>
                <div className="bg-current h-1 rounded-sm"></div>
                <div className="bg-current h-1 rounded-sm"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tracks Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTracks.map((track) => {
            const displayArtist = track.artist || 'Unknown Artist';
            const displayAlbum = track.album || 'Single';
            const coverArtSrc = track.coverArt || '/api/placeholder/300/200';
            const statusLabel = resolveStatusLabel(track.status);
            const releaseDateLabel = track.releaseDate
              ? new Date(track.releaseDate).toLocaleDateString()
              : '—';
            const durationLabel = track.duration || '—';
            const peakPosition = track.performance?.peakPosition ?? '—';
            const chartPerformance = track.performance?.chartPerformance ?? 'Stable';
            const genreLabel = track.genre || 'Uncategorized';

            return (
              <div
                key={track.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105 overflow-hidden"
              >
                <div className="relative">
                  <img src={coverArtSrc} alt={track.title} className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white font-semibold text-sm truncate">{track.title}</h3>
                    <p className="text-white/80 text-xs truncate">{displayArtist}</p>
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(track.status)}`}>
                      {statusLabel}
                    </div>
                  </div>
                  <button
                    className="absolute top-3 left-3 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors duration-200"
                    aria-label="Preview track"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <img
                        src="/api/placeholder/32/32"
                        alt={displayArtist}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{displayArtist}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{displayAlbum}</p>
                      </div>
                    </div>
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      aria-label="Track options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {formatNumber(track.streams)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Streams</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(track.revenue)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs">
                      {genreLabel}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {durationLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Peak #{peakPosition}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {chartPerformance}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{releaseDateLabel}</div>
                    <button
                      onClick={() => handleViewTrack(track)}
                      className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-xs"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Track</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Artist</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Streams</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Release Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredTracks.map((track) => {
                  const displayArtist = track.artist || 'Unknown Artist';
                  const displayAlbum = track.album || 'Single';
                  const coverArtSrc = track.coverArt || '/api/placeholder/80/80';
                  const statusLabel = resolveStatusLabel(track.status);
                  const releaseDateLabel = track.releaseDate
                    ? new Date(track.releaseDate).toLocaleDateString()
                    : '—';

                  return (
                    <tr
                      key={track.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={coverArtSrc}
                            alt={track.title}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{track.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{displayAlbum}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {displayArtist}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(track.status)}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatNumber(track.streams)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(track.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {releaseDateLabel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewTrack(track)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Track Details Modal */}
      {showTrackDetails && selectedTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-2xl">
            <div className="relative">
              <img
                src={selectedTrackDisplay?.coverArt}
                alt={selectedTrack.title}
                className="w-full h-64 object-cover rounded-t-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-t-2xl"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center space-x-4">
                  <button className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors duration-200">
                    <Play className="w-6 h-6" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedTrack.title}</h2>
                    <p className="text-white/80">by {selectedTrackDisplay?.artist}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTrackDetails(false)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Track Info */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Track Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Disc className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Album</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.album}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Duration</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Release Date</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.releaseDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Music className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Genre</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.genre}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Technical Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Zap className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">BPM</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.bpm ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Key className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Key</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.key ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Heart className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Mood</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.mood ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Language</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTrackDisplay?.language ?? '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Credits</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Composer:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrackDisplay?.composer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Producer:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrackDisplay?.producer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Label:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrackDisplay?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ISRC:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrackDisplay?.isrc}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance & Actions */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Performance Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Streams</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(selectedTrackDisplay?.streams)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Downloads</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(selectedTrackDisplay?.downloads)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(selectedTrackDisplay?.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Peak Position</span>
                        <span className="font-semibold text-gray-900 dark:text-white">#{selectedPeakPosition}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Chart Trend</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{selectedChartPerformance}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Platforms</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlatforms.map((platform: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Top Countries</h3>
                    <div className="space-y-2">
                      {selectedTopCountries.slice(0, 4).map((country: string, index: number) => {
                        const widthPercent = Math.max(10, 100 - index * 20);
                        return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{country}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                      <Edit className="w-4 h-4" />
                      <span>Edit Track</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                      <BarChart3 className="w-4 h-4" />
                      <span>Analytics</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTracks.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tracks found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => setShowAddTrackModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Track</span>
          </button>
        </div>
      )}

      {/* Add Track Modal */}
      {showAddTrackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Track</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enter track details and upload audio file</p>
                  </div>
                </div>
                <button
                  onClick={resetTrackForm}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleTrackSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Music className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                      Basic Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Track Title *
                        </label>
                        <input
                          type="text"
                          value={newTrack.title}
                          onChange={(e) => handleTrackInputChange('title', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            trackErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                          placeholder="Enter track title"
                        />
                        {trackErrors.title && <p className="text-red-500 text-sm mt-1">{trackErrors.title}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Artist *
                        </label>
                        <input
                          type="text"
                          value={newTrack.artist}
                          onChange={(e) => handleTrackInputChange('artist', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            trackErrors.artist ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                          placeholder="Enter artist name"
                        />
                        {trackErrors.artist && <p className="text-red-500 text-sm mt-1">{trackErrors.artist}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Album *
                        </label>
                        <input
                          type="text"
                          value={newTrack.album}
                          onChange={(e) => handleTrackInputChange('album', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            trackErrors.album ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                          placeholder="Enter album name"
                        />
                        {trackErrors.album && <p className="text-red-500 text-sm mt-1">{trackErrors.album}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duration *
                          </label>
                          <input
                            type="text"
                            value={newTrack.duration}
                            onChange={(e) => handleTrackInputChange('duration', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              trackErrors.duration ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                            }`}
                            placeholder="3:45"
                          />
                          {trackErrors.duration && <p className="text-red-500 text-sm mt-1">{trackErrors.duration}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Genre *
                          </label>
                          <select
                            value={newTrack.genre}
                            onChange={(e) => handleTrackInputChange('genre', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              trackErrors.genre ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                            }`}
                          >
                            <option value="">Select genre</option>
                            {allGenres.map(genre => (
                              <option key={genre} value={genre}>{genre}</option>
                            ))}
                          </select>
                          {trackErrors.genre && <p className="text-red-500 text-sm mt-1">{trackErrors.genre}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Release Date *
                        </label>
                        <input
                          type="date"
                          value={newTrack.releaseDate}
                          onChange={(e) => handleTrackInputChange('releaseDate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            trackErrors.releaseDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                        />
                        {trackErrors.releaseDate && <p className="text-red-500 text-sm mt-1">{trackErrors.releaseDate}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                      Technical Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          BPM
                        </label>
                        <input
                          type="number"
                          value={newTrack.bpm}
                          onChange={(e) => handleTrackInputChange('bpm', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="120"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Key
                        </label>
                        <select
                          value={newTrack.key}
                          onChange={(e) => handleTrackInputChange('key', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select key</option>
                          <option value="C major">C major</option>
                          <option value="C# major">C# major</option>
                          <option value="D major">D major</option>
                          <option value="D# major">D# major</option>
                          <option value="E major">E major</option>
                          <option value="F major">F major</option>
                          <option value="F# major">F# major</option>
                          <option value="G major">G major</option>
                          <option value="G# major">G# major</option>
                          <option value="A major">A major</option>
                          <option value="A# major">A# major</option>
                          <option value="B major">B major</option>
                          <option value="C minor">C minor</option>
                          <option value="C# minor">C# minor</option>
                          <option value="D minor">D minor</option>
                          <option value="D# minor">D# minor</option>
                          <option value="E minor">E minor</option>
                          <option value="F minor">F minor</option>
                          <option value="F# minor">F# minor</option>
                          <option value="G minor">G minor</option>
                          <option value="G# minor">G# minor</option>
                          <option value="A minor">A minor</option>
                          <option value="A# minor">A# minor</option>
                          <option value="B minor">B minor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Mood
                        </label>
                        <input
                          type="text"
                          value={newTrack.mood}
                          onChange={(e) => handleTrackInputChange('mood', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Energetic, Melancholic, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Language
                        </label>
                        <select
                          value={newTrack.language}
                          onChange={(e) => handleTrackInputChange('language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                          <option value="Italian">Italian</option>
                          <option value="Portuguese">Portuguese</option>
                          <option value="Instrumental">Instrumental</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 mt-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newTrack.explicit}
                          onChange={(e) => handleTrackInputChange('explicit', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Explicit Content</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newTrack.featured}
                          onChange={(e) => handleTrackInputChange('featured', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Featured Track</span>
                      </label>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical', 'country', 'folk', 'reggae', 'blues', 'soul', 'r&b'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            newTrack.tags.includes(tag)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Publishing Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                      Publishing Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ISRC Code
                        </label>
                        <input
                          type="text"
                          value={newTrack.isrc}
                          onChange={(e) => handleTrackInputChange('isrc', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="QZ1234567890"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Composer
                        </label>
                        <input
                          type="text"
                          value={newTrack.composer}
                          onChange={(e) => handleTrackInputChange('composer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter composer name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Producer
                        </label>
                        <input
                          type="text"
                          value={newTrack.producer}
                          onChange={(e) => handleTrackInputChange('producer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter producer name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Upload className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                      Audio File *
                    </h3>

                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6">
                      <div className="text-center">
                        <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Drag and drop your audio file here, or click to browse
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Supports: MP3, WAV, FLAC, AIFF (max 50MB)
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleTrackInputChange('audioFile', e.target.files?.[0] || null)}
                          className="hidden"
                          id="audio-upload"
                        />
                        <label
                          htmlFor="audio-upload"
                          className={`inline-flex items-center px-4 py-2 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer ${
                            trackErrors.audioFile ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Choose File
                        </label>
                        {newTrack.audioFile && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                            Selected: {newTrack.audioFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {trackErrors.audioFile && <p className="text-red-500 text-sm mt-2">{trackErrors.audioFile}</p>}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-slate-700 mt-6">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  * Required fields
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={resetTrackForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isTrackSubmitting}
                    className={`px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl ${
                      isTrackSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isTrackSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Adding Track...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Add Track</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {trackErrors.submit && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{trackErrors.submit}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal - Multi-Step Wizard */}
      {showBulkUploadModal && (
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
                    onClick={() => setBulkUploadStep(3)}
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
                    onClick={simulateBulkUpload}
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

export default CatalogManagement;
