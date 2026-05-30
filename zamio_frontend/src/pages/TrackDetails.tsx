import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Globe,
  FileText,
  BarChart3,
  MapPin,
  Music,
  Calendar,
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Download,
  Search,
  Award,
  Target,
  Filter,
  HelpCircle,
  Settings,
  Edit,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import ContributorsSection from '../components/trackDetails/ContributorsSection';
import PlaysOverTimeSection from '../components/trackDetails/PlaysOverTimeSection';
import TopStationsSection from '../components/trackDetails/TopStationsSection';
import PlayLogsSection from '../components/trackDetails/PlayLogsSection';
import RevenueDashboardSection from '../components/trackDetails/RevenueDashboardSection';
import GeographicPerformanceSection from '../components/trackDetails/GeographicPerformanceSection';
import {
  fetchArtistTrackDetail,
  updateArtistTrack,
  type TrackDetailPayload,
} from '../lib/api';
import { getDemoTrackById } from '../lib/demoTrackData';

interface MonthlyEarningViewModel {
  month: string;
  amount: number;
  currency: string;
}

interface TerritoryEarningViewModel {
  territory: string;
  amount: number;
  currency: string;
  percentage: number;
}

interface PayoutHistoryViewModel {
  date: string;
  amount: number;
  status: string;
  period: string;
}

interface TrackContributorViewModel {
  role: string;
  name: string;
  percentage: number;
}

interface TrackPlayLogViewModel {
  time: string;
  station: string;
  region: string;
}

interface TrackViewModel {
  id: number | string;
  title: string;
  artist_name: string;
  album: string | null;
  genre_name: string | null;
  duration: string;
  release_date: string | null;
  plays: number;
  totalEarnings: number;
  averageConfidence: number | null;
  cover_art: string | null;
  audio_file_url: string | null;
  monthlyEarnings: MonthlyEarningViewModel[];
  territoryEarnings: TerritoryEarningViewModel[];
  payoutHistory: PayoutHistoryViewModel[];
  playsOverTime: { month: string; plays: number }[];
  topStations: { name: string; count: number; region: string }[];
  playLogs: TrackPlayLogViewModel[];
  contributors: TrackContributorViewModel[];
}

type RegionPerformanceColor = 'green' | 'blue' | 'purple' | 'amber';

interface RegionPerformanceViewModel {
  region: string;
  plays: number;
  percentage: number;
  stations: number;
  color: RegionPerformanceColor;
}

const formatDuration = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return '—';
  }
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDateLabel = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString();
};

const ensureNonEmpty = <T,>(items: T[], fallback: T): T[] => (items.length > 0 ? items : [fallback]);

const resolveTrackErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }

  return 'Unable to load track details. Please try again.';
};

