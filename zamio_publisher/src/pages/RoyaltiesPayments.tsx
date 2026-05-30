import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TrendingDown,
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
  ArrowUpDown,
  CreditCard,
  PieChart,
  Send,
  HelpCircle,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchPublisherRoyalties,
  type PublisherDistributionSplit,
  type PublisherMonthlyEarning,
  type PublisherPaymentScheduleItem,
  type PublisherRoyaltiesPayload,
  type PublisherRoyaltiesSummary,
  type PublisherStationBreakdown,
  type PublisherTopTrack,
} from '../lib/api';

const resolveRoyaltiesError = (maybeError: unknown): string => {
  if (!maybeError) {
    return 'Unable to load royalties data. Please try again later.';
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
          const entries = Object.entries(errors as Record<string, unknown>);
          const firstEntry = entries[0];
          if (firstEntry) {
            const [, value] = firstEntry;
            if (typeof value === 'string' && value.trim().length > 0) {
              return value;
            }
            if (Array.isArray(value) && value.length > 0) {
              const candidate = value[0];
              if (typeof candidate === 'string' && candidate.trim().length > 0) {
                return candidate;
              }
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

  return 'Unable to load royalties data. Please try again later.';
};

const formatNumber = (num: number | null | undefined) => {
  const value = Number(num ?? 0);
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

const normalizePaymentStatus = (status: string | null | undefined) => {
  const key = (status || '').toLowerCase();
  if (key === 'processed') {
    return 'paid';
  }
  if (key === 'approved') {
    return 'processing';
  }
  if (key === 'pending') {
    return 'pending';
  }
  return key || 'scheduled';
};

const getStatusColor = (status: string | null | undefined) => {
  switch (normalizePaymentStatus(status)) {
    case 'paid':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'processing':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string | null | undefined) => {
  switch (normalizePaymentStatus(status)) {
    case 'paid':
      return <CheckCircle className="w-3 h-3" />;
    case 'pending':
      return <Clock className="w-3 h-3" />;
    case 'scheduled':
      return <Calendar className="w-3 h-3" />;
    case 'processing':
      return <RefreshCw className="w-3 h-3" />;
    case 'failed':
      return <XCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

const stationColorPalette = [
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
];

const stationSoftPalette = [
  'bg-green-100 dark:bg-green-900/30',
  'bg-blue-100 dark:bg-blue-900/30',
  'bg-purple-100 dark:bg-purple-900/30',
  'bg-orange-100 dark:bg-orange-900/30',
  'bg-amber-100 dark:bg-amber-900/30',
  'bg-teal-100 dark:bg-teal-900/30',
  'bg-pink-100 dark:bg-pink-900/30',
  'bg-indigo-100 dark:bg-indigo-900/30',
];

const RoyaltiesPayments: React.FC = () => {
  const navigate = useNavigate();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('earnings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [royalties, setRoyalties] = useState<PublisherRoyaltiesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyFallback, setCurrencyFallback] = useState('GHS');

  const loadRoyalties = useCallback(async () => {
    if (!publisherId) {
      setError('Your publisher ID is missing. Please sign out and sign in again.');
      setRoyalties(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchPublisherRoyalties({ publisherId });
      const payload = (envelope?.data ?? null) as PublisherRoyaltiesPayload | null;
      setRoyalties(payload);
      const currencyCandidate =
        typeof payload?.summary?.currency === 'string' && payload.summary.currency.trim().length > 0
          ? payload.summary.currency
          : 'GHS';
      setCurrencyFallback(currencyCandidate);
    } catch (err) {
      setError(resolveRoyaltiesError(err));
      setRoyalties(null);
    } finally {
      setIsLoading(false);
    }
  }, [publisherId]);

  useEffect(() => {
    loadRoyalties();
  }, [loadRoyalties]);

  const summary: PublisherRoyaltiesSummary | null = royalties?.summary ?? null;
  const monthlyEarnings: PublisherMonthlyEarning[] = royalties?.earnings ?? [];
  const topTracks: PublisherTopTrack[] = royalties?.topTracks ?? [];
  const stationBreakdown: PublisherStationBreakdown[] = royalties?.stationBreakdown ?? [];
  const paymentItems: PublisherPaymentScheduleItem[] = royalties?.payments?.items ?? [];
  const paymentStats = royalties?.payments?.stats ?? {};
  const distributionSplits: PublisherDistributionSplit[] = royalties?.distribution?.splits ?? [];
  const distributionSettings = royalties?.distribution?.settings ?? {};

  const currency = summary?.currency || currencyFallback;

  const formatCurrency = useCallback(
    (amount: number | null | undefined) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'GHS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number.isFinite(amount ?? 0) ? (amount as number) : 0),
    [currency],
  );

  const trendPercentage = summary?.trendPercentage ?? 0;
  const trendPositive = trendPercentage >= 0;
  const trendLabel = `${trendPositive ? '+' : ''}${trendPercentage.toFixed(1)}%`;
  const TrendIcon = trendPositive ? TrendingUp : TrendingDown;
  const trendColor = trendPositive ? 'text-green-600' : 'text-red-600';

  const totalEarnings = summary?.totalEarnings ?? 0;
  const paidEarnings = summary?.paidEarnings ?? 0;
  const pendingEarnings = summary?.pendingEarnings ?? 0;
  const disputedEarnings = summary?.disputedEarnings ?? 0;
  const processingEarnings = summary?.processingEarnings ?? 0;
  const scheduledEarnings = summary?.scheduledEarnings ?? 0;

  const stationOptions = useMemo(() => {
    const unique = new Set<string>();
    topTracks.forEach((track) => {
      if (track.station && track.station.trim().length > 0) {
        unique.add(track.station);
      }
    });
    return Array.from(unique).sort();
  }, [topTracks]);

  const filteredTopTracks = useMemo(() => {
    let data = [...topTracks];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter((track) => {
        const title = (track.title || '').toLowerCase();
        const artist = (track.artist || '').toLowerCase();
        return title.includes(term) || artist.includes(term);
      });
    }

    if (stationFilter !== 'all') {
      data = data.filter((track) => (track.station || '') === stationFilter);
    }

    data.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortBy) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'artist':
          aValue = a.artist || '';
          bValue = b.artist || '';
          break;
        case 'airplay':
          aValue = a.airplay ?? 0;
          bValue = b.airplay ?? 0;
          break;
        case 'earnings':
        default:
          aValue = a.earnings ?? 0;
          bValue = b.earnings ?? 0;
          break;
      }

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        return sortOrder === 'asc'
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString);
      }

      const aNumber = Number(aValue);
      const bNumber = Number(bValue);
      return sortOrder === 'asc' ? aNumber - bNumber : bNumber - aNumber;
    });

    return data;
  }, [topTracks, searchTerm, stationFilter, sortBy, sortOrder]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') {
      return paymentItems;
    }
    return paymentItems.filter(
      (payment) => normalizePaymentStatus(payment.status) === statusFilter,
    );
  }, [paymentItems, statusFilter]);

  const totalScheduledAmount = paymentStats.totalScheduled ?? 0;
  const totalProcessingAmount = paymentStats.totalProcessing ?? 0;
  const totalPaidAmount = paymentStats.totalPaid ?? 0;

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

  const renderStationBadge = (station: string | null | undefined, index: number) => {
    const badgeClass = stationSoftPalette[index % stationSoftPalette.length];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
        {station || 'Multiple Stations'}
      </span>
    );
  };

  const renderRegionBadge = (region: string | null | undefined, index: number) => {
    const badgeClass = stationSoftPalette[(index + 3) % stationSoftPalette.length];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
        {region || '—'}
      </span>
    );
  };

  return (
    <>
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Royalties & Payments</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Track earnings from radio and TV airplay, manage royalty distributions, and handle payments to Ghanaian and international artists
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(totalEarnings)}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid Out</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(paidEarnings)}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(pendingEarnings)}
                      </p>
                    </div>
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/royalties/process-payments')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Send className="w-4 h-4" />
                <span>Process Payments</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="mx-6 mb-6 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading royalties data…</span>
        </div>
      )}

      <div className="flex justify-center mb-8">
        <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'earnings', label: 'Earnings', icon: TrendingUp },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'distribution', label: 'Distribution', icon: PieChart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Earnings</h3>
                  <div className="flex items-center space-x-2">
                    <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                    <span className={`text-sm font-medium ${trendColor}`}>{trendLabel}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {monthlyEarnings.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No earnings available for this period.
                    </div>
                  )}
                  {monthlyEarnings.map((earning) => (
                    <div key={earning.period} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{earning.period}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {earning.tracks ?? 0} tracks • {earning.artists ?? 0} artists
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(earning.totalEarnings)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(earning.status)}`}>
                          {getStatusIcon(earning.status)}
                          <span className="ml-1 capitalize">{normalizePaymentStatus(earning.status)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Station Airplay Breakdown</h3>

                <div className="space-y-4">
                  {stationBreakdown.slice(0, 5).map((entry, index) => (
                    <div key={`${entry.station}-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${stationColorPalette[index % stationColorPalette.length]}`}></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.station}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(entry.royalties)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {entry.percentage?.toFixed(1) ?? '0.0'}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {stationBreakdown.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No station data available.</p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Disputed Earnings</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(disputedEarnings)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Processing: {formatCurrency(processingEarnings)}</span>
                    <span>Scheduled: {formatCurrency(scheduledEarnings)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Tracks</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Most valuable catalogue performances for this period</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search tracks or artists"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <select
                    value={stationFilter}
                    onChange={(e) => setStationFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Stations</option>
                    {stationOptions.map((station) => (
                      <option key={station} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <button className="flex items-center space-x-1" onClick={() => handleSort('title')}>
                          <span>Track</span>
                          {getSortIcon('title')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <button className="flex items-center space-x-1" onClick={() => handleSort('artist')}>
                          <span>Artist</span>
                          {getSortIcon('artist')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Station
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <button className="flex items-center space-x-1" onClick={() => handleSort('airplay')}>
                          <span>Airplay</span>
                          {getSortIcon('airplay')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <button className="flex items-center space-x-1" onClick={() => handleSort('earnings')}>
                          <span>Earnings</span>
                          {getSortIcon('earnings')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredTopTracks.map((track, index) => (
                      <tr key={track.trackId} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{track.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Last activity: {track.lastActivity ? new Date(track.lastActivity).toLocaleString() : '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {track.artist || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {renderStationBadge(track.station, index)}
                        </td>
                        <td className="px-6 py-4">
                          {renderRegionBadge(track.region, index)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {formatNumber(track.airplay ?? 0)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(track.earnings ?? 0)}
                        </td>
                        <td className="px-6 py-4">
                          {track.trend === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : track.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <Activity className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredTopTracks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No matching tracks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'earnings' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Earnings History</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Total duration tracked: {formatNumber(summary?.totalDurationHours ?? 0)} hrs</span>
              </div>
            </div>

            <div className="space-y-4">
              {monthlyEarnings.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No historical earnings recorded yet.
                </div>
              )}
              {monthlyEarnings.map((earning) => (
                <div key={`history-${earning.period}`} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{earning.period}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {earning.tracks ?? 0} tracks • {earning.artists ?? 0} artists
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(earning.totalEarnings)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(earning.status)}`}>
                        {getStatusIcon(earning.status)}
                        <span className="ml-1 capitalize">{normalizePaymentStatus(earning.status)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(earning.platformBreakdown || {}).map(([station, amount], index) => (
                      <div key={`${earning.period}-${station}`} className="text-center">
                        <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${stationSoftPalette[index % stationSoftPalette.length]}`}>
                          <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{station}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Schedule</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Scheduled: {formatCurrency(totalScheduledAmount)} • Processing: {formatCurrency(totalProcessingAmount)} • Paid: {formatCurrency(totalPaidAmount)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPayments.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No payments match the selected filter.
                </div>
              )}
              {filteredPayments.map((payment) => (
                <div key={payment.paymentId} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{payment.artist}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {payment.tracks.length} track{payment.tracks.length === 1 ? '' : 's'} • {payment.station || 'Multiple Stations'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.dueDate
                            ? `Due: ${new Date(payment.dueDate).toLocaleDateString()}`
                            : payment.processedAt
                              ? `Processed: ${new Date(payment.processedAt).toLocaleDateString()}`
                              : 'No due date specified'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1 capitalize">{normalizePaymentStatus(payment.status)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Royalty Distribution</h3>

              <div className="space-y-4">
                {distributionSplits.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Distribution data is not available yet.
                  </div>
                )}
                {distributionSplits.map((split, index) => (
                  <div key={split.label} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${stationSoftPalette[index % stationSoftPalette.length]} rounded-lg flex items-center justify-center`}>
                        <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{split.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{split.description || 'Share of total royalties'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(split.amount)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{split.percentage?.toFixed(1) ?? '0.0'}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Distribution Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Auto-Payout Threshold</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Minimum amount for automatic payments</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(distributionSettings.autoPayoutThreshold ?? 0)}</p>
                    <button className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                      Edit
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Payment Frequency</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">How often payments are processed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">{distributionSettings.paymentFrequency || 'Monthly'}</p>
                    <button className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                      Edit
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Default Split</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Standard royalty split for new tracks</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">{distributionSettings.defaultSplitLabel || '—'}</p>
                    <button className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Settings className="w-4 h-4" />
                  <span>Manage Distribution Rules</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RoyaltiesPayments;
