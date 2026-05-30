import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  Activity,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  Globe,
} from 'lucide-react';
import { Card } from '@zamio/ui';

// Enhanced mock data for agreements
const mockAgreements = [
  {
    id: 'agreement-1',
    partnerId: 'local-1', // GHAMRO
    partnerName: 'GHAMRO',
    partnerType: 'local',
    territory: 'United States',
    territoryCode: 'US',
    startDate: '2020-01-15',
    endDate: null, // Ongoing
    status: 'active',
    cadence: 'quarterly',
    feeOverride: 11.5,
    terms: 'Reciprocal agreement for US territory representation with reduced admin fee',
    performance: {
      totalCollections: 450000.00,
      lastCollectionAmount: 125000.00,
      lastCollectionDate: '2023-12-15',
      disputes: 2,
      complianceRate: 94.5,
      averageCollectionTime: 12 // days
    },
    notes: 'Reduced fee due to high volume partnership'
  },
  {
    id: 'agreement-2',
    partnerId: 'intl-1', // ASCAP
    partnerName: 'ASCAP',
    partnerType: 'international',
    territory: 'Ghana',
    territoryCode: 'GH',
    startDate: '2019-06-01',
    endDate: null,
    status: 'active',
    cadence: 'monthly',
    feeOverride: null,
    terms: 'ASCAP represents ZamIO repertoire in Ghana',
    performance: {
      totalCollections: 890000.00,
      lastCollectionAmount: 95000.00,
      lastCollectionDate: '2023-12-20',
      disputes: 1,
      complianceRate: 97.2,
      averageCollectionTime: 8
    },
    notes: 'Strong performance with minimal disputes'
  },
  {
    id: 'agreement-3',
    partnerId: 'intl-3', // PRS for Music
    partnerName: 'PRS for Music',
    partnerType: 'international',
    territory: 'United Kingdom',
    territoryCode: 'GB',
    startDate: '2020-02-10',
    endDate: '2024-02-10', // Expires in 2024
    status: 'active',
    cadence: 'quarterly',
    feeOverride: 10.5,
    terms: 'UK territory representation with performance-based fee structure',
    performance: {
      totalCollections: 675000.00,
      lastCollectionAmount: 85000.00,
      lastCollectionDate: '2023-12-22',
      disputes: 0,
      complianceRate: 98.8,
      averageCollectionTime: 10
    },
    notes: 'Excellent compliance, considering renewal'
  },
  {
    id: 'agreement-4',
    partnerId: 'local-2', // Musiga Rights
    partnerName: 'Musiga Rights',
    partnerType: 'local',
    territory: 'Canada',
    territoryCode: 'CA',
    startDate: '2021-06-01',
    endDate: null,
    status: 'pending',
    cadence: 'monthly',
    feeOverride: null,
    terms: 'Canadian territory representation for Ghanaian repertoire',
    performance: {
      totalCollections: 185000.00,
      lastCollectionAmount: 45000.00,
      lastCollectionDate: '2023-12-16',
      disputes: 0,
      complianceRate: 96.1,
      averageCollectionTime: 14
    },
    notes: 'Awaiting final approval from Canadian authorities'
  }
];

const Agreements = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');

  // Filter agreements based on criteria
  const filteredAgreements = mockAgreements.filter(agreement => {
    const matchesSearch = agreement.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agreement.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agreement.terms.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter;
    const matchesType = typeFilter === 'all' || agreement.partnerType === typeFilter;
    const matchesTerritory = territoryFilter === 'all' || agreement.territoryCode === territoryFilter;

    return matchesSearch && matchesStatus && matchesType && matchesTerritory;
  });

  // Calculate summary stats
  const stats = {
    totalAgreements: mockAgreements.length,
    activeAgreements: mockAgreements.filter(a => a.status === 'active').length,
    pendingAgreements: mockAgreements.filter(a => a.status === 'pending').length,
    totalCollections: mockAgreements.reduce((sum, a) => sum + a.performance.totalCollections, 0),
    averageCompliance: mockAgreements.reduce((sum, a) => sum + a.performance.complianceRate, 0) / mockAgreements.length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <main className="w-full px-6 py-8 min-h-screen">
        {/* Header with navigation context */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Agreement Management
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Manage reciprocal agreements and cross-border royalty collection
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Link to="/partners" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium">
                      ← Back to Partners
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/partners"
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <Building className="w-4 h-4" />
                <span>View Partners</span>
              </Link>
              <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Agreement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Territory Coverage Map */}
        <div className="mb-8">
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Territory Coverage</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { code: 'US', name: 'United States', status: 'active', agreements: 2 },
                { code: 'GB', name: 'United Kingdom', status: 'active', agreements: 1 },
                { code: 'GH', name: 'Ghana', status: 'active', agreements: 2 },
                { code: 'CA', name: 'Canada', status: 'pending', agreements: 1 },
              ].map((territory) => (
                <div key={territory.code} className={`p-4 rounded-lg border-2 ${territory.status === 'active' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${territory.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="font-semibold text-gray-900 dark:text-white">{territory.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {territory.agreements} agreement{territory.agreements !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </Card>
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
                    placeholder="Search agreements by partner, territory, or terms..."
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
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
                <select
                  className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="local">Local Partners</option>
                  <option value="international">International Partners</option>
                </select>
                <select
                  className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={territoryFilter}
                  onChange={(e) => setTerritoryFilter(e.target.value)}
                >
                  <option value="all">All Territories</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="GH">Ghana</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Agreements Table */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Agreement</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Partner</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Territory</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Performance</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.map((agreement) => (
                  <tr key={agreement.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{agreement.territory}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{agreement.cadence} • {agreement.feeOverride ? `Fee: ${agreement.feeOverride}%` : 'Standard Fee'}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agreement.partnerType === 'local' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-purple-100 dark:bg-purple-900/20'}`}>
                          {agreement.partnerType === 'local' ?
                            <Building className="w-5 h-5 text-blue-600" /> :
                            <Globe className="w-5 h-5 text-purple-600" />
                          }
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{agreement.partnerName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{agreement.partnerType} partner</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{agreement.territory}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(agreement.status)}`}>
                        <span className="capitalize">{agreement.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-gray-900 dark:text-white font-semibold">₵{agreement.performance.totalCollections.toLocaleString()}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {agreement.performance.complianceRate}% compliance • {agreement.performance.disputes} disputes
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200">
                          <Eye className="w-4 h-4" />
                        </button>
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
          {filteredAgreements.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No agreements found matching your criteria.</p>
            </div>
          )}
        </Card>
      </main>
  );
};

export default Agreements;
