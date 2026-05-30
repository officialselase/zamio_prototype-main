import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Settings,
  Search,
  Filter,
  Users,
  Shield,
  Database,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Server,
  Lock,
  Unlock,
  Key,
  UserCheck,
  UserX,
  Globe,
  Wifi,
  Monitor,
  Smartphone,
  HardDrive,
  Cpu,
  MemoryStick,
  Zap,
  AlertCircle,
  Info,
  X,
  FileText,
  Archive,
  RotateCcw,
  Power,
  Bell,
  BellOff,
  Palette,
  Globe as GlobeIcon,
  Shield as ShieldIcon,
  Database as DatabaseIcon,
  Cloud as CloudIcon,
  Settings as SettingsIcon
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  permissions: string[];
  department: string;
  joinDate: string;
  profilePicture?: string;
}

interface SystemConfig {
  id: string;
  category: 'general' | 'security' | 'performance' | 'integrations' | 'notifications';
  name: string;
  description: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'select' | 'password';
  options?: string[];
  required: boolean;
  sensitive: boolean;
  lastUpdated: string;
  updatedBy: string;
}

interface BackupJob {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: string;
  nextRun: string;
  size: string;
  duration: string;
  successRate: number;
  retentionDays: number;
}

interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'database' | 'file_transfer';
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  provider: string;
  description: string;
  lastSync: string;
  syncFrequency: string;
  errorCount: number;
  dataVolume: string;
  authentication: 'api_key' | 'oauth' | 'basic' | 'certificate';
}

interface SystemHealth {
  id: string;
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: string;
  responseTime: number;
  errorRate: number;
  lastChecked: string;
  dependencies: string[];
  description: string;
}