const mapDetailToViewModel = (detail: TrackDetailPayload): TrackViewModel => {
  const track = detail.track;

  const monthly = detail.revenue.monthly.map((entry) => ({
    month: entry.month,
    amount: Number(entry.amount ?? 0),
    currency: entry.currency ?? 'GHS',
  }));

  const territories = detail.revenue.territories.map((entry) => ({
    territory: entry.territory,
    amount: Number(entry.amount ?? 0),
    currency: entry.currency ?? 'GHS',
    percentage: Number(entry.percentage ?? 0),
  }));

  const payoutHistory = detail.revenue.payout_history.map((entry) => ({
    date: entry.date,
    amount: Number(entry.amount ?? 0),
    status: entry.status,
    period: entry.period,
  }));

  const playsOverTime = detail.performance.plays_over_time.map((entry) => ({
    month: entry.label,
    plays: entry.plays ?? 0,
  }));

  const topStations = detail.performance.top_stations.map((entry) => ({
    name: entry.name,
    count: entry.count ?? 0,
    region: entry.region ?? entry.country ?? 'Unknown region',
  }));

  const fallbackTimestamp =
    detail.stats.last_played_at ?? detail.stats.first_played_at ?? track.release_date ?? new Date().toISOString();

  const playLogs = detail.play_logs
    .map((entry) => ({
      time: entry.played_at ?? fallbackTimestamp,
      station: entry.station ?? 'Unknown Station',
      region: entry.region ?? entry.country ?? 'Unknown Region',
    }))
    .filter((entry) => Boolean(entry.time));

  const contributors = detail.contributors.map((entry) => ({
    role: entry.role,
    name: entry.name,
    percentage: entry.percentage,
  }));

  const safeMonthly = ensureNonEmpty(monthly, { month: 'No Data', amount: 0, currency: 'GHS' });
  const safeTerritories = ensureNonEmpty(territories, {
    territory: 'No Data',
    amount: 0,
    currency: 'GHS',
    percentage: 0,
  });
  const safePayouts = ensureNonEmpty(payoutHistory, {
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    status: 'Pending',
    period: 'No Data',
  });
  const safePlaysOverTime = ensureNonEmpty(playsOverTime, { month: 'No Data', plays: 0 });

  return {
    id: track.id,
    title: track.title,
    artist_name: track.artist,
    album: track.album ?? null,
    genre_name: track.genre ?? null,
    duration: formatDuration(track.duration_seconds ?? null),
    release_date: track.release_date ?? null,
    plays: detail.stats.total_plays ?? track.plays ?? 0,
    totalEarnings: Number(detail.stats.total_revenue ?? track.total_revenue ?? 0),
    averageConfidence: detail.stats.average_confidence ?? null,
    cover_art: track.cover_art_url ?? null,
    audio_file_url: track.audio_file_url ?? null,
    monthlyEarnings: safeMonthly,
    territoryEarnings: safeTerritories,
    payoutHistory: safePayouts,
    playsOverTime: safePlaysOverTime,
    topStations,
    playLogs,
    contributors,
  };
};

const INVALID_IDENTIFIER_TOKENS = new Set(['undefined', 'null', 'none', 'nan']);

const sanitizeIdentifier = (value: unknown): string | number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const normalized = trimmed.toLowerCase();
    if (INVALID_IDENTIFIER_TOKENS.has(normalized)) {
      return undefined;
    }

    return trimmed;
  }

  return undefined;
};

const TrackDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationState = location.state as { trackId?: number | string; trackKey?: number | string } | null;
  const stateTrackIdentifierRaw = locationState?.trackKey ?? locationState?.trackId;
  const queryTrackIdentifierValue = searchParams.get('trackId') ?? searchParams.get('track');
  const sanitizedQueryTrackIdentifier = sanitizeIdentifier(queryTrackIdentifierValue ?? undefined);

  const trackIdentifier: string | number | undefined = (() => {
    const sanitizedState = sanitizeIdentifier(stateTrackIdentifierRaw);

    if (sanitizedState !== undefined) {
      return sanitizedState;
    }

    if (sanitizedQueryTrackIdentifier !== undefined) {
      return sanitizedQueryTrackIdentifier;
    }

    return undefined;
  })();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newContributor, setNewContributor] = useState({ name: '', role: '', percentage: 0 });
  const [activeTab, setActiveTab] = useState<'performance' | 'revenue' | 'contributors' | 'geography'>('performance');
  const [detail, setDetail] = useState<TrackDetailPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const track = useMemo(() => (detail ? mapDetailToViewModel(detail) : null), [detail]);

  const [editTrackData, setEditTrackData] = useState({
    title: '',
    artist_name: '',
    genre_name: '',
    album: '',
    description: '',
  });

  const loadTrackDetail = useCallback(async () => {
    const normalizedIdentifier = sanitizeIdentifier(trackIdentifier) ?? null;

    if (normalizedIdentifier === null || normalizedIdentifier === '') {
      setError('Track identifier is missing.');
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchArtistTrackDetail(normalizedIdentifier);
      setDetail(response);
    } catch (err) {
      setError(resolveTrackErrorMessage(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [trackIdentifier]);

  useEffect(() => {
    void loadTrackDetail();
  }, [loadTrackDetail]);

  useEffect(() => {
    if (!track) {
      return;
    }
    setEditTrackData({
      title: track.title,
      artist_name: track.artist_name,
      genre_name: track.genre_name ?? '',
      album: track.album ?? '',
      description: detail?.track?.lyrics ?? '',
    });
  }, [track, detail]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }
    const timer = window.setTimeout(() => setActionMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
    };
  }, [track?.audio_file_url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume;
  }, [volume, track?.audio_file_url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [track?.audio_file_url]);

  const togglePlay = () => {
    if (!track?.audio_file_url) {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = vol;
    }
  };

  const handleAddContributor = () => {
    if (!track) {
      return;
    }

    if (newContributor.name.trim() && newContributor.role.trim()) {
      const currentTotal = track.contributors.reduce((sum, contributor) => sum + (contributor.percentage || 0), 0);
      const newTotal = currentTotal + newContributor.percentage;

      if (newTotal > 100) {
        setActionMessage(
          `Total percentage would exceed 100%. Current total: ${currentTotal}%, adding ${newContributor.percentage}% would make ${newTotal}%.`,
        );
        return;
      }

      setActionMessage(
        `Contributor ${newContributor.name} added as ${newContributor.role} with ${newContributor.percentage}% share.`,
      );
      setIsModalOpen(false);
      setNewContributor({ name: '', role: '', percentage: 0 });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewContributor({ name: '', role: '', percentage: 0 });
  };

  const handleSaveTrack = async () => {
    const canonicalTrackId =
      detail?.track?.track_id ??
      (typeof trackIdentifier === 'string'
        ? trackIdentifier
        : typeof trackIdentifier === 'number' && Number.isFinite(trackIdentifier)
          ? trackIdentifier
          : undefined);

    if (!canonicalTrackId) {
      setActionMessage('Track identifier is missing.');
      return;
    }

    const trimmedTitle = editTrackData.title.trim();
    if (!trimmedTitle) {
      setActionMessage('Track title is required.');
      return;
    }

    setIsSaving(true);
    try {
      await updateArtistTrack(canonicalTrackId, {
        title: trimmedTitle,
        genre: editTrackData.genre_name || undefined,
        album_title: editTrackData.album || undefined,
        lyrics: editTrackData.description || undefined,
      });
      setActionMessage('Track updated successfully.');
      setIsEditModalOpen(false);
      await loadTrackDetail();
    } catch (err) {
      setActionMessage('Unable to update track. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotalPercentage = track
    ? track.contributors.reduce((sum, contributor) => sum + (contributor.percentage || 0), 0)
    : 0;
  const remainingPercentage = Math.max(0, 100 - currentTotalPercentage);

  const handleRefresh = useCallback(() => {
    void loadTrackDetail();
  }, [loadTrackDetail]);

  const tabs = useMemo(
    () => [
      { id: 'performance', label: 'Performance' },
      { id: 'revenue', label: 'Revenue' },
      { id: 'contributors', label: 'Contributors' },
      { id: 'geography', label: 'Geography' },
    ] as const,
    [],
  );

  const regionPerformance = useMemo<RegionPerformanceViewModel[]>(() => {
    if (!track) {
      return [];
    }

    const aggregated = new Map<
      string,
      {
        plays: number;
        stationNames: Set<string>;
      }
    >();

    track.topStations.forEach((station) => {
      const regionKey = station.region || 'Unknown Region';
      const existing = aggregated.get(regionKey);
      if (existing) {
        existing.plays += station.count ?? 0;
        existing.stationNames.add(station.name);
      } else {
        aggregated.set(regionKey, {
          plays: station.count ?? 0,
          stationNames: new Set([station.name]),
        });
      }
    });

    if (aggregated.size === 0) {
      return [
        {
          region: 'No regional data',
          plays: 0,
          percentage: 0,
          stations: 0,
          color: 'purple',
        },
      ];
    }

    const totalPlays = Array.from(aggregated.values()).reduce((sum, entry) => sum + entry.plays, 0);
    const colors: RegionPerformanceColor[] = ['green', 'blue', 'purple', 'amber'];

    return Array.from(aggregated.entries()).map(([regionKey, entry], index) => ({
      region: regionKey,
      plays: entry.plays,
      percentage: totalPlays ? Math.round((entry.plays / totalPlays) * 100) : 0,
      stations: entry.stationNames.size,
      color: colors[index % colors.length],
    }));
  }, [track]);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!Number.isNaN(time)) {
      handleSeek(time);
    }
  };

  const isAudioAvailable = Boolean(track?.audio_file_url);
  const sliderMax = duration > 0 ? duration : currentTime > 0 ? currentTime : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading track details…</span>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/dashboard/upload-management');
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Unable to display track details</h2>
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

  if (!track) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Track not found</h2>
              <p className="mt-1 text-sm">We couldn’t find the track you’re looking for.</p>
              <button
                type="button"
                onClick={handleBack}
                className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to uploads</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {actionMessage && (
        <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-200">
          {actionMessage}
        </div>
      )}
      {/* Enhanced Back Navigation with Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-1"
            aria-label="Go back to upload management"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Upload Management</span>
            <span className="sm:hidden">Back</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 dark:text-white font-medium">Track Details</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-purple-600 dark:text-purple-400 font-medium truncate max-w-32">
            {track.title}
          </span>
        </nav>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Refresh data"
              aria-label="Refresh track data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500" title="Export report">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500" title="Share track">
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Edit track information"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          {/* Search/Filter Controls */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sections..."
                className="pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-48"
                aria-label="Search track details sections"
              />
            </div>
            <select className="px-3 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200">
              <option>All Sections</option>
              <option>Revenue</option>
              <option>Analytics</option>
              <option>Geographic</option>
              <option>Contributors</option>
            </select>
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
                  {track.genre_name ?? '—'}
                </span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Comprehensive analytics and performance data for <span className="font-medium text-gray-900 dark:text-white">{track.title}</span>
              </p>
            </div>

            {/* Quick Stats in Header */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {track.plays.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Plays</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₵{track.totalEarnings.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Earnings</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8" role="main">
        {/* Track Info Card - Enhanced Glassmorphism */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-white/20 dark:border-slate-700/30 shadow-2xl hover:shadow-3xl transition-all duration-300 group" role="region" aria-labelledby="track-info-title">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Enhanced Album Art with Glow */}
            <div className="relative flex-shrink-0">
              <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-300">
                {track.cover_art ? (
                  <img
                    src={track.cover_art}
                    alt={`${track.title} cover art`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 text-4xl font-bold text-white">
                    {track.title ? track.title.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              {/* Floating Play Button */}
              <button
                type="button"
                onClick={togglePlay}
                disabled={!isAudioAvailable}
                className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group-hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title}`}
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />}
              </button>
            </div>

            {/* Enhanced Track Info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <h1 id="track-info-title" className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  {track.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  by {track.artist_name}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Music className="w-4 h-4" />
                    <span>{track.genre_name ?? '—'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{track.duration}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateLabel(track.release_date)}</span>
                  </span>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!isAudioAvailable}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
                  <span className="font-medium">{isPlaying ? 'Pause Track' : 'Play Track'}</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-6 py-3 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative"
                  aria-label="Add to favorites"
                >
                  <Heart className="w-5 h-5" />
                  <span>Add to Favorites</span>
                  {/* Contextual Help Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    Save for quick access
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </button>
                <button
                  className="flex items-center space-x-2 px-6 py-3 bg-white/20 dark:bg-slate-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-white/30 dark:hover:bg-slate-800/70 transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 relative group"
                  aria-label="Share track"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                  {/* Contextual Help Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    Share performance data
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </button>
              </div>

              {isAudioAvailable ? (
                <div className="mt-6 w-full space-y-3">
                  <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                      aria-label={`${isPlaying ? 'Pause' : 'Play'} preview`}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={sliderMax || 0}
                        step={0.1}
                        value={sliderMax ? Math.min(currentTime, sliderMax) : 0}
                        onChange={handleRangeChange}
                        className="slider w-full accent-purple-600"
                        aria-label="Track progress"
                      />
                      <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(sliderMax || 0)}</span>
                      </div>
                    </div>
                    <div className="flex w-full items-center space-x-2 sm:w-40">
                      {volume <= 0 ? <VolumeX className="h-4 w-4 text-gray-500 dark:text-gray-400" /> : <Volume2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-full accent-purple-600"
                        aria-label="Volume"
                      />
                    </div>
                  </div>
                  <audio ref={audioRef} src={track.audio_file_url ?? undefined} preload="metadata" />
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-gray-400">
                  Audio preview unavailable for this track.
                </div>
              )}

              {/* Keyboard Navigation Instructions */}
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                <span>Press</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs font-mono">Space</kbd>
                <span>to play/pause,</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs font-mono">F</kbd>
                <span>to favorite</span>
              </div>
            </div>

            {/* Enhanced Stats Card */}
            <div className="bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-indigo-50/80 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-indigo-900/30 backdrop-blur-sm rounded-xl p-6 border border-purple-200/50 dark:border-purple-800/30 shadow-lg">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {track.plays.toLocaleString()}
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
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Total Plays</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
                  {track.plays.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <BarChart3 className="w-4 h-4 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Top Stations</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {track.topStations.length}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <MapPin className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Contributors</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                  {track.contributors.length}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Users className="w-4 h-4 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Duration</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200">
                  {track.duration}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-4 h-4 lg:w-6 lg:h-6 text-amber-600 dark:text-amber-400" />
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
            {activeTab === 'performance' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <PlaysOverTimeSection playsOverTime={track.playsOverTime} />
                  <TopStationsSection stations={track.topStations} />
                </div>
                <PlayLogsSection playLogs={track.playLogs} />
              </>
            )}

            {activeTab === 'revenue' && (
              <RevenueDashboardSection
                totalEarnings={track.totalEarnings}
                monthlyEarnings={track.monthlyEarnings}
                territoryEarnings={track.territoryEarnings}
                payoutHistory={track.payoutHistory}
              />
            )}

            {activeTab === 'contributors' && (
              <ContributorsSection
                contributors={track.contributors}
                currentTotalPercentage={currentTotalPercentage}
                remainingPercentage={remainingPercentage}
                onAddClick={() => setIsModalOpen(true)}
              />
            )}

            {activeTab === 'geography' && (
              <GeographicPerformanceSection regions={regionPerformance} />
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {/* Add Contributor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Contributor</h2>
              <button
                onClick={handleModalClose}
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
                  Contributor Name
                </label>
                <input
                  type="text"
                  value={newContributor.name}
                  onChange={(e) => setNewContributor({ ...newContributor, name: e.target.value })}
                  placeholder="Enter contributor name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={newContributor.role}
                  onChange={(e) => setNewContributor({ ...newContributor, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a role</option>
                  <option value="Producer">Producer</option>
                  <option value="Featured Artist">Featured Artist</option>
                  <option value="Mixing Engineer">Mixing Engineer</option>
                  <option value="Mastering Engineer">Mastering Engineer</option>
                  <option value="Songwriter">Songwriter</option>
                  <option value="Vocalist">Vocalist</option>
                  <option value="Instrumentalist">Instrumentalist</option>
                  <option value="Arranger">Arranger</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Percentage Split (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newContributor.percentage}
                  onChange={(e) => setNewContributor({ ...newContributor, percentage: parseInt(e.target.value) || 0 })}
                  placeholder="Enter percentage (0-100)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Current total: {currentTotalPercentage}% | Remaining: {remainingPercentage}%
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleModalClose}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContributor}
                  disabled={!newContributor.name.trim() || !newContributor.role.trim() || newContributor.percentage <= 0 || (currentTotalPercentage + newContributor.percentage) > 100}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Add Contributor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Track Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Track Information</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
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
                  Track Title
                </label>
                <input
                  type="text"
                  value={editTrackData.title}
                  onChange={(e) => setEditTrackData({ ...editTrackData, title: e.target.value })}
                  placeholder="Enter track title"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Artist Name
                </label>
                <input
                  type="text"
                  value={editTrackData.artist_name}
                  onChange={(e) => setEditTrackData({ ...editTrackData, artist_name: e.target.value })}
                  placeholder="Enter artist name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genre
                </label>
                <select
                  value={editTrackData.genre_name}
                  onChange={(e) => setEditTrackData({ ...editTrackData, genre_name: e.target.value })}
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
                  Album
                </label>
                <input
                  type="text"
                  value={editTrackData.album}
                  onChange={(e) => setEditTrackData({ ...editTrackData, album: e.target.value })}
                  placeholder="Enter album name (optional)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editTrackData.description}
                  onChange={(e) => setEditTrackData({ ...editTrackData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the track (optional)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTrack}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center justify-center space-x-2">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrackDetails;
