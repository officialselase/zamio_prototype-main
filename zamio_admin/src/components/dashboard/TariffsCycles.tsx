import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  DollarSign,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  Play,
  Pause,
  Lock,
  Unlock,
  BarChart3,
  Users,
  Radio,
  Music,
  Calculator,
  Receipt,
  Archive,
  RefreshCw,
  Copy,
  MoreHorizontal,
  ChevronDown,
  X
} from 'lucide-react';

interface TariffRule {
  id: string;
  name: string;
  description: string;
  type: 'station_class' | 'time_of_day' | 'usage_type' | 'territory';
  rate: number;
  unit: 'per_minute' | 'per_play' | 'percentage' | 'fixed';
  conditions: string[];
  status: 'active' | 'inactive' | 'draft';
  effectiveFrom: string;
  effectiveTo?: string;
  lastUpdated: string;
  createdBy: string;
}

interface Cycle {
  id: string;
  name: string;
  period: string;
  status: 'open' | 'closed' | 'locked' | 'archived';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalDistributions: number;
  partnerCount: number;
  statementCount: number;
  createdAt: string;
  lockedAt?: string;
  lockedBy?: string;
}

interface LineItem {
  id: string;
  cycleId: string;
  partnerId: string;
  partnerName: string;
  trackTitle: string;
  trackArtist: string;
  station: string;
  plays: number;
  duration: string;
  revenue: number;
  tariffRate: number;
  distributionAmount: number;
  status: 'pending' | 'approved' | 'disputed' | 'paid';
  lastUpdated: string;
}

