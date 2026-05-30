import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  TrendingUp,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Card } from '@zamio/ui';
import { fetchDisputes, type Dispute } from '../lib/api';

const Disputes = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch disputes from API
  useEffect(() => {
    const loadDisputes = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page,
          page_size: 50,
        };
        
        if (statusFilter !== 'all') params.status = statusFilter;
        if (priorityFilter !== 'all') params.priority = priorityFilter;
        if (categoryFilter !== 'all') params.type = categoryFilter;
        if (searchTerm) params.search = searchTerm;

        const response = await fetchDisputes(params);
        setDisputes(response.results);
        setTotalCount(response.count);
      } catch (err: any) {
        console.error('Failed to fetch disputes:', err);
        setError(err?.response?.data?.message || 'Failed to load disputes. Please try again.');
        setDisputes([]);
      } finally {
        setLoading(false);
      }
    };

    loadDisputes();
  }, [statusFilter, priorityFilter, categoryFilter, searchTerm, page]);

  // Filter disputes based on search (client-side for immediate feedback)
  const filteredDisputes = disputes;

  // Calculate summary stats
  const stats = {
    totalDisputes: totalCount,
    openDisputes: disputes.filter(d => d.status === 'open' || d.status === 'investigating' || d.status === 'pending').length,
    resolvedDisputes: disputes.filter(d => d.status === 'resolved').length,
    escalatedDisputes: disputes.filter(d => d.status === 'escalated').length,
    totalImpact: 0, // Would need to be calculated from backend
    avgResolutionTime: 0, // Would need to be calculated from backend
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'pending_info':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'escalated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attribution':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'data':
        return <TrendingUp className="w-5 h-5 text-purple-600" />;
      case 'technical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <main className="w-full px-6 py-8 min-h-screen">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 dark:from-red-400 dark:to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Disputes Management
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Manage station-flagged disputes and resolution workflows
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/disputes/analytics"
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Analytics</span>
              </Link>
              <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Dispute</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Disputes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {stats.totalDisputes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50/90 via-yellow-50/80 to-amber-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-orange-300 dark:hover:border-orange-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Open Disputes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300">
                  {stats.openDisputes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/60 dark:to-yellow-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-green-300 dark:hover:border-green-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Resolved</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                  {stats.resolvedDisputes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50/90 via-rose-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-red-300 dark:hover:border-red-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Escalated</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                  {stats.escalatedDisputes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/60 dark:to-rose-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
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
                    placeholder="Search disputes by title, description, or station..."
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
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="pending_info">Pending Info</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="attribution">Attribution</option>
                  <option value="payment">Payment</option>
                  <option value="data">Data</option>
                  <option value="technical">Technical</option>
                  <option value="policy">Policy</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-slate-600"
                      checked={selectedDisputes.length === filteredDisputes.length && filteredDisputes.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDisputes(filteredDisputes.map(d => d.id));
                        } else {
                          setSelectedDisputes([]);
                        }
                      }}
                    />
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Dispute</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Submitted By</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Priority</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Duration</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Last Updated</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading disputes...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
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
                ) : filteredDisputes.map((dispute) => (
                  <tr key={dispute.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-slate-600"
                        checked={selectedDisputes.includes(dispute.dispute_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDisputes([...selectedDisputes, dispute.dispute_id]);
                          } else {
                            setSelectedDisputes(selectedDisputes.filter(id => id !== dispute.dispute_id));
                          }
                        }}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dispute.dispute_type === 'attribution' ? 'bg-blue-100 dark:bg-blue-900/20' : dispute.dispute_type === 'payment' ? 'bg-green-100 dark:bg-green-900/20' : dispute.dispute_type === 'data' ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                          {getCategoryIcon(dispute.dispute_type)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{dispute.title}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{dispute.dispute_type} • {dispute.evidence_count || 0} evidence</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{dispute.submitted_by.first_name} {dispute.submitted_by.last_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{dispute.submitted_by.user_type}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(dispute.status)}`}>
                        <span className="capitalize">{dispute.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(dispute.priority)}`}>
                        <span className="capitalize">{dispute.priority}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">{dispute.days_open} days</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{dispute.comments_count || 0} comments</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">
                        {new Date(dispute.updated_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(dispute.updated_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/disputes/${dispute.dispute_id}`}
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
          {!loading && !error && filteredDisputes.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No disputes found matching your criteria.</p>
            </div>
          )}
        </Card>
      </main>
  );
};

export default Disputes;
