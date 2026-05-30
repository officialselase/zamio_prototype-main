import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  TrendingUp,
  Users,
  Globe,
  FileText,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@zamio/ui';
import { fetchAllPublishers, type Publisher } from '../lib/api';

// Mock data from our reference documents (kept as fallback)
const mockPartners = [
  // Local Partners
  {
    id: 'local-1',
    name: 'GHAMRO',
    type: 'local',
    reportingStandard: 'CWR',
    adminFee: 15.0,
    contactInfo: {
      email: 'info@ghamro.org',
      phone: '+233 30 297 6156',
      address: 'Accra, Ghana',
      website: 'https://ghamro.org'
    },
    status: 'active',
    joinDate: '2020-01-15',
    description: 'Ghana Music Rights Organization - Primary PRO for Ghanaian musicians',
    metrics: {
      totalAgreements: 12,
      activeAgreements: 10,
      totalRoyaltyCollected: 2847293.45,
      lastCollectionDate: '2023-12-15',
      disputeCount: 3
    }
  },
  {
    id: 'local-2',
    name: 'Musiga Rights',
    type: 'local',
    reportingStandard: 'CSV',
    adminFee: 12.5,
    contactInfo: {
      email: 'rights@musiga.org',
      phone: '+233 24 123 4567',
      address: 'Accra, Ghana'
    },
    status: 'active',
    joinDate: '2021-03-20',
    description: 'Musicians Union of Ghana rights management division',
    metrics: {
      totalAgreements: 8,
      activeAgreements: 7,
      totalRoyaltyCollected: 1256789.23,
      lastCollectionDate: '2023-12-10',
      disputeCount: 1
    }
  },
  // International Partners
  {
    id: 'intl-1',
    name: 'ASCAP',
    type: 'international',
    reportingStandard: 'CWR',
    adminFee: 11.5,
    contactInfo: {
      email: 'licensing@ascap.com',
      phone: '+1 212 621 6000',
      address: 'New York, NY, USA',
      website: 'https://www.ascap.com'
    },
    status: 'active',
    joinDate: '2019-06-01',
    description: 'American Society of Composers, Authors and Publishers',
    metrics: {
      totalAgreements: 45,
      activeAgreements: 42,
      totalRoyaltyCollected: 15428739.67,
      lastCollectionDate: '2023-12-20',
      disputeCount: 8
    }
  },
  {
    id: 'intl-2',
    name: 'BMI',
    type: 'international',
    reportingStandard: 'DDEX',
    adminFee: 12.0,
    contactInfo: {
      email: 'info@bmi.com',
      phone: '+1 212 586 2000',
      address: 'New York, NY, USA',
      website: 'https://www.bmi.com'
    },
    status: 'active',
    joinDate: '2019-08-15',
    description: 'Broadcast Music, Inc.',
    metrics: {
      totalAgreements: 38,
      activeAgreements: 35,
      totalRoyaltyCollected: 12837492.18,
      lastCollectionDate: '2023-12-18',
      disputeCount: 5
    }
  },
  {
    id: 'intl-3',
    name: 'PRS for Music',
    type: 'international',
    reportingStandard: 'CWR',
    adminFee: 10.5,
    contactInfo: {
      email: 'members@prsformusic.com',
      phone: '+44 20 7580 5544',
      address: 'London, UK',
      website: 'https://www.prsformusic.com'
    },
    status: 'active',
    joinDate: '2020-02-10',
    description: 'Performing Right Society for Music (UK)',
    metrics: {
      totalAgreements: 28,
      activeAgreements: 26,
      totalRoyaltyCollected: 8937456.92,
      lastCollectionDate: '2023-12-22',
      disputeCount: 4
    }
  }
];

const Partners = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'international'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch publishers from API
  useEffect(() => {
    const loadPublishers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page,
        };
        
        if (searchTerm) params.search = searchTerm;

        const response = await fetchAllPublishers(params);
        if (response.data) {
          setPublishers(response.data.publishers || []);
          setTotalPages(response.data.pagination?.total_pages || 1);
        }
      } catch (err: any) {
        console.error('Failed to fetch publishers:', err);
        setError(err?.response?.data?.message || 'Failed to load publishers. Please try again.');
        setPublishers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPublishers();
  }, [searchTerm, page]);

  // Transform publishers to match the UI format
  const transformedPartners = publishers.map(pub => ({
    id: pub.publisher_id,
    name: pub.company_name || 'Unnamed Publisher',
    type: pub.country === 'Ghana' ? 'local' : 'international',
    reportingStandard: 'CWR',
    adminFee: 0,
    contactInfo: {
      email: pub.primary_contact_email || pub.user?.email || '',
      phone: pub.primary_contact_phone || '',
      address: `${pub.city || ''}, ${pub.country || ''}`.trim(),
      website: pub.website_url || ''
    },
    status: pub.active ? 'active' : 'inactive',
    joinDate: new Date(pub.created_at).toISOString().split('T')[0],
    description: `${pub.company_type || 'Publisher'} - ${pub.industry || 'Music Rights'}`,
    metrics: {
      totalAgreements: 0,
      activeAgreements: 0,
      totalRoyaltyCollected: 0,
      lastCollectionDate: new Date().toISOString().split('T')[0],
      disputeCount: 0
    }
  }));

  // Filter partners based on active tab and search
  const filteredPartners = transformedPartners.filter(partner => {
    const matchesTab = activeTab === 'all' || partner.type === activeTab;
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    return matchesTab && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    totalPartners: transformedPartners.length,
    localPartners: transformedPartners.filter(p => p.type === 'local').length,
    internationalPartners: transformedPartners.filter(p => p.type === 'international').length,
    activeAgreements: transformedPartners.reduce((sum, p) => sum + p.metrics.activeAgreements, 0),
    totalRoyaltyCollected: transformedPartners.reduce((sum, p) => sum + p.metrics.totalRoyaltyCollected, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'local' ?
      <Building className="w-5 h-5 text-blue-600" /> :
      <Globe className="w-5 h-5 text-purple-600" />;
  };

  return (
    <main className="w-full px-6 py-8 min-h-screen">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Partners Management
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Manage local and international PRO partnerships for royalty collection
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Partner</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Partners</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {stats.totalPartners}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Local Partners</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  {stats.localPartners}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Building className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">International Partners</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  {stats.internationalPartners}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Active Agreements</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  {stats.activeAgreements}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Partner Type Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            {[
              { id: 'all', name: 'All Partners', icon: Building },
              { id: 'local', name: 'Local Partners', icon: Building },
              { id: 'international', name: 'International Partners', icon: Globe },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search partners by name or description..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Partners Table */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Partner</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Type</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Agreements</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Royalty Collected</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading publishers...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600 dark:text-red-400">{error}</p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredPartners.map((partner) => (
                  <tr key={partner.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${partner.type === 'local' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-purple-100 dark:bg-purple-900/20'}`}>
                          {getTypeIcon(partner.type)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{partner.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{partner.contactInfo.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${partner.type === 'local' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'}`}>
                          {partner.type === 'local' ? 'Local' : 'International'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(partner.status)}`}>
                        <span className="capitalize">{partner.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">{partner.metrics.activeAgreements}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">of {partner.metrics.totalAgreements} total</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">₵{partner.metrics.totalRoyaltyCollected.toLocaleString()}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Last: {partner.metrics.lastCollectionDate}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/partners/${partner.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors duration-200">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && filteredPartners.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No partners found matching your criteria.</p>
            </div>
          )}
        </Card>
      </main>
  );
};

export default Partners;
