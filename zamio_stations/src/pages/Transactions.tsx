import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  Activity,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  CreditCard,
  Smartphone,
  Building,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Download
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getStationBalance,
  requestDeposit,
  getDepositRequests,
  getStationTransactions,
  type StationBalance,
  type DepositRequestRecord,
  type Transaction
} from '../lib/accountApi';

const Transactions: React.FC = () => {
  const { user } = useAuth();
  
  const stationId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = user['station_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [balance, setBalance] = useState<StationBalance | null>(null);
  const [deposits, setDeposits] = useState<DepositRequestRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mtn_momo' | 'bank_transfer' | 'card' | 'cash'>('mtn_momo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'play_charge'>('all');

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₵${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadData = async () => {
    if (!stationId) {
      setError('Station ID not found. Please ensure you are logged in as a station user.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load balance
      const balanceData = await getStationBalance(stationId);
      setBalance(balanceData);

      // Load deposit requests
      const depositsData = await getDepositRequests({ station_id: stationId });
      setDeposits(depositsData);

      // Load transactions
      const transactionsData = await getStationTransactions({ 
        station_id: stationId,
        limit: 50 
      });
      setTransactions(transactionsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [stationId]);

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
        return <Smartphone className="w-4 h-4" />;
      case 'bank_transfer':
        return <Building className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="w-5 h-5 text-green-600" />;
      case 'play_charge':
        return <ArrowUpCircle className="w-5 h-5 text-red-600" />;
      case 'refund':
        return <ArrowDownCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'play_charge':
        return 'Play Charge';
      case 'refund':
        return 'Refund';
      case 'adjustment':
        return 'Adjustment';
      default:
        return type;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    return tx.transaction_type === filterType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading transactions...</p>
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
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account & Transactions</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your balance and view transaction history</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadData}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${
                parseFloat(balance.balance) < 100 ? 'bg-red-100 dark:bg-red-900/30' :
                parseFloat(balance.balance) < 1000 ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-green-100 dark:bg-green-900/30'
              }`}>
                <DollarSign className={`w-6 h-6 ${
                  parseFloat(balance.balance) < 100 ? 'text-red-600 dark:text-red-400' :
                  parseFloat(balance.balance) < 1000 ? 'text-amber-600 dark:text-amber-400' :
                  'text-green-600 dark:text-green-400'
                }`} />
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  parseFloat(balance.balance) < 100 ? 'text-red-600 dark:text-red-400' :
                  parseFloat(balance.balance) < 1000 ? 'text-amber-600 dark:text-amber-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {formatCurrency(balance.balance)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Balance</div>
              </div>
            </div>
            {parseFloat(balance.balance) < 100 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                ⚠️ Low balance! Add funds to continue.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(balance.total_spent)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Spent</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {balance.total_plays.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Plays</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {deposits.filter(d => d.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Deposits</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Deposit Requests */}
      {deposits.filter(d => d.status === 'pending').length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-300">Pending Deposit Requests</h2>
          </div>
          <div className="space-y-3">
            {deposits.filter(d => d.status === 'pending').map((deposit) => (
              <div key={deposit.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getPaymentMethodIcon(deposit.payment_method)}
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(deposit.amount)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getPaymentMethodLabel(deposit.payment_method)}
                      {deposit.reference && ` • Ref: ${deposit.reference}`}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Requested: {new Date(deposit.requested_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
          <div className="flex items-center space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Transactions</option>
              <option value="deposit">Deposits Only</option>
              <option value="play_charge">Play Charges Only</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {filterType === 'all' 
                ? 'Your transaction history will appear here'
                : `No ${filterType === 'deposit' ? 'deposits' : 'play charges'} found`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.transaction_id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    transaction.transaction_type === 'deposit' ? 'bg-green-100 dark:bg-green-900/30' :
                    transaction.transaction_type === 'play_charge' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {getTransactionLabel(transaction.transaction_type)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    transaction.transaction_type === 'deposit' ? 'text-green-600 dark:text-green-400' :
                    transaction.transaction_type === 'play_charge' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-900 dark:text-white'
                  }`}>
                    {transaction.transaction_type === 'deposit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    ID: {transaction.transaction_id}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Funds to Account</h3>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositAmount('');
                  setReference('');
                  setNotes('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (GHS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₵</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g., Transaction ID, Receipt number..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any additional information..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
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
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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

export default Transactions;
