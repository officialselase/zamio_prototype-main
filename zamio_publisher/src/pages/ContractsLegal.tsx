import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  Upload,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  Music,
  Radio,
  Globe,
  DollarSign,
  TrendingUp,
  Shield,
  AlertCircle,
  Award,
  FileCheck,
  UserCheck,
  Building,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Send,
  Archive,
  RefreshCw,
  Trash2,
  Copy,
  Printer,
  FileX,
  CheckSquare,
  AlertOctagon,
  Info,
  Star,
  Heart,
  Share2,
  Layers,
  Target,
  PiggyBank,
  Wallet,
  Bell,
  Minus,
  X,
  Check,
  Settings,
  Activity,
  Crown,
  Gem,
  Wifi,
  Lock,
  EyeOff,
  Tag,
  Smartphone,
  Monitor,
  Key,
  FileAudio,
  ArrowUpDown,
  CreditCard,
  PieChart,
  HelpCircle,
  BookOpen,
  Scale,
  Gavel,
  Receipt,
  Calculator,
  Percent,
  Timer,
  Zap
} from 'lucide-react';

const ContractsLegal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('contracts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContract, setNewContract] = useState({
    title: '',
    type: 'Artist Agreement',
    artist: '',
    startDate: '',
    endDate: '',
    value: '',
    territory: 'Ghana',
    stations: [] as string[],
    renewalDate: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string | string[]) => {
    setNewContract(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitContract = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!newContract.title || !newContract.artist || !newContract.startDate || !newContract.endDate || !newContract.value) {
      alert('Please fill in all required fields');
      return;
    }

    // Generate new contract ID
    const newId = Math.max(...mockContracts.map(c => c.id)) + 1;

    // Create new contract object
    const contractToAdd = {
      id: newId,
      title: newContract.title,
      type: newContract.type,
      status: 'draft',
      artist: newContract.artist,
      startDate: newContract.startDate,
      endDate: newContract.endDate,
      value: parseFloat(newContract.value),
      territory: newContract.territory,
      stations: newContract.stations,
      renewalDate: newContract.renewalDate || null,
      lastModified: new Date().toISOString().split('T')[0],
      complianceStatus: 'draft',
      documents: 0,
      notes: newContract.notes
    };

    // In a real app, this would be an API call
    // For now, we'll just add it to the mock data
    mockContracts.unshift(contractToAdd);

    // Reset form and close modal
    setNewContract({
      title: '',
      type: 'Artist Agreement',
      artist: '',
      startDate: '',
      endDate: '',
      value: '',
      territory: 'Ghana',
      stations: [],
      renewalDate: '',
      notes: ''
    });
    setShowAddModal(false);
  };

  const resetForm = () => {
    setNewContract({
      title: '',
      type: 'Artist Agreement',
      artist: '',
      startDate: '',
      endDate: '',
      value: '',
      territory: 'Ghana',
      stations: [],
      renewalDate: '',
      notes: ''
    });
  };
  const mockContracts = [
    {
      id: 1,
      title: 'Artist Representation Agreement - Sarah Johnson',
      type: 'Artist Agreement',
      status: 'active',
      artist: 'Sarah Johnson',
      startDate: '2023-03-15',
      endDate: '2025-03-15',
      value: 15000,
      territory: 'Ghana',
      stations: ['Joy FM', 'Citi FM'],
      renewalDate: '2025-01-15',
      lastModified: '2024-10-15',
      complianceStatus: 'compliant',
      documents: 5,
      notes: 'Standard broadcast rights agreement for Ghanaian market'
    },
    {
      id: 2,
      title: 'Broadcast Licensing Agreement - BBC Africa',
      type: 'Licensing Agreement',
      status: 'active',
      artist: 'Multiple Artists',
      startDate: '2023-01-01',
      endDate: '2024-12-31',
      value: 25000,
      territory: 'International',
      stations: ['BBC Africa'],
      renewalDate: '2024-11-01',
      lastModified: '2024-09-20',
      complianceStatus: 'review_required',
      documents: 8,
      notes: 'International broadcasting rights for African content'
    },
    {
      id: 3,
      title: 'Mechanical Rights Agreement - Amara Okafor',
      type: 'Mechanical Rights',
      status: 'pending',
      artist: 'Amara Okafor',
      startDate: '2023-07-10',
      endDate: '2025-07-10',
      value: 8500,
      territory: 'West Africa',
      stations: ['Regional Stations'],
      renewalDate: '2025-05-10',
      lastModified: '2024-10-20',
      complianceStatus: 'draft',
      documents: 3,
      notes: 'Mechanical reproduction rights for West African distribution'
    },
    {
      id: 4,
      title: 'Publishing Administration - Michael Kwame',
      type: 'Publishing Agreement',
      status: 'active',
      artist: 'Michael Kwame',
      startDate: '2023-05-22',
      endDate: '2026-05-22',
      value: 12000,
      territory: 'Global',
      stations: ['BBC Africa', 'VOA Africa'],
      renewalDate: '2026-03-22',
      lastModified: '2024-08-15',
      complianceStatus: 'compliant',
      documents: 6,
      notes: 'Full publishing administration for international markets'
    },
    {
      id: 5,
      title: 'Expired Contract - Kofi Mensah',
      type: 'Artist Agreement',
      status: 'expired',
      artist: 'Kofi Mensah',
      startDate: '2022-02-08',
      endDate: '2024-02-08',
      value: 6700,
      territory: 'Ghana',
      stations: ['Joy FM'],
      renewalDate: null,
      lastModified: '2024-02-08',
      complianceStatus: 'expired',
      documents: 4,
      notes: 'Contract expired, renewal negotiations pending'
    }
  ];

  const mockLegalDocuments = [
    {
      id: 1,
      title: 'Broadcast Rights Compliance Report',
      type: 'Compliance Document',
      status: 'approved',
      issueDate: '2024-10-01',
      expiryDate: '2025-10-01',
      authority: 'Ghana Broadcasting Corporation',
      territory: 'Ghana',
      category: 'Regulatory Compliance',
      lastReview: '2024-10-15',
      nextReview: '2025-04-15',
      documents: 12
    },
    {
      id: 2,
      title: 'International Copyright Registration',
      type: 'Copyright Document',
      status: 'active',
      issueDate: '2023-06-15',
      expiryDate: '2028-06-15',
      authority: 'WIPO',
      territory: 'Global',
      category: 'Intellectual Property',
      lastReview: '2024-06-15',
      nextReview: '2028-06-15',
      documents: 8
    },
    {
      id: 3,
      title: 'Mechanical Rights License',
      type: 'License Document',
      status: 'pending_review',
      issueDate: '2024-09-01',
      expiryDate: '2025-09-01',
      authority: 'Ghana Music Rights Organization',
      territory: 'Ghana',
      category: 'Mechanical Rights',
      lastReview: '2024-09-01',
      nextReview: '2024-12-01',
      documents: 6
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_review': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'compliant': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'review_required': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'expired': return <XCircle className="w-3 h-3" />;
      case 'draft': return <FileText className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'pending_review': return <AlertTriangle className="w-3 h-3" />;
      case 'compliant': return <Shield className="w-3 h-3" />;
      case 'review_required': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Artist Agreement': return <Users className="w-4 h-4" />;
      case 'Licensing Agreement': return <Radio className="w-4 h-4" />;
      case 'Mechanical Rights': return <Music className="w-4 h-4" />;
      case 'Publishing Agreement': return <FileText className="w-4 h-4" />;
      case 'Compliance Document': return <Shield className="w-4 h-4" />;
      case 'Copyright Document': return <Award className="w-4 h-4" />;
      case 'License Document': return <Award className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredContracts = useMemo(() => {
    let data = mockContracts;

    if (searchTerm) {
      data = data.filter(contract =>
        contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      data = data.filter(contract => contract.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      data = data.filter(contract => contract.type === typeFilter);
    }

    data.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'artist':
          aValue = a.artist;
          bValue = b.artist;
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'date':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        default:
          aValue = a.title;
          bValue = b.title;
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
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl shadow-lg">
                  <Scale className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contracts & Legal</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Manage artist contracts, licensing agreements, and ensure compliance with music industry regulations for broadcast royalties
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                <span>New Contract</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
          {[
            { id: 'contracts', label: 'Contracts', icon: FileText },
            { id: 'agreements', label: 'Agreements', icon: FileCheck },
            { id: 'compliance', label: 'Compliance', icon: Shield },
            { id: 'templates', label: 'Templates', icon: BookOpen }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === 'contracts' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Management</h3>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contracts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-48"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="draft">Draft</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Types</option>
                  <option value="Artist Agreement">Artist Agreement</option>
                  <option value="Licensing Agreement">Licensing Agreement</option>
                  <option value="Mechanical Rights">Mechanical Rights</option>
                  <option value="Publishing Agreement">Publishing Agreement</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('title')}>
                        <span>Contract</span>
                        {getSortIcon('title')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('artist')}>
                        <span>Artist/Entity</span>
                        {getSortIcon('artist')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('value')}>
                        <span>Value</span>
                        {getSortIcon('value')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button className="flex items-center space-x-1" onClick={() => handleSort('date')}>
                        <span>Start Date</span>
                        {getSortIcon('date')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg flex items-center justify-center">
                            {getTypeIcon(contract.type)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{contract.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {contract.documents} documents • {contract.territory}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {contract.artist}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {contract.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(contract.value)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                          {getStatusIcon(contract.status)}
                          <span className="ml-1 capitalize">{contract.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'agreements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Agreements */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Active Agreements</h3>

              <div className="space-y-4">
                {mockContracts.filter(contract => contract.status === 'active').map((contract) => (
                  <div key={contract.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                          {getTypeIcon(contract.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{contract.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{contract.artist}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                        {getStatusIcon(contract.status)}
                        <span className="ml-1 capitalize">{contract.status}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Value</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(contract.value)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Expires</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDate(contract.endDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agreement Templates */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Agreement Templates</h3>

              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Standard Artist Agreement</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ghanaian market broadcast rights</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: Oct 15, 2024</p>
                    <button className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                      Use Template
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center">
                      <Radio className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">International Licensing Agreement</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">BBC Africa & VOA Africa broadcast rights</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: Sep 20, 2024</p>
                    <button className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                      Use Template
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-lg flex items-center justify-center">
                      <Music className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Mechanical Rights Template</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">West African distribution rights</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: Oct 20, 2024</p>
                    <button className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Compliance Overview */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Compliance Overview</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-300">Fully Compliant</p>
                      <p className="text-sm text-green-600 dark:text-green-400">All contracts up to date</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-800 dark:text-green-300">3/3</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-300">Review Required</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">1 contract needs attention</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-yellow-800 dark:text-yellow-300">1/3</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-300">Upcoming Renewals</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Next 30 days</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-800 dark:text-blue-300">2</p>
                </div>
              </div>
            </div>

            {/* Legal Documents */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Legal Documents</h3>

              <div className="space-y-4">
                {mockLegalDocuments.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          doc.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
                          doc.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}>
                          {getTypeIcon(doc.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{doc.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{doc.authority}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        <span className="ml-1 capitalize">{doc.status.replace('_', ' ')}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Territory</p>
                        <p className="font-medium text-gray-900 dark:text-white">{doc.territory}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Expires</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDate(doc.expiryDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Templates</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Ghana Artist Agreement',
                  description: 'Standard broadcast rights agreement for Ghanaian artists',
                  category: 'Artist Contracts',
                  lastUpdated: '2024-10-15',
                  usage: 15,
                  type: 'Artist Agreement'
                },
                {
                  title: 'International Broadcasting License',
                  description: 'BBC Africa and VOA Africa licensing template',
                  category: 'Licensing',
                  lastUpdated: '2024-09-20',
                  usage: 8,
                  type: 'Licensing Agreement'
                },
                {
                  title: 'Mechanical Rights Template',
                  description: 'West African mechanical reproduction rights',
                  category: 'Mechanical Rights',
                  lastUpdated: '2024-10-20',
                  usage: 5,
                  type: 'Mechanical Rights'
                },
                {
                  title: 'Publishing Administration',
                  description: 'Full publishing administration agreement',
                  category: 'Publishing',
                  lastUpdated: '2024-08-15',
                  usage: 12,
                  type: 'Publishing Agreement'
                },
                {
                  title: 'Regional Distribution Agreement',
                  description: 'West African regional distribution template',
                  category: 'Distribution',
                  lastUpdated: '2024-07-10',
                  usage: 6,
                  type: 'Distribution Agreement'
                },
                {
                  title: 'Performance Rights Template',
                  description: 'Live performance and broadcast performance rights',
                  category: 'Performance Rights',
                  lastUpdated: '2024-06-01',
                  usage: 9,
                  type: 'Performance Agreement'
                }
              ].map((template, index) => (
                <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      template.type === 'Artist Agreement' ? 'bg-green-100 dark:bg-green-900/30' :
                      template.type === 'Licensing Agreement' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      template.type === 'Mechanical Rights' ? 'bg-orange-100 dark:bg-orange-900/30' :
                      'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      {getTypeIcon(template.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{template.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{template.category}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {template.description}
                  </p>

                  <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>Last updated: {formatDate(template.lastUpdated)}</p>
                    <p>Used {template.usage} times</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <button className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                        Edit Template
                      </button>
                      <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        Use Template
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Contract Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg">
                    <Plus className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Contract</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitContract} className="p-6 space-y-6">
              {/* Contract Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contract Title *
                </label>
                <input
                  type="text"
                  value={newContract.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter contract title"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contract Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contract Type *
                  </label>
                  <select
                    value={newContract.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="Artist Agreement">Artist Agreement</option>
                    <option value="Licensing Agreement">Licensing Agreement</option>
                    <option value="Mechanical Rights">Mechanical Rights</option>
                    <option value="Publishing Agreement">Publishing Agreement</option>
                    <option value="Distribution Agreement">Distribution Agreement</option>
                    <option value="Performance Agreement">Performance Agreement</option>
                  </select>
                </div>

                {/* Artist/Entity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Artist/Entity *
                  </label>
                  <input
                    type="text"
                    value={newContract.artist}
                    onChange={(e) => handleInputChange('artist', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter artist or entity name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newContract.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={newContract.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contract Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contract Value (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newContract.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Territory */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Territory *
                  </label>
                  <select
                    value={newContract.territory}
                    onChange={(e) => handleInputChange('territory', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="Ghana">Ghana</option>
                    <option value="West Africa">West Africa</option>
                    <option value="International">International</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
              </div>

              {/* Renewal Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Renewal Date (Optional)
                </label>
                <input
                  type="date"
                  value={newContract.renewalDate}
                  onChange={(e) => handleInputChange('renewalDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newContract.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Add any additional notes or terms"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ContractsLegal;
