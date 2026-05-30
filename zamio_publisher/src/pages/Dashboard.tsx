import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Users,
  Music,
  DollarSign,
  TrendingUp,
  FileText,
  Activity,
  Calendar,
  Award,
  Radio,
  Headphones,
  PieChart,
  MapPin,
  Download,
  Share2,
  Smartphone,
  Search,
  Settings,
  Bell,
  Mic
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchPublisherDashboard,
  type PublisherDashboardPayload,
  type PublisherDashboardTrendPoint,
  type PublisherDashboardTopSong,
  type PublisherDashboardRegionPerformance,
  type PublisherDashboardStationBreakdown,
  type PublisherDashboardActivityItem,
  type PublisherDashboardRosterSummary,
  type PublisherDashboardTopArtist,
  type PublisherDashboardPerformanceScore,
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

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<PublisherDashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const publisherId = useMemo(() => {
    console.log('=== USER OBJECT DEBUG ===');
    console.log('User:', user);
    console.log('User keys:', user ? Object.keys(user) : 'null');
    
    if (user && typeof user === 'object' && user !== null) {
      const candidate = (user as Record<string, unknown>)['publisher_id'];
      console.log('publisher_id field:', candidate);
      
      if (typeof candidate === 'string' && candidate.length > 0) {
        console.log('✅ Using publisher_id:', candidate);
        return candidate;
      }
      
      // Also check for publisherId (alternative field name)
      const altCandidate = (user as Record<string, unknown>)['publisherId'];
      console.log('publisherId field:', altCandidate);
      
      if (typeof altCandidate === 'string' && altCandidate.length > 0) {
        console.log('✅ Using publisherId:', altCandidate);
        return altCandidate;
      }
      
      console.log('❌ No valid publisher ID found in user object');
    }
    return null;
  }, [user]);

  const periodDescriptor = useMemo(() => {
    switch (selectedPeriod) {
      case 'daily':
        return 'today';
      case 'weekly':
        return 'this week';
      case 'yearly':
        return 'this year';
      case 'monthly':
        return 'this month';
      case 'all-time':
      case 'alltime':
      case 'lifetime':
        return 'all time';
      default:
        return 'this period';
    }
  }, [selectedPeriod]);

  const periodTitle = useMemo(() => {
    switch (selectedPeriod) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'yearly':
        return 'Yearly';
      case 'monthly':
        return 'Monthly';
      case 'all-time':
      case 'alltime':
      case 'lifetime':
        return 'All Time';
      default:
        return 'All Time';
    }
  }, [selectedPeriod]);

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const numeric = Number.isFinite(value) ? value : 0;
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: options?.maximumFractionDigits ?? 0, ...options }).format(
        numeric,
      );
    },
    [],
  );

  const loadDashboard = useCallback(async () => {
    if (!publisherId) {
      setDashboardError('Your publisher ID is missing. Please ensure you have a publisher profile set up. Contact support if this issue persists.');
      setDashboardData(null);
      return;
    }

    setIsLoadingDashboard(true);
    setDashboardError(null);

    try {
      const envelope = await fetchPublisherDashboard(publisherId, {
        period: selectedPeriod,
      });
      
      // Validate response structure
      if (!envelope || !envelope.data) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      const data = envelope.data as PublisherDashboardPayload;
      
      // Debug: Log full response to identify data mismatches
      console.log('=== PUBLISHER DASHBOARD API RESPONSE ===');
      console.log('Full envelope:', JSON.stringify(envelope, null, 2));
      console.log('Data object:', data);
      console.log('Stats object:', data.stats);
      if (data.stats) {
        console.log('Individual stats:');
        console.log('  totalPerformances:', data.stats.totalPerformances);
        console.log('  totalEarnings:', data.stats.totalEarnings);
        console.log('  worksInCatalog:', data.stats.worksInCatalog);
        console.log('  activeStations:', data.stats.activeStations);
      }
      console.log('Other data:');
      console.log('  playsOverTime length:', data.playsOverTime?.length || 0);
      console.log('  topSongs length:', data.topSongs?.length || 0);
      console.log('  topArtists length:', data.topArtists?.length || 0);
      console.log('  recentActivity length:', data.recentActivity?.length || 0);
      console.log('========================================');
      
      setDashboardData(data);
    } catch (error) {
      const errorMessage = resolveErrorMessage(error);
      console.error('Dashboard Error:', error);
      setDashboardError(errorMessage);
      setDashboardData((previous) => previous ?? null);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [publisherId, selectedPeriod]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statCards = useMemo(() => {
    const definitions = [
      {
        key: 'totalPerformances' as const,
        title: 'Total Performances',
        icon: Radio,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20',
        gradient: 'from-purple-50/90 via-violet-50/80 to-indigo-50/90',
      },
      {
        key: 'totalEarnings' as const,
        title: 'Total Earnings',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        gradient: 'from-emerald-50/90 via-green-50/80 to-teal-50/90',
      },
      {
        key: 'worksInCatalog' as const,
        title: 'Works in Catalog',
        icon: Music,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        gradient: 'from-blue-50/90 via-cyan-50/80 to-indigo-50/90',
      },
      {
        key: 'activeStations' as const,
        title: 'Active Stations',
        icon: Headphones,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20',
        gradient: 'from-amber-50/90 via-orange-50/80 to-yellow-50/90',
      },
    ];

    const statsSource = dashboardData?.stats ?? {};

    return definitions.map((definition) => {
      const metrics = statsSource[definition.key] ?? {};
      const numericValue = typeof metrics?.value === 'number' ? metrics.value : 0;
      const changeValue = typeof metrics?.change === 'number' ? metrics.change : 0;
      const formattedValue =
        definition.key === 'totalEarnings'
          ? `₵${formatNumber(numericValue, { maximumFractionDigits: 2 })}`
          : formatNumber(numericValue);
      const changeText = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(1)}% ${periodDescriptor}`;

      return {
        ...definition,
        formattedValue,
        changeText,
      };
    });
  }, [dashboardData, formatNumber, periodDescriptor, periodTitle]);

  const playsOverTimeSeries = useMemo(() => {
    const series = (dashboardData?.playsOverTime ?? []).map((entry: PublisherDashboardTrendPoint) => ({
      label: entry.label ?? entry.period ?? '—',
      airplay: entry.airplay ?? 0,
      streaming: entry.streaming ?? 0,
    }));
    const maxValue = series.reduce((acc, item) => Math.max(acc, item.airplay ?? 0, item.streaming ?? 0), 0);
    return {
      series,
      maxValue: maxValue > 0 ? maxValue : 1,
    };
  }, [dashboardData]);

  const topSongs = useMemo(() => {
    return (dashboardData?.topSongs ?? []).map((song: PublisherDashboardTopSong, index) => ({
      title: song.title ?? `Track ${index + 1}`,
      artist: song.artist ?? 'Unknown Artist',
      plays: song.plays ?? 0,
      earningsDisplay: `₵${formatNumber(song.earnings ?? 0, { maximumFractionDigits: 2 })}`,
      stations: song.stations ?? 0,
    }));
  }, [dashboardData, formatNumber]);

  const regionPerformance = useMemo(() => {
    return (dashboardData?.regionPerformance ?? []).map((region: PublisherDashboardRegionPerformance, index) => ({
      key: `${region.region ?? 'region'}-${index}`,
      region: region.region ?? 'Unknown',
      plays: region.plays ?? 0,
      earningsDisplay: `₵${formatNumber(region.earnings ?? 0, { maximumFractionDigits: 2 })}`,
      stations: region.stations ?? 0,
      growth: region.growth ?? 0,
    }));
  }, [dashboardData, formatNumber]);

  const topStations = useMemo(() => {
    return (dashboardData?.topStations ?? []).map((station: PublisherDashboardStationBreakdown, index) => ({
      key: station.stationId ?? index,
      name: station.name ?? 'Unknown Station',
      region: station.region ?? 'Unknown',
      plays: station.plays ?? 0,
      percentage: station.percentage ?? 0,
    }));
  }, [dashboardData]);

  const activityTypeConfig = useMemo(
    () => ({
      playlog: { icon: Activity, color: 'text-purple-400' },
      agreement: { icon: FileText, color: 'text-blue-400' },
      payment: { icon: DollarSign, color: 'text-green-400' },
      contract: { icon: FileText, color: 'text-purple-400' },
      release: { icon: Music, color: 'text-blue-400' },
      achievement: { icon: Award, color: 'text-yellow-400' },
    }),
    [],
  );

  const recentActivity = useMemo(() => {
    return (dashboardData?.recentActivity ?? []).map((activity: PublisherDashboardActivityItem, index) => {
      const config = activityTypeConfig[(activity.type ?? '').toLowerCase()] ?? { icon: Activity, color: 'text-purple-400' };
      let timeLabel = activity.time ?? null;
      if (!timeLabel && activity.timestamp) {
        try {
          timeLabel = new Date(activity.timestamp).toLocaleString();
        } catch (error) {
          timeLabel = String(activity.timestamp);
        }
      }
      return {
        id: activity.id ?? index,
        title: activity.title ?? 'Activity',
        description: activity.description ?? '',
        time: timeLabel ?? '—',
        icon: config.icon,
        color: config.color,
      };
    });
  }, [dashboardData, activityTypeConfig]);

  const roster = useMemo<PublisherDashboardRosterSummary>(() => ({
    writerCount: dashboardData?.roster?.writerCount ?? 0,
    agreementCount: dashboardData?.roster?.agreementCount ?? 0,
    publisherSplit: dashboardData?.roster?.publisherSplit ?? 0,
    writerSplit: dashboardData?.roster?.writerSplit ?? 0,
    unclaimedLogs: dashboardData?.roster?.unclaimedLogs ?? 0,
    disputes: dashboardData?.roster?.disputes ?? 0,
  }), [dashboardData]);

  const rosterItems = useMemo(
    () => [
      { label: 'Writers', value: formatNumber(roster.writerCount ?? 0), color: 'text-slate-600 dark:text-slate-300' },
      { label: 'Agreements', value: formatNumber(roster.agreementCount ?? 0), color: 'text-slate-600 dark:text-slate-300' },
      {
        label: 'Publisher Split',
        value: `${formatNumber(roster.publisherSplit ?? 0, { maximumFractionDigits: 1 })}%`,
        color: 'text-slate-600 dark:text-slate-300',
      },
      {
        label: 'Writers Split',
        value: `${formatNumber(roster.writerSplit ?? 0, { maximumFractionDigits: 1 })}%`,
        color: 'text-slate-600 dark:text-slate-300',
      },
      { label: 'Unclaimed Logs', value: formatNumber(roster.unclaimedLogs ?? 0), color: 'text-yellow-600 dark:text-yellow-400' },
      { label: 'Disputes', value: formatNumber(roster.disputes ?? 0), color: 'text-red-600 dark:text-red-400' },
    ],
    [roster, formatNumber],
  );

  const topArtists = useMemo(() => {
    return (dashboardData?.topArtists ?? []).map((artist: PublisherDashboardTopArtist, index) => {
      const trend = artist.trend ?? 0;
      return {
        id: artist.artistId ?? index,
        name: artist.name ?? 'Unknown Artist',
        streamsLabel: `${formatNumber(artist.plays ?? 0)} plays`,
        revenueDisplay: `₵${formatNumber(artist.revenue ?? 0, { maximumFractionDigits: 2 })}`,
        trendText: `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`,
        trendPositive: trend >= 0,
      };
    });
  }, [dashboardData, formatNumber]);



  const quickActions = useMemo(
    () => {
      const hasReports = playsOverTimeSeries.series.length > 0 || topSongs.length > 0;
      const hasArtists = topArtists.length > 0;
      return [
        {
          key: 'download',
          label: 'Download Report',
          icon: Download,
          disabled: !hasReports,
          description: hasReports ? 'Export the latest performance summary.' : 'No report data available yet.',
        },
        {
          key: 'share',
          label: 'Share Stats',
          icon: Share2,
          disabled: !hasReports,
          description: hasReports ? 'Share highlights with your roster.' : 'Generate reports to enable sharing.',
        },
        {
          key: 'mobile',
          label: 'Mobile Analytics',
          icon: Smartphone,
          disabled: !hasArtists,
          description: hasArtists ? 'Track artist performance on the go.' : 'Link artists to unlock mobile analytics.',
        },
      ];
    },
    [playsOverTimeSeries.series.length, topArtists.length, topSongs.length],
  );

  return (
    <div className="space-y-8">
      {dashboardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Dashboard Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                {dashboardError}
              </div>
              <div className="mt-4">
                <button
                  onClick={loadDashboard}
                  className="text-sm font-medium text-red-800 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
                >
                  Try Again →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isLoadingDashboard && !dashboardData && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading publisher dashboard for period: {selectedPeriod}...
          </div>
        </div>
      )}

      {/* Publisher Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Publisher Dashboard</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Manage your music publishing operations and track performance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-green-400 transition-all duration-200"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards - Professional Dark Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className={`bg-gradient-to-br ${stat.gradient} dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-white/30 dark:hover:border-slate-500/70 group cursor-pointer`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">{stat.title}</p>
                <p className={`text-2xl sm:text-3xl font-bold leading-tight group-hover:scale-105 transition-transform duration-300 ${stat.color} dark:${stat.color.replace('600', '400')}`}>
                  {stat.formattedValue}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 ${stat.bgColor} dark:${stat.bgColor.replace('100', '900/60').replace('900/20', '900/60')}`}>
                <stat.icon className={`w-6 h-6 ${stat.color} dark:${stat.color.replace('600', '400')}`} />
              </div>
            </div>
            <div className={`mt-4 flex items-center text-sm ${stat.color} dark:${stat.color.replace('600', '400')}`}>
              <span>{stat.changeText}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Plays Over Time - Dark Glassmorphism */}
          <div className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
                Plays Over Time
              </h2>
              <div className="flex space-x-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Airplay</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Streaming</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {playsOverTimeSeries.series.length > 0 ? (
                playsOverTimeSeries.series.map((entry, index) => (
                  <div key={`${entry.label}-${index}`} className="space-y-2 group">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{entry.label}</span>
                      <div className="flex space-x-4">
                        <span className="text-gray-900 dark:text-white font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {formatNumber(entry.airplay ?? 0)}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {formatNumber(entry.streaming ?? 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1 bg-gray-200/80 dark:bg-slate-700/80 rounded-full h-3 overflow-hidden group-hover:bg-gray-300/60 dark:group-hover:bg-slate-600/60 transition-colors">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-full transition-all duration-500 hover:from-purple-400 hover:to-pink-400"
                          style={{ width: `${((entry.airplay ?? 0) / playsOverTimeSeries.maxValue) * 100}%` }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-200/80 dark:bg-slate-700/80 rounded-full h-3 overflow-hidden group-hover:bg-gray-300/60 dark:group-hover:bg-slate-600/60 transition-colors">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 rounded-full transition-all duration-500 hover:from-blue-400 hover:to-cyan-400"
                          style={{ width: `${((entry.streaming ?? 0) / playsOverTimeSeries.maxValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No playback data available for this period.</div>
              )}
            </div>
          </div>

          {/* Top Songs Played - Enhanced Glassmorphism */}
          <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <Music className="w-5 h-5 mr-2 text-purple-500 dark:text-purple-400" />
                Top Works by Plays
              </h2>
              <button className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center font-medium transition-colors duration-300 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 px-3 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">
                View All <Activity className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-4">
              {topSongs.length > 0 ? (
                topSongs.map((song, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[60px]"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform duration-300 shadow-md">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {song.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                          by {song.artist} • {song.stations} stations
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900 dark:text-white font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{formatNumber(song.plays ?? 0)}</div>
                      <div className="text-sm text-green-600 dark:text-green-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {song.earningsDisplay}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No play data recorded yet.</div>
              )}
            </div>
          </div>

          {/* Ghana Regions Performance - Professional Styling */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-emerald-500 dark:text-emerald-400" />
                Ghana Regions Performance
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regionPerformance.length > 0 ? regionPerformance.map((region) => (
                <div
                  key={region.key}
                  className="p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[80px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {region.region}
                    </div>
                    <div className={`text-sm font-medium transition-all duration-300 ${ (region.growth ?? 0) > 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      {`${(region.growth ?? 0) >= 0 ? '+' : ''}${(region.growth ?? 0).toFixed(1)}%`}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Plays</span>
                      <span className="text-gray-900 dark:text-white font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {formatNumber(region.plays ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Earnings</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {region.earningsDisplay}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Stations</span>
                      <span className="text-orange-600 dark:text-orange-400 font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {formatNumber(region.stations ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No regional performance data available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Enhanced Dark Glassmorphism */}
        <div className="space-y-8">
          {/* Station Breakdown */}
          <div className="bg-gradient-to-br from-amber-50/90 via-yellow-50/80 to-orange-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-amber-500 dark:text-amber-400" />
                Top Stations
              </h2>
            </div>
            <div className="space-y-4">
              {topStations.length > 0 ? topStations.map((station, index) => (
                <div
                  key={station.key ?? index}
                  className="flex items-center space-x-3 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-pointer group p-3 rounded-lg min-h-[50px]"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                        {station.name}
                      </span>
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors duration-300">
                        {formatNumber(station.percentage ?? 0, { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 leading-relaxed group-hover:text-amber-600/80 dark:group-hover:text-amber-400/80 transition-colors duration-300">
                      {station.region ?? 'Unknown'} • {formatNumber(station.plays ?? 0)} plays
                    </div>
                    <div className="w-full bg-gray-200/80 dark:bg-slate-600/80 rounded-full h-2 group-hover:shadow-inner transition-all duration-300">
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400 h-2 rounded-full group-hover:from-amber-400 group-hover:to-orange-400 transition-colors duration-300"
                        style={{ width: `${Math.min(station.percentage ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No station breakdown available.</div>
              )}
            </div>
          </div>

          {/* Recent Activity - Professional Dark Theme */}
          <div className="bg-gradient-to-br from-violet-50/90 via-purple-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-violet-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-violet-500 dark:text-violet-400" />
                Recent Activity
              </h2>
            </div>
            <div className="space-y-3">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50/80 dark:bg-slate-700/60 rounded-lg border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-purple-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group">
                  <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-100/80 to-pink-100/80 dark:from-purple-900/60 dark:to-pink-900/60 group-hover:scale-110 transition-transform duration-300`}>
                    <activity.icon className={`w-4 h-4 ${activity.color} dark:${activity.color.replace('400', '300')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{activity.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{activity.time}</p>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity recorded.</div>
              )}
            </div>
          </div>

          {/* Roster & Agreements - Enhanced Styling */}
          <div className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <Award className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" />
                Roster & Agreements
              </h2>
            </div>
            <div className="space-y-3">
              {rosterItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex justify-between items-center p-3 bg-gray-50/80 dark:bg-slate-700/60 rounded-lg border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-gray-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
                  <span className={`text-sm font-medium ${item.color} group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors`}>{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Artists - Professional Dark Styling */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/80 to-cyan-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" />
                Top Artists
              </h2>
            </div>
            <div className="space-y-4">
              {topArtists.length > 0 ? (
                topArtists.map((artist, index) => (
                  <div key={artist.id ?? index} className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-slate-700/60 rounded-lg border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{artist.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">{artist.streamsLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{artist.revenueDisplay}</p>
                      <p className={`text-xs font-medium transition-all duration-300 ${artist.trendPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {artist.trendText}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No artist performance data yet.</div>
              )}
            </div>
          </div>

          {/* Quick Actions - Professional Button Styling */}
          <div className="bg-gradient-to-br from-pink-50/90 via-rose-50/80 to-purple-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-pink-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-between group px-4 text-left ${
                      action.disabled
                        ? 'bg-white/10 dark:bg-slate-700/40 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                        : action.key === 'download'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 text-white hover:shadow-lg hover:scale-[1.02]'
                          : 'bg-white/10 dark:bg-slate-700/60 text-gray-900 dark:text-white border border-white/20 dark:border-slate-600/40 hover:bg-white/20 dark:hover:bg-slate-600/70 hover:scale-[1.02]'
                    }`}
                    disabled={action.disabled}
                  >
                    <div className="flex items-center">
                      <Icon className={`w-4 h-4 mr-2 ${action.disabled ? '' : 'group-hover:scale-110 transition-transform'}`} />
                      {action.label}
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{action.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}