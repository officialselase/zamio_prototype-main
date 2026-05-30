import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@zamio/ui';
import { TrendingUp, Eye, ChevronUp, ChevronDown, Download, Share2, Settings, BarChart3, DollarSign, Globe, Target, Music, MapPin, PieChart, Award } from 'lucide-react';
import HoverCard from '../components/HoverCard';
import { useAuth } from '../lib/auth';
import {
  fetchStationDashboard,
  type StationDashboardPayload,
  type StationDashboardDetectionRecord,
  type StationDashboardSystemMetric,
  type StationDashboardStaffPerformance,
  type StationDashboardTopTrack,
  type StationDashboardMonthlyTrend,
  type StationDashboardBreakdownEntry,
  type StationDashboardRegionStat,
  type StationDashboardComplianceStatus,
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
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [chartFilters, setChartFilters] = useState({
    airplayTrends: {
      showDetections: true,
      showEarnings: true
    },
    regionalPerformance: {
      showDetections: true,
      showEarnings: true,
      showStations: true
    }
  });
  const [dashboardData, setDashboardData] = useState<StationDashboardPayload | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  const stationId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = user['station_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (!stationId) {
      setDashboardError('Your station ID is missing. Please sign out and sign in again.');
      setDashboardData(null);
      return;
    }

    setIsLoadingDashboard(true);
    setDashboardError(null);

    try {
      const envelope = await fetchStationDashboard(stationId, {
        period: selectedPeriod,
      });
      const payload = (envelope?.data ?? null) as StationDashboardPayload | null;
      setDashboardData(payload);
    } catch (error) {
      setDashboardError(resolveErrorMessage(error));
      setDashboardData((previous) => previous ?? null);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [stationId, selectedPeriod]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stationStats = useMemo(
    () => ({
      tracksDetected: dashboardData?.stats?.tracksDetected ?? dashboardData?.totalPlays ?? 0,
      monitoringAccuracy: dashboardData?.stats?.monitoringAccuracy ?? dashboardData?.confidenceScore ?? 0,
      uptime: dashboardData?.stats?.uptime ?? 0,
      revenueEarned: dashboardData?.stats?.revenueEarned ?? dashboardData?.totalRoyalties ?? 0,
      activeStaff: dashboardData?.stats?.activeStaff ?? 0,
      complianceScore: dashboardData?.stats?.complianceScore ?? 0,
    }),
    [dashboardData],
  );



  const recentDetections = useMemo<StationDashboardDetectionRecord[]>(
    () =>
      (dashboardData?.recentDetections ?? []).map((detection) => ({
        ...detection,
        confidence: detection.confidence ?? 0,
        status: detection.status ?? 'pending',
      })),
    [dashboardData],
  );

  const staffPerformance = useMemo<StationDashboardStaffPerformance[]>(
    () => dashboardData?.staffPerformance ?? [],
    [dashboardData],
  );

  const topTracks = useMemo<StationDashboardTopTrack[]>(
    () =>
      (dashboardData?.topTracks ?? []).map((track, index, source) => ({
        ...track,
        trend:
          track.trend ??
          (index === 0 ? 'up' : index === source.length - 1 && source.length > 1 ? 'down' : 'stable'),
        stations: track.stations ?? 1,
      })),
    [dashboardData],
  );

  const monthlyTrends = useMemo<StationDashboardMonthlyTrend[]>(
    () =>
      (dashboardData?.monthlyTrends ?? []).map((entry) => ({
        month: entry.month ?? '—',
        detections: entry.detections ?? 0,
        accuracy: entry.accuracy ?? 0,
        earnings: entry.earnings ?? 0,
      })),
    [dashboardData],
  );

  const stationBreakdown = useMemo<StationDashboardBreakdownEntry[]>(
    () =>
      (dashboardData?.stationBreakdown ?? []).map((entry) => ({
        ...entry,
        type: entry.type ?? entry.station,
      })),
    [dashboardData],
  );

  const ghanaRegions = useMemo<StationDashboardRegionStat[]>(
    () =>
      (dashboardData?.ghanaRegions ?? []).map((region) => ({
        ...region,
        trend:
          region.trend ?? (region.growth > 1 ? 'up' : region.growth < -1 ? 'down' : 'stable'),
      })),
    [dashboardData],
  );

  const complianceStatus = useMemo<StationDashboardComplianceStatus>(
    () => ({
      broadcastingLicense: dashboardData?.complianceStatus?.broadcastingLicense ?? 'pending',
      musicLicense: dashboardData?.complianceStatus?.musicLicense ?? 'pending',
      technicalCertification: dashboardData?.complianceStatus?.technicalCertification ?? 'pending',
      lastAudit: dashboardData?.complianceStatus?.lastAudit ?? null,
      nextAudit: dashboardData?.complianceStatus?.nextAudit ?? null,
    }),
    [dashboardData],
  );

  const maxDetections = useMemo(
    () => monthlyTrends.reduce((max, entry) => Math.max(max, entry.detections ?? 0), 0),
    [monthlyTrends],
  );

  const maxEarnings = useMemo(
    () => monthlyTrends.reduce((max, entry) => Math.max(max, entry.earnings ?? 0), 0),
    [monthlyTrends],
  );

  const isInitialLoading = isLoadingDashboard && !dashboardData;
  const safeMaxDetections = maxDetections || 1;
  const safeMaxEarnings = maxEarnings || 1;

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

  // Helper functions for enhanced interactions
  const toggleChartFilter = (chartType: keyof typeof chartFilters, filterKey: string) => {
    setChartFilters(prev => ({
      ...prev,
      [chartType]: {
        ...prev[chartType],
        [filterKey]: !prev[chartType][filterKey as keyof typeof prev[typeof chartType]]
      }
    }));
  };

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

  return (
    <div className="space-y-8">
      {/* Station Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Station Control Center</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Monitor your station's music detection and compliance status
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
            }}
            className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all duration-200 hover:shadow-sm ${isLoadingDashboard ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoadingDashboard}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          {isLoadingDashboard && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Updating...</span>
            </div>
          )}
        </div>
      </div>

      {dashboardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {dashboardError}
        </div>
      )}

      {/* Station Stats Cards - Enhanced Design */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${isLoadingDashboard ? 'opacity-50' : 'opacity-100'}`}>
        {/* Tracks Detected Card */}
        <Card className="bg-gradient-to-br from-red-50/90 via-orange-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-red-300 dark:hover:border-red-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Detections</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                {stationStats.tracksDetected.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">🎵</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tracks identified this period</span>
          </div>
        </Card>

        {/* Monitoring Accuracy Card */}
        <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Accuracy Rate</p>
              <p className={`text-2xl sm:text-3xl font-bold leading-tight group-hover:scale-105 transition-transform duration-300 ${
                stationStats.monitoringAccuracy >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                stationStats.monitoringAccuracy >= 80 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {stationStats.monitoringAccuracy}%
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 ${
              stationStats.monitoringAccuracy >= 90 ? 'bg-emerald-100/80 dark:bg-emerald-900/60' :
              stationStats.monitoringAccuracy >= 80 ? 'bg-blue-100/80 dark:bg-blue-900/60' :
              'bg-red-100/80 dark:bg-red-900/60'
            }`}>
              <span className="text-2xl">🎯</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Music recognition accuracy</span>
          </div>
        </Card>

        {/* System Uptime Card */}
        <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">System Uptime</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                {stationStats.uptime}%
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">System availability</span>
          </div>
        </Card>

        {/* Revenue Earned Card */}
        <Card className="bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Revenue Earned</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                ₵{stationStats.revenueEarned.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total revenue this period</span>
          </div>
        </Card>
      </div>

      {/* Main Content Grid - Station-focused sections */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 transition-opacity duration-300 ${isLoadingDashboard ? 'opacity-50' : 'opacity-100'}`}>
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Detections */}
          <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">🔍</span>
                Recent Music Detections
              </h2>
              <button className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1 rounded-lg transition-all duration-200 flex items-center active:scale-95 border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                View All Detections
              </button>
            </div>
            <div className="space-y-4">
              {isInitialLoading ? (
                // Loading skeleton for detections
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 dark:bg-slate-800/50 rounded-xl border border-white/10 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-400 rounded w-32"></div>
                        <div className="h-3 bg-gray-400 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-4 bg-gray-400 rounded w-16"></div>
                      <div className="h-3 bg-gray-400 rounded w-12"></div>
                    </div>
                  </div>
                ))
              ) : recentDetections.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No detections yet</p>
                  <p className="text-sm mt-1">Start broadcasting to see music detections</p>
                </div>
              ) : (
                recentDetections.map((detection) => (
                  <div
                    key={detection.id}
                    className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[60px]"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-125 ${detection.status === 'verified' ? 'bg-green-400' : detection.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          {detection.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          by {detection.artist ?? 'Unknown artist'} • {detection.confidence}% confidence
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900 dark:text-white font-semibold text-sm">
                        {detection.timestamp ?? 'Just now'}
                      </div>
                      <div className={`inline-flex items-center justify-center text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-300 min-w-[60px] text-center ${
                        detection.status === 'verified' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                        detection.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                        'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}>
                        {detection.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Airplay Trends Chart - Monthly Detection Trends */}
          <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">📈</span>
                Monthly Detection Trends
              </h2>
              <div className="flex space-x-2">
                <button
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-300 ${
                    chartFilters.airplayTrends.showDetections
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                  }`}
                  onClick={() => toggleChartFilter('airplayTrends', 'showDetections')}
                >
                  <div className={`w-3 h-3 rounded-full ${chartFilters.airplayTrends.showDetections ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                  <span className="text-sm">Detections</span>
                </button>
                <button
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-300 ${
                    chartFilters.airplayTrends.showEarnings
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                  }`}
                  onClick={() => toggleChartFilter('airplayTrends', 'showEarnings')}
                >
                  <div className={`w-3 h-3 rounded-full ${chartFilters.airplayTrends.showEarnings ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                  <span className="text-sm">Earnings</span>
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {isInitialLoading ? (
                // Loading skeleton for chart
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-3 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-12"></div>
                      <div className="flex items-center space-x-4">
                        <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-20"></div>
                        <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                        <div className="h-full bg-gray-400 dark:bg-slate-500 rounded-full w-1/3"></div>
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                        <div className="h-full bg-gray-400 dark:bg-slate-500 rounded-full w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : monthlyTrends.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No trend data available</p>
                  <p className="text-sm mt-1">Data will appear as you broadcast</p>
                </div>
              ) : (
                monthlyTrends.map((month, index) => (
                  <div key={month.month} className="space-y-3 group">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">{month.month}</span>
                      <div className="flex items-center space-x-4">
                        {chartFilters.airplayTrends.showDetections && (
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {month.detections.toLocaleString()} detections
                          </span>
                        )}
                        {chartFilters.airplayTrends.showEarnings && (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ₵{month.earnings.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {chartFilters.airplayTrends.showDetections && (
                        <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden group-hover:bg-gray-300 dark:group-hover:bg-slate-600 transition-colors duration-300">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 hover:from-blue-400 hover:to-cyan-400 cursor-pointer"
                            style={{ width: `${(month.detections / safeMaxDetections) * 100}%` }}
                            title={`${month.detections.toLocaleString()} detections`}
                          />
                        </div>
                      )}
                      {chartFilters.airplayTrends.showEarnings && (
                        <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden group-hover:bg-gray-300 dark:group-hover:bg-slate-600 transition-colors duration-300">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500 hover:from-emerald-400 hover:to-green-400 cursor-pointer"
                            style={{ width: `${(month.earnings / safeMaxEarnings) * 100}%` }}
                            title={`₵${month.earnings.toFixed(0)} earnings`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Top Performing Tracks - Enhanced with trend indicators and hover effects */}
          <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">🎵</span>
                Top Performing Tracks
              </h2>
              <button className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center font-medium transition-colors duration-300 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 px-3 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">
                View All Tracks
              </button>
            </div>
            <div className="space-y-4">
              {isInitialLoading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-400 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-400 rounded w-32"></div>
                        <div className="h-3 bg-gray-400 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-x-4 flex">
                      <div className="h-4 bg-gray-400 rounded w-16"></div>
                      <div className="h-4 bg-gray-400 rounded w-16"></div>
                    </div>
                  </div>
                ))
              ) : topTracks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tracks detected yet</p>
                  <p className="text-sm mt-1">Top tracks will appear here</p>
                </div>
              ) : (
                topTracks.slice(0, 3).map((track, index) => (
                <div key={track.id} className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[60px]">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform duration-300 shadow-md">
                      {index + 1}
                    </div>
                    <div>
                      <HoverCard
                        trigger={
                          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors cursor-pointer">
                            {track.title}
                          </h3>
                        }
                        content={[
                          { label: 'Detections', value: track.detections.toLocaleString() },
                          { label: 'Earnings', value: `₵${track.earnings.toFixed(2)}` },
                          { label: 'Stations', value: `${track.stations}` },
                          { label: 'Trend', value: track.trend === 'up' ? 'Increasing' : track.trend === 'down' ? 'Decreasing' : 'Stable' }
                        ]}
                        position="top"
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                        {track.stations} stations • {track.confidence}% accuracy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-right">
                      <HoverCard
                        trigger={
                          <p className="font-semibold text-gray-900 dark:text-white cursor-pointer group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                            {track.detections.toLocaleString()}
                          </p>
                        }
                        content={[
                          { label: 'Total Detections', value: track.detections.toLocaleString() },
                          { label: 'Trend', value: track.trend === 'up' ? '↗ Increasing' : track.trend === 'down' ? '↘ Decreasing' : '→ Stable' }
                        ]}
                        position="top"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">detections</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 dark:text-green-400 cursor-pointer group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors">
                        ₵{track.earnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">earned</p>
                    </div>
                    <div className="flex items-center cursor-pointer group-hover:scale-110 transition-transform duration-300">
                      {getTrendIcon(track.trend)}
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Station Management */}
        <div className="space-y-8">
          {/* Staff Performance */}
          <Card className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">👥</span>
                Staff Performance
              </h2>
              <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-200 dark:border-indigo-800">
                {stationStats.activeStaff} Active
              </div>
            </div>
            <div className="space-y-4">
              {isInitialLoading ? (
                // Loading skeleton
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 bg-gray-400 rounded w-24"></div>
                      <div className="h-6 bg-gray-400 rounded-full w-16"></div>
                    </div>
                    <div className="h-3 bg-gray-400 rounded w-32 mb-3"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-gray-400 rounded w-16"></div>
                      <div className="h-3 bg-gray-400 rounded w-12"></div>
                    </div>
                  </div>
                ))
              ) : staffPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No staff data available</p>
                  <p className="text-sm mt-1">Add staff members to track performance</p>
                </div>
              ) : (
                staffPerformance.map((staff) => (
                <div
                  key={staff.name}
                  className="p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group min-h-[60px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                      {staff.name}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-300 ${
                      staff.status === 'active' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                      staff.status === 'training' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                      'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {staff.status}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                    {staff.role} • {staff.detections} detections
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Accuracy:</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{staff.accuracy}%</span>
                  </div>
                </div>
              ))
              )}
            </div>
          </Card>

          {/* Compliance Status */}
          <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">📋</span>
                Compliance Status
              </h2>
              <div className={`text-sm font-medium px-3 py-1 rounded-full transition-all duration-300 ${
                complianceStatus.broadcastingLicense === 'valid' && complianceStatus.musicLicense === 'valid'
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                {stationStats.complianceScore >= 8 ? 'Compliant' : 'Review Needed'}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-green-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Broadcasting License</span>
                <span className={`text-sm font-medium transition-all duration-300 ${complianceStatus.broadcastingLicense === 'valid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {complianceStatus.broadcastingLicense === 'valid' ? '✓ Valid' : '✗ Expired'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-green-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Music License</span>
                <span className={`text-sm font-medium transition-all duration-300 ${complianceStatus.musicLicense === 'valid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {complianceStatus.musicLicense === 'valid' ? '✓ Valid' : '✗ Expired'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-700/60 rounded-xl border border-gray-200/60 dark:border-slate-600/40 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-green-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer group">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Technical Certification</span>
                <span className={`text-sm font-medium transition-all duration-300 ${complianceStatus.technicalCertification === 'valid' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {complianceStatus.technicalCertification === 'valid' ? '✓ Valid' : '⏳ Pending'}
                </span>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Next Audit Due</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{complianceStatus.nextAudit}</div>
              </div>
            </div>
          </Card>

          {/* Station Quick Actions */}
          <Card className="bg-gradient-to-br from-violet-50/90 via-purple-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-violet-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Station Management
            </h2>
            <div className="space-y-3">
              <button className="group relative w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:from-blue-800 active:to-cyan-800 text-white py-4 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform hover:scale-[1.02]">
                <span className="mr-2 relative z-10">⚙️</span>
                <span className="relative z-10">System Settings</span>
              </button>
              <button className="group w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white py-4 px-4 rounded-xl font-semibold transition-all duration-300 border border-emerald-200/50 hover:border-emerald-300/70 active:border-emerald-400/80 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform hover:scale-[1.02]">
                <span className="mr-2">📊</span>
                Generate Report
              </button>
              <button className="group w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white py-4 px-4 rounded-xl font-semibold transition-all duration-300 border border-purple-200/50 hover:border-purple-300/70 active:border-purple-400/80 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform hover:scale-[1.02]">
                <span className="mr-2">👥</span>
                Manage Staff
              </button>
              <button className="group w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:from-amber-800 active:to-orange-800 text-white py-4 px-4 rounded-xl font-semibold transition-all duration-300 border border-amber-200/50 hover:border-amber-300/70 active:border-amber-400/80 flex items-center justify-center shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transform hover:scale-[1.02]">
                <span className="mr-2">📋</span>
                Compliance Check
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}