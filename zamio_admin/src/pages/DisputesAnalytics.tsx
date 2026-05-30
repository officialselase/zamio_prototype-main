import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building,
  DollarSign,
  Activity,
  FileText,
  PieChart,
  LineChart,
} from 'lucide-react';
import { Card } from '@zamio/ui';

// Mock analytics data for disputes
const mockAnalyticsData = {
  totalDisputes: 45,
  openDisputes: 12,
  resolvedDisputes: 28,
  escalatedDisputes: 5,
  avgResolutionTime: 3.2, // days
  totalImpact: 12500.00,
  monthlyTrends: [
    { month: 'Jan', disputes: 12, resolved: 8 },
    { month: 'Feb', disputes: 15, resolved: 10 },
    { month: 'Mar', disputes: 18, resolved: 12 },
    { month: 'Apr', disputes: 14, resolved: 11 },
    { month: 'May', disputes: 16, resolved: 13 },
    { month: 'Jun', disputes: 19, resolved: 15 },
  ],
  statusDistribution: [
    { status: 'resolved', count: 28, percentage: 62 },
    { status: 'investigating', count: 8, percentage: 18 },
    { status: 'pending_info', count: 6, percentage: 13 },
    { status: 'escalated', count: 3, percentage: 7 },
  ],
  categoryBreakdown: [
    { category: 'attribution', count: 18, color: 'bg-blue-500' },
    { category: 'payment', count: 12, color: 'bg-green-500' },
    { category: 'technical', count: 8, color: 'bg-red-500' },
    { category: 'data', count: 7, color: 'bg-purple-500' },
  ],
  stationPerformance: [
    { station: 'Accra FM', disputes: 8, resolved: 6, avgTime: 2.8, impact: 2100 },
    { station: 'Ghana TV', disputes: 12, resolved: 9, avgTime: 3.5, impact: 3200 },
    { station: 'AfroStream', disputes: 6, resolved: 5, avgTime: 2.1, impact: 1800 },
    { station: 'National Theatre', disputes: 4, resolved: 3, avgTime: 1.9, impact: 1200 },
    { station: 'Kumasi Radio', disputes: 15, resolved: 5, avgTime: 4.2, impact: 4200 },
  ],
  resolutionTimes: [
    { range: '0-1 days', count: 8 },
    { range: '1-3 days', count: 12 },
    { range: '3-7 days', count: 6 },
    { range: '7+ days', count: 2 },
  ]
};

const DisputesAnalytics = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('6months');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'investigating':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'pending_info':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'escalated':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attribution':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'technical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'data':
        return <Activity className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <main className="w-full px-6 py-8 min-h-screen">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Disputes Analytics
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Comprehensive insights into dispute patterns and resolution performance
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <select
                className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
              <Link
                to="/disputes"
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>View Disputes</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Disputes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {mockAnalyticsData.totalDisputes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-green-300 dark:hover:border-green-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Resolved</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                  {mockAnalyticsData.resolvedDisputes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Avg Resolution Time</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  {mockAnalyticsData.avgResolutionTime}d
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Impact</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  ₵{mockAnalyticsData.totalImpact.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trends */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Monthly Dispute Trends</h3>
            <div className="space-y-4">
              {mockAnalyticsData.monthlyTrends.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{month.month}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{month.disputes} disputes</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{month.resolved} resolved</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(month.resolved / month.disputes) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round((month.resolved / month.disputes) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Status Distribution</h3>
            <div className="space-y-4">
              {mockAnalyticsData.statusDistribution.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {status.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${status.status === 'resolved' ? 'bg-green-500' : status.status === 'investigating' ? 'bg-yellow-500' : status.status === 'pending_info' ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${status.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                      {status.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Category Breakdown */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Dispute Categories</h3>
            <div className="space-y-4">
              {mockAnalyticsData.categoryBreakdown.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category.category)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {category.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {category.count}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Resolution Times */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Resolution Time Distribution</h3>
            <div className="space-y-4">
              {mockAnalyticsData.resolutionTimes.map((time) => (
                <div key={time.range} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{time.range}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(time.count / Math.max(...mockAnalyticsData.resolutionTimes.map(t => t.count))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                      {time.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Station Performance Table */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Station Performance Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Station</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Total Disputes</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Resolved</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Avg Resolution Time</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Total Impact</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {mockAnalyticsData.stationPerformance.map((station) => (
                  <tr key={station.station} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{station.station}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">{station.disputes}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-green-600 dark:text-green-400 font-semibold">{station.resolved}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">{station.avgTime}d</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-semibold">₵{station.impact.toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${station.resolved / station.disputes >= 0.8 ? 'bg-green-100 text-green-800' : station.resolved / station.disputes >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {Math.round((station.resolved / station.disputes) * 100)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
  );
};

export default DisputesAnalytics;
