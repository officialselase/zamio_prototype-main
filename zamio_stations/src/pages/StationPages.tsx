import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ComingSoonPage from './ComingSoon';
import PlayLogs from './PlayLogs';
import AllDisputeMatches from './MatchDisputeManagement/AllDisputeMatches';
import { Card } from '@zamio/ui';
import { useAuth } from '../lib/auth';
import {
  fetchStationProfile,
  type StationProfilePayload,
} from '../lib/api';
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
} from 'lucide-react';

// Station Profile Data Helpers
const resolveProfileError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to load station profile. Please try again later.';
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

  return 'Unable to load station profile. Please try again later.';
};

const defaultProfile: StationProfilePayload['profile'] = {
  id: '',
  name: 'Your Station',
  tagline: '',
  description: '',
  logo: '',
  coverImage: '',
  location: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  frequency: '',
  established: '',
  licenseNumber: '',
  licenseExpiry: '',
  status: 'Pending',
  rating: 0,
  weeklyReach: 0,
  stationType: '',
  coverageArea: '',
  contactName: '',
  contactTitle: '',
  complianceOfficer: '',
  complianceOfficerEmail: '',
  complianceOfficerPhone: '',
  emergencyContact: '',
  socialMedia: {},
};

const defaultStats: StationProfilePayload['stats'] = {
  totalDetections: 0,
  monthlyDetections: 0,
  accuracy: 0,
  uptime: 0,
  revenue: 0,
  activeStaff: 0,
  broadcasts: 0,
  avgDailyListeners: 0,
  weeklyReach: 0,
};

// MatchLogs Page
const MatchLogs: React.FC = () => {
  return <PlayLogs />;
};

// MatchDisputes Page
const MatchDisputes: React.FC = () => {
  return <AllDisputeMatches />;
};

