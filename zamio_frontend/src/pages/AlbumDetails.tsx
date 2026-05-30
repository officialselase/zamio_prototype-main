import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  Heart,
  Share2,
  Users,
  TrendingUp,
  Clock,
  BarChart3,
  MapPin,
  Music,
  Calendar,
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Download,
  Search,
  AlertCircle,
  Edit,
  Album as AlbumIcon,
  Loader2
} from 'lucide-react';

import { fetchArtistAlbumDetail, type AlbumDetailPayload } from '../lib/api';
import ProtectedImage from '../components/ProtectedImage';

interface AlbumTrackViewModel {
  id: number;
  title: string;
  duration: string;
  plays: number;
  revenue: number;
  release_date: string | null;
}

interface AlbumContributorViewModel {
  name: string;
  role: string;
  percentage: number;
}

interface AlbumMonthlyRevenueViewModel {
  month: string;
  amount: number;
  currency: string;
  plays: number;
}

interface AlbumTerritoryRevenueViewModel {
  territory: string;
  amount: number;
  currency: string;
  percentage: number;
  plays: number;
}

interface AlbumTopStationViewModel {
  name: string;
  count: number;
  region: string;
}

interface AlbumPlaysTrendViewModel {
  month: string;
  plays: number;
}

interface AlbumDetailsViewModel {
  id: number;
  title: string;
  artist_name: string;
  genre_name: string;
  release_date: string | null;
  total_tracks: number;
  total_plays: number;
  total_revenue: number;
  cover_art: string | null;
  description: string | null;
  status: 'active' | 'inactive' | 'draft';
  raw_status?: string | null;
  tracks: AlbumTrackViewModel[];
  monthly_revenue: AlbumMonthlyRevenueViewModel[];
  territory_revenue: AlbumTerritoryRevenueViewModel[];
  contributors: AlbumContributorViewModel[];
  top_stations: AlbumTopStationViewModel[];
  plays_over_time: AlbumPlaysTrendViewModel[];
}

type AlbumTab = 'overview' | 'revenue' | 'performance' | 'contributors';

const formatDuration = (seconds?: number | null): string => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || seconds <= 0) {
    return '—';
  }

  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const mapDetailToViewModel = (detail: AlbumDetailPayload): AlbumDetailsViewModel => {
  const tracks = (detail.tracks ?? []).map<AlbumTrackViewModel>((track) => ({
    id: track.id,
    title: track.title,
    duration: formatDuration(track.duration_seconds),
    plays: track.plays ?? 0,
    revenue: Number(track.revenue ?? 0),
    release_date: track.release_date ?? null,
  }));

  const totalPlays =
    typeof detail.stats?.total_plays === 'number'
      ? detail.stats.total_plays
      : tracks.reduce((sum, item) => sum + item.plays, 0);

  const totalRevenue =
    typeof detail.stats?.total_revenue === 'number'
      ? Number(detail.stats.total_revenue)
      : tracks.reduce((sum, item) => sum + item.revenue, 0);

  const totalTracks =
    typeof detail.stats?.total_tracks === 'number' ? detail.stats.total_tracks : tracks.length;

  return {
    id: detail.album.id,
    title: detail.album.title,
    artist_name: detail.album.artist,
    genre_name: detail.album.genre ?? 'Uncategorized',
    release_date: detail.album.release_date ?? null,
    total_tracks: totalTracks,
    total_plays: totalPlays,
    total_revenue: totalRevenue,
    cover_art: detail.album.cover_art_url ?? null,
    description: null,
    status: detail.album.status,
    raw_status: detail.album.raw_status ?? null,
    tracks,
    monthly_revenue: (detail.revenue?.monthly ?? []).map((entry) => ({
      month: entry.month || '—',
      amount: Number(entry.amount ?? 0),
      currency: entry.currency ?? 'GHS',
      plays: entry.plays ?? 0,
    })),
    territory_revenue: (detail.revenue?.territories ?? []).map((entry) => ({
      territory: entry.territory || 'Unspecified',
      amount: Number(entry.amount ?? 0),
      currency: entry.currency ?? 'GHS',
      percentage: Number(entry.percentage ?? 0),
      plays: entry.plays ?? 0,
    })),
    contributors: (detail.contributors ?? []).map((entry) => ({
      name: entry.name,
      role: entry.role,
      percentage: Number(entry.percentage ?? 0),
    })),
    top_stations: (detail.performance?.top_stations ?? []).map((entry) => ({
      name: entry.name || 'Unknown Station',
      count: entry.count ?? 0,
      region: entry.region || entry.country || 'Unspecified',
    })),
    plays_over_time: (detail.performance?.plays_over_time ?? []).map((entry) => ({
      month: entry.label || '—',
      plays: entry.plays ?? 0,
    })),
  };
};

