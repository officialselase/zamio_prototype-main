import { Card } from '@zamio/ui';
import {
  BarChart3,
  Radio,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Building,
  Eye,
  Activity,
  Settings,
  Download,
  Database,
  Shield
} from 'lucide-react';

import type {
  AdminPlatformStats,
  AdminPublisherStats,
  AdminRecentActivity
} from '../../lib/api';

interface OverviewProps {
  platformStats?: AdminPlatformStats;
  publisherStats?: AdminPublisherStats;
  recentActivity?: AdminRecentActivity[];
  loading?: boolean;
  error?: string | null;
}

const fallbackPlatformStats: AdminPlatformStats = {
  totalStations: 0,
  totalArtists: 0,
  totalSongs: 0,
  totalPlays: 0,
  totalRoyalties: 0,
  pendingPayments: 0,
  activeDistributors: 0,
  monthlyGrowth: 0,
  systemHealth: 0,
  pendingDisputes: 0,
};

const fallbackPublisherStats: AdminPublisherStats = {
  totalPublishers: 0,
  activeAgreements: 0,
  pendingPublisherPayments: 0,
  internationalPartners: 0,
  catalogsUnderReview: 0,
  agreementsExpiring: 0,
  payoutVelocity: 0,
};

export const Overview = ({
  platformStats,
  publisherStats,
  recentActivity,
  loading = false,
  error,
}: OverviewProps) => {
  const resolvedPlatformStats = platformStats ?? fallbackPlatformStats;
  const resolvedPublisherStats = publisherStats ?? fallbackPublisherStats;
  const activityItems = recentActivity?.length ? recentActivity.slice(0, 5) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return { bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' };
      case 'completed':
        return { bg: 'bg-blue-100 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' };
      case 'resolved':
        return { bg: 'bg-purple-100 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-700 dark:text-gray-300' };
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'station':
        return <Radio className="w-5 h-5" />;
      case 'payment':
        return <DollarSign className="w-5 h-5" />;
      case 'dispute':
        return <Shield className="w-5 h-5" />;
      case 'artist':
        return <Users className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div>
      {/* Core Operational Metrics */}
      <div className="mb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Operational Overview
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Core platform metrics and operational health indicators
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </button>
            <button className="px-5 py-2.5 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200/50 dark:border-slate-600/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 backdrop-blur-sm">
              View Details
            </button>
          </div>
        </div>

        {/* Core Operational Metrics */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`}>
          {/* Active Stations Card */}
          <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Active Stations</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {resolvedPlatformStats.totalStations}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Radio className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center mr-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-green-600 dark:text-green-400">+8.2%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
            </div>
          </Card>

          {/* Registered Artists Card */}
          <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Registered Artists</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  {resolvedPlatformStats.totalArtists.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center mr-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-green-600 dark:text-green-400">+{resolvedPlatformStats.monthlyGrowth}%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">growth</span>
            </div>
          </Card>

          {/* Total Royalties Card */}
          <Card className="bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Royalties</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  ₵{resolvedPlatformStats.totalRoyalties.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center mr-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-green-600 dark:text-green-400">+15.3%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">this month</span>
            </div>
          </Card>

          {/* Pending Payments Card */}
          <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Pending Payments</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  ₵{resolvedPlatformStats.pendingPayments.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Requires attention</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${resolvedPlatformStats.pendingDisputes > 10 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'}`}>
                {resolvedPlatformStats.pendingDisputes > 10 ? 'Urgent' : 'Normal'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Publisher Network & System Health */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-16">
        {/* Publisher Network Snapshot */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Publisher Network
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Partner coverage and agreements status
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>View All</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-indigo-200/40 dark:border-slate-600/30">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                {resolvedPublisherStats.totalPublishers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Publishers</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-blue-50/60 to-sky-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-blue-200/40 dark:border-slate-600/30">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {resolvedPublisherStats.activeAgreements}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Active Agreements</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-emerald-200/40 dark:border-slate-600/30">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                {resolvedPublisherStats.internationalPartners}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">International PROs</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-amber-200/40 dark:border-slate-600/30">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                {resolvedPublisherStats.agreementsExpiring}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Agreements Expiring</div>
            </div>
          </div>
        </Card>

        {/* System Health Monitor */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  System Health
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Real-time system performance metrics
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50/60 to-emerald-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-gray-200/40 dark:border-slate-600/30">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 dark:text-gray-300 font-semibold">API Performance</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{resolvedPlatformStats.systemHealth}%</span>
                <div className="w-20 h-3 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50/60 to-blue-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-gray-200/40 dark:border-slate-600/30">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 dark:text-gray-300 font-semibold">Database Load</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">73%</span>
                <div className="w-20 h-3 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50/60 to-green-50/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-gray-200/40 dark:border-slate-600/30">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 dark:text-gray-300 font-semibold">Payment Processing</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-600 dark:text-green-400 font-bold text-lg">Active</span>
                <div className="w-20 h-3 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Platform Activity Feed */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Recent Activity
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Latest platform events and updates
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 dark:from-violet-400 dark:to-violet-500 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Live
              </button>
              <button className="px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium border border-gray-200/50 dark:border-slate-600/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 backdrop-blur-sm">
                All
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {loading && (
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Loading dashboard activity...
              </div>
            )}
            {!loading && error && (
              <div className="text-sm text-red-500 dark:text-red-400 font-medium">
                {error}
              </div>
            )}
            {!loading && !error && activityItems.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                No recent activity yet.
              </div>
            )}
            {activityItems.map((activity) => {
              const statusColors = getStatusColor(activity.status);
              return (
                <div
                  key={activity.id}
                  className={`flex items-start space-x-4 p-5 bg-gradient-to-r from-gray-50/60 to-gray-100/40 dark:from-slate-800/40 dark:to-slate-700/30 rounded-xl border border-gray-200/40 dark:border-slate-600/30 hover:from-violet-50/50 hover:to-purple-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-700/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 cursor-pointer group`}
                >
                  <div className={`p-3 rounded-xl ${statusColors.bg} ${statusColors.border} ${statusColors.text} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {getStatusIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-semibold text-lg group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300 mb-1">
                      {activity.description}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {activity.time}
                    </div>
                  </div>
                  <div className="text-right">
                    {typeof activity.amount === 'number' && !Number.isNaN(activity.amount) && (
                      <div className="text-green-600 dark:text-green-400 font-bold text-lg mb-1">
                        ₵{activity.amount.toLocaleString()}
                      </div>
                    )}
                    <div className={`text-sm ${statusColors.text} capitalize font-semibold px-3 py-1 rounded-full bg-white/50 dark:bg-slate-800/50`}>
                      {activity.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 dark:from-pink-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Quick Actions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Essential admin tools and shortcuts
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 group hover:from-purple-600 hover:to-pink-600">
              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Export Reports</span>
            </button>
            <button className="w-full bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-xl font-semibold border border-gray-200/50 dark:border-slate-600/50 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 group backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-700/80">
              <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>System Settings</span>
            </button>
            <button className="w-full bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-xl font-semibold border border-gray-200/50 dark:border-slate-600/50 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 group backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-700/80">
              <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Security Center</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
