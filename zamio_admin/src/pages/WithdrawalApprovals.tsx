import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Building
} from 'lucide-react';
import {
  getPendingWithdrawals,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getPlatformBalance,
  type WithdrawalRequest,
  type PlatformBalance
} from '../lib/withdrawalApi';

const WithdrawalApprovals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [platformBalance, setPlatformBalance] = useState<PlatformBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₵${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load withdrawals
      const withdrawalData = filter === 'pending'
        ? await getPendingWithdrawals()
        : await getAllWithdrawals({ limit: 50 });
      
      setWithdrawals(withdrawalData);

      // Load platform balance
      const balance = await getPlatformBalance();
      setPlatformBalance(balance);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    if (!confirm(`Approve withdrawal of ${formatCurrency(withdrawal.amount)} for ${withdrawal.requester_email}?`)) {
      return;
    }

    try {
      setProcessing(true);
      await approveWithdrawal(withdrawal.withdrawal_id);
      alert('Withdrawal approved and payment processed successfully!');
      loadData(); // Refresh
    } catch (err: any) {
      console.error('Failed to approve withdrawal:', err);
      alert(`Failed to approve: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await rejectWithdrawal(selectedWithdrawal.withdrawal_id, rejectionReason);
      alert('Withdrawal rejected successfully');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedWithdrawal(null);
      loadData(); // Refresh
    } catch (err: any) {
      console.error('Failed to reject withdrawal:', err);
      alert(`Failed to reject: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading withdrawal requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Withdrawal Approvals</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage royalty payout requests</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'pending' | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="pending">Pending Only</option>
              <option value="all">All Requests</option>
            </select>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Balance */}
      {platformBalance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(platformBalance.balance)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Balance</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(platformBalance.total_received)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Received</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <TrendingDown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(platformBalance.total_paid_out)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Paid Out</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Requests */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {filter === 'pending' ? 'Pending Requests' : 'All Requests'} ({withdrawals.length})
        </h2>

        {withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No withdrawal requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.withdrawal_id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    withdrawal.status === 'processed' ? 'bg-green-100' :
                    withdrawal.status === 'pending' ? 'bg-amber-100' :
                    withdrawal.status === 'approved' ? 'bg-blue-100' :
                    withdrawal.status === 'rejected' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {withdrawal.status === 'processed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {withdrawal.status === 'pending' && <Clock className="w-5 h-5 text-amber-600" />}
                    {withdrawal.status === 'approved' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    {withdrawal.status === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white">
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
                      <span className="flex items-center space-x-1">
                        {withdrawal.requester_type === 'artist' ? <Users className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                        <span>{withdrawal.requester_email}</span>
                        <span className="text-gray-400 dark:text-gray-500">•</span>
                        <span>{withdrawal.requester_type}</span>
                      </span>
                    </div>
                    {withdrawal.artist_name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Artist: {withdrawal.artist_name}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Requested: {new Date(withdrawal.requested_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {withdrawal.status === 'pending' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleApprove(withdrawal)}
                      disabled={processing}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openRejectModal(withdrawal)}
                      disabled={processing}
                      className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reject Withdrawal</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedWithdrawal(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Rejecting withdrawal of <span className="font-bold">{formatCurrency(selectedWithdrawal.amount)}</span> for <span className="font-bold">{selectedWithdrawal.requester_email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedWithdrawal(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Rejecting...' : 'Reject Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalApprovals;