// Station Profile Page
const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<StationProfilePayload | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const stationId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = (user as Record<string, unknown>)['station_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const loadProfile = useCallback(async () => {
    if (!stationId) {
      setProfileError('Your station ID is missing. Please sign out and sign in again.');
      setProfileData(null);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const envelope = await fetchStationProfile(stationId);
      const payload = (envelope?.data ?? null) as StationProfilePayload | null;
      setProfileData(payload);
    } catch (error) {
      setProfileError(resolveProfileError(error));
      setProfileData((previous) => previous ?? null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [stationId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const stationProfile = useMemo(() => profileData?.profile ?? defaultProfile, [profileData]);
  const stationStats = useMemo(
    () => ({
      totalDetections: profileData?.stats?.totalDetections ?? defaultStats.totalDetections,
      monthlyDetections: profileData?.stats?.monthlyDetections ?? defaultStats.monthlyDetections,
      accuracy: profileData?.stats?.accuracy ?? defaultStats.accuracy,
      uptime: profileData?.stats?.uptime ?? defaultStats.uptime,
      revenue: profileData?.stats?.revenue ?? defaultStats.revenue,
      activeStaff: profileData?.stats?.activeStaff ?? defaultStats.activeStaff,
      broadcasts: profileData?.stats?.broadcasts ?? defaultStats.broadcasts,
      avgDailyListeners: profileData?.stats?.avgDailyListeners ?? defaultStats.avgDailyListeners,
      weeklyReach: profileData?.stats?.weeklyReach ?? defaultStats.weeklyReach,
    }),
    [profileData],
  );
  const recentActivity = profileData?.recentActivity ?? [];
  const staffMembers = profileData?.staff ?? [];
  const complianceDocuments = profileData?.complianceDocuments ?? [];
  const socialMediaEntries = useMemo(
    () => Object.entries(stationProfile.socialMedia ?? {}),
    [stationProfile.socialMedia],
  );

  const statusColors = {
    excellent: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      accent: 'text-emerald-600 dark:text-emerald-400'
    },
    good: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      accent: 'text-blue-600 dark:text-blue-400'
    },
    average: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      accent: 'text-amber-600 dark:text-amber-400'
    },
    poor: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      accent: 'text-red-600 dark:text-red-400'
    }
  };

  const getStatusColor = (value: number, thresholds = { excellent: 95, good: 90, average: 85 }) => {
    if (value >= thresholds.excellent) return statusColors.excellent;
    if (value >= thresholds.good) return statusColors.good;
    if (value >= thresholds.average) return statusColors.average;
    return statusColors.poor;
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Station Profile</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Manage your station information, monitor performance, and configure settings.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </button>
      </div>

      {profileError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {profileError}
        </div>
      )}
      {isLoadingProfile && !profileError && !profileData && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading station profile...</div>
      )}

      {/* Profile Header Card */}
      <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
        <div className="flex items-start space-x-8">
          <div className="flex-shrink-0">
            <div className="relative">
              <img
                src={stationProfile.logo || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(stationProfile.name || 'Station')}` }
                alt={stationProfile.name}
                className="w-32 h-32 object-cover rounded-xl shadow-lg"
              />
              {isEditing && (
                <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stationProfile.name}
                </h2>
                {stationProfile.tagline ? (
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-4 italic">
                    "{stationProfile.tagline}"
                  </p>
                ) : null}
                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
                  {stationProfile.description || 'No station description provided yet.'}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.location || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.frequency || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.established ? `Est. ${stationProfile.established}` : 'Est. —'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{typeof stationProfile.rating === 'number' ? `${stationProfile.rating.toFixed(1)}★ Rating` : '—'}</span>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{stationProfile.stationType || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.coverageArea || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.contactName || '—'}{stationProfile.contactTitle ? ` - ${stationProfile.contactTitle}` : ''}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.email || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-3">
                <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${stationProfile.status === 'Active' ? statusColors.excellent.bg : statusColors.average.bg} ${stationProfile.status === 'Active' ? statusColors.excellent.border : statusColors.average.border} ${stationProfile.status === 'Active' ? statusColors.excellent.text : statusColors.average.text}`}>
                  {stationProfile.status === 'Active' ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  )}
                  {stationProfile.status}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stationStats.weeklyReach.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Weekly Reach</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'performance', label: 'Performance' },
          { id: 'staff', label: 'Staff' },
          { id: 'settings', label: 'Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Station Stats */}
            <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Station Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total Detections</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{stationStats.totalDetections.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Monthly Detections</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{stationStats.monthlyDetections.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Detection Accuracy</span>
                  <span className={`text-sm font-medium ${getStatusColor(stationStats.accuracy).text}`}>{stationStats.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">System Uptime</span>
                  <span className={`text-sm font-medium ${getStatusColor(stationStats.uptime, { excellent: 99, good: 95, average: 90 }).text}`}>{stationStats.uptime}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total Revenue</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">₵{stationStats.revenue.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-emerald-500" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'success' ? 'bg-emerald-400' :
                      activity.status === 'warning' ? 'bg-amber-400' :
                      activity.status === 'error' ? 'bg-red-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{activity.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Daily Listeners</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                    {stationStats.avgDailyListeners.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Broadcasts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                    {stationStats.broadcasts.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <RadioIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Detection Accuracy</p>
                  <p className={`text-2xl sm:text-3xl font-bold leading-tight ${getStatusColor(stationStats.accuracy).text}`}>
                    {stationStats.accuracy}%
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-sm ${getStatusColor(stationStats.accuracy).bg}`}>
                  <TrendingUp className={`w-6 h-6 ${getStatusColor(stationStats.accuracy).accent}`} />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">System Uptime</p>
                  <p className={`text-2xl sm:text-3xl font-bold leading-tight ${getStatusColor(stationStats.uptime, { excellent: 99, good: 95, average: 90 }).text}`}>
                    {stationStats.uptime}%
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-sm ${getStatusColor(stationStats.uptime, { excellent: 99, good: 95, average: 90 }).bg}`}>
                  <Activity className={`w-6 h-6 ${getStatusColor(stationStats.uptime, { excellent: 99, good: 95, average: 90 }).accent}`} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'staff' && (
          <Card className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200/50 dark:border-slate-600/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              Station Staff ({staffMembers.length} members)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staffMembers.map((staff) => (
                <div key={staff.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{staff.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{staff.role}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{staff.email}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        staff.roleType === 'admin' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                        staff.roleType === 'manager' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                        'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      }`}>
                        {staff.roleType === 'admin' ? '👑 Admin' : staff.roleType === 'manager' ? '🛡️ Manager' : '📋 Reporter'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {staff.permissions.slice(0, 3).map(permission => (
                        <span key={permission} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          {permission}
                        </span>
                      ))}
                      {staff.permissions.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          +{staff.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${staff.status === 'Active' ? statusColors.excellent.bg : statusColors.average.bg} ${staff.status === 'Active' ? statusColors.excellent.border : statusColors.average.border} ${staff.status === 'Active' ? statusColors.excellent.text : statusColors.average.text}`}>
                    {staff.status}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-slate-500" />
                Station Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-2 rounded">
                    {stationProfile.licenseNumber}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Expiry Date
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-2 rounded">
                    {stationProfile.licenseExpiry ? new Date(stationProfile.licenseExpiry).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Station Type
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-2 rounded">
                    {stationProfile.stationType}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Coverage Area
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-2 rounded">
                    {stationProfile.coverageArea}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Information
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{stationProfile.contactName || '—'}{stationProfile.contactTitle ? ` - ${stationProfile.contactTitle}` : ''}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{stationProfile.phone || '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{stationProfile.email || '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{stationProfile.website || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-purple-500" />
                Social Media
              </h3>
              <div className="space-y-3">
                {socialMediaEntries.length > 0 ? (
                  socialMediaEntries.map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 capitalize">
                          {platform.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{platform}</span>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">No social media links provided.</p>
                )}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200/50 dark:border-slate-600/60 p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                Compliance Documents ({complianceDocuments.length} documents)
              </h3>
              <div className="space-y-3">
                {complianceDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        doc.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        doc.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {doc.status === 'approved' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : doc.status === 'pending' ? (
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{doc.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()} • {doc.fileSize}
                          {doc.expiryDate && ` • Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                        doc.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Compliance Officer</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.complianceOfficer || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.complianceOfficerEmail || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{stationProfile.complianceOfficerPhone || '—'}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Emergency: {stationProfile.emergencyContact || '—'}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// StaffManagement Page
const StaffManagement: React.FC = () => {
  return (
    <ComingSoonPage
      title="Staff Management"
      description="Manage station staff, assign roles and permissions, and track team performance across monitoring activities."
      icon={<Users className="w-8 h-8" />}
    />
  );
};

// Compliance Page
const Compliance: React.FC = () => {
  return (
    <ComingSoonPage
      title="Compliance Management"
      description="Monitor license compliance, track regulatory requirements, and ensure your station meets all broadcasting standards."
      icon={<Shield className="w-8 h-8" />}
    />
  );
};

// PlaylogManagement Page
const PlaylogManagement: React.FC = () => {
  return <PlayLogs />;
};

// Notifications Page
const Notifications: React.FC = () => {
  return (
    <ComingSoonPage
      title="Notifications"
      description="Stay updated with real-time alerts about system status, detection results, and important station updates."
      icon={<Bell className="w-8 h-8" />}
    />
  );
};

// Help Page
const Help: React.FC = () => {
  return (
    <ComingSoonPage
      title="Help & Support"
      description="Get comprehensive help, troubleshooting guides, and contact support for station management questions."
      icon={<HelpCircle className="w-8 h-8" />}
    />
  );
};

// RadioStream Page
const RadioStream: React.FC = () => {
  return (
    <ComingSoonPage
      title="Radio Stream Monitor"
      description="Monitor live radio streams, track music detection in real-time, and manage broadcast quality monitoring."
      icon={<RadioIcon className="w-8 h-8" />}
    />
  );
};

// AudioStream Page
const AudioStream: React.FC = () => {
  return (
    <ComingSoonPage
      title="Audio Stream Matcher"
      description="Process audio files for music identification, manage batch processing, and review matching results."
      icon={<Headphones className="w-8 h-8" />}
    />
  );
};

export {
  MatchLogs,
  MatchDisputes,
  Profile,
  PlaylogManagement,
  Notifications,
  Help,
  RadioStream,
  AudioStream
};
