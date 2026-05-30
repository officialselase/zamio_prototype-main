import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Music,
  Radio,
  Building,
  TrendingUp,
  DollarSign,
  Activity,
  Settings,
  Ban,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Shield,
  Loader2,
} from 'lucide-react';
import { Card } from '@zamio/ui';
import { fetchUserDetails, fetchUserRoyalties, type UserDetailResponse, type UserRoyaltiesResponse } from '../lib/api';

const mockUsers = [
  {
    id: 1,
    name: 'Sarkodie',
    email: 'sarkodie@zamio.com',
    type: 'artist',
    status: 'active',
    role: 'Artist',
    lastActivity: '2 hours ago',
    joinDate: 'Jan 2023',
    royaltiesEarned: 45234.8,
    plays: 234567,
    territory: 'Ghana',
    phone: '+233 20 123 4567',
    avatar: 'S',
    bio: 'Ghanaian hip-hop artist and entrepreneur known for his lyrical prowess and business acumen.',
    totalTracks: 150,
    monthlyListeners: 1250000,
    topTracks: [
      { name: 'Adonai', plays: 45000 },
      { name: 'Kanta', plays: 38000 },
      { name: 'Pain Killer', plays: 32000 },
    ],
    recentActivity: [
      { action: 'Uploaded new track', time: '2 hours ago' },
      { action: 'Received royalty payment', time: '1 day ago' },
      { action: 'Updated profile', time: '3 days ago' },
    ],
    // Artist-specific data
    streamingTrends: {
      monthlyGrowth: 12.5,
      topRegions: ['Accra', 'Kumasi', 'Takoradi'],
      collaborations: ['Stonebwoy', 'Shatta Wale', 'Efya'],
    },
    copyrightClaims: [
      { track: 'Adonai', status: 'resolved', date: '2023-06-15' },
      { track: 'Kanta', status: 'pending', date: '2023-07-22' },
    ],
  },
  {
    id: 2,
    name: 'Peace FM',
    email: 'contact@peacefm.com',
    type: 'station',
    status: 'active',
    role: 'Station',
    lastActivity: '1 hour ago',
    joinDate: 'Mar 2022',
    royaltiesEarned: 12890.5,
    plays: 56789,
    territory: 'Accra, Ghana',
    phone: '+233 30 212 3456',
    avatar: 'P',
    bio: 'Leading radio station in Ghana focusing on news, music, and cultural content.',
    totalTracks: 0,
    monthlyListeners: 500000,
    topTracks: [],
    recentActivity: [
      { action: 'Updated playlist', time: '1 hour ago' },
      { action: 'Processed play logs', time: '6 hours ago' },
    ],
    // Station-specific data
    stationType: 'Radio',
    broadcastSchedule: {
      hoursPerDay: 18,
      peakHours: '6:00 AM - 10:00 PM',
      coverage: 'Greater Accra Region',
    },
    complianceStatus: 'Compliant',
    reportingAccuracy: 98.5,
  },
  {
    id: 3,
    name: 'Universal Music Publishing Ghana',
    email: 'admin@umpghana.com',
    type: 'publisher',
    status: 'active',
    role: 'Publisher',
    lastActivity: '30 mins ago',
    joinDate: 'Dec 2022',
    royaltiesEarned: 183204.54,
    plays: 892345,
    territory: 'West Africa',
    phone: '+233 24 345 6789',
    avatar: 'U',
    bio: 'Major music publisher managing rights for artists across West Africa.',
    totalTracks: 0,
    monthlyListeners: 0,
    topTracks: [],
    recentActivity: [
      { action: 'Processed royalty distribution', time: '30 mins ago' },
      { action: 'Updated agreement terms', time: '2 days ago' },
    ],
    // Publisher-specific data
    activeAgreements: 45,
    territories: ['Ghana', 'Nigeria', 'Senegal', 'Ivory Coast'],
    catalogSize: 15000,
    catalogGrowth: 8.3,
    partnerPROs: ['ASCAP', 'BMI', 'PRS for Music'],
  },
];

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [royalties, setRoyalties] = useState<UserRoyaltiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoyalties, setLoadingRoyalties] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadUserDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'royalties' && id && !royalties) {
      loadUserRoyalties();
    }
  }, [activeTab, id]);

  const loadUserDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetchUserDetails(id);
      if (response.data) {
        setUser(response.data);
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoyalties = async () => {
    if (!id) return;
    
    setLoadingRoyalties(true);
    try {
      const response = await fetchUserRoyalties(id);
      if (response.data) {
        setRoyalties(response.data);
      }
    } catch (err) {
      console.error('Failed to load user royalties:', err);
    } finally {
      setLoadingRoyalties(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">User Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'The requested user could not be found.'}</p>
          <button
            onClick={() => navigate('/user-management')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to User Management
          </button>
        </div>
      </div>
    );
  }

  const displayName = user.artist_profile?.stage_name || user.station_profile?.station_name || user.publisher_profile?.company_name || `${user.first_name} ${user.last_name}`;
  const userStatus = !user.is_active ? 'suspended' : user.kyc_status === 'pending' ? 'pending' : 'active';
  const avatar = displayName.charAt(0).toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'suspended':
        return <UserX className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    switch (lowerType) {
      case 'artist':
        return <Music className="w-5 h-5" />;
      case 'station':
        return <Radio className="w-5 h-5" />;
      case 'publisher':
        return <Building className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  return (
    <main className="w-full px-6 py-8 bg-gray-50/50 dark:bg-slate-900/50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => navigate('/user-management')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Users</span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-6">
              {user.photo_url ? (
                <img src={user.photo_url} alt={displayName} className="w-20 h-20 rounded-full object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {avatar}
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{displayName}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">{user.email}</p>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(userStatus)}`}>
                    {getStatusIcon(userStatus)}
                    <span className="ml-1 capitalize">{userStatus}</span>
                  </span>
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    {getTypeIcon(user.user_type)}
                    <span className="capitalize">{user.user_type}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>Edit User</span>
              </button>
              {user.is_active ? (
                <button className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                  <UserX className="w-4 h-4" />
                  <span>Suspend</span>
                </button>
              ) : (
                <button className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Activate</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            {[
              { id: 'profile', name: 'Profile', icon: Users },
              { id: 'activity', name: 'Activity', icon: Activity },
              { id: 'royalties', name: 'Royalties', icon: DollarSign },
              { id: 'settings', name: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{user.first_name} {user.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">{user.email}</p>
                        {user.email_verified && <CheckCircle className="w-4 h-4 text-green-500" title="Verified" />}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">{user.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">{user.country || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Member Since</label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">{formatDate(user.timestamp)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Activity</label>
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">{formatDateTime(user.last_activity)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">KYC Status</label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.kyc_status)}`}>
                        {user.kyc_status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2FA Enabled</label>
                      <p className="text-gray-900 dark:text-white">{user.two_factor_enabled ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6">
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Status</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Account Active</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.is_active ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Email Verified</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.email_verified ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Profile Complete</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.profile_complete ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Failed Login Attempts</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.failed_login_attempts}</span>
                    </div>
                    {user.account_locked_until && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Account Locked Until</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{formatDateTime(user.account_locked_until)}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {user.permissions && user.permissions.length > 0 && (
                  <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Permissions</h3>
                    <div className="space-y-2">
                      {user.permissions.map((perm, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800/50 rounded">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{perm.permission}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">by {perm.granted_by}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Type-Specific Information */}
              {user.artist_profile && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Artist Profile</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Stage Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.artist_profile.stage_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Self Published</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.artist_profile.self_published ? 'Yes' : 'No'}</span>
                    </div>
                    {user.artist_profile.total_tracks !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Tracks</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.artist_profile.total_tracks}</span>
                      </div>
                    )}
                    {user.artist_profile.total_earnings !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Earnings</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₵{user.artist_profile.total_earnings.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {user.station_profile && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Station Profile</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Station Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.station_profile.station_name}</span>
                    </div>
                    {user.station_profile.city && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">City</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.station_profile.city}</span>
                      </div>
                    )}
                    {user.station_profile.region && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Region</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.station_profile.region}</span>
                      </div>
                    )}
                    {user.station_profile.frequency && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Frequency</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.station_profile.frequency}</span>
                      </div>
                    )}
                    {user.station_profile.compliance_status && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Compliance Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.station_profile.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {user.station_profile.compliance_status}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {user.publisher_profile && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Publisher Profile</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Company Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{user.publisher_profile.company_name}</span>
                    </div>
                    {user.publisher_profile.website && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Website</span>
                        <a href={user.publisher_profile.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          {user.publisher_profile.website}
                        </a>
                      </div>
                    )}
                    {user.publisher_profile.verified !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Verified</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.publisher_profile.verified ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {user.publisher_profile.total_artists !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Artists</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.publisher_profile.total_artists}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
              {user.recent_activity && user.recent_activity.length > 0 ? (
                <div className="space-y-4">
                  {user.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {activity.resource_type} {activity.resource_id && `• ${activity.resource_id}`}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDateTime(activity.timestamp)}</span>
                          <span>•</span>
                          <span>{activity.ip_address}</span>
                          {activity.status_code && (
                            <>
                              <span>•</span>
                              <span className={activity.status_code < 400 ? 'text-green-600' : 'text-red-600'}>
                                {activity.status_code}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No recent activity</p>
              )}
            </Card>
          )}

          {activeTab === 'royalties' && (
            <>
              {loadingRoyalties ? (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  </div>
                </Card>
              ) : royalties ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Earned</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {royalties.summary.currency} {royalties.summary.total_net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <DollarSign className="w-10 h-10 text-green-500" />
                      </div>
                    </Card>

                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Paid Out</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {royalties.summary.currency} {royalties.summary.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-blue-500" />
                      </div>
                    </Card>

                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {royalties.summary.currency} {royalties.summary.pending_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-500" />
                      </div>
                    </Card>

                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Plays</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {royalties.summary.total_distributions.toLocaleString()}
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-500" />
                      </div>
                    </Card>
                  </div>

                  {/* Recent Royalties Table */}
                  <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Royalty Distributions</h3>
                    {royalties.recent_royalties.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-700">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Track</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Station</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {royalties.recent_royalties.map((royalty) => (
                              <tr key={royalty.distribution_id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                  {formatDateTime(royalty.calculated_at)}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                  {royalty.play_log?.track_title || 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                  {royalty.play_log?.station_name || 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                                  {royalty.recipient_type}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                                  {royalty.currency} {royalty.net_amount.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    royalty.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    royalty.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                    royalty.status === 'pending' || royalty.status === 'calculated' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                    royalty.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                                  }`}>
                                    {royalty.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No royalty distributions found</p>
                      </div>
                    )}
                  </Card>
                </div>
              ) : (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Unable to load royalty data</p>
                  </div>
                </Card>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    Enable
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Notification Preferences</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manage how you receive notifications</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    Configure
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-300">Danger Zone</p>
                    <p className="text-sm text-red-700 dark:text-red-400">Irreversible actions for this account</p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
  );
};

export default UserDetail;
