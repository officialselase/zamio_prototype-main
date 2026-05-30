import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  Radio,
  Wifi,
  WifiOff,
  Battery,
  Cpu,
  HardDrive,
  Thermometer,
  Settings,
  Bell,
  BellOff,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Info,
  Plus,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Shield,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Database,
  Cloud,
  Zap as ZapIcon,
  Heart,
  AlertOctagon,
  CheckSquare,
  XSquare,
  Clock as ClockIcon,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
  TrendingUp as TrendingUpIcon,
  Download,
  Upload,
  X,
  FileText,
  Archive
} from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: 'scanner' | 'server' | 'router' | 'mobile' | 'desktop';
  location: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  uptime: string;
  lastSeen: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number;
  batteryLevel?: number;
  signalStrength?: number;
  softwareVersion: string;
  ipAddress: string;
  macAddress: string;
}

interface StreamScan {
  id: string;
  stationName: string;
  stationId: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  lastScan: string;
  scanFrequency: string;
  tracksDetected: number;
  errors: number;
  bandwidth: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  location: string;
  deviceId: string;
}

interface BackendJob {
  id: string;
  name: string;
  type: 'data_processing' | 'report_generation' | 'backup' | 'sync' | 'cleanup';
  status: 'running' | 'completed' | 'failed' | 'queued' | 'cancelled';
  progress: number;
  startTime: string;
  endTime?: string;
  duration?: string;
  cpuUsage: number;
  memoryUsage: number;
  errorMessage?: string;
  retryCount: number;
}

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  threshold: {
    warning: number;
    critical: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'device' | 'stream' | 'system' | 'security';
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationChannels: ('email' | 'sms' | 'push' | 'webhook')[];
  createdAt: string;
  lastTriggered?: string;
}

