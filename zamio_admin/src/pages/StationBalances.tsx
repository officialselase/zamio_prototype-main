import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  Radio,
  RefreshCw,
  AlertCircle,
  Plus,
  Activity,
  Clock,
  CheckCircle
} from 'lucide-react';
import { getStationBalance, addStationFunds, type StationBalance } from '../lib/withdrawalApi';
import authApi from '../lib/api';
import { useAuth } from '../lib/auth';

interface Station {
  id: number;
  name: string;
}

const StationBalances: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [balances, setBalances] = useState<Map<number, StationBalance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₵${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadStations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stations list from API using authApi
      const { data } = await authApi.get('/api/stations/get-all-stations/');
      
      const stationsList = data.data?.stations || data.stations || data.results || data || [];
      setStations(stationsList);

      // Load balances for each station
      const balanceMap = new Map<number, StationBalance>();
      for (const station of stationsList) {
        try {
          const balance = await getStationBalance(station.id);
          balanceMap.set(station.id, balance);
        } catch (err) {
          console.error(`Failed to load balance for station ${station.id}:`, err);
        }
      }
      setBalances(balanceMap);
    } catch (err: any) {
      console.error('Failed to load stations:', err);
      setError(err.message || 'Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load stations after auth is initialized and user is authenticated
    if (isInitialized && isAuthenticated) {
      loadStations();
    }
  }, [isInitialized, isAuthenticated]);

  const handleAddFunds = async () => {
    if (!selectedStation || !fundAmount) {
      alert('Please enter an amount');
      return;
    }

    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setProcessing(true);
      await addStationFunds(selectedStation, amount, fundDescription);
      alert(`Successfully added ${formatCurrency(amount)} to station account`);

      // Reload balance for this station
      const balance = await getStationBalance(selectedStation);
      setBalances(prev => new Map(prev).set(selectedStation, balance));

      // Reset form
      setShowAddFundsModal(false);
      setSelectedStation(null);
      setFundAmount('');
      setFundDescription('');
    } catch (err: any) {
      console.error('Failed to add funds:', err);
      alert(`Failed to add funds: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openAddFundsModal = (stationId: number) => {
    setSelectedStation(stationId);
    setShowAddFundsModal(true);
  };

  const getTotalBalance = () => {
    let total = 0;
    balances.forEach(balance => {
      total += parseFloat(balance.balance);
    });
    return total;
  };

  const getTotalSpent = () => {
    let total = 0;
    balances.forEach(balance => {
      total += parseFloat(balance.total_spent);
    });
    return total;
  };

  const getTotalPlays = () => {
    let total = 0;
    balances.forEach(balance => {
      total += balance.total_plays;
    });
    return total;
  };

  // Show loading while auth is initializing or data is loading
  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading station balances...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Please log in to view station balances</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-400">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
          <button
            onClick={loadStations}
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Station Balances</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage station account balances and funding</p>
              </div>
            </div>
          </div>
          <button
            onClick={loadStations}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Radio className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Stations</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(getTotalBalance())}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Balance</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(getTotalSpent())}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Spent</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {getTotalPlays().toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Plays</div>
            </div>
          </div>
        </div>
      </div>

      {/* Station List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Station Accounts</h2>

        {stations.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No stations found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stations.map((station) => {
              const balance = balances.get(station.id);
              return (
                <div
                  key={station.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white">{station.name}</div>
                      {balance ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                          <div>Account ID: {balance.account_id}</div>
                          <div className="flex items-center space-x-4">
                            <span>Spent: {formatCurrency(balance.total_spent)}</span>
                            <span>•</span>
                            <span>Plays: {balance.total_plays.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">Loading balance...</div>
                      )}
                    </div>
                  </div>

                  {balance && (
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          parseFloat(balance.balance) < 100 ? 'text-red-600 dark:text-red-400' :
                          parseFloat(balance.balance) < 1000 ? 'text-amber-600 dark:text-amber-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {formatCurrency(balance.balance)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {balance.allow_negative_balance ? (
                            <span>Credit: {formatCurrency(balance.credit_limit)}</span>
                          ) : (
                            <span>No credit</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openAddFundsModal(station.id)}
                        className="flex items-center space-x-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Funds</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {showAddFundsModal && selectedStation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Funds to Station</h3>
              <button
                onClick={() => {
                  setShowAddFundsModal(false);
                  setSelectedStation(null);
                  setFundAmount('');
                  setFundDescription('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Station: <span className="font-bold">{stations.find(s => s.id === selectedStation)?.name}</span>
                </p>
                {balances.get(selectedStation) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current Balance: <span className="font-bold">{formatCurrency(balances.get(selectedStation)!.balance)}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (GHS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₵</span>
                  <input
                    type="number"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={fundDescription}
                  onChange={(e) => setFundDescription(e.target.value)}
                  placeholder="e.g., Monthly top-up, Initial funding..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddFundsModal(false);
                  setSelectedStation(null);
                  setFundAmount('');
                  setFundDescription('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFunds}
                disabled={processing || !fundAmount}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Adding...' : 'Add Funds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationBalances;
