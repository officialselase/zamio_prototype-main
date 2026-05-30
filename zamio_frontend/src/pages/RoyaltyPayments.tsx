import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  Building,
  FileText,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings,
  Plus,
  Wallet,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  Award,
  Crown,
  Star,
  ChevronDown,
  MoreVertical,
  Receipt,
  Calculator,
  PiggyBank,
  Music
} from 'lucide-react';
import { fetchArtistPayments, requestPayout, getWithdrawalHistory, type PaymentsData, type WithdrawalResponse } from '../lib/paymentsApi';
import { getArtistId } from '../lib/auth';

// Default empty payment data
const defaultPaymentData: PaymentsData = {
  time_range: '12months',
  overview: {
    total_earnings: 0,
    pending_payments: 0,
    paid_this_month: 0,
    total_transactions: 0,
    average_payment: 0,
    growth_rate: 0,
    next_payout_date: null,
    next_payout_amount: 0
  },
  payment_status: [
  ],
  recent_payments: [],
  monthly_trends: [],
  top_earning_tracks: [],
  payment_methods: []
};

const RoyaltyPayments: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | '3months' | '12months'>('12months');
  const [selectedView, setSelectedView] = useState('overview');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentsData>(defaultPaymentData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState({
    amount: '0',
    paymentMethod: 'bank_transfer',
    notes: ''
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₵0.00';
    return `₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch payments data
  const loadPayments = useCallback(async (showRefreshing = false) => {
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

      const data = await fetchArtistPayments({
        artist_id: artistId,
        time_range: selectedPeriod,
      });

      setPaymentData(data);
      // Update payout form with pending amount
      setPayoutFormData(prev => ({
        ...prev,
        amount: data.overview.pending_payments.toString()
      }));
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Failed to load payments data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  // Load withdrawal history
  const loadWithdrawalHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const history = await getWithdrawalHistory({ limit: 20 });
      setWithdrawalHistory(history);
    } catch (err) {
      console.error('Failed to load withdrawal history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load payments on mount and when period changes
  useEffect(() => {
    loadPayments();
    loadWithdrawalHistory();
  }, [loadPayments, loadWithdrawalHistory]);

  // Handle refresh
  const handleRefresh = () => {
    loadPayments(true);
    loadWithdrawalHistory();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <>
      {/* Enhanced Page Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <PiggyBank className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Royalty Payments</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Track your earnings and manage royalty distributions
                  </p>
                </div>
              </div>

              {/* Quick Stats in Header */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(paymentData.overview.total_earnings)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Earnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(paymentData.overview.pending_payments)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {paymentData.overview.total_transactions}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPayoutModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Wallet className="w-4 h-4" />
                <span>Request Payout</span>
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Periods</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <button className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Download className="w-4 h-4" />
                <span>Export Report</span>
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
            <p className="text-gray-600 dark:text-gray-400">Loading payments data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Error Loading Payments</h3>
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
        {/* Payment Status Cards - Large Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(paymentData.payment_status || []).map((status) => {
            const statusConfig = {
              paid: { icon: CheckCircle, color: 'from-emerald-500 to-green-500', bgColor: 'from-emerald-50 to-green-50' },
              pending: { icon: Clock, color: 'from-amber-500 to-orange-500', bgColor: 'from-amber-50 to-orange-50' },
              failed: { icon: XCircle, color: 'from-red-500 to-pink-500', bgColor: 'from-red-50 to-pink-50' }
            }[status.status] || { icon: AlertCircle, color: 'from-gray-500 to-gray-500', bgColor: 'from-gray-50 to-gray-50' };
            const StatusIcon = statusConfig.icon;
            return (
            <div key={status.status} className={`relative bg-gradient-to-br ${statusConfig.bgColor} dark:bg-gradient-to-br dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/90 rounded-2xl p-8 border border-gray-200/50 dark:border-slate-600/60 shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer`}>
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 bg-gradient-to-br ${statusConfig.color} rounded-xl shadow-lg`}>
                  <StatusIcon className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {status.count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {status.percentage}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {status.status}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {status.description}
                </p>
                <div className="pt-2">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(status.amount)}
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                <StatusIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
              </div>
            </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Payment History Cards */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Payments</h2>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200">
                    <Search className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(paymentData.recent_payments || []).map((payment) => (
                  <div key={payment.id} className="bg-gray-50/80 dark:bg-slate-800/60 rounded-xl p-6 border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-100/50 dark:hover:bg-slate-800/80 hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 bg-gradient-to-br ${payment.status === 'paid' ? 'from-green-500 to-emerald-500' : payment.status === 'pending' ? 'from-amber-500 to-orange-500' : 'from-red-500 to-pink-500'} rounded-xl shadow-lg`}>
                          <Receipt className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {payment.description}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(payment.date)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Music className="w-4 h-4" />
                              <span>{payment.tracks} tracks</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Building className="w-4 h-4" />
                              <span>{payment.source}</span>
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Reference: {payment.reference} • Period: {payment.period}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors duration-200">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors duration-200">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Revenue Breakdown & Quick Actions */}
          <div className="space-y-6">
            {/* Revenue Sources */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Payment Methods</h3>
              <div className="space-y-4">
                {(paymentData.payment_methods || []).map((method, index) => (
                  <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-800/80 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{method.method}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(method.total_amount)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{method.count} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Earning Tracks */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Earning Tracks</h3>
              <div className="space-y-3">
                {(paymentData.top_earning_tracks || []).map((track, index) => (
                  <div key={track.title} className="flex items-center space-x-3 p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-800/80 transition-colors duration-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {track.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{track.plays.toLocaleString()} plays</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(track.trend)}
                          <span>{Math.abs(track.trend)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 dark:text-green-400 text-sm">
                        {formatCurrency(track.earnings)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Calculator className="w-5 h-5" />
                  <span>Calculate Royalties</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                  <Settings className="w-5 h-5" />
                  <span>Payment Settings</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                  <FileText className="w-5 h-5" />
                  <span>View Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Next Payout Alert */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Next Payout Scheduled
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                Your next payment of <span className="font-bold">{formatCurrency(paymentData.overview.next_payout_amount)}</span> is scheduled for <span className="font-bold">{paymentData.overview.next_payout_date ? formatDate(paymentData.overview.next_payout_date) : 'TBD'}</span>
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl">
              View Details
            </button>
          </div>
        </div>

        {/* Monthly Trends Chart Placeholder */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Trends</h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center bg-gray-50/50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Monthly Payment Trends</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Interactive chart showing payment trends over time
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Withdrawal History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Withdrawal History</h2>
          <button
            onClick={loadWithdrawalHistory}
            disabled={loadingHistory}
            className="flex items-center space-x-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
        ) : withdrawalHistory.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No withdrawal requests yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Click "Request Payout" to make your first withdrawal request
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawalHistory.map((withdrawal) => (
              <div
                key={withdrawal.withdrawal_id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    withdrawal.status === 'processed' ? 'bg-green-100 dark:bg-green-900/30' :
                    withdrawal.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    withdrawal.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    withdrawal.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-gray-100 dark:bg-gray-900/30'
                  }`}>
                    {withdrawal.status === 'processed' && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    {withdrawal.status === 'pending' && <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                    {withdrawal.status === 'approved' && <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    {withdrawal.status === 'rejected' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                    {withdrawal.status === 'cancelled' && <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(withdrawal.amount)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        withdrawal.status === 'processed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        withdrawal.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Requested: {new Date(withdrawal.requested_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {withdrawal.processed_at && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Processed: {new Date(withdrawal.processed_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                    {withdrawal.rejection_reason && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Reason: {withdrawal.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    ID: {withdrawal.withdrawal_id.substring(0, 8)}...
                  </div>
                  {withdrawal.processed_by_email && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      By: {withdrawal.processed_by_email}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request Payout</h2>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Available Balance */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(paymentData.overview.pending_payments)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payout Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₵</span>
                  <input
                    type="number"
                    value={payoutFormData.amount}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1"
                    max={paymentData.overview.pending_payments}
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum: {formatCurrency(paymentData.overview.pending_payments)}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={payoutFormData.paymentMethod}
                  onChange={(e) => setPayoutFormData({ ...payoutFormData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={payoutFormData.notes}
                  onChange={(e) => setPayoutFormData({ ...payoutFormData, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any notes for this payout request..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Processing Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Processing Information</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Payout requests are typically processed within 3-5 business days. You'll receive a confirmation email once processed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const amount = parseFloat(payoutFormData.amount);
                      
                      // Validate amount
                      if (isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid amount');
                        return;
                      }
                      
                      if (amount > paymentData.overview.pending_payments) {
                        alert(`Amount cannot exceed available balance of ${formatCurrency(paymentData.overview.pending_payments)}`);
                        return;
                      }
                      
                      // Make API call to request payout
                      const response = await requestPayout({
                        amount: amount,
                        currency: 'GHS',
                        notes: payoutFormData.notes
                      });
                      
                      // Success - show confirmation
                      alert(`Payout request for ${formatCurrency(amount)} submitted successfully!\n\nRequest ID: ${response.withdrawal_id}\nStatus: ${response.status}\n\nYou'll receive a confirmation email once processed.`);
                      
                      // Reset form
                      setPayoutFormData({
                        amount: paymentData.overview.pending_payments.toString(),
                        paymentMethod: 'bank_transfer',
                        notes: ''
                      });
                      
                      // Close modal
                      setIsPayoutModalOpen(false);
                      
                      // Reload payments data and withdrawal history
                      loadWithdrawalHistory();
                      loadPayments();
                      
                    } catch (err: any) {
                      console.error('Failed to request payout:', err);
                      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit payout request';
                      alert(`Error: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Request Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoyaltyPayments;