const formatDateLabel = (value: string | null): string => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString();
};

const AlbumDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stateAlbumId = (location.state as { albumId?: number } | null)?.albumId;
  const queryAlbumIdValue = searchParams.get('albumId');
  const parsedQueryAlbumId = queryAlbumIdValue ? Number(queryAlbumIdValue) : undefined;
  const albumId = stateAlbumId ?? (Number.isFinite(parsedQueryAlbumId) ? parsedQueryAlbumId : undefined);

  const [detail, setDetail] = useState<AlbumDetailPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AlbumTab>('overview');
  const [trackSearchTerm, setTrackSearchTerm] = useState('');

  const loadAlbumDetail = useCallback(async () => {
    if (!albumId) {
      setError('Album identifier is missing.');
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchArtistAlbumDetail(albumId);
      setDetail(response?.data ?? null);
    } catch (err) {
      setError('Unable to load album details. Please try again.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    void loadAlbumDetail();
  }, [loadAlbumDetail]);

  useEffect(() => {
    setTrackSearchTerm('');
  }, [albumId]);

  const album = useMemo(() => (detail ? mapDetailToViewModel(detail) : null), [detail]);

  const filteredTracks = useMemo(() => {
    if (!album) {
      return [] as AlbumTrackViewModel[];
    }
    const query = trackSearchTerm.trim().toLowerCase();
    if (!query) {
      return album.tracks;
    }
    return album.tracks.filter((track) => track.title.toLowerCase().includes(query));
  }, [album, trackSearchTerm]);

  const totalContributorSplit = useMemo(() => {
    if (!album) {
      return 0;
    }
    return album.contributors.reduce((sum, contributor) => sum + contributor.percentage, 0);
  }, [album]);

  const handleRefresh = useCallback(() => {
    void loadAlbumDetail();
  }, [loadAlbumDetail]);

  const tabs = useMemo(
    () =>
      [
        { id: 'overview', label: 'Overview' },
        { id: 'revenue', label: 'Revenue' },
        { id: 'performance', label: 'Performance' },
        { id: 'contributors', label: 'Contributors' },
      ] as const,
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading album details…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Unable to display album details</h2>
              <p className="mt-1 text-sm">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Album not found</h2>
              <p className="mt-1 text-sm">We couldn’t find the album you’re looking for.</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/album-list')}
                className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to albums</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const releaseDateLabel = formatDateLabel(album.release_date);
  const displayedTracks = filteredTracks;

  return (
    <>
      {/* Enhanced Back Navigation with Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
          <button
            onClick={() => navigate('/dashboard/album-list')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-1"
            aria-label="Go back to album list"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Album Management</span>
            <span className="sm:hidden">Back</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 dark:text-white font-medium">Album Details</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-purple-600 dark:text-purple-400 font-medium truncate max-w-32">
            {album.title}
          </span>
        </nav>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <button
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Refresh data"
              onClick={handleRefresh}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500" title="Export report">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500" title="Share album">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Search/Filter Controls */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tracks..."
                value={trackSearchTerm}
                onChange={(event) => setTrackSearchTerm(event.target.value)}
                className="pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-48"
                aria-label="Search album tracks"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Page header with enhanced context */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded-full">
                  {album.genre_name}
                </span>
                <span className={`px-2 py-1 ${album.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'} text-xs font-medium rounded-full`}>
                  {album.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Comprehensive analytics and performance data for <span className="font-medium text-gray-900 dark:text-white">{album.title}</span> by {album.artist_name}
              </p>
            </div>

            {/* Quick Stats in Header */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {album.total_tracks}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tracks</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {album.total_plays.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Plays</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₵{album.total_revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8" role="main">
        {/* Album Info Card - Enhanced Glassmorphism */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-white/20 dark:border-slate-700/30 shadow-2xl hover:shadow-3xl transition-all duration-300 group" role="region" aria-labelledby="album-info-title">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Enhanced Album Art with Glow */}
            <div className="relative flex-shrink-0">
              <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-300">
                {album.cover_art ? (
                  <ProtectedImage
                    src={album.cover_art}
                    alt={`${album.title} cover art`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 text-white">
                        <AlbumIcon className="h-14 w-14" />
                      </div>
                    }
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 text-white">
                    <AlbumIcon className="h-14 w-14" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              {/* Floating Play Button */}
              <button
                className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group-hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                aria-label={`Play ${album.title}`}
              >
                <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
              </button>
            </div>

            {/* Enhanced Album Info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <h1 id="album-info-title" className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  {album.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  by {album.artist_name}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Music className="w-4 h-4" />
                    <span>{album.genre_name}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{album.total_tracks} tracks</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{releaseDateLabel}</span>
                  </span>
                </div>
                {album.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                    {album.description}
                  </p>
                )}
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                  aria-label={`Play ${album.title}`}
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  <span className="font-medium">Play Album</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-6 py-3 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative"
                  aria-label="Add to favorites"
                >
                  <Heart className="w-5 h-5" />
                  <span>Add to Favorites</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-6 py-3 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative group"
                  aria-label="Share album"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-6 py-3 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative group"
                  aria-label="Edit album"
                >
                  <Edit className="w-5 h-5" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Enhanced Stats Card */}
            <div className="bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-indigo-50/80 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-indigo-900/30 backdrop-blur-sm rounded-xl p-6 border border-purple-200/50 dark:border-purple-800/30 shadow-lg">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {album.total_plays.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Total Plays
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Enhanced Responsive Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Total Tracks</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
                  {album.total_tracks}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Music className="w-4 h-4 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Total Plays</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {album.total_plays.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <BarChart3 className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Top Stations</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                  {album.top_stations.length}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <MapPin className="w-4 h-4 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Contributors</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200">
                  {album.contributors.length}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Users className="w-4 h-4 lg:w-6 lg:h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Detail Sections */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/20 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-slate-700/60 hover:border-purple-400/60 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-8">
            {activeTab === 'overview' && (
              <>
                {/* Track List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Album Tracks</h3>
                  <div className="space-y-3">
                    {displayedTracks.length === 0 ? (
                      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-600 bg-white/40 dark:bg-slate-800/40 p-6 text-sm text-gray-500 dark:text-gray-400">
                        No tracks match your current filters.
                      </div>
                    ) : (
                      displayedTracks.map((track, index) => (
                        <div key={track.id} className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-colors duration-200">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{track.title}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{track.duration}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{track.plays.toLocaleString()}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">plays</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-600 dark:text-green-400">₵{track.revenue.toLocaleString()}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">revenue</div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30">
                              <Play className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'revenue' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Revenue Chart Placeholder */}
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue</h3>
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-16 h-16 mb-4" />
                    <p className="text-center">Revenue chart would be displayed here</p>
                  </div>
                </div>

                {/* Territory Breakdown */}
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Territory</h3>
                  <div className="space-y-3">
                    {album.territory_revenue.map((territory) => (
                      <div key={territory.territory} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{territory.territory}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                              style={{ width: `${territory.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                            {territory.percentage}%
                          </span>
                          <span className="text-sm text-green-600 dark:text-green-400 font-bold w-20 text-right">
                            ₵{territory.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Plays Over Time Chart Placeholder */}
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plays Over Time</h3>
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <TrendingUp className="w-16 h-16 mb-4" />
                    <p className="text-center">Performance chart would be displayed here</p>
                  </div>
                </div>

                {/* Top Stations */}
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Stations</h3>
                  <div className="space-y-3">
                    {album.top_stations.map((station, index) => (
                      <div key={station.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{station.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{station.region}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{station.count}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">plays</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contributors' && (
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Album Contributors</h3>
                <div className="space-y-4">
                  {album.contributors.map((contributor) => (
                    <div key={`${contributor.name}-${contributor.role}`} className="flex items-center justify-between p-4 bg-white/30 dark:bg-slate-800/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{contributor.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contributor.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{contributor.percentage}%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">split</div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Split</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{totalContributorSplit}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AlbumDetails;
