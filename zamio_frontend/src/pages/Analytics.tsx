import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Play,
  Users,
  Globe,
  Music,
  Calendar,
  MapPin,
  Award,
  Target,
  Filter,
  Download,
  Share2,
  RefreshCw,
  Eye,
  Heart,
  Clock,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  Search,
  Table,
  Grid,
  List,
  XCircle
} from 'lucide-react';
import { fetchArtistAnalytics, type AnalyticsData } from '../lib/analyticsApi';
import { getArtistId } from '../lib/auth';

// Default empty analytics data
const defaultAnalyticsData: AnalyticsData = {
  time_range: '12months',
  overview: {
    total_plays: 0,
    total_revenue: 0,
    total_tracks: 0,
    total_albums: 0,
    active_listeners: 0,
    growth_rate: 0,
    previous_period_growth: 0
  },
  monthly_performance: [],
  top_tracks: [],
  geographic_performance: [],
  revenue_by_source: [],
  recent_activity: [],
  track_details: []
};

const Analytics: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7days' | '30days' | '3months' | '12months'>('12months');
  const [selectedMetric, setSelectedMetric] = useState('plays');
  const [selectedView, setSelectedView] = useState<'charts' | 'tables'>('charts');
  const [sortBy, setSortBy] = useState<'plays' | 'revenue' | 'growth'>('plays');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(defaultAnalyticsData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₵0.00';
    return `₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (growth < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 dark:text-green-400';
    if (growth < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Fetch analytics data
  const loadAnalytics = useCallback(async (showRefreshing = false) => {
    const artistId = getArtistId();
    if (!artistId) {
      setError('Artist ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchArtistAnalytics({
        artist_id: artistId,
        time_range: selectedTimeRange,
      });

      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTimeRange]);

  // Load analytics on mount and when time range changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle refresh
  const handleRefresh = () => {
    loadAnalytics(true);
  };

  return (
    <>
      {/* Enhanced Page header */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Comprehensive data analysis and performance insights
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="3months">Last 3 months</option>
                <option value="12months">Last 12 months</option>
              </select>

              <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
                    selectedView === 'charts' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  onClick={() => setSelectedView('charts')}
                >
                  <Grid className="w-4 h-4 inline mr-1" />
                  Charts
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
                    selectedView === 'tables' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  onClick={() => setSelectedView('tables')}
                >
                  <Table className="w-4 h-4 inline mr-1" />
                  Tables
                </button>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Error Loading Analytics</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
      <div className="space-y-8">
        {/* Performance Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Performance Chart */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Performance Trends</h2>
              <div className="flex items-center space-x-2">
                <button className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                  selectedMetric === 'plays' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`} onClick={() => setSelectedMetric('plays')}>
                  Plays
                </button>
                <button className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                  selectedMetric === 'revenue' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`} onClick={() => setSelectedMetric('revenue')}>
                  Revenue
                </button>
                <button className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                  selectedMetric === 'listeners' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`} onClick={() => setSelectedMetric('listeners')}>
                  Listeners
                </button>
              </div>
            </div>

            <div className="h-80 overflow-y-auto">
              {analyticsData.monthly_performance.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.monthly_performance.map((month, index) => {
                    const maxValue = Math.max(...analyticsData.monthly_performance.map(m => 
                      selectedMetric === 'plays' ? m.plays : 
                      selectedMetric === 'revenue' ? m.revenue : 
                      m.listeners
                    ));
                    const value = selectedMetric === 'plays' ? month.plays : 
                                  selectedMetric === 'revenue' ? month.revenue : 
                                  month.listeners;
                    const percentage = (value / maxValue) * 100;
                    
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
                          {month.month}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-8 relative">
                              <div
                                className={`h-8 rounded-full transition-all duration-500 ${
                                  selectedMetric === 'plays' ? 'bg-gradient-to-r from-indigo-500 to-blue-500' :
                                  selectedMetric === 'revenue' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  'bg-gradient-to-r from-purple-500 to-pink-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white w-20 text-right">
                              {selectedMetric === 'revenue' ? formatCurrency(value) : formatNumber(value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Geographic Performance Chart */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Geographic Performance Distribution</h2>
            <div className="h-80 overflow-y-auto">
              {analyticsData.geographic_performance.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.geographic_performance.map((region, index) => {
                    const colors = [
                      'from-blue-500 to-indigo-500',
                      'from-green-500 to-emerald-500',
                      'from-purple-500 to-pink-500',
                      'from-orange-500 to-red-500',
                      'from-yellow-500 to-orange-500',
                      'from-cyan-500 to-blue-500',
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <div key={region.region} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {region.region}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatNumber(region.plays)} plays
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {region.percentage}% of total
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                          <div
                            className={`bg-gradient-to-r ${colorClass} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${region.percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatCurrency(region.revenue)} revenue</span>
                          <span>{formatNumber(region.listeners)} listeners</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No regional data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Sources Breakdown */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Sources</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently tracking radio airplay only</p>
              </div>
            </div>
            <div className="space-y-4">
              {analyticsData.revenue_by_source.map((source) => (
                <div key={source.source} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {source.source}
                    </span>
                    <div className="text-right">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(source.amount)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {source.percentage}% of total
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatNumber(source.plays)} plays</span>
                    <span>₵{(source.avg_per_play ?? 0).toFixed(3)} per play</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track Performance Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Track Performance Metrics</h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'plays' | 'revenue' | 'growth')}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="plays">Sort by Plays</option>
                <option value="revenue">Sort by Revenue</option>
                <option value="growth">Sort by Growth</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Track</th>
                    <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Plays</th>
                    <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Revenue</th>
                    <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Growth</th>
                    <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Listeners</th>
                  </tr>
                </thead>
                <tbody>
                  {[...analyticsData.top_tracks]
                    .sort((a, b) => {
                      switch (sortBy) {
                        case 'revenue': return b.revenue - a.revenue;
                        case 'growth': return b.growth - a.growth;
                        default: return b.plays - a.plays;
                      }
                    })
                    .map((track, index) => (
                    <tr key={track.title} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-gray-900 dark:text-white font-medium">{track.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                        {formatNumber(track.plays)}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(track.revenue)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className={`flex items-center justify-end space-x-1 ${getGrowthColor(track.growth)}`}>
                          {getGrowthIcon(track.growth)}
                          <span className="font-medium">{Math.abs(track.growth)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                        {formatNumber(track.plays * 0.035)} {/* Approximate listeners calculation */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detailed Tables Section */}
        {selectedView === 'tables' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Geographic Performance Table */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Regional Performance Details</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Region</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Plays</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Revenue</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Listeners</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Avg/Listener</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.geographic_performance.map((region) => (
                        <tr key={region.region} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-2 text-gray-900 dark:text-white font-medium">{region.region}</td>
                          <td className="py-3 px-2 text-right text-gray-900 dark:text-white">{formatNumber(region.plays)}</td>
                          <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(region.revenue)}</td>
                          <td className="py-3 px-2 text-right text-gray-900 dark:text-white">{formatNumber(region.listeners)}</td>
                          <td className="py-3 px-2 text-right text-gray-900 dark:text-white">₵{(region.avg_revenue_per_listener ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Track Analytics */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Track Analytics Details</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Track</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Completion</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Skip Rate</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Avg Play Time</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.track_details.map((track) => (
                        <tr key={track.title} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-2 text-gray-900 dark:text-white font-medium">{track.title}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${track.completion_rate ?? 0}%` }}
                                />
                              </div>
                              <span className="text-gray-900 dark:text-white text-xs">{track.completion_rate ?? 0}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right text-red-600 dark:text-red-400">{track.skip_rate ?? 0}%</td>
                          <td className="py-3 px-2 text-right text-gray-900 dark:text-white">{(track.avg_play_time ?? 0).toFixed(1)}m</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              (track.completion_rate ?? 0) > 75 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              (track.completion_rate ?? 0) > 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {(track.completion_rate ?? 0) > 75 ? 'High' : (track.completion_rate ?? 0) > 60 ? 'Medium' : 'Low'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity Log</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Activity</th>
                      <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                      <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Location</th>
                      <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.recentActivity.map((activity, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-2 text-gray-900 dark:text-white">{activity.action}</td>
                        <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{activity.time}</td>
                        <td className="py-3 px-2 text-gray-900 dark:text-white">{activity.location}</td>
                        <td className="py-3 px-2 text-right">
                          {activity.plays && (
                            <div className="text-blue-600 dark:text-blue-400 font-medium">
                              +{activity.plays} plays
                            </div>
                          )}
                          {activity.revenue && (
                            <div className="text-green-600 dark:text-green-400 font-medium">
                              +{formatCurrency(activity.revenue)}
                            </div>
                          )}
                          {activity.followers && (
                            <div className="text-purple-600 dark:text-purple-400 font-medium">
                              +{activity.followers} follower{activity.followers > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Summary Statistics Cards (Charts View) */}
        {selectedView === 'charts' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Total Plays</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatNumber(analyticsData.overview.total_plays)}
                  </p>
                  <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(analyticsData.overview.growth_rate)}`}>
                    {getGrowthIcon(analyticsData.overview.growth_rate)}
                    <span>{Math.abs(analyticsData.overview.growth_rate)}% growth</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/90 to-green-50/90 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(analyticsData.overview.total_revenue)}
                  </p>
                  <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(analyticsData.overview.growth_rate)}`}>
                    {getGrowthIcon(analyticsData.overview.growth_rate)}
                    <span>{Math.abs(analyticsData.overview.growth_rate)}% growth</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Active Listeners</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatNumber(analyticsData.overview.active_listeners)}
                  </p>
                  <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(analyticsData.overview.growth_rate)}`}>
                    {getGrowthIcon(analyticsData.overview.growth_rate)}
                    <span>{Math.abs(analyticsData.overview.growth_rate)}% growth</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/90 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Total Tracks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {analyticsData.overview.total_tracks}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {analyticsData.overview.total_albums} albums
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </>
  );
};

export default Analytics;
