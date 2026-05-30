import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Music,
  MapPin,
  PieChart,
  Award,
  Download,
  Share2,
  Smartphone,
  Eye,
  ChevronUp,
  ChevronDown,
  Radio,
  DollarSign,
  Target,
  Globe,
  Info,
  Activity
} from 'lucide-react';

import HoverCard from '../components/HoverCard';
import { useAuth } from '../lib/auth';
import {
  fetchArtistDashboard,
  type ArtistDashboardPayload,
  type ArtistDashboardRegionStat,
  type ArtistDashboardSeriesPoint,
  type ArtistDashboardStationBreakdown,
  type ArtistDashboardTopSong,
  type ArtistDashboardPerformanceScore,
} from '../lib/api';

const resolveErrorMessage = (error: unknown): string => {
  if (!error) {
    return 'Unable to load dashboard data.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    const maybeError = error as {
      response?: { data?: unknown; status?: number };
      message?: string;
    };

    if (maybeError.response?.data && typeof maybeError.response.data === 'object') {
      const data = maybeError.response.data as Record<string, unknown>;
      if (typeof data['message'] === 'string') {
        return data['message'];
      }
      if (typeof data['detail'] === 'string') {
        return data['detail'];
      }
      if (data['errors'] && typeof data['errors'] === 'object') {
        const errors = data['errors'] as Record<string, unknown>;
        const firstKey = Object.keys(errors)[0];
        const firstValue = firstKey ? errors[firstKey] : null;
        if (typeof firstValue === 'string') {
          return firstValue;
        }
        if (Array.isArray(firstValue) && firstValue.length > 0) {
          const candidate = firstValue[0];
          if (typeof candidate === 'string') {
            return candidate;
          }
        }
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.length > 0) {
      return maybeError.message;
    }
  }

  return 'Unable to load dashboard data. Please try again later.';
};

