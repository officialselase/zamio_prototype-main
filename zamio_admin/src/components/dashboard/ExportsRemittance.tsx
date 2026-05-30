import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Download,
  Upload,
  Search,
  Filter,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Archive,
  Send,
  Receipt,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Banknote,
  ArrowRight,
  Check,
  AlertCircle,
  Info,
  Plus,
  Settings,
  History,
  X
} from 'lucide-react';

interface PartnerStatement {
  id: string;
  partnerId: string;
  partnerName: string;
  cycleId: string;
  cycleName: string;
  period: string;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'generated' | 'sent' | 'acknowledged' | 'disputed';
  generatedAt: string;
  sentAt?: string;
  acknowledgedAt?: string;
  lineItems: number;
  tracks: number;
  stations: number;
  format: 'PDF' | 'Excel' | 'CSV';
}

interface Remittance {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  method: 'bank_transfer' | 'paypal' | 'crypto' | 'check';
  reference: string;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
}

interface Settlement {
  id: string;
  cycleId: string;
  cycleName: string;
  partnerCount: number;
  totalAmount: number;
  currency: string;
  status: 'in_progress' | 'completed' | 'failed' | 'partial';
  initiatedAt: string;
  completedAt?: string;
  successCount: number;
  failureCount: number;
  notes?: string;
}

