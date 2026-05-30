import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  RefreshCw,
  Settings,
  FileText,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  Calculator,
  Globe,
  Banknote,
  Wallet,
  Smartphone,
  Building,
  Shield,
  Receipt,
  FileCheck,
  AlertTriangle,
  Info
} from 'lucide-react';

// Mock payment data for processing - Updated for Radio/TV Broadcast
const mockPendingPayments = [
  {
    id: 1,
    artist: 'Sarah Johnson',
    artistId: 1,
    amount: 1250.00,
    currency: 'USD',
    tracks: ['Midnight Dreams', 'City Lights'],
    station: 'Multiple Ghanaian Stations',
    region: 'Ghana',
    period: 'October 2024',
    status: 'pending',
    dueDate: '2024-11-15',
    paymentMethod: 'bank_transfer',
    bankDetails: {
      accountName: 'Sarah Johnson',
      accountNumber: '****1234',
      routingNumber: '****5678',
      bankName: 'Ghana Commercial Bank'
    },
    taxInfo: {
      tin: '***-**-1234',
      w9Form: 'verified'
    }
  },
  {
    id: 2,
    artist: 'Michael Kwame',
    artistId: 2,
    amount: 890.00,
    currency: 'USD',
    tracks: ['Afro Vibes Vol. 2'],
    station: 'BBC Africa',
    region: 'International',
    period: 'October 2024',
    status: 'pending',
    dueDate: '2024-11-10',
    paymentMethod: 'paypal',
    paypalEmail: 'michael.kwame@email.com',
    taxInfo: {
      tin: '***-**-5678',
      w9Form: 'verified'
    }
  },
  {
    id: 3,
    artist: 'Amara Okafor',
    artistId: 3,
    amount: 650.00,
    currency: 'USD',
    tracks: ['Soul Connection'],
    station: 'Regional West African Stations',
    region: 'West Africa',
    period: 'October 2024',
    status: 'pending',
    dueDate: '2024-11-12',
    paymentMethod: 'bank_transfer',
    bankDetails: {
      accountName: 'Amara Okafor',
      accountNumber: '****9876',
      routingNumber: '****4321',
      bankName: 'Ecobank Nigeria'
    },
    taxInfo: {
      tin: '***-**-9012',
      w9Form: 'pending'
    }
  },
  {
    id: 4,
    artist: 'Kofi Mensah',
    artistId: 4,
    amount: 420.00,
    currency: 'USD',
    tracks: ['Accra Nights'],
    station: 'Joy FM & Citi FM',
    region: 'Ghana',
    period: 'October 2024',
    status: 'pending',
    dueDate: '2024-11-08',
    paymentMethod: 'bank_transfer',
    bankDetails: {
      accountName: 'Kofi Mensah',
      accountNumber: '****5555',
      routingNumber: '****9999',
      bankName: 'Standard Chartered Ghana'
    },
    taxInfo: {
      tin: '***-**-3456',
      w9Form: 'verified'
    }
  }
];

const mockPaymentMethods = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer (ACH)',
    description: 'Direct bank transfer - lowest fees',
    fee: 0.00,
    processingTime: '1-3 business days',
    icon: Building,
    available: true,
    international: true
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Digital wallet payments',
    fee: 2.9,
    processingTime: 'Instant',
    icon: Wallet,
    available: true,
    international: true
  },
  {
    id: 'wise',
    name: 'Wise (International)',
    description: 'Best for international transfers',
    fee: 0.5,
    processingTime: '1-2 business days',
    icon: Globe,
    available: true,
    international: true
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Blockchain-based payments',
    fee: 0.1,
    processingTime: '10-60 minutes',
    icon: Banknote,
    available: false,
    international: true
  },
  {
    id: 'check',
    name: 'Paper Check',
    description: 'Traditional mail delivery',
    fee: 5.00,
    processingTime: '7-10 business days',
    icon: Receipt,
    available: true,
    international: false
  }
];

