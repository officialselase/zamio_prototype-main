import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  TrendingUp,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
  MapPin,
  Users,
  Music,
  Radio,
  DollarSign,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Settings,
  Plus,
  Save,
  Share,
  Filter as FilterIcon,
  Globe,
  Target,
  Award,
  Clock,
  Activity,
  Zap,
  Layers,
  ChevronDown,
  X,
  FileText,
  Image,
  Table,
  Grid
} from 'lucide-react';

interface RevenueData {
  id: string;
  period: string;
  revenue: number;
  plays: number;
  uniqueListeners: number;
  averagePlayTime: number;
  topGenre: string;
  topStation: string;
  growth: number;
}

interface GeographicData {
  id: string;
  region: string;
  country: string;
  revenue: number;
  plays: number;
  listeners: number;
  topCity: string;
  growth: number;
  percentage: number;
}

interface DemographicData {
  id: string;
  ageGroup: string;
  gender: string;
  revenue: number;
  plays: number;
  percentage: number;
  topGenre: string;
  averageSession: number;
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  category: 'revenue' | 'engagement' | 'technical' | 'growth';
}

interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  widgets: string[];
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
  lastModified: string;
}

export const Analytics = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'geographic' | 'demographic' | 'performance' | 'custom'>('revenue');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null);
  const [showMetricModal, setShowMetricModal] = useState(false);

  // Mock revenue analytics data
  const [revenueData, setRevenueData] = useState<RevenueData[]>([
    {
      id: '1',
      period: 'Jan 2024',
      revenue: 45000,
      plays: 125000,
      uniqueListeners: 25000,
      averagePlayTime: 3.2,
      topGenre: 'Afrobeats',
      topStation: 'Accra Central FM',
      growth: 12.5
    },
    {
      id: '2',
      period: 'Feb 2024',
      revenue: 52000,
      plays: 142000,
      uniqueListeners: 28000,
      averagePlayTime: 3.5,
      topGenre: 'Hiplife',
      topStation: 'Kumasi Rock FM',
      growth: 15.6
    },
    {
      id: '3',
      period: 'Mar 2024',
      revenue: 61000,
      plays: 168000,
      uniqueListeners: 32000,
      averagePlayTime: 3.8,
      topGenre: 'Gospel',
      topStation: 'Accra Central FM',
      growth: 17.3
    },
    {
      id: '4',
      period: 'Apr 2024',
      revenue: 58000,
      plays: 156000,
      uniqueListeners: 31000,
      averagePlayTime: 3.6,
      topGenre: 'Highlife',
      topStation: 'Takoradi Wave FM',
      growth: -5.0
    },
    {
      id: '5',
      period: 'May 2024',
      revenue: 72000,
      plays: 195000,
      uniqueListeners: 38000,
      averagePlayTime: 4.1,
      topGenre: 'Afrobeats',
      topStation: 'Accra Central FM',
      growth: 24.1
    }
  ]);

  // Mock geographic data
  const [geographicData, setGeographicData] = useState<GeographicData[]>([
    {
      id: '1',
      region: 'Greater Accra',
      country: 'Ghana',
      revenue: 285000,
      plays: 890000,
      listeners: 125000,
      topCity: 'Accra',
      growth: 18.5,
      percentage: 45.2
    },
    {
      id: '2',
      region: 'Ashanti',
      country: 'Ghana',
      revenue: 156000,
      plays: 520000,
      listeners: 89000,
      topCity: 'Kumasi',
      growth: 12.3,
      percentage: 24.7
    },
    {
      id: '3',
      region: 'Western',
      country: 'Ghana',
      revenue: 89000,
      plays: 280000,
      listeners: 56000,
      topCity: 'Takoradi',
      growth: 8.9,
      percentage: 14.1
    },
    {
      id: '4',
      region: 'Northern',
      country: 'Ghana',
      revenue: 45000,
      plays: 150000,
      listeners: 34000,
      topCity: 'Tamale',
      growth: 15.2,
      percentage: 7.1
    },
    {
      id: '5',
      region: 'International',
      country: 'Various',
      revenue: 56000,
      plays: 180000,
      listeners: 45000,
      topCity: 'Lagos',
      growth: 22.1,
      percentage: 8.9
    }
  ]);

  // Mock demographic data
  const [demographicData, setDemographicData] = useState<DemographicData[]>([
    {
      id: '1',
      ageGroup: '18-24',
      gender: 'All',
      revenue: 185000,
      plays: 620000,
      percentage: 31.2,
      topGenre: 'Afrobeats',
      averageSession: 45
    },
    {
      id: '2',
      ageGroup: '25-34',
      gender: 'All',
      revenue: 245000,
      plays: 780000,
      percentage: 39.3,
      topGenre: 'Hiplife',
      averageSession: 52
    },
    {
      id: '3',
      ageGroup: '35-44',
      gender: 'All',
      revenue: 125000,
      plays: 380000,
      percentage: 19.1,
      topGenre: 'Gospel',
      averageSession: 38
    },
    {
      id: '4',
      ageGroup: '45+',
      gender: 'All',
      revenue: 65000,
      plays: 210000,
      percentage: 10.4,
      topGenre: 'Highlife',
      averageSession: 42
    }
  ]);

  // Mock performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      id: '1',
      name: 'Monthly Revenue',
      value: 72000,
      previousValue: 61000,
      change: 17.7,
      trend: 'up',
      unit: 'GHS',
      category: 'revenue'
    },
    {
      id: '2',
      name: 'Total Plays',
      value: 195000,
      previousValue: 168000,
      change: 16.1,
      trend: 'up',
      unit: 'plays',
      category: 'engagement'
    },
    {
      id: '3',
      name: 'Unique Listeners',
      value: 38000,
      previousValue: 32000,
      change: 18.8,
      trend: 'up',
      unit: 'listeners',
      category: 'engagement'
    },
    {
      id: '4',
      name: 'Average Session Time',
      value: 4.1,
      previousValue: 3.8,
      change: 7.9,
      trend: 'up',
      unit: 'minutes',
      category: 'engagement'
    },
    {
      id: '5',
      name: 'System Uptime',
      value: 99.7,
      previousValue: 99.5,
      change: 0.2,
      trend: 'up',
      unit: '%',
      category: 'technical'
    }
  ]);

  // Mock custom dashboards
  const [customDashboards, setCustomDashboards] = useState<CustomDashboard[]>([
    {
      id: '1',
      name: 'Executive Overview',
      description: 'High-level revenue and growth metrics for leadership',
      widgets: ['revenue_chart', 'top_performers', 'geographic_map'],
      createdBy: 'Admin User',
      createdAt: '1 month ago',
      isPublic: true,
      lastModified: '2 days ago'
    },
    {
      id: '2',
      name: 'Technical Performance',
      description: 'System metrics and technical KPIs for operations team',
      widgets: ['system_metrics', 'error_rates', 'uptime_chart'],
      createdBy: 'Tech Lead',
      createdAt: '2 weeks ago',
      isPublic: false,
      lastModified: '1 day ago'
    }
  ]);

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') {
      return <TrendingUp className={`w-4 h-4 ${change > 0 ? 'text-green-500' : 'text-red-500'}`} />;
    } else if (trend === 'down') {
      return <TrendingDown className={`w-4 h-4 ${change > 0 ? 'text-green-500' : 'text-red-500'}`} />;
    }
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up') {
      return change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    } else if (trend === 'down') {
      return change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  const handleViewMetric = (metric: PerformanceMetric) => {
    setSelectedMetric(metric);
    setShowMetricModal(true);
  };

  return (
    <div>
      {/* Analytics Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Business intelligence, trends, and performance insights
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>

            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>

            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Custom Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'revenue', name: 'Revenue Analytics', icon: DollarSign, count: 0 },
            { id: 'geographic', name: 'Geographic Insights', icon: Globe, count: 0 },
            { id: 'demographic', name: 'Demographic Data', icon: Users, count: 0 },
            { id: 'performance', name: 'Performance Metrics', icon: BarChart3, count: performanceMetrics.length },
            { id: 'custom', name: 'Custom Dashboards', icon: Layers, count: customDashboards.length }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Revenue Analytics Tab */}
      {activeTab === 'revenue' && (
        <>
          {/* Revenue Overview Cards */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">₵288K</p>
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +17.3% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Plays</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">986K</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +16.1% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-500 rounded-xl flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Listeners</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">194K</p>
                    <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +18.8% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Session Time</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">3.8m</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +7.9% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Revenue Chart */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Revenue Trends</h3>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <LineChartIcon className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-80 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <LineChartIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Interactive revenue chart will be displayed here</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Shows revenue, plays, and listener trends over time
                </p>
              </div>
            </div>
          </Card>

          {/* Revenue Table */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Monthly Breakdown</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Period</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Plays</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Listeners</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Top Genre</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{item.period}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">₵{item.revenue.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{item.plays.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{item.uniqueListeners.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {item.topGenre}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className={`flex items-center justify-center space-x-1 ${getTrendColor('up', item.growth)}`}>
                          {getTrendIcon('up', item.growth)}
                          <span className="text-sm font-medium">{item.growth > 0 ? '+' : ''}{item.growth}%</span>
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

      {/* Geographic Insights Tab */}
      {activeTab === 'geographic' && (
        <>
          {/* Geographic Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Geographic Revenue Distribution
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Map Placeholder */}
                <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Interactive map will be displayed here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Shows revenue distribution by region
                    </p>
                  </div>
                </div>

                {/* Top Regions */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Top Performing Regions</h4>
                  {geographicData.slice(0, 3).map((region) => (
                    <div key={region.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{region.region}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{region.topCity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">₵{region.revenue.toLocaleString()}</p>
                        <p className={`text-sm ${getTrendColor('up', region.growth)}`}>
                          {region.growth > 0 ? '+' : ''}{region.growth}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Geographic Table */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Regional Performance</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Region</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Plays</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Listeners</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Share</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {geographicData.map((region) => (
                    <tr key={region.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{region.region}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{region.country}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">₵{region.revenue.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{region.plays.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{region.listeners.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mx-auto max-w-16">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${region.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{region.percentage}%</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className={`flex items-center justify-center space-x-1 ${getTrendColor('up', region.growth)}`}>
                          {getTrendIcon('up', region.growth)}
                          <span className="text-sm font-medium">{region.growth > 0 ? '+' : ''}{region.growth}%</span>
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

      {/* Demographic Data Tab */}
      {activeTab === 'demographic' && (
        <>
          {/* Demographic Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Audience Demographics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Age Distribution */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Age Distribution</h4>
                  <div className="space-y-3">
                    {demographicData.map((demo) => (
                      <div key={demo.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{demo.ageGroup}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{demo.topGenre}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">{demo.percentage}%</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{demo.plays.toLocaleString()} plays</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Demographic Chart */}
                <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Demographic pie chart will be displayed here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Shows audience breakdown by age and preferences
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Demographic Details */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Detailed Demographics</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Age Group</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Plays</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Share</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Avg Session</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Top Genre</th>
                  </tr>
                </thead>
                <tbody>
                  {demographicData.map((demo) => (
                    <tr key={demo.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{demo.ageGroup}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">₵{demo.revenue.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{demo.plays.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mx-auto max-w-16">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${demo.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{demo.percentage}%</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="font-medium text-gray-900 dark:text-white">{demo.averageSession}m</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                          {demo.topGenre}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Performance Metrics Tab */}
      {activeTab === 'performance' && (
        <>
          {/* Performance Overview */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {performanceMetrics.map((metric) => (
                <div
                  key={metric.id}
                  onClick={() => handleViewMetric(metric)}
                  className="cursor-pointer hover:shadow-xl transition-all duration-200"
                >
                  <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.name}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {metric.value.toLocaleString()}{metric.unit}
                        </p>
                        <p className={`text-sm flex items-center ${getTrendColor(metric.trend, metric.change)}`}>
                          {getTrendIcon(metric.trend, metric.change)}
                          {metric.change > 0 ? '+' : ''}{metric.change}% from last period
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        metric.category === 'revenue' ? 'bg-green-50 dark:bg-green-900/20' :
                        metric.category === 'engagement' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        metric.category === 'technical' ? 'bg-purple-50 dark:bg-purple-900/20' :
                        'bg-amber-50 dark:bg-amber-900/20'
                      }`}>
                        {metric.category === 'revenue' && <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />}
                        {metric.category === 'engagement' && <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                        {metric.category === 'technical' && <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                        {metric.category === 'growth' && <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trends */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Performance Trends</h3>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <LineChartIcon className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-80 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Performance comparison chart will be displayed here</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Compare metrics across different time periods
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Custom Dashboards Tab */}
      {activeTab === 'custom' && (
        <>
          {/* Custom Dashboards Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Custom Dashboards</h3>
                <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Dashboard</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customDashboards.map((dashboard) => (
                  <div key={dashboard.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{dashboard.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{dashboard.description}</p>
                        </div>
                      </div>
                      {dashboard.isPublic && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                          Public
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Widgets: {dashboard.widgets.length}</p>
                      <div className="flex flex-wrap gap-1">
                        {dashboard.widgets.slice(0, 3).map((widget, index) => (
                          <span key={index} className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md text-xs">
                            {widget.replace('_', ' ')}
                          </span>
                        ))}
                        {dashboard.widgets.length > 3 && (
                          <span className="px-2 py-1 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md text-xs">
                            +{dashboard.widgets.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created by {dashboard.createdBy} • {dashboard.lastModified}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
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

                {/* Create New Dashboard Card */}
                <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="text-center">
                    <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Create New Dashboard</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Build custom analytics views</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Dashboard Builder Tools */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Dashboard Builder</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Available Widgets */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Available Widgets</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Revenue Chart', icon: DollarSign, type: 'chart' },
                    { name: 'Geographic Map', icon: Globe, type: 'map' },
                    { name: 'Top Performers', icon: Award, type: 'table' },
                    { name: 'System Metrics', icon: Activity, type: 'metric' },
                    { name: 'Demographic Breakdown', icon: Users, type: 'chart' },
                    { name: 'Trend Analysis', icon: TrendingUp, type: 'chart' }
                  ].map((widget) => (
                    <div key={widget.name} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:shadow-md transition-all duration-200 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <widget.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{widget.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{widget.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard Preview */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h4>
                <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center">
                  <div className="text-center">
                    <Grid className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Drag widgets here to build your dashboard</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-3">
                  <button className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save Dashboard</span>
                  </button>
                  <button className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                    <Share className="w-4 h-4" />
                    <span>Share Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Metric Details Modal */}
      {showMetricModal && selectedMetric && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedMetric.category === 'revenue' ? 'bg-green-50 dark:bg-green-900/20' :
                  selectedMetric.category === 'engagement' ? 'bg-blue-50 dark:bg-blue-900/20' :
                  selectedMetric.category === 'technical' ? 'bg-purple-50 dark:bg-purple-900/20' :
                  'bg-amber-50 dark:bg-amber-900/20'
                }`}>
                  {selectedMetric.category === 'revenue' && <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />}
                  {selectedMetric.category === 'engagement' && <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                  {selectedMetric.category === 'technical' && <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                  {selectedMetric.category === 'growth' && <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedMetric.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedMetric.category} metric • {selectedMetric.trend} trend
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMetricModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Metric Details */}
                <div className="space-y-6">
                  {/* Current Value */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Value</h3>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedMetric.value.toLocaleString()}{selectedMetric.unit}
                    </div>
                    <div className={`flex items-center space-x-2 ${getTrendColor(selectedMetric.trend, selectedMetric.change)}`}>
                      {getTrendIcon(selectedMetric.trend, selectedMetric.change)}
                      <span className="text-lg font-medium">
                        {selectedMetric.change > 0 ? '+' : ''}{selectedMetric.change}% from previous period
                      </span>
                    </div>
                  </Card>

                  {/* Historical Trend */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historical Trend</h3>
                    <div className="h-48 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <LineChartIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Trend chart will be displayed here</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Insights & Actions */}
                <div className="space-y-6">
                  {/* Insights */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Insights</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Performance</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          This metric shows {selectedMetric.trend === 'up' ? 'improvement' : 'decline'} compared to the previous period.
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Recommendation</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Consider {selectedMetric.trend === 'up' ? 'scaling successful strategies' : 'investigating factors contributing to the decline'}.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <Download className="w-5 h-5" />
                        <span>Export Data</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <Share className="w-5 h-5" />
                        <span>Share Report</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                        <Settings className="w-5 h-5" />
                        <span>Set Alert Threshold</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowMetricModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                View Detailed Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
