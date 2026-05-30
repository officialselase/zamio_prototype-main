import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Radio,
  TrendingUp,
  DollarSign,
  Shield,
  AlertTriangle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Globe,
  Database,
  Settings,
  Bell,
  Search,
  Download,
  Eye,
  UserCheck,
  Disc,
  CreditCard,
  Activity,
  Wallet,
  Award,
  UserPlus,
  BellRing,
  Home,
  Building,
  FileText,
  Target,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Music,
  MapPin,
  Award as AwardIcon,
  Target as TargetIcon,
} from 'lucide-react';

import {
  Overview,
  Stations,
  AttributionQA,
  Repertoire,
  TariffsCycles,
  ExportsRemittance,
  Monitoring,
  Analytics,
  System
} from '../components/dashboard';
import { fetchAdminDashboard, type AdminDashboardResponse } from '../lib/api';

// Import the UI components
import { Card } from '@zamio/ui';

const ZamioAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError(null);

    try {
      const data = await fetchAdminDashboard();
      setDashboardData(data);
    } catch (err: unknown) {
      const apiMessage =
        (typeof err === 'object' && err !== null && 'response' in err &&
          (err as { response?: { data?: { error?: string; detail?: string } } }).response?.data?.error) ||
        (err instanceof Error ? err.message : null);
      setDashboardError(apiMessage || 'Unable to load admin analytics. Please try again.');
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' };
      case 'pending':
        return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300' };
      case 'urgent':
        return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' };
      case 'warning':
        return { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' };
      default:
        return { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-700 dark:text-gray-300' };
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="w-4 h-4" />;
      case 'registration':
        return <UserPlus className="w-4 h-4" />;
      case 'dispute':
        return <AlertTriangle className="w-4 h-4" />;
      case 'station':
        return <Radio className="w-4 h-4" />;
      case 'distribution':
        return <Disc className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getPublisherStatusStyles = (status: string) => {
    switch (status) {
      case 'Active':
        return 'border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'Renewing':
        return 'border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'Watchlist':
        return 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300';
      default:
        return 'border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
    }
  };

  // Dashboard content component that receives activeTab as prop
  const DashboardContent = ({ activeTab }: { activeTab: string }) => {
    const tabs = [
      { id: 'overview', name: 'Overview', icon: BarChart3 },
      { id: 'stations', name: 'Stations', icon: Radio },
      { id: 'qa', name: 'Attribution QA', icon: Target },
      { id: 'repertoire', name: 'Repertoire', icon: Music },
      { id: 'tariffs', name: 'Tariffs & Cycles', icon: FileText },
      { id: 'exports', name: 'Exports & Remittance', icon: Download },
      { id: 'monitoring', name: 'Monitoring', icon: Activity },
      { id: 'analytics', name: 'Analytics', icon: TrendingUp },
      { id: 'system', name: 'System', icon: Settings },
    ];

    return (
      <main className="w-full px-6 py-8 min-h-screen">
        {/* Dashboard Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  {React.createElement(tabs.find(tab => tab.id === activeTab)?.icon || BarChart3, { className: "w-6 h-6 text-white" })}
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    ZamIO Admin Dashboard
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    {tabs.find(tab => tab.id === activeTab)?.name} - Welcome back! Here's what's happening with your platform today.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="text-center lg:text-right">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                  Export Report
                </button>
                <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <Overview
            platformStats={dashboardData?.platformStats}
            publisherStats={dashboardData?.publisherStats}
            recentActivity={dashboardData?.recentActivity}
            loading={loadingDashboard}
            error={dashboardError}
          />
        )}
        {activeTab === 'stations' && <Stations />}
        {activeTab === 'qa' && <AttributionQA />}
        {activeTab === 'repertoire' && <Repertoire />}
        {activeTab === 'tariffs' && <TariffsCycles />}
        {activeTab === 'exports' && <ExportsRemittance />}
        {activeTab === 'monitoring' && <Monitoring />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'system' && <System />}

        {/* Placeholder content for other tabs */}
        {activeTab !== 'overview' && activeTab !== 'stations' && activeTab !== 'qa' && activeTab !== 'repertoire' && activeTab !== 'tariffs' && activeTab !== 'exports' && activeTab !== 'monitoring' && activeTab !== 'analytics' && activeTab !== 'system' && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  {React.createElement(tabs.find(tab => tab.id === activeTab)?.icon || BarChart3, { className: "w-8 h-8 text-white" })}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {tabs.find(tab => tab.id === activeTab)?.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                  This section is ready for implementation. Content for {tabs.find(tab => tab.id === activeTab)?.name} will be added here.
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                  Start Building
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>
    );
  };

  return <DashboardContent activeTab={activeTab} />;
};

export default ZamioAdminDashboard;