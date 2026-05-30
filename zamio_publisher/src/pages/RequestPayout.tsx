import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Wallet,
  Music,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import {
  getSignedArtists,
  requestArtistPayout,
  getPublisherWithdrawals,
  type Artist,
  type WithdrawalRequest
} from '../lib/payoutApi';

const RequestPayout: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₵${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load signed artists
      const artistsData = await getSignedArtists();
      setArtists(artistsData);

      // Load withdrawal history
      const withdrawalsData = await getPublisherWithdrawals({ limit: 20 });
      setWithdrawals(withdrawalsData);
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

  const handleSubmitRequest = async () => {
    if (!selectedArtist) {
      alert('Please select an artist');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const response = await requestArtistPayout({
        artist_id: selectedArtist,
        amount: amountNum,
        currency: 'GHS',
        notes: notes
      });

      alert(`Payout request submitted successfully!\n\nRequest ID: ${response.withdrawal_id}\nStatus: ${response.status}\n\nThe request will be reviewed by an administrator.`);

      // Reset form
      setSelectedArtist(null);
      setAmount('');
      setNotes('');
      setShowRequestModal(false);

      // Reload data
      loadData();
    } catch (err: any) {
      console.error('Failed to submit request:', err);
      alert(`Failed to submit request: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedArtistName = () => {
    const artist = artists.find(a => a.id === selectedArtist);
    return artist?.stage_name || 'Select Artist';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
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
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Request Artist Payout</h1>
                <p className="text-gray-600">Request withdrawals for your signed artists</p>
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
              onClick={() => setShowRequestModal(true)}
              disabled={artists.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-5 h-5" />
              <span>Request Payout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signed Artists Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{artists.length}</div>
              <div className="text-sm text-gray-600">Signed Artists</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {withdrawals.filter(w => w.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending Requests</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {withdrawals.filter(w => w.status === 'processed').length}
              </div>
              <div className="text-sm text-gray-600">Processed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Signed Artists List */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Your Signed Artists</h2>
        
        {artists.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No signed artists yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.map((artist) => (
              <div
                key={artist.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Music className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{artist.stage_name}</div>
                    <div className="text-xs text-gray-500">Artist ID: {artist.id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Withdrawal History</h2>

        {withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No withdrawal requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.withdrawal_id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center space-x-4">
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
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        withdrawal.status === 'processed' ? 'bg-green-100 text-green-800' :
                        withdrawal.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Artist: {withdrawal.artist_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Requested: {new Date(withdrawal.requested_at).toLocaleDateString()}
                    </div>
                    {withdrawal.rejection_reason && (
                      <div className="text-xs text-red-600 mt-1">
                        Reason: {withdrawal.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Request Artist Payout</h3>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedArtist(null);
                  setAmount('');
                  setNotes('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Artist Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Artist *
                </label>
                <div className="relative">
                  <select
                    value={selectedArtist || ''}
                    onChange={(e) => setSelectedArtist(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">Select an artist...</option>
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.stage_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (GHS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₵</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                  placeholder="Add any notes for this payout request..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Publisher Withdrawal</p>
                    <p>You are requesting a payout on behalf of your signed artist. The funds will be transferred to your publisher account for distribution.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedArtist(null);
                  setAmount('');
                  setNotes('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting || !selectedArtist || !amount}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default RequestPayout;
