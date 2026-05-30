import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Filter,
  Search,
  Calendar,
  Building,
  Music,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Check,
  X,
  AlertCircle,
  Wallet,
  PiggyBank,
  Receipt
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import authApi, { type ApiEnvelope } from '../lib/api';

// Types
interface SubDistributionSummary {
  total_amount: number;
  publisher_fees: number;
  artist_payments: number;
  total_distributions: number;
  paid_count: number;
  pending_count: number;
  currency: string;
  average_fee_percentage: number;
}

interface StatusBreakdown {
  [key: string]: {
    count: number;
    amount: number;
    label: string;
  };
}

interface ArtistBreakdown {
  artist_id: string;
  artist_name: string;
  artist_email: string;
  total_distributions: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  currency: string;
}

interface SubDistribution {
  sub_distribution_id: string;
  parent_distribution_id: string;
  artist_id: string;
  artist_name: string;
  artist_email: string;
  total_amount: number;
  publisher_fee_percentage: number;
  publisher_fee_amount: number;
  artist_net_amount: number;
  currency: string;
  status: string;
  calculated_at: string;
  approved_at: string | null;
  paid_to_artist_at: string | null;
  payment_reference: string | null;
  track_title: string | null;
  station_name: string | null;
  agreement_reference: string | null;
}

interface SubDistributionsData {
  summary: SubDistributionSummary;
  status_breakdown: StatusBreakdown;
  artist_breakdown: ArtistBreakdown[];
  recent_distributions: SubDistribution[];
}

const ArtistPayments: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<SubDistributionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const loadSubDistributions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedStatus) params.status = selectedStatus;

      const response = await authApi.get<ApiEnvelope<SubDistributionsData>>(
        '/api/publishers/sub-distributions/',
        { params }
      );

      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load sub-distributions:', err);
      setError('Failed to load artist payments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubDistributions();
  }, [selectedStatus]);

  const handleApprove = async (subDistId: string) => {
    if (!confirm('Approve this payment for processing?')) return;

    try {
      setProcessingId(subDistId);
      await authApi.post('/api/publishers/sub-distributions/approve/', {
        sub_distribution_id: subDistId
      });
      
      // Reload data
      await loadSubDistributions();
      alert('Payment approved successfully');
    } catch (err) {
      console.error('Failed to approve payment:', err);
      alert('Failed to approve payment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaid = async (subDistId: string) => {
    const reference = prompt('Enter payment reference:');
    if (!reference) return;

    try {
      setProcessingId(subDistId);
      await authApi.post('/api/publishers/sub-distributions/mark-paid/', {
        sub_distribution_id: subDistId,
        payment_reference: reference,
        payment_method: 'Bank Transfer'
      });
      
      // Reload data
      await loadSubDistributions();
      alert('Payment marked as paid successfully');
    } catch (err) {
      console.error('Failed to mark payment as paid:', err);
      alert('Failed to mark payment as paid');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
      case 'calculated':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading artist payments...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error || 'Failed to load data'}</p>
            </div>
          </div>
          <button
            onClick={loadSubDistributions}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Artist Payments</h1>
                <p className="text-gray-600 dark:text-gray-300">Track and manage payments to your artists</p>
              </div>
            </div>
          </div>
          <button
            onClick={loadSubDistributions}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.summary.total_amount)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Received</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <PiggyBank className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.summary.publisher_fees)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Publisher Fees ({data.summary.average_fee_percentage}%)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.summary.artist_payments)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Paid to Artists</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.summary.pending_count}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</div>
        </div>
      </div>

      {/* Artist Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Artist Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Artist</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Amount</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Paid</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pending</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Distributions</th>
              </tr>
            </thead>
            <tbody>
              {data.artist_breakdown.map((artist) => (
                <tr key={artist.artist_id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{artist.artist_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{artist.artist_email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(artist.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                    {formatCurrency(artist.paid_amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                    {formatCurrency(artist.pending_amount)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-900 dark:text-white">
                    {artist.total_distributions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Distributions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Distributions</h2>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="calculated">Calculated</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="space-y-4">
          {data.recent_distributions.map((dist) => (
            <div key={dist.sub_distribution_id} className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{dist.artist_name}</div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dist.status)}`}>
                      {dist.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Track:</span> {dist.track_title || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Station:</span> {dist.station_name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> {formatCurrency(dist.total_amount)}
                    </div>
                    <div>
                      <span className="font-medium">Publisher Fee ({dist.publisher_fee_percentage}%):</span> {formatCurrency(dist.publisher_fee_amount)}
                    </div>
                    <div>
                      <span className="font-medium">Artist Net:</span> <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(dist.artist_net_amount)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(dist.calculated_at)}
                    </div>
                  </div>
                  {dist.payment_reference && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Payment Ref: {dist.payment_reference}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {dist.status === 'calculated' || dist.status === 'pending' ? (
                    <button
                      onClick={() => handleApprove(dist.sub_distribution_id)}
                      disabled={processingId === dist.sub_distribution_id}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  ) : dist.status === 'approved' ? (
                    <button
                      onClick={() => handleMarkPaid(dist.sub_distribution_id)}
                      disabled={processingId === dist.sub_distribution_id}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Paid</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtistPayments;
