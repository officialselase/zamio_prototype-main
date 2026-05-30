import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  AlertTriangle,
  User,
  Users,
  Shield,
  FileSearch,
  Bell,
  HelpCircle,
  RadioTower as RadioIcon,
  Headphones,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  Clock,
  Settings,
  Edit,
  Camera,
  Phone,
  Mail,
  Globe,
  Award,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Building2,
  Crown,
  FileText,
  Plus,
  UserX,
  UserCheck,
  Trash2,
  Upload,
  FileCheck,
  Download,
  Eye,
  RadioTower,
  Music,
  DollarSign,
  CheckCircle2,
  Filter,
  RefreshCw,
  BellRing,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  deleteStationNotification,
  fetchStationNotifications,
  markAllStationNotificationsRead,
  markStationNotificationRead,
  type StationNotificationRecord,
  type StationNotificationsFilters,
  type StationNotificationsPagination,
  type StationNotificationsPayload,
  type StationNotificationsStats,
} from '../lib/api';

const PAGE_SIZE = 50;

const defaultStats: StationNotificationsStats = {
  total_count: 0,
  unread_count: 0,
  read_count: 0,
  high_priority_count: 0,
  system_count: 0,
  performance_count: 0,
};

const defaultFilters: StationNotificationsFilters = {
  available_types: [],
  available_priorities: [],
};

const defaultPagination: StationNotificationsPagination = {
  page_number: 1,
  page_size: PAGE_SIZE,
  total_pages: 1,
  count: 0,
  next: null,
  previous: null,
  has_next: false,
  has_previous: false,
};

const resolveNotificationsError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to load notifications. Please try again later.';
  }

  if (typeof maybeError === 'object' && maybeError !== null) {
    const response = (maybeError as { response?: unknown }).response;
    if (response && typeof response === 'object') {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === 'object') {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
          return message;
        }

        const errors = (data as { errors?: unknown }).errors;
        if (errors && typeof errors === 'object') {
          const entries = Object.entries(errors as Record<string, unknown>);
          const firstEntry = entries[0];
          if (firstEntry) {
            const [, errorValue] = firstEntry;
            if (typeof errorValue === 'string' && errorValue.length > 0) {
              return errorValue;
            }
            if (Array.isArray(errorValue) && errorValue.length > 0) {
              const candidate = errorValue[0];
              if (typeof candidate === 'string' && candidate.length > 0) {
                return candidate;
              }
            }
          }
        }
      }
    }

    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Unable to load notifications. Please try again later.';
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) {
    return 'Just now';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '₵0';
  }
  return `₵${amount.toLocaleString()}`;
};

