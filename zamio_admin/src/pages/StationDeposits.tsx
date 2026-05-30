import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Radio,
  Smartphone,
  Building,
  CreditCard,
  Banknote
} from 'lucide-react';
import authApi from '../lib/api';

interface DepositRequest {
  id: number;
  station: number;
  station_name: string;
  amount: string;
  currency: string;
  payment_method: string;
  reference: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at: string | null;
  processed_by: number | null;
  rejection_reason: string | null;
}

const StationDeposits: React.FC = () => {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₵${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadDeposits = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = filter === 'pending' ? { status: 'pending' } : {};
      const { data } = await authApi.get('/api/royalties/stations/deposit-requests/', { params });
      setDeposits(data.deposits || []);
    } catch (err: any) {
      console.error('Failed to load deposits:', err);
      setError(err.message || 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeposits();
  }, [filter]);

  const handleApprove = async (deposit: DepositRequest) => {
    if (!confirm(`Approve deposit of ${formatCurrency(deposit.amount)} for ${deposit.station_name}?`)) {
      return;
    }

    try {
      setProcessing(true);
      await authApi.post(`/api/royalties/stations/deposits/${deposit.id}/approve/`);
      alert('Deposit approved and funds added to station account!');
      loadDeposits();
    } catch (err: any) {
      console.error('Failed to approve deposit:', err);
      alert(`Failed to approve: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await authApi.post(`/api/royalties/stations/deposits/${selectedDeposit.id}/reject/`, {
        rejection_reason: rejectionReason
      });
      alert('Deposit rejected successfully');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedDeposit(null);
      loadDeposits();
    } catch (err: any) {
      console.error('Failed to reject deposit:', err);
      alert(`Failed to reject: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (deposit: DepositRequest) => {
    setSelectedDeposit(deposit);
    setShowRejectModal(true);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mtn_momo':
        return <Smartphone className="w-5 h-5 text-indigo-600" />;
      case 'bank_transfer':
        return <Building className="w-5 h-5 text-indigo-600" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-indigo-600" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-indigo-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'mtn_momo':
        return 'MTN Mobile Money';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'card':
        return 'Credit/Debit Card';
      case 'cash':
        return 'Cash';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading deposit requests...</p>
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
            onClick={loadDeposits}
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
                <Radio className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Station Deposit Requests</h1>
                <p className="text-gray-600 dark:text-gray-400">Approve or reject station funding requests</p>
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
              onClick={loadDeposits}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deposit Requests */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {filter === 'pending' ? 'Pending Requests' : 'All Requests'} ({deposits.length})
        </h2>

        {deposits.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No deposit requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    deposit.status === 'completed' ? 'bg-green-100' :
                    deposit.status === 'pending' ? 'bg-amber-100' :
                    deposit.status === 'rejected' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {deposit.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {deposit.status === 'pending' && <Clock className="w-5 h-5 text-amber-600" />}
                    {deposit.status === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(deposit.amount)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        deposit.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        deposit.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        deposit.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <Radio className="w-4 h-4" />
                        <span>{deposit.station_name}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2">
                      {getPaymentMethodIcon(deposit.payment_method)}
                      <span>{getPaymentMethodLabel(deposit.payment_method)}</span>
                      {deposit.reference && (
                        <>
                          <span>•</span>
                          <span>Ref: {deposit.reference}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Requested: {new Date(deposit.requested_at).toLocaleString()}
                    </div>
                    {deposit.notes && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Notes: {deposit.notes}
                      </div>
                    )}
                  </div>
                </div>

                {deposit.status === 'pending' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleApprove(deposit)}
                      disabled={processing}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openRejectModal(deposit)}
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
      {showRejectModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reject Deposit</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedDeposit(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Rejecting deposit of <span className="font-bold">{formatCurrency(selectedDeposit.amount)}</span> from <span className="font-bold">{selectedDeposit.station_name}</span>
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
                  setSelectedDeposit(null);
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
                {processing ? 'Rejecting...' : 'Reject Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationDeposits;
