import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  CreditCard,
  Smartphone,
  Building,
  Banknote
} from 'lucide-react';
import {
  getStationBalance,
  requestDeposit,
  getDepositRequests,
  type StationBalance,
  type DepositRequestRecord
} from '../lib/accountApi';

const AccountBalance: React.FC = () => {
  const [balance, setBalance] = useState<StationBalance | null>(null);
  const [deposits, setDeposits] = useState<DepositRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mtn_momo' | 'bank_transfer' | 'card' | 'cash'>('mtn_momo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get station ID from auth/context
  const stationId = 1; // TODO: Get from auth context

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₵${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load balance
      const balanceData = await getStationBalance(stationId);
      setBalance(balanceData);

      // Load deposit requests
      const depositsData = await getDepositRequests({ station_id: stationId });
      setDeposits(depositsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      await requestDeposit(stationId, {
        amount,
        payment_method: paymentMethod,
        reference,
        notes
      });

      alert('Deposit request submitted successfully!\n\nYour request will be processed once payment is verified.');

      // Reset form
      setShowDepositModal(false);
      setDepositAmount('');
      setReference('');
      setNotes('');

      // Reload data
      loadData();
    } catch (err: any) {
      console.error('Failed to submit deposit:', err);
      alert(`Failed to submit deposit: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mtn_momo':
        return <Smartphone className="w-5 h-5" />;
      case 'bank_transfer':
        return <Building className="w-5 h-5" />;
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
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
          <p className="text-gray-600">Loading account balance...</p>
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
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-b border-gray-200 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Balance</h1>
                <p className="text-gray-600">Manage your station account and deposits</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadData}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Funds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${
                parseFloat(balance.balance) < 100 ? 'bg-red-100' :
                parseFloat(balance.balance) < 1000 ? 'bg-amber-100' :
                'bg-green-100'
              }`}>
                <DollarSign className={`w-6 h-6 ${
                  parseFloat(balance.balance) < 100 ? 'text-red-600' :
                  parseFloat(balance.balance) < 1000 ? 'text-amber-600' :
                  'text-green-600'
                }`} />
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  parseFloat(balance.balance) < 100 ? 'text-red-600' :
                  parseFloat(balance.balance) < 1000 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {formatCurrency(balance.balance)}
                </div>
                <div className="text-sm text-gray-600">Current Balance</div>
              </div>
            </div>
            {parseFloat(balance.balance) < 100 && (
              <div className="text-xs text-red-600 mt-2">
                ⚠️ Low balance! Add funds to continue playing tracks.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(balance.total_spent)}
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {balance.total_plays.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Plays</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Requests */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Deposit Requests</h2>

        {deposits.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No deposit requests yet</p>
            <p className="text-sm text-gray-500 mt-2">Click "Add Funds" to make your first deposit</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center space-x-4">
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
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">
                        {formatCurrency(deposit.amount)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        deposit.status === 'completed' ? 'bg-green-100 text-green-800' :
                        deposit.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        deposit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1 flex items-center space-x-2">
                      {getPaymentMethodIcon(deposit.payment_method)}
                      <span>{getPaymentMethodLabel(deposit.payment_method)}</span>
                      {deposit.reference && (
                        <>
                          <span>•</span>
                          <span>Ref: {deposit.reference}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Requested: {new Date(deposit.requested_at).toLocaleDateString()}
                    </div>
                    {deposit.rejection_reason && (
                      <div className="text-xs text-red-600 mt-1">
                        Reason: {deposit.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Funds to Account</h3>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositAmount('');
                  setReference('');
                  setNotes('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (GHS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₵</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g., Transaction ID, Receipt number..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any additional information..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Deposit Process</p>
                    <p>Your deposit request will be reviewed and processed once payment is verified. This usually takes a few minutes to a few hours depending on the payment method.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositAmount('');
                  setReference('');
                  setNotes('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDeposit}
                disabled={submitting || !depositAmount}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountBalance;