export const System = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'config' | 'health' | 'backups' | 'integrations'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Mock users data
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Admin',
      email: 'john.admin@zamio.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2 minutes ago',
      permissions: ['read', 'write', 'delete', 'manage_users', 'system_config'],
      department: 'IT',
      joinDate: 'Jan 2023'
    },
    {
      id: '2',
      name: 'Sarah Manager',
      email: 'sarah.manager@zamio.com',
      role: 'manager',
      status: 'active',
      lastLogin: '1 hour ago',
      permissions: ['read', 'write', 'manage_reports'],
      department: 'Operations',
      joinDate: 'Mar 2023'
    },
    {
      id: '3',
      name: 'Mike Analyst',
      email: 'mike.analyst@zamio.com',
      role: 'analyst',
      status: 'inactive',
      lastLogin: '2 days ago',
      permissions: ['read', 'generate_reports'],
      department: 'Analytics',
      joinDate: 'Jun 2023'
    }
  ]);

  // Mock system configurations
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([
    {
      id: '1',
      category: 'general',
      name: 'Platform Name',
      description: 'The display name for the ZamIO platform',
      value: 'ZamIO Royalty Management',
      type: 'text',
      required: true,
      sensitive: false,
      lastUpdated: '1 week ago',
      updatedBy: 'System Admin'
    },
    {
      id: '2',
      category: 'security',
      name: 'Session Timeout',
      description: 'Minutes before user sessions expire',
      value: 60,
      type: 'number',
      required: true,
      sensitive: false,
      lastUpdated: '2 days ago',
      updatedBy: 'Security Team'
    },
    {
      id: '3',
      category: 'security',
      name: 'Two-Factor Authentication',
      description: 'Require 2FA for all admin users',
      value: true,
      type: 'boolean',
      required: true,
      sensitive: false,
      lastUpdated: '1 month ago',
      updatedBy: 'Security Team'
    },
    {
      id: '4',
      category: 'integrations',
      name: 'API Rate Limit',
      description: 'Maximum API requests per minute',
      value: 1000,
      type: 'number',
      required: true,
      sensitive: false,
      lastUpdated: '3 days ago',
      updatedBy: 'DevOps Team'
    }
  ]);

  // Mock backup jobs
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([
    {
      id: '1',
      name: 'Daily Database Backup',
      type: 'full',
      schedule: 'daily',
      status: 'completed',
      lastRun: '2:00 AM today',
      nextRun: '2:00 AM tomorrow',
      size: '2.4 GB',
      duration: '15 minutes',
      successRate: 98.5,
      retentionDays: 30
    },
    {
      id: '2',
      name: 'Weekly Full Backup',
      type: 'full',
      schedule: 'weekly',
      status: 'scheduled',
      lastRun: 'Sunday 2:00 AM',
      nextRun: 'Next Sunday 2:00 AM',
      size: '8.7 GB',
      duration: '45 minutes',
      successRate: 99.2,
      retentionDays: 90
    },
    {
      id: '3',
      name: 'Monthly Archive',
      type: 'incremental',
      schedule: 'monthly',
      status: 'running',
      lastRun: 'Last month',
      nextRun: 'End of month',
      size: '1.2 GB',
      duration: '8 minutes',
      successRate: 97.8,
      retentionDays: 365
    }
  ]);

  // Mock integrations
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'ASCAP API',
      type: 'api',
      status: 'active',
      provider: 'ASCAP',
      description: 'Synchronize with ASCAP database for international repertoire',
      lastSync: '30 minutes ago',
      syncFrequency: 'Every hour',
      errorCount: 0,
      dataVolume: '2.1 GB/month',
      authentication: 'api_key'
    },
    {
      id: '2',
      name: 'BMI Webhook',
      type: 'webhook',
      status: 'active',
      provider: 'BMI',
      description: 'Receive real-time updates from BMI systems',
      lastSync: '15 minutes ago',
      syncFrequency: 'Real-time',
      errorCount: 2,
      dataVolume: '850 MB/month',
      authentication: 'oauth'
    },
    {
      id: '3',
      name: 'Ghana PRO Database',
      type: 'database',
      status: 'error',
      provider: 'Ghana PRO',
      description: 'Direct database connection to Ghana PRO systems',
      lastSync: 'Failed 2 hours ago',
      syncFrequency: 'Every 4 hours',
      errorCount: 15,
      dataVolume: '3.2 GB/month',
      authentication: 'certificate'
    }
  ]);

  // Mock system health
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([
    {
      id: '1',
      component: 'Web Server',
      status: 'healthy',
      uptime: '15d 8h 32m',
      responseTime: 45,
      errorRate: 0.1,
      lastChecked: 'Just now',
      dependencies: ['Database', 'Cache'],
      description: 'Main web application server'
    },
    {
      id: '2',
      component: 'Database Cluster',
      status: 'healthy',
      uptime: '30d 12h 15m',
      responseTime: 12,
      errorRate: 0.05,
      lastChecked: '1 minute ago',
      dependencies: ['Storage'],
      description: 'Primary database for all operations'
    },
    {
      id: '3',
      component: 'File Storage',
      status: 'warning',
      uptime: '7d 4h 22m',
      responseTime: 89,
      errorRate: 2.3,
      lastChecked: '5 minutes ago',
      dependencies: [],
      description: 'Cloud storage for backups and media'
    },
    {
      id: '4',
      component: 'Monitoring Service',
      status: 'critical',
      uptime: '0d 2h 15m',
      responseTime: 0,
      errorRate: 100,
      lastChecked: '10 minutes ago',
      dependencies: ['Web Server'],
      description: 'System monitoring and alerting service'
    }
  ]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      case 'suspended':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'healthy':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'warning':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'critical':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'running':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'scheduled':
        return `${baseClasses} bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800`;
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'maintenance':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'manager':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'analyst':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'viewer':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || integration.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleViewConfig = (config: SystemConfig) => {
    setSelectedConfig(config);
    setShowConfigModal(true);
  };

  return (
    <div>
      {/* System Management Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 dark:from-slate-400 dark:to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  System Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Configure settings, manage users, and monitor system health
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 dark:from-slate-400 dark:to-slate-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>System Check</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Management Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'users', name: 'User Management', icon: Users, count: users.filter(u => u.status === 'active').length },
            { id: 'config', name: 'Configuration', icon: Settings, count: systemConfigs.length },
            { id: 'health', name: 'System Health', icon: Activity, count: systemHealth.filter(h => h.status === 'healthy').length },
            { id: 'backups', name: 'Backup & Recovery', icon: Database, count: backupJobs.length },
            { id: 'integrations', name: 'Integrations', icon: Globe, count: integrations.filter(i => i.status === 'active').length }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
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
                      placeholder="Search by name, email, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>

                {/* Role Filter */}
                <select className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500">
                  <option>All Roles</option>
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Analyst</option>
                  <option>Viewer</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{user.department}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.lastLogin}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                            <UserX className="w-4 h-4" />
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

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <>
          {/* Configuration Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                System Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{systemConfigs.filter(c => c.category === 'general').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">General Settings</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{systemConfigs.filter(c => c.category === 'security').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Security Settings</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{systemConfigs.filter(c => c.category === 'integrations').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Integration Settings</p>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{systemConfigs.filter(c => c.category === 'performance').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Performance Settings</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Configuration List */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {systemConfigs.map((config) => (
                <div key={config.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{config.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(config.category)}`}>
                          {config.category}
                        </span>
                        {config.sensitive && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                            Sensitive
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {config.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Current Value</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {config.type === 'boolean' ? (config.value ? 'Enabled' : 'Disabled') : config.value}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">{config.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Required</p>
                          <p className="font-medium text-gray-900 dark:text-white">{config.required ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                          <p className="font-medium text-gray-900 dark:text-white">{config.lastUpdated}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Updated by {config.updatedBy}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewConfig(config)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* System Health Tab */}
      {activeTab === 'health' && (
        <>
          {/* Health Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Health Dashboard
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{systemHealth.filter(h => h.status === 'healthy').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Healthy Components</p>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{systemHealth.filter(h => h.status === 'warning').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Warning Components</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{systemHealth.filter(h => h.status === 'critical').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Critical Components</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">99.2%</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Uptime</p>
                </div>
              </div>
            </Card>
          </div>

          {/* System Components */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {systemHealth.map((component) => (
                <div key={component.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        component.status === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' :
                        component.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                        component.status === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        {component.component === 'Web Server' && <Server className={`w-5 h-5 ${component.status === 'healthy' ? 'text-green-600 dark:text-green-400' : component.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : component.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {component.component === 'Database Cluster' && <DatabaseIcon className={`w-5 h-5 ${component.status === 'healthy' ? 'text-green-600 dark:text-green-400' : component.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : component.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {component.component === 'File Storage' && <CloudIcon className={`w-5 h-5 ${component.status === 'healthy' ? 'text-green-600 dark:text-green-400' : component.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : component.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {component.component === 'Monitoring Service' && <Activity className={`w-5 h-5 ${component.status === 'healthy' ? 'text-green-600 dark:text-green-400' : component.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : component.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{component.component}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(component.status)}`}>
                            {component.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {component.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                            <p className="font-medium text-gray-900 dark:text-white">{component.uptime}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
                            <p className="font-medium text-gray-900 dark:text-white">{component.responseTime}ms</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
                            <p className="font-medium text-gray-900 dark:text-white">{component.errorRate}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Last Checked</p>
                            <p className="font-medium text-gray-900 dark:text-white">{component.lastChecked}</p>
                          </div>
                        </div>

                        {component.dependencies.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dependencies:</p>
                            <div className="flex flex-wrap gap-2">
                              {component.dependencies.map((dep, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                                  {dep}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </button>
                      <button className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Restart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Backup & Recovery Tab */}
      {activeTab === 'backups' && (
        <>
          {/* Backup Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Backup & Recovery Management
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{backupJobs.filter(j => j.status === 'completed').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Successful Backups</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{backupJobs.filter(j => j.status === 'running').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Running Backups</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{backupJobs.filter(j => j.status === 'failed').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed Backups</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">12.3 GB</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Backup Size</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Backup Jobs */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {backupJobs.map((job) => (
                <div key={job.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{job.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                          {job.status}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          {job.type}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {job.schedule}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Last Run</p>
                          <p className="font-medium text-gray-900 dark:text-white">{job.lastRun}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Next Run</p>
                          <p className="font-medium text-gray-900 dark:text-white">{job.nextRun}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Size</p>
                          <p className="font-medium text-gray-900 dark:text-white">{job.size}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                          <p className="font-medium text-gray-900 dark:text-white">{job.duration}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                          <div className="flex items-center space-x-2">
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  job.successRate > 90 ? 'bg-green-500' : job.successRate > 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${job.successRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{job.successRate}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Retention</p>
                          <p className="font-medium text-gray-900 dark:text-white">{job.retentionDays} days</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Eye className="w-4 h-4 mr-1" />
                        View Logs
                      </button>
                      <button className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Run Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <>
          {/* Integration Overview */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Integration Management
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{integrations.filter(i => i.status === 'active').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Integrations</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{integrations.filter(i => i.status === 'error').length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Error Integrations</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{integrations.reduce((sum, i) => sum + i.errorCount, 0)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Errors</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{integrations.reduce((sum, i) => sum + parseFloat(i.dataVolume.split(' ')[0]), 0).toFixed(1)} GB</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Data Volume</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Integrations List */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {filteredIntegrations.map((integration) => (
                <div key={integration.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        integration.status === 'active' ? 'bg-green-50 dark:bg-green-900/20' :
                        integration.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                        integration.status === 'maintenance' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        'bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        {integration.type === 'api' && <GlobeIcon className={`w-5 h-5 ${integration.status === 'active' ? 'text-green-600 dark:text-green-400' : integration.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {integration.type === 'webhook' && <Zap className={`w-5 h-5 ${integration.status === 'active' ? 'text-green-600 dark:text-green-400' : integration.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {integration.type === 'database' && <DatabaseIcon className={`w-5 h-5 ${integration.status === 'active' ? 'text-green-600 dark:text-green-400' : integration.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {integration.type === 'file_transfer' && <CloudIcon className={`w-5 h-5 ${integration.status === 'active' ? 'text-green-600 dark:text-green-400' : integration.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(integration.status)}`}>
                            {integration.status}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                            {integration.provider}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {integration.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Last Sync</p>
                            <p className="font-medium text-gray-900 dark:text-white">{integration.lastSync}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Frequency</p>
                            <p className="font-medium text-gray-900 dark:text-white">{integration.syncFrequency}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Error Count</p>
                            <p className={`font-medium ${integration.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                              {integration.errorCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Data Volume</p>
                            <p className="font-medium text-gray-900 dark:text-white">{integration.dataVolume}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                            {integration.authentication.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {integration.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </button>
                      <button className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Test Connection
                      </button>
                      <button className="px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Settings className="w-4 h-4 mr-1" />
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)} • {selectedUser.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - User Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedUser.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Role</span>
                        <span className={`font-medium ${getRoleBadge(selectedUser.role)}`}>
                          {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedUser.status)}`}>
                          {selectedUser.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Department</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedUser.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Join Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedUser.joinDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Login</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedUser.lastLogin}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Permissions & Actions */}
                <div className="space-y-6">
                  {/* Permissions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h3>
                    <div className="space-y-2">
                      {selectedUser.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{permission.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <Edit className="w-5 h-5" />
                        <span>Edit User</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <UserCheck className="w-5 h-5" />
                        <span>Change Role</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                        <Lock className="w-5 h-5" />
                        <span>Reset Password</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                        <UserX className="w-5 h-5" />
                        <span>Suspend User</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 dark:from-slate-400 dark:to-slate-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Details Modal */}
      {showConfigModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedConfig.category === 'security' ? 'bg-red-50 dark:bg-red-900/20' :
                  selectedConfig.category === 'performance' ? 'bg-green-50 dark:bg-green-900/20' :
                  selectedConfig.category === 'integrations' ? 'bg-blue-50 dark:bg-blue-900/20' :
                  'bg-gray-50 dark:bg-gray-900/20'
                }`}>
                  {selectedConfig.category === 'security' && <ShieldIcon className="w-6 h-6 text-red-600 dark:text-red-400" />}
                  {selectedConfig.category === 'performance' && <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />}
                  {selectedConfig.category === 'integrations' && <GlobeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                  {selectedConfig.category === 'general' && <SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedConfig.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedConfig.category} • {selectedConfig.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Config Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedConfig.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Category</span>
                        <span className={`font-medium ${getStatusBadge(selectedConfig.category)}`}>
                          {selectedConfig.category}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedConfig.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Required</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedConfig.required ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Sensitive</span>
                        <span className={`font-medium ${selectedConfig.sensitive ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {selectedConfig.sensitive ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedConfig.lastUpdated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Updated By</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedConfig.updatedBy}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Description */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedConfig.description}
                    </p>
                  </Card>
                </div>

                {/* Right Column - Value & Actions */}
                <div className="space-y-6">
                  {/* Current Value */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Value</h3>
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      {selectedConfig.type === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          {selectedConfig.value ? <CheckCircle className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-gray-400" />}
                          <span className="text-lg font-medium text-gray-900 dark:text-white">
                            {selectedConfig.value ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedConfig.value}
                        </p>
                      )}
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <Edit className="w-5 h-5" />
                        <span>Edit Configuration</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5" />
                        <span>Reset to Default</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                        <Save className="w-5 h-5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 dark:from-slate-400 dark:to-slate-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