export const Monitoring = () => {
  const [activeTab, setActiveTab] = useState<'devices' | 'streams' | 'jobs' | 'metrics' | 'alerts'>('devices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedJob, setSelectedJob] = useState<BackendJob | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);

  // Mock devices data
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'Accra Central Scanner',
      type: 'scanner',
      location: 'Accra Central FM',
      status: 'online',
      uptime: '15d 8h 32m',
      lastSeen: 'Just now',
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 38,
      temperature: 42,
      signalStrength: 85,
      softwareVersion: 'v2.1.4',
      ipAddress: '192.168.1.101',
      macAddress: '00:1B:44:11:3A:B7'
    },
    {
      id: '2',
      name: 'Kumasi Server Node',
      type: 'server',
      location: 'Kumasi Data Center',
      status: 'warning',
      uptime: '7d 14h 15m',
      lastSeen: '2 minutes ago',
      cpuUsage: 78,
      memoryUsage: 85,
      diskUsage: 72,
      temperature: 58,
      softwareVersion: 'v2.1.3',
      ipAddress: '10.0.1.50',
      macAddress: '00:1B:44:11:3A:C8'
    },
    {
      id: '3',
      name: 'Takoradi Mobile Unit',
      type: 'mobile',
      location: 'Takoradi Wave FM',
      status: 'offline',
      uptime: '0d 0h 0m',
      lastSeen: '3 hours ago',
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      temperature: 0,
      batteryLevel: 15,
      signalStrength: 0,
      softwareVersion: 'v2.1.2',
      ipAddress: '192.168.2.205',
      macAddress: '00:1B:44:11:3A:D9'
    }
  ]);

  // Mock stream scans data
  const [streamScans, setStreamScans] = useState<StreamScan[]>([
    {
      id: '1',
      stationName: 'Accra Central FM',
      stationId: 'STN001',
      status: 'active',
      lastScan: '2 minutes ago',
      scanFrequency: 'Every 30 seconds',
      tracksDetected: 1247,
      errors: 3,
      bandwidth: '128 kbps',
      quality: 'excellent',
      location: 'Accra',
      deviceId: '1'
    },
    {
      id: '2',
      stationName: 'Kumasi Rock FM',
      stationId: 'STN002',
      status: 'active',
      lastScan: '1 minute ago',
      scanFrequency: 'Every 45 seconds',
      tracksDetected: 892,
      errors: 1,
      bandwidth: '96 kbps',
      quality: 'good',
      location: 'Kumasi',
      deviceId: '2'
    },
    {
      id: '3',
      stationName: 'Takoradi Wave FM',
      stationId: 'STN003',
      status: 'error',
      lastScan: '3 hours ago',
      scanFrequency: 'Every 60 seconds',
      tracksDetected: 0,
      errors: 45,
      bandwidth: '0 kbps',
      quality: 'poor',
      location: 'Takoradi',
      deviceId: '3'
    }
  ]);

  // Mock backend jobs data
  const [backendJobs, setBackendJobs] = useState<BackendJob[]>([
    {
      id: '1',
      name: 'Daily Royalty Calculation',
      type: 'data_processing',
      status: 'running',
      progress: 67,
      startTime: '6:00 AM',
      cpuUsage: 45,
      memoryUsage: 62,
      retryCount: 0
    },
    {
      id: '2',
      name: 'Monthly Report Generation',
      type: 'report_generation',
      status: 'completed',
      progress: 100,
      startTime: '12:00 AM',
      endTime: '2:30 AM',
      duration: '2h 30m',
      cpuUsage: 23,
      memoryUsage: 34,
      retryCount: 0
    },
    {
      id: '3',
      name: 'Database Backup',
      type: 'backup',
      status: 'failed',
      progress: 0,
      startTime: '3:00 AM',
      cpuUsage: 0,
      memoryUsage: 0,
      errorMessage: 'Disk space insufficient',
      retryCount: 2
    }
  ]);

  // Mock system metrics data
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    {
      id: '1',
      name: 'CPU Usage',
      value: 45.2,
      unit: '%',
      status: 'normal',
      trend: 'up',
      lastUpdated: 'Just now',
      threshold: { warning: 70, critical: 90 }
    },
    {
      id: '2',
      name: 'Memory Usage',
      value: 68.7,
      unit: '%',
      status: 'warning',
      trend: 'up',
      lastUpdated: '1 minute ago',
      threshold: { warning: 80, critical: 95 }
    },
    {
      id: '3',
      name: 'Disk Usage',
      value: 34.1,
      unit: '%',
      status: 'normal',
      trend: 'stable',
      lastUpdated: '5 minutes ago',
      threshold: { warning: 85, critical: 95 }
    },
    {
      id: '4',
      name: 'Network Latency',
      value: 12.5,
      unit: 'ms',
      status: 'normal',
      trend: 'down',
      lastUpdated: '30 seconds ago',
      threshold: { warning: 50, critical: 100 }
    }
  ]);

  // Mock alert rules data
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds 80%',
      type: 'system',
      condition: 'CPU > 80%',
      threshold: 80,
      severity: 'high',
      enabled: true,
      notificationChannels: ['email', 'push'],
      createdAt: '1 month ago',
      lastTriggered: '2 hours ago'
    },
    {
      id: '2',
      name: 'Device Offline',
      description: 'Alert when any device goes offline for more than 5 minutes',
      type: 'device',
      condition: 'Device status = offline',
      threshold: 5,
      severity: 'critical',
      enabled: true,
      notificationChannels: ['email', 'sms', 'push'],
      createdAt: '2 weeks ago',
      lastTriggered: '3 hours ago'
    },
    {
      id: '3',
      name: 'Stream Scan Errors',
      description: 'Alert when stream scan errors exceed 10 per hour',
      type: 'stream',
      condition: 'Errors > 10/hour',
      threshold: 10,
      severity: 'medium',
      enabled: false,
      notificationChannels: ['email'],
      createdAt: '1 week ago'
    }
  ]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'online':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'offline':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'warning':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'active':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'maintenance':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'running':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'queued':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'normal':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'critical':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'low':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'medium':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'high':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'scanner':
        return <Radio className="w-5 h-5" />;
      case 'server':
        return <Server className="w-5 h-5" />;
      case 'router':
        return <Wifi className="w-5 h-5" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getJobIcon = (type: string) => {
    switch (type) {
      case 'data_processing':
        return <Database className="w-4 h-4" />;
      case 'report_generation':
        return <FileText className="w-4 h-4" />;
      case 'backup':
        return <Cloud className="w-4 h-4" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4" />;
      case 'cleanup':
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredStreams = streamScans.filter(stream => {
    const matchesSearch = stream.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stream.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || stream.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDevice = (device: Device) => {
    setSelectedDevice(device);
    setShowDeviceModal(true);
  };

  const handleViewJob = (job: BackendJob) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  return (
    <div>
      {/* Monitoring Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Monitoring Dashboard
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Real-time system health, device monitoring, and performance metrics
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh All</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Alert Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monitoring Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'devices', name: 'Device Fleet', icon: Monitor, count: devices.filter(d => d.status !== 'offline').length },
            { id: 'streams', name: 'Stream Scans', icon: Radio, count: streamScans.filter(s => s.status === 'active').length },
            { id: 'jobs', name: 'Backend Jobs', icon: Server, count: backendJobs.filter(j => j.status === 'running').length },
            { id: 'metrics', name: 'System Metrics', icon: BarChart3, count: systemMetrics.length },
            { id: 'alerts', name: 'Alert Rules', icon: Bell, count: alertRules.filter(a => a.enabled).length }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Device Fleet Tab */}
      {activeTab === 'devices' && (
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
                      placeholder="Search by device name, location, or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>

                {/* Type Filter */}
                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Types</option>
                  <option>Scanner</option>
                  <option>Server</option>
                  <option>Mobile</option>
                  <option>Desktop</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Devices Grid */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(device.type)}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{device.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{device.location}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(device.status)}`}>
                      {device.status}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    {/* Usage Bars */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">CPU</span>
                        <span className="font-medium text-gray-900 dark:text-white">{device.cpuUsage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            device.cpuUsage > 80 ? 'bg-red-500' : device.cpuUsage > 60 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${device.cpuUsage}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Memory</span>
                        <span className="font-medium text-gray-900 dark:text-white">{device.memoryUsage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            device.memoryUsage > 80 ? 'bg-red-500' : device.memoryUsage > 60 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${device.memoryUsage}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Disk</span>
                        <span className="font-medium text-gray-900 dark:text-white">{device.diskUsage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            device.diskUsage > 80 ? 'bg-red-500' : device.diskUsage > 60 ? 'bg-amber-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${device.diskUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <Thermometer className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">Temp</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{device.temperature}°C</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <Zap className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">Uptime</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{device.uptime}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Last seen: {device.lastSeen}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDevice(device)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredDevices.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <Monitor className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No devices found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Stream Scans Tab */}
      {activeTab === 'streams' && (
        <>
          {/* Stream Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Radio className="w-5 h-5 mr-2" />
                Stream Scan Overview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">24</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Streams</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1.2K</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tracks Detected</p>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">8</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">With Errors</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">99.2%</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Stream Scans Table */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Station</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quality</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tracks</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Errors</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Scan</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {streamScans.map((stream) => (
                    <tr key={stream.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{stream.stationName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{stream.location}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(stream.status)}`}>
                          {stream.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            stream.quality === 'excellent' ? 'bg-green-500' :
                            stream.quality === 'good' ? 'bg-blue-500' :
                            stream.quality === 'fair' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{stream.quality}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-medium text-gray-900 dark:text-white">{stream.tracksDetected}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-medium ${stream.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {stream.errors}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stream.lastScan}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                            <Settings className="w-4 h-4" />
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

      {/* Backend Jobs Tab */}
      {activeTab === 'jobs' && (
        <>
          {/* Jobs Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Server className="w-5 h-5 mr-2" />
                Backend Jobs Overview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Running</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">127</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">5</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">12</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Queued</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Jobs List */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {backendJobs.map((job) => (
                <div key={job.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {getJobIcon(job.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{job.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                            {job.status}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                            {job.type.replace('_', ' ')}
                          </span>
                        </div>

                        {job.status === 'running' && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Progress</span>
                              <span className="font-medium text-gray-900 dark:text-white">{job.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Start Time</p>
                            <p className="font-medium text-gray-900 dark:text-white">{job.startTime}</p>
                          </div>
                          {job.endTime && (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">End Time</p>
                              <p className="font-medium text-gray-900 dark:text-white">{job.endTime}</p>
                            </div>
                          )}
                          {job.duration && (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                              <p className="font-medium text-gray-900 dark:text-white">{job.duration}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Retry Count</p>
                            <p className="font-medium text-gray-900 dark:text-white">{job.retryCount}</p>
                          </div>
                        </div>

                        {job.errorMessage && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Error</p>
                            <p className="text-sm text-red-600 dark:text-red-400">{job.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewJob(job)}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </button>

                      {job.status === 'running' && (
                        <button className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                          <Pause className="w-4 h-4 mr-1" />
                          Stop
                        </button>
                      )}

                      {job.status === 'failed' && (
                        <button className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
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

      {/* System Metrics Tab */}
      {activeTab === 'metrics' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Real-Time System Metrics
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Metrics Cards */}
            <div className="space-y-6">
              {systemMetrics.map((metric) => (
                <div key={metric.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{metric.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Threshold: {metric.threshold.warning}% / {metric.threshold.critical}%
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(metric.status)}`}>
                      {metric.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 mb-3">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {metric.value}{metric.unit}
                    </div>
                    <div className={`flex items-center space-x-1 ${
                      metric.trend === 'up' ? 'text-red-600 dark:text-red-400' :
                      metric.trend === 'down' ? 'text-green-600 dark:text-green-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {metric.trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
                       metric.trend === 'down' ? <TrendingDown className="w-4 h-4" /> :
                       <Activity className="w-4 h-4" />}
                      <span className="text-sm font-medium capitalize">{metric.trend}</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        metric.status === 'critical' ? 'bg-red-500' :
                        metric.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Last updated: {metric.lastUpdated}
                  </p>
                </div>
              ))}
            </div>

            {/* Metrics Chart Placeholder */}
            <div className="space-y-6">
              <Card className="p-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance Trends</h4>
                <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <LineChartIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Interactive chart will be displayed here</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resource Distribution</h4>
                <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Pie chart visualization</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      )}

      {/* Alert Rules Tab */}
      {activeTab === 'alerts' && (
        <>
          {/* Alert Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Alert Configuration & Management
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">8</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Rules</p>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">12</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Triggered Today</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">3</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Critical Alerts</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monitoring</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Alert Rules List */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {alertRules.map((rule) => (
                <div key={rule.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(rule.severity)}`}>
                          {rule.severity}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${rule.enabled ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'}`}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          {rule.type}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {rule.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Condition</p>
                          <p className="font-medium text-gray-900 dark:text-white">{rule.condition}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Threshold</p>
                          <p className="font-medium text-gray-900 dark:text-white">{rule.threshold}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Channels</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {rule.notificationChannels.join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                          <p className="font-medium text-gray-900 dark:text-white">{rule.createdAt}</p>
                        </div>
                      </div>

                      {rule.lastTriggered && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last triggered: {rule.lastTriggered}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}>
                        {rule.enabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Device Details Modal */}
      {showDeviceModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                {getDeviceIcon(selectedDevice.type)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedDevice.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedDevice.location} • {selectedDevice.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Device Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Device Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedDevice.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Location</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedDevice.status)}`}>
                          {selectedDevice.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.uptime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Seen</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.lastSeen}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Software Version</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.softwareVersion}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Hardware Metrics */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hardware Metrics</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">CPU Usage</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              selectedDevice.cpuUsage > 80 ? 'bg-red-500' : selectedDevice.cpuUsage > 60 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${selectedDevice.cpuUsage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Memory Usage</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.memoryUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              selectedDevice.memoryUsage > 80 ? 'bg-red-500' : selectedDevice.memoryUsage > 60 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${selectedDevice.memoryUsage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Disk Usage</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.diskUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              selectedDevice.diskUsage > 80 ? 'bg-red-500' : selectedDevice.diskUsage > 60 ? 'bg-amber-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${selectedDevice.diskUsage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <Thermometer className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">Temperature</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedDevice.temperature}°C</p>
                        </div>
                        {selectedDevice.batteryLevel !== undefined && (
                          <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                            <Battery className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">Battery</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedDevice.batteryLevel}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Network & Actions */}
                <div className="space-y-6">
                  {/* Network Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">IP Address</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.ipAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">MAC Address</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.macAddress}</span>
                      </div>
                      {selectedDevice.signalStrength !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Signal Strength</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedDevice.signalStrength}%</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5" />
                        <span>Restart Device</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <Settings className="w-5 h-5" />
                        <span>Update Firmware</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Run Diagnostics</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                        <Trash2 className="w-5 h-5" />
                        <span>Remove Device</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowDeviceModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                {getJobIcon(selectedJob.type)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedJob.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedJob.type.replace('_', ' ')} • {selectedJob.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJobModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Job Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Job Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedJob.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {selectedJob.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedJob.status)}`}>
                          {selectedJob.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Start Time</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedJob.startTime}</span>
                      </div>
                      {selectedJob.endTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">End Time</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedJob.endTime}</span>
                        </div>
                      )}
                      {selectedJob.duration && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedJob.duration}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Retry Count</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedJob.retryCount}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Progress */}
                  {selectedJob.status === 'running' && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress</h3>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedJob.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${selectedJob.progress}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  )}

                  {selectedJob.errorMessage && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4">Error Details</h3>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-600 dark:text-red-400">{selectedJob.errorMessage}</p>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-6">
                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      {selectedJob.status === 'running' && (
                        <>
                          <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                            <Pause className="w-5 h-5" />
                            <span>Pause Job</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                            <XCircle className="w-5 h-5" />
                            <span>Cancel Job</span>
                          </button>
                        </>
                      )}

                      {selectedJob.status === 'failed' && (
                        <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                          <RefreshCw className="w-5 h-5" />
                          <span>Retry Job</span>
                        </button>
                      )}

                      {selectedJob.status === 'completed' && (
                        <>
                          <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                            <Download className="w-5 h-5" />
                            <span>Download Results</span>
                          </button>
                          <button className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2">
                            <Archive className="w-5 h-5" />
                            <span>Archive Job</span>
                          </button>
                        </>
                      )}

                      <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>View Logs</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowJobModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Update Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