const PaymentProcessing: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [selectedPayments, setSelectedPayments] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [executionResults, setExecutionResults] = useState<any>(null);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

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

  const filteredPayments = useMemo(() => {
    let data = mockPendingPayments;

    if (searchTerm) {
      data = data.filter(payment =>
        payment.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.tracks.some(track => track.toLowerCase().includes(searchTerm.toLowerCase())) ||
        payment.station.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      data = data.filter(payment => payment.status === statusFilter);
    }

    data.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'artist':
          aValue = a.artist;
          bValue = b.artist;
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'station':
          aValue = a.station;
          bValue = b.station;
          break;
        default:
          aValue = a.amount;
          bValue = b.amount;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return data;
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const selectedPaymentData = mockPendingPayments.filter(payment =>
    selectedPayments.includes(payment.id)
  );

  const totalSelectedAmount = selectedPaymentData.reduce((acc, payment) => acc + payment.amount, 0);
  const selectedMethod = mockPaymentMethods.find(method => method.id === paymentMethod);

  const handlePaymentSelection = (paymentId: number, selected: boolean) => {
    if (selected) {
      setSelectedPayments(prev => [...prev, paymentId]);
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId));
    }
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === filteredPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(filteredPayments.map(payment => payment.id));
    }
  };

  const calculateFees = (amount: number, method: any) => {
    if (method.fee === 0) return 0;

    if (typeof method.fee === 'number') {
      // Fixed fee
      return method.fee;
    } else {
      // Percentage fee
      return amount * (method.fee / 100);
    }
  };

  const simulatePaymentProcessing = async () => {
    setIsProcessing(true);
    setActiveStep(3);

    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProcessingProgress(progress);
    }

    // Simulate results
    const results = {
      totalProcessed: selectedPaymentData.length,
      successful: Math.floor(selectedPaymentData.length * 0.95), // 95% success rate
      failed: Math.floor(selectedPaymentData.length * 0.05), // 5% failure rate
      totalAmount: totalSelectedAmount,
      fees: selectedMethod ? calculateFees(totalSelectedAmount, selectedMethod) : 0,
      executionTime: new Date().toISOString(),
      batchId: `BATCH_${Date.now()}`
    };

    setExecutionResults(results);
    setIsProcessing(false);
    setActiveStep(4);
  };

  const resetProcess = () => {
    setActiveStep(1);
    setSelectedPayments([]);
    setProcessingProgress(0);
    setExecutionResults(null);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Processing</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Process royalty payments to artists and manage payment distribution
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payments</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {mockPendingPayments.length}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Selected Amount</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totalSelectedAmount)}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Selected Artists</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {selectedPaymentData.length}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Processing Fee</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {selectedMethod ? formatCurrency(calculateFees(totalSelectedAmount, selectedMethod)) : '$0.00'}
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Calculator className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard/royalties')}
                className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>Back to Royalties</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
          {[
            { id: 1, label: 'Select Payments', icon: CheckCircle },
            { id: 2, label: 'Configure Method', icon: Settings },
            { id: 3, label: 'Process & Execute', icon: RefreshCw },
            { id: 4, label: 'Review Results', icon: FileCheck }
          ].map((step) => (
            <button
              key={step.id}
              onClick={() => activeStep >= step.id && setActiveStep(step.id)}
              disabled={activeStep < step.id}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeStep >= step.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300 cursor-not-allowed'
              }`}
            >
              <step.icon className="w-4 h-4" />
              <span>{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Step 1: Select Payments */}
        {activeStep === 1 && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Payments to Process</h3>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search artists, tracks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Select All ({selectedPayments.length} of {filteredPayments.length} selected)
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Selected: {formatCurrency(totalSelectedAmount)}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('artist')}>
                        <span>Artist</span>
                        {getSortIcon('artist')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tracks
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Station
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('amount')}>
                        <span>Amount</span>
                        {getSortIcon('amount')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('dueDate')}>
                        <span>Due Date</span>
                        {getSortIcon('dueDate')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPayments.includes(payment.id)}
                          onChange={(e) => handlePaymentSelection(payment.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{payment.artist}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{payment.period}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {payment.tracks.map((track, index) => (
                            <span key={index} className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-xs mr-1">
                              {track}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          payment.station === 'Multiple Ghanaian Stations' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          payment.station === 'BBC Africa' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          payment.station === 'Regional West African Stations' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {payment.station}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setActiveStep(2)}
                disabled={selectedPayments.length === 0}
                className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                  selectedPayments.length > 0
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Next: Configure Payment Method
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Payment Method */}
        {activeStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Method Selection */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Select Payment Method</h3>

              <div className="space-y-4">
                {mockPaymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => method.available && setPaymentMethod(method.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                        : method.available
                          ? 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                          : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          paymentMethod === method.id
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-gray-100 dark:bg-slate-700'
                        }`}>
                          <method.icon className={`w-5 h-5 ${
                            paymentMethod === method.id
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{method.description}</p>
                        </div>
                      </div>
                      {!method.available && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Coming Soon</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Fee: {method.fee === 0 ? 'Free' : `${method.fee}${typeof method.fee === 'number' && method.fee < 1 ? '%' : '$'}`}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {method.processingTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary & Configuration */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Payment Summary</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Selected Payments</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedPaymentData.length}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalSelectedAmount)}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {selectedMethod ? formatCurrency(calculateFees(totalSelectedAmount, selectedMethod)) : '$0.00'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="font-medium text-green-700 dark:text-green-400">Net Amount</span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(totalSelectedAmount - (selectedMethod ? calculateFees(totalSelectedAmount, selectedMethod) : 0))}
                  </span>
                </div>
              </div>

              {selectedMethod && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Payment Method Details</h4>
                  <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <p>• Processing time: {selectedMethod.processingTime}</p>
                    <p>• International support: {selectedMethod.international ? 'Yes' : 'No'}</p>
                    <p>• Fee structure: {selectedMethod.fee === 0 ? 'No fees' : `${selectedMethod.fee}${typeof selectedMethod.fee === 'number' && selectedMethod.fee < 1 ? '%' : '$'} per transaction`}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Review & Execute
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Process & Execute */}
        {activeStep === 3 && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className={`w-8 h-8 text-blue-600 dark:text-blue-400 ${isProcessing ? 'animate-spin' : ''}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {isProcessing ? 'Processing Payments...' : 'Ready to Execute'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {isProcessing
                  ? `Processing ${selectedPaymentData.length} payments • ${processingProgress}% complete`
                  : `Review and confirm ${selectedPaymentData.length} payments totaling ${formatCurrency(totalSelectedAmount)}`
                }
              </p>
            </div>

            {isProcessing ? (
              <div className="space-y-4">
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{processingProgress}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Math.floor((processingProgress / 100) * selectedPaymentData.length)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Processed</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedPaymentData.length - Math.floor((processingProgress / 100) * selectedPaymentData.length)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pre-execution Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Payment Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Payments</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedPaymentData.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalSelectedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {selectedMethod ? formatCurrency(calculateFees(totalSelectedAmount, selectedMethod)) : '$0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                        <span className="font-medium text-gray-900 dark:text-white">Net Total</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(totalSelectedAmount - (selectedMethod ? calculateFees(totalSelectedAmount, selectedMethod) : 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Payment Method</h4>
                    {selectedMethod && (
                      <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <selectedMethod.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">{selectedMethod.name}</span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>• Processing time: {selectedMethod.processingTime}</p>
                          <p>• International: {selectedMethod.international ? 'Supported' : 'Not supported'}</p>
                          <p>• Fee: {selectedMethod.fee === 0 ? 'No fees' : `${selectedMethod.fee}${typeof selectedMethod.fee === 'number' && selectedMethod.fee < 1 ? '%' : '$'}`}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment List Preview */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Payments to Process</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedPaymentData.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{payment.artist}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{payment.tracks.length} track(s)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{payment.station}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={simulatePaymentProcessing}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Execute Payments
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review Results */}
        {activeStep === 4 && executionResults && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Payment Processing Complete!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Successfully processed {executionResults.successful} of {executionResults.totalProcessed} payments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{executionResults.successful}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{executionResults.failed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(executionResults.totalAmount)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(executionResults.fees)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Fees</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Batch ID</span>
                <span className="font-mono text-sm text-gray-900 dark:text-white">{executionResults.batchId}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Execution Time</span>
                <span className="text-sm text-gray-900 dark:text-white">{new Date(executionResults.executionTime).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {Math.round((executionResults.successful / executionResults.totalProcessed) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex justify-center space-x-3 pt-8">
              <button
                onClick={() => navigate('/dashboard/royalties')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Back to Royalties
              </button>
              <button
                onClick={resetProcess}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200"
              >
                Process More Payments
              </button>
              <button className="px-6 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PaymentProcessing;