export const ExportsRemittance = () => {
  const [activeTab, setActiveTab] = useState<'statements' | 'remittances' | 'settlements' | 'history'>('statements');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStatement, setSelectedStatement] = useState<PartnerStatement | null>(null);
  const [selectedRemittance, setSelectedRemittance] = useState<Remittance | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);

  // Mock partner statements data
  const [partnerStatements, setPartnerStatements] = useState<PartnerStatement[]>([
    {
      id: '1',
      partnerId: 'P001',
      partnerName: 'Universal Music Ghana',
      cycleId: '3',
      cycleName: 'Q2 2024',
      period: 'Apr-Jun 2024',
      totalAmount: 15420.50,
      currency: 'GHS',
      status: 'generated',
      generatedAt: '2 hours ago',
      lineItems: 245,
      tracks: 1890,
      stations: 23,
      format: 'PDF'
    },
    {
      id: '2',
      partnerId: 'P002',
      partnerName: 'Sony Music West Africa',
      cycleId: '3',
      cycleName: 'Q2 2024',
      period: 'Apr-Jun 2024',
      totalAmount: 12890.25,
      currency: 'GHS',
      status: 'sent',
      generatedAt: '1 day ago',
      sentAt: '6 hours ago',
      lineItems: 198,
      tracks: 1456,
      stations: 19,
      format: 'Excel'
    },
    {
      id: '3',
      partnerId: 'P003',
      partnerName: 'Eazymusic Collective',
      cycleId: '3',
      cycleName: 'Q2 2024',
      period: 'Apr-Jun 2024',
      totalAmount: 5670.80,
      currency: 'GHS',
      status: 'disputed',
      generatedAt: '3 days ago',
      lineItems: 89,
      tracks: 634,
      stations: 12,
      format: 'PDF'
    }
  ]);

  // Mock remittances data
  const [remittances, setRemittances] = useState<Remittance[]>([
    {
      id: '1',
      partnerId: 'P001',
      partnerName: 'Universal Music Ghana',
      amount: 15420.50,
      currency: 'GHS',
      status: 'completed',
      method: 'bank_transfer',
      reference: 'TXN-2024-001',
      createdAt: '1 day ago',
      processedAt: '1 day ago',
      completedAt: '1 day ago'
    },
    {
      id: '2',
      partnerId: 'P002',
      partnerName: 'Sony Music West Africa',
      amount: 12890.25,
      currency: 'GHS',
      status: 'processing',
      method: 'paypal',
      reference: 'TXN-2024-002',
      createdAt: '6 hours ago',
      processedAt: '6 hours ago'
    },
    {
      id: '3',
      partnerId: 'P003',
      partnerName: 'Eazymusic Collective',
      amount: 5670.80,
      currency: 'GHS',
      status: 'failed',
      method: 'bank_transfer',
      reference: 'TXN-2024-003',
      createdAt: '2 days ago',
      failureReason: 'Insufficient funds in account'
    }
  ]);

  // Mock settlements data
  const [settlements, setSettlements] = useState<Settlement[]>([
    {
      id: '1',
      cycleId: '3',
      cycleName: 'Q2 2024',
      partnerCount: 289,
      totalAmount: 1245780.45,
      currency: 'GHS',
      status: 'completed',
      initiatedAt: '1 day ago',
      completedAt: '1 day ago',
      successCount: 285,
      failureCount: 4,
      notes: 'Settlement completed successfully with minor failures'
    },
    {
      id: '2',
      cycleId: '2',
      cycleName: 'Q1 2024',
      partnerCount: 267,
      totalAmount: 1350000.00,
      currency: 'GHS',
      status: 'completed',
      initiatedAt: '1 month ago',
      completedAt: '1 month ago',
      successCount: 267,
      failureCount: 0
    }
  ]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'generated':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'sent':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'acknowledged':
        return `${baseClasses} bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800`;
      case 'disputed':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'pending':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'processing':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'in_progress':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'partial':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return <Banknote className="w-4 h-4" />;
      case 'paypal':
        return <CreditCard className="w-4 h-4" />;
      case 'crypto':
        return <DollarSign className="w-4 h-4" />;
      case 'check':
        return <FileText className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const filteredStatements = partnerStatements.filter(statement => {
    const matchesSearch = statement.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         statement.cycleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || statement.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredRemittances = remittances.filter(remittance => {
    const matchesSearch = remittance.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         remittance.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || remittance.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewStatement = (statement: PartnerStatement) => {
    setSelectedStatement(statement);
    setShowStatementModal(true);
  };

  const handleViewRemittance = (remittance: Remittance) => {
    setSelectedRemittance(remittance);
    setShowRemittanceModal(true);
  };

  const handleGenerateStatement = () => {
    // Simulate statement generation
    const newStatement: PartnerStatement = {
      id: Date.now().toString(),
      partnerId: 'P004',
      partnerName: 'New Partner',
      cycleId: '3',
      cycleName: 'Q2 2024',
      period: 'Apr-Jun 2024',
      totalAmount: 8500.00,
      currency: 'GHS',
      status: 'generated',
      generatedAt: 'Just now',
      lineItems: 156,
      tracks: 1200,
      stations: 15,
      format: 'PDF'
    };
    setPartnerStatements(prev => [newStatement, ...prev]);
  };

  const handleProcessRemittance = (remittanceId: string) => {
    setRemittances(prev => prev.map(remittance =>
      remittance.id === remittanceId
        ? { ...remittance, status: 'processing' as const, processedAt: new Date().toISOString() }
        : remittance
    ));
  };

  return (
    <div>
      {/* Exports & Remittance Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Exports & Remittance Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Generate statements, process payments, and track settlements
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateStatement}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Statement</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Process Payments</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exports & Remittance Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'statements', name: 'Partner Statements', icon: FileText, count: partnerStatements.length },
            { id: 'remittances', name: 'Remittances', icon: CreditCard, count: remittances.length },
            { id: 'settlements', name: 'Settlements', icon: CheckCircle, count: settlements.length },
            { id: 'history', name: 'Export History', icon: History, count: 0 }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Partner Statements Tab */}
      {activeTab === 'statements' && (
        <>
          {/* Search and Filters */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by partner name or cycle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="generated">Generated</option>
                  <option value="sent">Sent</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Partner Statements Grid */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {filteredStatements.map((statement) => (
                <div
                  key={statement.id}
                  className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {statement.partnerName}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(statement.status)}`}>
                          {statement.status}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          {statement.format}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Cycle</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{statement.cycleName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {statement.currency} {statement.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Line Items</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{statement.lineItems}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Generated</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{statement.generatedAt}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Tracks</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{statement.tracks}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Stations</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{statement.stations}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{statement.period}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewStatement(statement)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {statement.status === 'generated' && (
                        <>
                          <button className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                            <Send className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {statement.status === 'disputed' && (
                        <button className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredStatements.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No statements found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Remittances Tab */}
      {activeTab === 'remittances' && (
        <>
          {/* Filters */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500">
                  <option>All Partners</option>
                  <option>Universal Music Ghana</option>
                  <option>Sony Music West Africa</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>

                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500">
                  <option>All Methods</option>
                  <option>Bank Transfer</option>
                  <option>PayPal</option>
                  <option>Crypto</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Remittances Table */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Partner</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Reference</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRemittances.map((remittance) => (
                    <tr key={remittance.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{remittance.partnerName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{remittance.partnerId}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {remittance.currency} {remittance.amount.toLocaleString()}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {getPaymentMethodIcon(remittance.method)}
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {remittance.method.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{remittance.reference}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(remittance.status)}`}>
                          {remittance.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{remittance.createdAt}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewRemittance(remittance)}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {remittance.status === 'pending' && (
                            <button
                              onClick={() => handleProcessRemittance(remittance.id)}
                              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <>
          {/* Settlement Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Settlement Overview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">95%</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₵2.4M</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Settled</p>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">12</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">3</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Settlements List */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Settlement History</h3>

            <div className="space-y-4">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{settlement.cycleName}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(settlement.status)}`}>
                          {settlement.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Partners</p>
                          <p className="font-medium text-gray-900 dark:text-white">{settlement.partnerCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {settlement.currency} {settlement.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                          <p className="font-medium text-green-600 dark:text-green-400">
                            {((settlement.successCount / settlement.partnerCount) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Initiated</p>
                          <p className="font-medium text-gray-900 dark:text-white">{settlement.initiatedAt}</p>
                        </div>
                      </div>

                      {settlement.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <strong>Notes:</strong> {settlement.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </button>
                      {settlement.status === 'in_progress' && (
                        <button className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                          <Check className="w-4 h-4 mr-1" />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Export History Tab */}
      {activeTab === 'history' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Export History & Archiving
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Export Formats */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Export Formats</h4>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Export as PDF</span>
                </button>
                <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Export as Excel</span>
                </button>
                <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Export as CSV</span>
                </button>
              </div>
            </div>

            {/* Archive Management */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Archive Management</h4>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2">
                  <Archive className="w-5 h-5" />
                  <span>Archive Old Exports</span>
                </button>
                <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5" />
                  <span>Clean Up Archives</span>
                </button>
                <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Archives</span>
                </button>
              </div>
            </div>
          </div>

          {/* Export History */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Exports</h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Q2 2024 Partner Statements</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">PDF format • 245 statements • 2.1 MB</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                      Completed
                    </span>
                    <button className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Q1 2024 Settlement Report</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Excel format • Settlement data • 1.8 MB</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      Processing
                    </span>
                    <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Statement Details Modal */}
      {showStatementModal && selectedStatement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedStatement.partnerName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedStatement.cycleName} • {selectedStatement.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStatementModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Statement Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statement Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Partner</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedStatement.partnerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Cycle</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedStatement.cycleName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Period</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedStatement.period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedStatement.currency} {selectedStatement.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Format</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedStatement.format}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Generated</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedStatement.generatedAt}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Summary Statistics */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Line Items</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedStatement.lineItems}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Tracks</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{selectedStatement.tracks}</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Stations</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{selectedStatement.stations}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-6">
                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <Download className="w-5 h-5" />
                        <span>Download Statement</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <Send className="w-5 h-5" />
                        <span>Send to Partner</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                        <Edit className="w-5 h-5" />
                        <span>Edit Statement</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                        <Archive className="w-5 h-5" />
                        <span>Archive Statement</span>
                      </button>
                    </div>
                  </Card>

                  {/* Status Timeline */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Generated</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedStatement.generatedAt}</p>
                        </div>
                      </div>

                      {selectedStatement.sentAt && (
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Sent to Partner</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedStatement.sentAt}</p>
                          </div>
                        </div>
                      )}

                      {selectedStatement.acknowledgedAt && (
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Acknowledged</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedStatement.acknowledgedAt}</p>
                          </div>
                        </div>
                      )}

                      {selectedStatement.status === 'disputed' && (
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">Disputed</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Requires resolution</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Update Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remittance Details Modal */}
      {showRemittanceModal && selectedRemittance && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                {getPaymentMethodIcon(selectedRemittance.method)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedRemittance.partnerName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedRemittance.reference} • {selectedRemittance.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRemittanceModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Remittance Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Remittance Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Partner</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedRemittance.partnerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRemittance.currency} {selectedRemittance.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Payment Method</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {selectedRemittance.method.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Reference</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedRemittance.reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedRemittance.createdAt}</span>
                      </div>
                      {selectedRemittance.processedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Processed</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedRemittance.processedAt}</span>
                        </div>
                      )}
                      {selectedRemittance.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedRemittance.completedAt}</span>
                        </div>
                      )}
                      {selectedRemittance.failureReason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Failure Reason</p>
                          <p className="text-sm text-red-600 dark:text-red-400">{selectedRemittance.failureReason}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="space-y-6">
                  {/* Status */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h3>
                    <div className="text-center">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(selectedRemittance.status)}`}>
                        {selectedRemittance.status.charAt(0).toUpperCase() + selectedRemittance.status.slice(1)}
                      </span>
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      {selectedRemittance.status === 'pending' && (
                        <>
                          <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                            <Check className="w-5 h-5" />
                            <span>Process Payment</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                            <Edit className="w-5 h-5" />
                            <span>Edit Details</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                            <XCircle className="w-5 h-5" />
                            <span>Cancel Remittance</span>
                          </button>
                        </>
                      )}

                      {selectedRemittance.status === 'processing' && (
                        <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                          <RefreshCw className="w-5 h-5" />
                          <span>Check Status</span>
                        </button>
                      )}

                      {selectedRemittance.status === 'completed' && (
                        <>
                          <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                            <Receipt className="w-5 h-5" />
                            <span>View Receipt</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2">
                            <Archive className="w-5 h-5" />
                            <span>Archive</span>
                          </button>
                        </>
                      )}

                      {selectedRemittance.status === 'failed' && (
                        <>
                          <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span>View Error Details</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                            <RefreshCw className="w-5 h-5" />
                            <span>Retry Payment</span>
                          </button>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowRemittanceModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Update Remittance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