export const TariffsCycles = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'cycles' | 'lineitems' | 'statements'>('rules');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRule, setSelectedRule] = useState<TariffRule | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);

  // Mock tariff rules data
  const [tariffRules, setTariffRules] = useState<TariffRule[]>([
    {
      id: '1',
      name: 'Prime Time Radio',
      description: 'Higher rate for prime time radio broadcasts',
      type: 'time_of_day',
      rate: 0.15,
      unit: 'per_minute',
      conditions: ['Time: 6 AM - 10 PM', 'Station Class: Commercial'],
      status: 'active',
      effectiveFrom: '2024-01-01',
      lastUpdated: '2 days ago',
      createdBy: 'Admin User'
    },
    {
      id: '2',
      name: 'Community Station Discount',
      description: 'Reduced rate for community and educational stations',
      type: 'station_class',
      rate: 0.08,
      unit: 'per_minute',
      conditions: ['Station Class: Community', 'Station Class: Educational'],
      status: 'active',
      effectiveFrom: '2024-01-01',
      lastUpdated: '1 week ago',
      createdBy: 'Admin User'
    },
    {
      id: '3',
      name: 'Digital Streaming Premium',
      description: 'Premium rate for digital streaming platforms',
      type: 'usage_type',
      rate: 0.20,
      unit: 'per_play',
      conditions: ['Usage Type: Streaming', 'Territory: Ghana'],
      status: 'draft',
      effectiveFrom: '2024-02-01',
      lastUpdated: 'Just now',
      createdBy: 'Finance Team'
    }
  ]);

  // Mock cycles data
  const [cycles, setCycles] = useState<Cycle[]>([
    {
      id: '1',
      name: 'Q4 2023',
      period: 'Oct-Dec 2023',
      status: 'locked',
      startDate: '2023-10-01',
      endDate: '2023-12-31',
      totalRevenue: 1250000,
      totalDistributions: 1150000,
      partnerCount: 245,
      statementCount: 245,
      createdAt: '2023-10-01',
      lockedAt: '2024-01-15',
      lockedBy: 'Finance Manager'
    },
    {
      id: '2',
      name: 'Q1 2024',
      period: 'Jan-Mar 2024',
      status: 'closed',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      totalRevenue: 1450000,
      totalDistributions: 1350000,
      partnerCount: 267,
      statementCount: 267,
      createdAt: '2024-01-01'
    },
    {
      id: '3',
      name: 'Q2 2024',
      period: 'Apr-Jun 2024',
      status: 'open',
      startDate: '2024-04-01',
      endDate: '2024-06-30',
      totalRevenue: 890000,
      totalDistributions: 0,
      partnerCount: 289,
      statementCount: 0,
      createdAt: '2024-04-01'
    }
  ]);

  // Mock line items data
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      cycleId: '3',
      partnerId: 'P001',
      partnerName: 'Universal Music Ghana',
      trackTitle: 'Water No Get Enemy',
      trackArtist: 'Fela Kuti',
      station: 'Accra Central FM',
      plays: 45,
      duration: '11:05',
      revenue: 67.50,
      tariffRate: 0.15,
      distributionAmount: 67.50,
      status: 'pending',
      lastUpdated: '1 hour ago'
    },
    {
      id: '2',
      cycleId: '3',
      partnerId: 'P002',
      partnerName: 'Sony Music West Africa',
      trackTitle: 'Zombie',
      trackArtist: 'Fela Kuti',
      station: 'Kumasi Rock FM',
      plays: 32,
      duration: '12:25',
      revenue: 48.00,
      tariffRate: 0.15,
      distributionAmount: 48.00,
      status: 'approved',
      lastUpdated: '2 hours ago'
    }
  ]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'draft':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'open':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'closed':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'locked':
        return `${baseClasses} bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800`;
      case 'archived':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'pending':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'approved':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'disputed':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'paid':
        return `${baseClasses} bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getCycleStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'closed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-purple-500" />;
      case 'archived':
        return <Archive className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredRules = tariffRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rule.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredCycles = cycles.filter(cycle => {
    const matchesSearch = cycle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cycle.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cycle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewRule = (rule: TariffRule) => {
    setSelectedRule(rule);
    setShowRuleModal(true);
  };

  const handleViewCycle = (cycle: Cycle) => {
    setSelectedCycle(cycle);
    setShowCycleModal(true);
  };

  const handleCycleAction = (cycleId: string, action: 'open' | 'close' | 'lock') => {
    setCycles(prev => prev.map(cycle => {
      if (cycle.id === cycleId) {
        const newStatus = action;
        return {
          ...cycle,
          status: newStatus,
          lockedAt: action === 'lock' ? new Date().toISOString() : cycle.lockedAt,
          lockedBy: action === 'lock' ? 'Admin User' : cycle.lockedBy
        };
      }
      return cycle;
    }));
  };

  return (
    <div>
      {/* Tariffs & Cycles Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Tariffs & Cycles Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Configure pricing rules and manage billing cycles
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Rule</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>New Cycle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tariffs & Cycles Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'rules', name: 'Tariff Rules', icon: Calculator, count: tariffRules.length },
            { id: 'cycles', name: 'Billing Cycles', icon: Calendar, count: cycles.length },
            { id: 'lineitems', name: 'Line Items', icon: FileText, count: lineItems.length },
            { id: 'statements', name: 'Statements', icon: Receipt, count: cycles.filter(c => c.status === 'locked').length }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tariff Rules Tab */}
      {activeTab === 'rules' && (
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
                      placeholder="Search by rule name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Tariff Rules Grid */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {rule.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(rule.status)}`}>
                          {rule.status}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          {rule.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {rule.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Rate</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ₵{rule.rate} {rule.unit.replace('_', '/')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Effective From</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {new Date(rule.effectiveFrom).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{rule.createdBy}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{rule.lastUpdated}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conditions:</p>
                        <div className="flex flex-wrap gap-2">
                          {rule.conditions.map((condition, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewRule(rule)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredRules.length === 0 && (
                <div className="text-center py-16">
                  <Calculator className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No rules found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Billing Cycles Tab */}
      {activeTab === 'cycles' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Billing Cycles Management
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getCycleStatusIcon(cycle.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{cycle.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cycle.period}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(cycle.status)}`}>
                    {cycle.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                    <span className="font-medium text-gray-900 dark:text-white">₵{cycle.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Distributions</span>
                    <span className="font-medium text-gray-900 dark:text-white">₵{cycle.totalDistributions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Partners</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cycle.partnerCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Statements</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cycle.statementCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created {new Date(cycle.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewCycle(cycle)}
                      className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {cycle.status === 'open' && (
                      <>
                        <button
                          onClick={() => handleCycleAction(cycle.id, 'close')}
                          className="p-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCycleAction(cycle.id, 'lock')}
                          className="p-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {cycle.status === 'closed' && (
                      <button
                        onClick={() => handleCycleAction(cycle.id, 'lock')}
                        className="p-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Line Items Tab */}
      {activeTab === 'lineitems' && (
        <>
          {/* Filters */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500">
                  <option>All Cycles</option>
                  <option>Q2 2024</option>
                  <option>Q1 2024</option>
                  <option>Q4 2023</option>
                </select>

                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500">
                  <option>All Partners</option>
                  <option>Universal Music Ghana</option>
                  <option>Sony Music West Africa</option>
                </select>

                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500">
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Disputed</option>
                  <option>Paid</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Line Items Table */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Partner</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Track</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Station</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Plays</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Distribution</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.partnerName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.partnerId}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.trackTitle}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.trackArtist}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{item.station}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-medium text-gray-900 dark:text-white">{item.plays}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-medium text-gray-900 dark:text-white">₵{item.revenue.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-medium text-gray-900 dark:text-white">₵{item.distributionAmount.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                            <Edit className="w-4 h-4" />
                          </button>
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

      {/* Statements Tab */}
      {activeTab === 'statements' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Statement Package Generation
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Statement Generation */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Generate Statements</h4>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Select Cycle</h5>
                  <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500">
                    <option>Q2 2024 (Open)</option>
                    <option>Q1 2024 (Closed)</option>
                    <option>Q4 2023 (Locked)</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Statement Format</h5>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input type="radio" name="format" value="pdf" defaultChecked className="text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">PDF Format</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="radio" name="format" value="excel" className="text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Excel Format</span>
                    </label>
                  </div>
                </div>

                <button className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Generate Statements</span>
                </button>
              </div>
            </div>

            {/* Recent Statements */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Statements</h4>
              <div className="space-y-3">
                {cycles.filter(c => c.status === 'locked').map((cycle) => (
                  <div key={cycle.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 dark:text-white">{cycle.name} Statements</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge('locked')}`}>
                        Locked
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {cycle.statementCount} statements • ₵{cycle.totalDistributions.toLocaleString()} total
                    </p>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-1">
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      <button className="px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1">
                        <Archive className="w-4 h-4" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Rule Details Modal */}
      {showRuleModal && selectedRule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedRule.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedRule.type.replace('_', ' ').toUpperCase()} Rule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRuleModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Rule Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rule Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rule Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedRule.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedRule.type.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">₵{selectedRule.rate} {selectedRule.unit.replace('_', '/')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedRule.status)}`}>
                          {selectedRule.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Effective From</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selectedRule.effectiveFrom).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedRule.effectiveTo && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Effective To</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(selectedRule.effectiveTo).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Description */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedRule.description}
                    </p>
                  </Card>
                </div>

                {/* Right Column - Conditions & Actions */}
                <div className="space-y-6">
                  {/* Conditions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conditions</h3>
                    <div className="space-y-2">
                      {selectedRule.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{condition}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Usage Statistics */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Times Applied</span>
                        <span className="font-medium text-gray-900 dark:text-white">1,247</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue Generated</span>
                        <span className="font-medium text-gray-900 dark:text-white">₵18,750.50</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Used</span>
                        <span className="font-medium text-gray-900 dark:text-white">2 hours ago</span>
                      </div>
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <Edit className="w-5 h-5" />
                        <span>Edit Rule</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <Copy className="w-5 h-5" />
                        <span>Duplicate Rule</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                        <Trash2 className="w-5 h-5" />
                        <span>Delete Rule</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cycle Details Modal */}
      {showCycleModal && selectedCycle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                {getCycleStatusIcon(selectedCycle.status)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedCycle.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedCycle.period} • {selectedCycle.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCycleModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Cycle Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cycle Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Cycle Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedCycle.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Period</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedCycle.period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedCycle.status)}`}>
                          {selectedCycle.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Start Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selectedCycle.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">End Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selectedCycle.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selectedCycle.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedCycle.lockedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Locked</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(selectedCycle.lockedAt).toLocaleDateString()} by {selectedCycle.lockedBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Right Column - Statistics & Actions */}
                <div className="space-y-6">
                  {/* Financial Summary */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                        <span className="font-medium text-gray-900 dark:text-white">₵{selectedCycle.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Distributions</span>
                        <span className="font-medium text-gray-900 dark:text-white">₵{selectedCycle.totalDistributions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Net Revenue</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ₵{(selectedCycle.totalRevenue - selectedCycle.totalDistributions).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Partner Summary */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partner Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Partners</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedCycle.partnerCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Statements Generated</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedCycle.statementCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {((selectedCycle.statementCount / selectedCycle.partnerCount) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      {selectedCycle.status === 'open' && (
                        <>
                          <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                            <Pause className="w-5 h-5" />
                            <span>Close Cycle</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                            <Lock className="w-5 h-5" />
                            <span>Lock Cycle</span>
                          </button>
                        </>
                      )}

                      {selectedCycle.status === 'closed' && (
                        <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                          <Lock className="w-5 h-5" />
                          <span>Lock Cycle</span>
                        </button>
                      )}

                      {selectedCycle.status === 'locked' && (
                        <>
                          <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                            <Download className="w-5 h-5" />
                            <span>Download Statements</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2">
                            <Archive className="w-5 h-5" />
                            <span>Archive Cycle</span>
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
                onClick={() => setShowCycleModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Update Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