const Dashboard = () => {
  const { user } = useAuth();
  const artistId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = user['artist_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [chartFilters, setChartFilters] = useState({
    airplayTrends: {
      showPlays: true,
      showEarnings: true
    },
    regionalPerformance: {
      showPlays: true,
      showEarnings: true,
      showStations: true
    }
  });
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    content: string;
    x: number;
    y: number;
  }>({
    show: false,
    content: '',
    x: 0,
    y: 0
  });
  const [dashboardData, setDashboardData] = useState<ArtistDashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const statsData = useMemo(
    () => ({
      totalPlays: dashboardData?.stats?.totalPlays ?? 0,
      totalStations: dashboardData?.stats?.totalStations ?? 0,
      totalEarnings: dashboardData?.stats?.totalEarnings ?? 0,
      growthRate: dashboardData?.stats?.growthRate ?? 0,
      activeTracks: dashboardData?.stats?.activeTracks ?? 0,
      avgConfidence: dashboardData?.stats?.avgConfidence ?? dashboardData?.confidenceScore ?? 0,
    }),
    [dashboardData],
  );

  const topSongs = useMemo<ArtistDashboardTopSong[]>(() => {
    const source = dashboardData?.topSongs ?? [];
    return source.map((song, index) => ({
      ...song,
      trend:
        song.trend ?? (index === 0 ? 'up' : index === source.length - 1 && source.length > 1 ? 'down' : 'stable'),
    }));
  }, [dashboardData]);

  const playsOverTime = useMemo<ArtistDashboardSeriesPoint[]>(
    () =>
      (dashboardData?.playsOverTime ?? []).map((entry) => {
        const parsed = entry.date ? new Date(entry.date) : null;
        let label = entry.date;
        if (parsed && !Number.isNaN(parsed.valueOf())) {
          label = parsed.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }

        return {
          date: label,
          airplay: entry.airplay ?? 0,
          earnings: entry.earnings ?? 0,
        };
      }),
    [dashboardData],
  );

  const stationBreakdown = useMemo<ArtistDashboardStationBreakdown[]>(
    () =>
      (dashboardData?.stationBreakdown ?? []).map((station) => ({
        ...station,
        type: station.type ?? 'Unknown',
      })),
    [dashboardData],
  );

  const ghanaRegions = useMemo<ArtistDashboardRegionStat[]>(
    () =>
      (dashboardData?.ghanaRegions ?? []).map((region) => ({
        ...region,
        trend: region.trend ?? (region.growth > 1 ? 'up' : region.growth < -1 ? 'down' : 'stable'),
      })),
    [dashboardData],
  );

  const performanceScore = useMemo<ArtistDashboardPerformanceScore>(
    () => ({
      overall: dashboardData?.performanceScore?.overall ?? 0,
      airplayGrowth: dashboardData?.performanceScore?.airplayGrowth ?? 0,
      regionalReach: dashboardData?.performanceScore?.regionalReach ?? 0,
      fanEngagement: dashboardData?.performanceScore?.fanEngagement ?? 0,
      trackQuality: dashboardData?.performanceScore?.trackQuality ?? 0,
    }),
    [dashboardData],
  );

  const targets = useMemo(() => {
    const backendTargets = dashboardData?.targets;

    const fallbackAirplay = statsData.totalPlays ? Math.ceil(statsData.totalPlays * 1.15) : 10;
    const fallbackEarnings = statsData.totalEarnings ? Math.round(statsData.totalEarnings * 1.2 + 50) : 100;
    const fallbackStations = statsData.totalStations ? Math.ceil(statsData.totalStations * 1.1) : 3;
    const fallbackConfidence = statsData.avgConfidence ? Math.min(100, Math.round((statsData.avgConfidence + 5) * 10) / 10) : 70;

    return {
      airplayTarget: backendTargets?.airplayTarget ?? fallbackAirplay,
      earningsTarget: backendTargets?.earningsTarget ?? fallbackEarnings,
      stationsTarget: backendTargets?.stationsTarget ?? fallbackStations,
      confidenceTarget: backendTargets?.confidenceTarget ?? fallbackConfidence,
    };
  }, [dashboardData?.targets, statsData.avgConfidence, statsData.totalEarnings, statsData.totalPlays, statsData.totalStations]);

  const maxPlays = useMemo(() => {
    if (!playsOverTime.length) {
      return 0;
    }
    return Math.max(...playsOverTime.map((d) => d.airplay));
  }, [playsOverTime]);

  const maxRegionalPlays = useMemo(() => {
    if (!ghanaRegions.length) {
      return 0;
    }
    return Math.max(...ghanaRegions.map((r) => r.plays));
  }, [ghanaRegions]);

  const computeRegionalShare = useCallback(
    (plays: number) => {
      if (!maxRegionalPlays) {
        return 0;
      }
      return Math.round((plays / maxRegionalPlays) * 100);
    },
    [maxRegionalPlays],
  );

  const growthIsPositive = statsData.growthRate >= 0;
  const growthTextClass = growthIsPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';
  const formattedGrowthRate = `${growthIsPositive ? '+' : '-'}${Math.abs(statsData.growthRate).toFixed(1)}%`;

  const statusColors = {
    excellent: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      accent: 'text-emerald-600 dark:text-emerald-400'
    },
    good: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      accent: 'text-blue-600 dark:text-blue-400'
    },
    average: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      accent: 'text-amber-600 dark:text-amber-400'
    },
    poor: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      accent: 'text-red-600 dark:text-red-400'
    }
  };

  const warmDarkColors = {
    background: {
      primary: '#0f0f0f',
      secondary: '#1a1a1a',
      tertiary: '#262626',
      elevated: '#2d2d2d',
    },
    surface: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#d4d4d4',
      tertiary: '#a3a3a3',
      muted: '#737373',
    },
    border: {
      light: '#404040',
      medium: '#525252',
      dark: '#737373',
    }
  };

  const getStatusColor = (value: number, thresholds = { excellent: 90, good: 80, average: 70 }) => {
    if (value >= thresholds.excellent) return statusColors.excellent;
    if (value >= thresholds.good) return statusColors.good;
    if (value >= thresholds.average) return statusColors.average;
    return statusColors.poor;
  };

  const [viewTransition, setViewTransition] = useState(false);

  const viewTransitionStyles = viewTransition
    ? 'opacity-0 scale-95 translate-y-2'
    : 'opacity-100 scale-100 translate-y-0';

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  const toggleChartFilter = (chartType: keyof typeof chartFilters, filterKey: string) => {
    setChartFilters(prev => {
      const current = prev[chartType] as Record<string, boolean> | undefined;
      const nextValue = !(current?.[filterKey] ?? false);
      return {
        ...prev,
        [chartType]: {
          ...(current ?? {}),
          [filterKey]: nextValue,
        },
      };
    });
  };

  const getRegionColors = (index: number) => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-green-500 to-blue-500',
      'from-yellow-500 to-green-500',
      'from-orange-500 to-yellow-500',
      'from-red-500 to-orange-500',
      'from-purple-500 to-pink-500',
    ];
    return colors[index % colors.length];
  };

  const loadDashboard = useCallback(async () => {
    if (!artistId) {
      return;
    }

    setIsLoadingDashboard(true);
    setDashboardError(null);
    setViewTransition(true);

    try {
      const envelope = await fetchArtistDashboard(artistId, { period: selectedPeriod });
      const payload = (envelope?.data ?? null) as ArtistDashboardPayload | null;
      setDashboardData(payload);

      if (payload?.ghanaRegions) {
        setSelectedRegion((prevRegion) => {
          if (prevRegion === 'all') {
            return prevRegion;
          }
          const hasRegion = payload.ghanaRegions?.some((region) => region.region === prevRegion);
          return hasRegion ? prevRegion : 'all';
        });
      }
    } catch (error) {
      const message = resolveErrorMessage(error);
      setDashboardError(message);
    } finally {
      setIsLoadingDashboard(false);
      setViewTransition(false);
    }
  }, [artistId, selectedPeriod]);

  useEffect(() => {
    if (!artistId) {
      return;
    }

    loadDashboard();
  }, [artistId, loadDashboard]);

  const showTooltip = useCallback(
    (content: string, event: React.MouseEvent<HTMLElement>) => {
      const { clientX, clientY } = event;
      setTooltip({
        show: true,
        content,
        x: clientX,
        y: clientY - 12,
      });
    },
    [],
  );

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ChevronDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-blue-500"></div>;
    }
  };

  if (!artistId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Info className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">We couldn't find your artist profile</h2>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            Please sign out and sign in again to refresh your account data, then return to the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingDashboard && !dashboardData) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Loading your dashboard metrics…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-opacity duration-200"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Welcome back! Here's your music performance overview.
              </p>
            </div>
            {isLoadingDashboard && dashboardData && (
              <div className="hidden items-center space-x-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 sm:flex">
                <Activity className="h-3 w-3 animate-spin" />
                <span>Refreshing metrics…</span>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {dashboardError && (
          <div className="mx-6 mb-6 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm dark:border-red-800 dark:bg-red-900/40 dark:text-red-200">
            {dashboardError}
          </div>
        )}
        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 ${viewTransitionStyles}`}>
            <div className="bg-gradient-to-br from-red-50/90 via-orange-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-red-300 dark:hover:border-red-700/70 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Airplay</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                    {statsData.totalPlays.toLocaleString()}
                  </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Radio className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center mr-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span className={growthTextClass}>{formattedGrowthRate}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Earnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  ₵{statsData.totalEarnings.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Lifetime royalties earned</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Active Stations</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  {statsData.totalStations}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Broadcasting your music</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${viewTransitionStyles}`}>
          {/* Left Column - Charts and Data */}
          <div className={`lg:col-span-2 space-y-6 ${viewTransitionStyles}`}>
            {/* Plays Over Time Chart */}
            <div className={`bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 ${viewTransitionStyles}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  Airplay Trends
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all duration-300 ${
                      chartFilters.airplayTrends.showPlays
                        ? 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                    }`}
                    onClick={() => toggleChartFilter('airplayTrends', 'showPlays')}
                  >
                    <div className={`w-3 h-3 rounded-full ${chartFilters.airplayTrends.showPlays ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <span className="text-sm font-medium">Plays</span>
                  </button>
                  <button
                    className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all duration-300 ${
                      chartFilters.airplayTrends.showEarnings
                        ? 'bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                    }`}
                    onClick={() => toggleChartFilter('airplayTrends', 'showEarnings')}
                  >
                    <div className={`w-3 h-3 rounded-full ${chartFilters.airplayTrends.showEarnings ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <span className="text-sm font-medium">Earnings</span>
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {playsOverTime.map((month, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                      {month.date}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2 relative group">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300 cursor-pointer"
                            style={{ width: `${maxPlays ? (month.airplay / maxPlays) * 100 : 0}%` }}
                            onMouseEnter={(e) => showTooltip(`${month.airplay.toLocaleString()} plays`, e)}
                            onMouseLeave={hideTooltip}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                          {month.airplay.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-20 text-sm text-green-600 dark:text-green-400 text-right cursor-pointer"
                      onMouseEnter={(e) => showTooltip(`₵${month.earnings.toFixed(0)} earned`, e)}
                      onMouseLeave={hideTooltip}
                    >
                      ₵{month.earnings.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Songs */}
            <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                  <Music className="w-5 h-5 mr-2 text-purple-500" />
                  Top Performing Tracks
                </h2>
                <button className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center font-medium transition-colors duration-300 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 px-2 py-1 rounded-md">
                  View All <Eye className="w-4 h-4 ml-1" />
                </button>
              </div>
              <div className="space-y-4">
                {topSongs.map((song, index) => (
                  <div key={`${song.title}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-4 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-2 sm:space-y-0 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[60px]">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform duration-300">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                          {song.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                          {song.stations} stations • {song.confidence}% accuracy
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-right">
                        <HoverCard
                          trigger={
                            <p
                              className="font-semibold text-gray-900 dark:text-white cursor-pointer text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300"
                            >
                              {song.plays.toLocaleString()}
                            </p>
                          }
                          content={[
                            { label: 'Total Plays', value: song.plays.toLocaleString() },
                            { label: 'Stations', value: `${song.stations}` },
                            { label: 'Trend', value: song.trend === 'up' ? 'Increasing' : song.trend === 'down' ? 'Decreasing' : 'Stable' }
                          ]}
                          position="top"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">plays</p>
                      </div>
                      <div className="text-right">
                        <p
                          className="font-semibold text-green-600 dark:text-green-400 cursor-pointer text-sm sm:text-base group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors duration-300"
                          onMouseEnter={(e) => showTooltip(`₵${song.earnings.toFixed(2)} earned from ${song.plays.toLocaleString()} plays`, e)}
                          onMouseLeave={hideTooltip}
                        >
                          ₵{song.earnings.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">earned</p>
                      </div>
                      <div className="flex items-center cursor-pointer group-hover:scale-110 transition-transform duration-300"
                           onMouseEnter={(e) => showTooltip(`Trend: ${song.trend === 'up' ? 'Increasing' : song.trend === 'down' ? 'Decreasing' : 'Stable'} performance`, e)}
                           onMouseLeave={hideTooltip}>
                        {getTrendIcon(song.trend)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Performance */}
            <div className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-emerald-500" />
                  Regional Performance
                </h2>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Regions</option>
                  {ghanaRegions.map((region) => (
                    <option key={region.region} value={region.region}>
                      {region.region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ghanaRegions.map((region, index) => {
                  const regionalShare = computeRegionalShare(region.plays);
                  return (
                    <div key={region.region} className="p-4 sm:p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[60px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-2 sm:space-y-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                        {region.region}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs sm:text-sm font-medium ${
                          region.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                          region.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`}>
                          {region.trend === 'up' ? '+' : region.trend === 'down' ? '-' : ''}
                          {region.growth}%
                        </span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          region.trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' :
                          region.trend === 'down' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' :
                          'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        }`}>
                          {region.trend === 'up' ? 'Growing' : region.trend === 'down' ? 'Declining' : 'Stable'}
                        </div>
                        <div className="group-hover:scale-110 transition-transform duration-300">
                          {getTrendIcon(region.trend)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-light leading-relaxed">Plays</span>
                        <span
                          className="font-medium text-gray-900 dark:text-white cursor-pointer"
                          onMouseEnter={(e) => showTooltip(`${region.plays.toLocaleString()} total plays in ${region.region}`, e)}
                          onMouseLeave={hideTooltip}
                        >
                          {region.plays.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-light leading-relaxed">Earnings</span>
                        <span
                          className="font-medium text-green-600 dark:text-green-400 cursor-pointer"
                          onMouseEnter={(e) => showTooltip(`₵${region.earnings.toFixed(2)} earned from ${region.plays.toLocaleString()} plays`, e)}
                          onMouseLeave={hideTooltip}
                        >
                          ₵{region.earnings.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-light leading-relaxed">Stations</span>
                        <span
                          className="font-medium text-orange-600 dark:text-orange-400 cursor-pointer"
                          onMouseEnter={(e) => showTooltip(`${region.stations} active stations in ${region.region}`, e)}
                          onMouseLeave={hideTooltip}
                        >
                          {region.stations}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 relative group">
                      <div
                        className={`h-full bg-gradient-to-r ${getRegionColors(index)} rounded-full cursor-pointer transition-all duration-300`}
                        style={{ width: `${regionalShare}%` }}
                        onMouseEnter={(e) => showTooltip(`${regionalShare}% of total regional plays`, e)}
                        onMouseLeave={hideTooltip}
                      />
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar widgets */}
          <div className="space-y-6">
            {/* Station Breakdown */}
            <div className="bg-gradient-to-br from-amber-50/90 via-yellow-50/80 to-orange-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-amber-500" />
                  Top Stations
                </h2>
              </div>
              <div className="space-y-4">
                {stationBreakdown.map((station, index) => (
                  <div key={station.station} className="flex items-center space-x-3 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-pointer group p-3 sm:p-2 rounded-lg min-h-[50px]">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                          {station.station}
                        </span>
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors duration-300">
                          {station.percentage}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 leading-relaxed group-hover:text-amber-600/80 dark:group-hover:text-amber-400/80 transition-colors duration-300">
                        {station.region} • {station.type}
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 group-hover:shadow-inner transition-all duration-300">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full group-hover:from-amber-400 group-hover:to-orange-400 transition-colors duration-300"
                          style={{ width: `${station.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-rose-50/90 via-pink-50/80 to-red-50/90 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-rose-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform">
                  <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                  Download Report
                </button>
                <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:from-blue-800 active:to-cyan-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 border border-blue-200/50 hover:border-blue-300/70 active:border-blue-400/80 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform group">
                  <Share2 className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                  Share Stats
                </button>
                <button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 border border-emerald-200/50 hover:border-emerald-300/70 active:border-emerald-400/80 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform group">
                  <Smartphone className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                  Mobile Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;