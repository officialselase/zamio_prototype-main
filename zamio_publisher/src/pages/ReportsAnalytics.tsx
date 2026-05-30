import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Radio,
  Users,
  Globe,
  Download,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchPublisherReports,
  type PublisherReportStationOption,
  type PublisherReportsPayload,
} from '../lib/api';

const DEFAULT_PERIOD_OPTIONS = [
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'last3months', label: 'Last 3 Months' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'lastyear', label: 'Last Year' },
];

const resolveReportsError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to load analytics. Please try again later.';
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
          const firstEntry = Object.values(errors as Record<string, unknown>)[0];
          if (typeof firstEntry === 'string' && firstEntry.trim().length > 0) {
            return firstEntry;
          }
          if (Array.isArray(firstEntry) && firstEntry.length > 0) {
            const candidate = firstEntry[0];
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
              return candidate;
            }
          }
        }
      }
    }

    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Unable to load analytics. Please try again later.';
};

const ReportsAnalytics: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('last30days');
  const [stationFilter, setStationFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [reportData, setReportData] = useState<PublisherReportsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  useEffect(() => {
    if (!publisherId) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchPublisherReports({
      publisherId,
      period: dateRange,
      stationId: stationFilter !== 'all' ? stationFilter : undefined,
      region: regionFilter !== 'all' ? regionFilter : undefined,
    })
      .then((envelope) => {
        if (!isMounted) {
          return;
        }
        const payload = (envelope?.data ?? null) as PublisherReportsPayload | null;
        setReportData(payload);
      })
      .catch((fetchError) => {
        if (!isMounted) {
          return;
        }
        setError(resolveReportsError(fetchError));
        setReportData(null);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [publisherId, dateRange, stationFilter, regionFilter]);

  useEffect(() => {
    if (!reportData?.filters?.selected) {
      return;
    }

    const { period, stationId, region } = reportData.filters.selected;

    if (period && period !== dateRange) {
      setDateRange(period);
    }

    const resolvedStation = stationId ?? 'all';
    if (resolvedStation !== stationFilter) {
      setStationFilter(resolvedStation);
    }

    const resolvedRegion = region ?? 'all';
    if (resolvedRegion !== regionFilter) {
      setRegionFilter(resolvedRegion);
    }
  }, [reportData?.filters?.selected]);

  const overview = reportData?.overview;
  const totalEarnings = overview?.totalEarnings ?? 0;
  const totalAirplay = overview?.totalAirplay ?? 0;
  const totalStations = overview?.totalStations ?? 0;
  const totalArtists = overview?.totalArtists ?? 0;
  const overviewGrowth = overview?.growth ?? {};
  const earningsGrowth = Number(overviewGrowth?.earnings ?? 0);
  const airplayGrowth = Number(overviewGrowth?.airplay ?? 0);
  const stationGrowth = Number(overviewGrowth?.stations ?? 0);
  const artistGrowth = Number(overviewGrowth?.artists ?? 0);

  const stationPerformance = reportData?.stationPerformance ?? [];
  const artistPerformance = reportData?.artistPerformance ?? [];
  const monthlyTrends = reportData?.monthlyTrends ?? [];
  const regionalPerformance = reportData?.regionalPerformance ?? [];
  const filters = reportData?.filters;

  const periodOptions = (filters?.availablePeriods && filters.availablePeriods.length > 0
    ? filters.availablePeriods
    : DEFAULT_PERIOD_OPTIONS);

  const stationOptions = [
    { value: 'all', label: 'All Stations' },
    ...((filters?.stations ?? []) as PublisherReportStationOption[])
      .filter((station) => typeof station?.stationId === 'string' && station.stationId.length > 0)
      .map((station) => ({
        value: station.stationId as string,
        label: station.name ?? 'Unknown Station',
      })),
  ];

  const regionOptions = [
    { value: 'all', label: 'All Regions' },
    ...(filters?.regions ?? []).map((region) => ({ value: region, label: region })),
  ];

  const filteredStationData = stationPerformance.filter((station) => {
    if (stationFilter !== 'all') {
      const stationIdentifier =
        station.stationId != null ? String(station.stationId) : station.station ?? '';
      if (stationIdentifier !== stationFilter) {
        return false;
      }
    }

    if (regionFilter !== 'all') {
      const regionValue = station.region ?? 'Unknown';
      if (regionValue !== regionFilter) {
        return false;
      }
    }

    return true;
  });

  const filteredArtistData = artistPerformance.filter((artist) => {
    if (regionFilter !== 'all') {
      const regionValue = artist.region ?? 'Unknown';
      return regionValue === regionFilter;
    }
    return true;
  });

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Comprehensive insights into radio/TV airplay performance, earnings trends, and artist success metrics
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'stations', label: 'Stations', icon: Radio },
            { id: 'artists', label: 'Artists', icon: Users },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'regions', label: 'Regions', icon: Globe }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="mx-6 -mt-4 mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-16 text-gray-600 dark:text-gray-300">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Loading analytics...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {activeTab === 'overview' && (
          <>
            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalEarnings)}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{earningsGrowth}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Airplay</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(totalAirplay)}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{airplayGrowth}%
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Radio className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Stations</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalStations}
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{stationGrowth}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Radio className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Artists</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalArtists}
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{artistGrowth}%
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Earnings Trend */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Earnings Trend</h3>
                <div className="space-y-4">
                  {monthlyTrends.map((data) => {
                    const monthLabel = [data.month, data.year].filter(Boolean).join(' ').trim() || data.label || '—';
                    return (
                      <div key={`${data.month}-${data.year}-${monthLabel}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">{data.month}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{monthLabel}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(data.earnings ?? 0)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{formatNumber(data.airplay ?? 0)} plays</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Station Performance */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Performing Stations</h3>
                <div className="space-y-4">
                  {stationPerformance.slice(0, 4).map((station, index) => (
                    <div key={`${station.station}-${station.stationId}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          station.station === 'Joy FM' ? 'bg-green-500' :
                          station.station === 'Citi FM' ? 'bg-blue-500' :
                          station.station === 'BBC Africa' ? 'bg-purple-500' :
                          'bg-orange-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{station.station ?? 'Unknown Station'}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{station.region ?? 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(station.earnings ?? 0)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{formatNumber(station.airplay ?? 0)} plays</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
          )}

          {activeTab === 'stations' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Station Performance Analysis</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {stationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Station
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Airplay
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tracks
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Artists
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Avg/Play
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredStationData.map((station, index) => (
                    <tr
                      key={`${station.stationId ?? station.station ?? 'station'}-${index}`}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{station.station ?? 'Unknown Station'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          station.region === 'Ghana' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          station.region === 'International' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                          'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                        }`}>
                          {station.region ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatNumber(station.airplay ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(station.earnings ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {station.tracks ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {station.artists ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatCurrency(station.avgPerPlay ?? 0)}
                      </td>
                      <td className="px-6 py-4">
                        {station.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeTab === 'artists' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Artist Performance Analysis</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredArtistData.map((artist, index) => (
                <div
                  key={`${artist.artistId ?? artist.artist ?? 'artist'}-${index}`}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{artist.artist ?? 'Unknown Artist'}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{artist.region ?? 'Unknown'}</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg ${artist.trend === 'up' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {artist.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Airplay</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(artist.totalAirplay ?? 0)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Earnings</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(artist.totalEarnings ?? 0)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Tracks</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{artist.tracks ?? 0}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Avg/Track</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(artist.avgPerTrack ?? 0)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Top Station: <span className="font-medium text-gray-900 dark:text-white">{artist.topStation ?? 'Unknown'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {activeTab === 'trends' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Performance Trends</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Performance Chart */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Monthly Performance</h4>
                <div className="space-y-3">
                  {monthlyTrends.map((data) => {
                    const monthLabel = [data.month, data.year].filter(Boolean).join(' ').trim() || data.label || '—';
                    return (
                      <div
                        key={`${data.month}-${data.year}-${monthLabel}`}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{data.month}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{monthLabel}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(data.earnings ?? 0)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{formatNumber(data.airplay ?? 0)} airplay</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Growth Indicators */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Growth Metrics</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">Earnings Growth</p>
                        <p className="text-sm text-green-600 dark:text-green-400">Month over month</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-green-800 dark:text-green-300">+18.5%</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3">
                      <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-300">Airplay Growth</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Total broadcast plays</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-blue-800 dark:text-blue-300">+22.3%</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="font-medium text-purple-800 dark:text-purple-300">Artist Growth</p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">New artists added</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-purple-800 dark:text-purple-300">+12.1%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'regions' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Regional Performance Analysis</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {regionalPerformance.map((region) => (
                <div key={region.region} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        region.region === 'Ghana' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        region.region === 'International' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                        'bg-pink-100 dark:bg-pink-900/30'
                      }`}>
                        <Globe className={`w-6 h-6 ${
                          region.region === 'Ghana' ? 'text-yellow-600 dark:text-yellow-400' :
                          region.region === 'International' ? 'text-indigo-600 dark:text-indigo-400' :
                          'text-pink-600 dark:text-pink-400'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{region.region}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{region.stations} stations</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{(region.percentage ?? 0).toLocaleString()}%</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">of total</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Earnings</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(region.earnings ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Airplay</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(region.airplay ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Stations</span>
                      <span className="font-medium text-gray-900 dark:text-white">{region.stations ?? 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
    </>
  );
};

export default ReportsAnalytics;