const getNotificationIcon = (type: string, priority: string) => {
  const iconProps = { className: 'w-5 h-5' };

  switch (type) {
    case 'system':
      return <RadioTower className={`${iconProps.className} text-red-600`} />;
    case 'performance':
      return <TrendingUp className={`${iconProps.className} text-blue-600`} />;
    case 'content':
      return <Music className={`${iconProps.className} text-purple-600`} />;
    case 'compliance':
      return <Shield className={`${iconProps.className} text-amber-600`} />;
    case 'financial':
      return <DollarSign className={`${iconProps.className} text-green-600`} />;
    case 'social':
      return <Users className={`${iconProps.className} text-pink-600`} />;
    case 'technical':
      return <Settings className={`${iconProps.className} text-gray-600`} />;
    default:
      return <Bell className={`${iconProps.className} text-gray-600`} />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
    case 'medium':
      return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10';
    case 'low':
      return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
    default:
      return 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-800/50';
  }
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StationNotificationRecord[]>([]);
  const [stats, setStats] = useState<StationNotificationsStats>(defaultStats);
  const [filters, setFilters] = useState<StationNotificationsFilters>(defaultFilters);
  const [pagination, setPagination] = useState<StationNotificationsPagination>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'system' | 'performance' | 'content' | 'compliance' | 'financial' | 'social' | 'technical'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stationId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = (user as Record<string, unknown>)['station_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const loadNotifications = useCallback(
    async (showRefreshing = false) => {
      if (!stationId) {
        setError('Your station ID is missing. Please sign out and sign in again.');
        setNotifications([]);
        setStats(defaultStats);
        setFilters(defaultFilters);
        setPagination(defaultPagination);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const envelope = await fetchStationNotifications({
          stationId,
          search: searchTerm ? searchTerm.trim() : undefined,
          filterType: selectedFilter !== 'all' && selectedFilter !== 'unread' ? selectedFilter : undefined,
          filterPriority: selectedPriority !== 'all' ? selectedPriority : undefined,
          filterRead: selectedFilter === 'unread' ? 'unread' : undefined,
          orderBy: 'newest',
          page: 1,
          pageSize: PAGE_SIZE,
        });

        const payload = (envelope?.data ?? null) as StationNotificationsPayload | null;
        setNotifications(payload?.notifications ?? []);
        setStats(payload?.stats ?? defaultStats);
        setFilters(payload?.filters ?? defaultFilters);
        setPagination(payload?.pagination ?? { ...defaultPagination, page_size: PAGE_SIZE });
      } catch (fetchError) {
        setError(resolveNotificationsError(fetchError));
        setNotifications([]);
        setStats(defaultStats);
        setFilters(defaultFilters);
        setPagination({ ...defaultPagination, page_size: PAGE_SIZE });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stationId, searchTerm, selectedFilter, selectedPriority],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (value: typeof selectedFilter) => {
    setSelectedFilter(value);
  };

  const handlePriorityChange = (value: typeof selectedPriority) => {
    setSelectedPriority(value);
  };

  const handleRefresh = () => {
    loadNotifications(true);
  };

  const handleMarkAsRead = useCallback(
    async (notificationId: number) => {
      if (!stationId) {
        setError('Your station ID is missing. Please sign out and sign in again.');
        return;
      }

      const target = notifications.find((notification) => notification.id === notificationId);
      if (!target || target.read) {
        return;
      }

      try {
        await markStationNotificationRead({
          stationId,
          notificationId,
        });

        setNotifications((previous) =>
          previous.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        );

        setStats((previous) => ({
          ...previous,
          unread_count: Math.max(0, previous.unread_count - 1),
          read_count: previous.read_count + 1,
        }));
      } catch (markError) {
        setError(resolveNotificationsError(markError));
      }
    },
    [notifications, stationId],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!stationId) {
      setError('Your station ID is missing. Please sign out and sign in again.');
      return;
    }

    try {
      await markAllStationNotificationsRead({ stationId });
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
      setStats((previous) => ({
        ...previous,
        read_count: previous.read_count + previous.unread_count,
        unread_count: 0,
      }));
    } catch (markError) {
      setError(resolveNotificationsError(markError));
    }
  }, [stationId]);

  const handleDeleteNotification = useCallback(
    async (notificationId: number) => {
      if (!stationId) {
        setError('Your station ID is missing. Please sign out and sign in again.');
        return;
      }

      const target = notifications.find((notification) => notification.id === notificationId);

      try {
        await deleteStationNotification({ stationId, notificationId });

        setNotifications((previous) => previous.filter((notification) => notification.id !== notificationId));
        setStats((previous) => ({
          ...previous,
          total_count: Math.max(0, previous.total_count - 1),
          unread_count:
            target && !target.read ? Math.max(0, previous.unread_count - 1) : previous.unread_count,
          read_count:
            target && target.read ? Math.max(0, previous.read_count - 1) : previous.read_count,
          high_priority_count:
            target && target.priority === 'high'
              ? Math.max(0, previous.high_priority_count - 1)
              : previous.high_priority_count,
          system_count:
            target && (target.type || '').toLowerCase() === 'system'
              ? Math.max(0, previous.system_count - 1)
              : previous.system_count,
          performance_count:
            target && (target.type || '').toLowerCase() === 'performance'
              ? Math.max(0, previous.performance_count - 1)
              : previous.performance_count,
        }));
      } catch (deleteError) {
        setError(resolveNotificationsError(deleteError));
      }
    },
    [notifications, stationId],
  );

  const unreadCount = stats.unread_count ?? 0;
  const totalNotifications = useMemo(() => {
    if (stats.total_count) {
      return stats.total_count;
    }
    if (pagination && typeof pagination.count === 'number') {
      return pagination.count;
    }
    return notifications.length;
  }, [stats.total_count, pagination, notifications.length]);

  const availableTypes = filters.available_types;
  const availablePriorities = filters.available_priorities;

  return (
    <>
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Station Notifications</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Stay updated with your station's performance, compliance, and operational alerts
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalNotifications}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unreadCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.high_priority_count ?? notifications.filter((n) => n.priority === 'high').length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">High Priority</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading || refreshing || unreadCount === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Mark All Read</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                <span>{refreshing ? 'Refreshing' : 'Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(event) => handleFilterChange(event.target.value as typeof selectedFilter)}
                className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread</option>
                <option value="system">System Alerts</option>
                <option value="performance">Performance</option>
                <option value="content">Content</option>
                <option value="compliance">Compliance</option>
                <option value="financial">Financial</option>
                <option value="social">Social</option>
                <option value="technical">Technical</option>
                {availableTypes
                  .filter(
                    (type) =>
                      type &&
                      ![
                        'system',
                        'performance',
                        'content',
                        'compliance',
                        'financial',
                        'social',
                        'technical',
                        'unread',
                      ].includes(type),
                  )
                  .map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
              </select>
            </div>

            <select
              value={selectedPriority}
              onChange={(event) => handlePriorityChange(event.target.value as typeof selectedPriority)}
              className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
              {availablePriorities
                .filter((priority) => priority && !['high', 'medium', 'low'].includes(priority))
                .map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {notifications.length} Notification{notifications.length !== 1 ? 's' : ''}
            </h2>
            <button
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No notifications found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {searchTerm || selectedFilter !== 'all' || selectedPriority !== 'all'
                  ? 'Try adjusting your filters to see more notifications.'
                  : "You're all caught up! Check back later for updates."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-6 border-l-4 rounded-r-xl transition-all duration-200 hover:shadow-lg ${getPriorityColor(
                    notification.priority,
                  )} ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div
                        className={`p-3 rounded-xl ${
                          notification.priority === 'high'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : notification.priority === 'medium'
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}
                      >
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3
                              className={`font-semibold ${
                                !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {notification.title}
                            </h3>
                            {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(notification.timestamp)}
                            </span>
                            <div
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                notification.priority === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : notification.priority === 'medium'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                            >
                              {notification.priority}
                            </div>
                          </div>
                        </div>

                        <p
                          className={`text-sm ${
                            !notification.read ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {notification.message}
                        </p>

                        {typeof notification.amount === 'number' && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(notification.amount)}
                            </span>
                            {typeof notification.growth === 'number' && (
                              <>
                                <span className="text-gray-500 dark:text-gray-400">•</span>
                                <span className="text-green-600 dark:text-green-400">+{notification.growth}% growth</span>
                              </>
                            )}
                          </div>
                        )}

                        {typeof notification.listeners === 'number' && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {notification.listeners.toLocaleString()} listeners
                            </span>
                          </div>
                        )}

                        {typeof notification.tracks_detected === 'number' && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Music className="w-4 h-4 text-purple-500" />
                            <span className="font-medium text-purple-600 dark:text-purple-400">
                              {notification.tracks_detected} new tracks detected
                            </span>
                          </div>
                        )}

                        {typeof notification.days_until_expiry === 'number' && (
                          <div className="flex items-center space-x-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              Expires in {notification.days_until_expiry} days
                            </span>
                          </div>
                        )}

                        {notification.username && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-medium text-pink-600 dark:text-pink-400">@{notification.username}</span>
                            <span className="text-gray-500 dark:text-gray-400">on {notification.platform}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-200"
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {notification.actionable && notification.action_label && (
                        <button className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors duration-200">
                          {notification.action_label}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Unread</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{unreadCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount === 0 ? 'All caught up!' : 'Need attention'}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center">
                <BellRing className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">High Priority</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats.high_priority_count ?? notifications.filter((n) => n.priority === 'high').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Require immediate action</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">System Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats.system_count ?? notifications.filter((n) => (n.type || '').toLowerCase() === 'system').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Technical notifications</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center">
                <RadioTower className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Performance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats.performance_count ??
                    notifications.filter((n) => (n.type || '').toLowerCase() === 'performance').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Station metrics & milestones</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Notifications;
