import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Music,
  TrendingUp,
  MapPin,
  Activity,
  Settings,
  Bell,
  BarChart3,
  Radio,
  Eye,
  Clock,
  Target,
  DollarSign,
  Share2,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Verified,
  Play,
  Calendar,
  Award,
  Star,
  Heart,
  Users,
  Globe,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Filter,
  Search,
  MoreVertical,
  Crown,
  Gem,
  Shield,
  Zap,
  Target as TargetIcon,
  RefreshCw,
  XCircle
} from 'lucide-react';
import {
  fetchArtistProfile,
  updateArtistProfile,
  type ProfileData,
  type ArtistProfile,
  type UpdateProfileParams
} from '../lib/profileApi';
import { getArtistId } from '../lib/auth';

// Default empty profile data
const defaultProfileData: ProfileData = {
  profile: {
    artist_id: '',
    stage_name: '',
    bio: '',
    profile_image: null,
    cover_image: null,
    verified: false,
    join_date: null,
    location: null,
    genres: []
  },
  contact: {
    email: '',
    phone: null,
    instagram: '',
    twitter: '',
    facebook: null,
    website: '',
    spotify_url: '',
    shazam_url: ''
  },
  publisher: {
    is_self_published: true,
    publisher: null
  },
  stats: {
    total_plays: 0,
    total_earnings: 0,
    monthly_plays: 0,
    monthly_earnings: 0,
    new_followers: 0,
    radio_coverage: 0,
    avg_rating: 0,
    total_songs: 0,
    followers: 0
  },
  top_tracks: [],
  recent_activity: [],
  achievements: []
};



const Profile: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    stageName: '',
    bio: '',
    location: '',
    genres: [] as string[],
    contact: {
      email: '',
      phone: '',
      instagram: '',
      twitter: '',
      facebook: '',
      website: '',
      spotify_url: '',
      shazam_url: ''
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch profile data
  const loadProfile = useCallback(async (showRefreshing = false) => {
    const artistId = getArtistId();
    if (!artistId) {
      setError('Artist ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchArtistProfile(artistId);
      setProfileData(data);

      // Update edit form with fetched data
      setEditFormData({
        stageName: data.profile.stage_name || '',
        bio: data.profile.bio || '',
        location: data.profile.location || '',
        genres: data.profile.genres || [],
        contact: {
          email: data.contact.email || '',
          phone: data.contact.phone || '',
          instagram: data.contact.instagram || '',
          twitter: data.contact.twitter || '',
          facebook: data.contact.facebook || '',
          website: data.contact.website || '',
          spotify_url: data.contact.spotify_url || '',
          shazam_url: data.contact.shazam_url || ''
        }
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle refresh
  const handleRefresh = () => {
    loadProfile(true);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
  };

  const handleGenreChange = (index: number, value: string) => {
    const newGenres = [...editFormData.genres];
    newGenres[index] = value;
    setEditFormData(prev => ({
      ...prev,
      genres: newGenres
    }));
  };

  const addGenre = () => {
    setEditFormData(prev => ({
      ...prev,
      genres: [...prev.genres, '']
    }));
  };

  const removeGenre = (index: number) => {
    const newGenres = editFormData.genres.filter((_, i) => i !== index);
    setEditFormData(prev => ({
      ...prev,
      genres: newGenres
    }));
  };

  const handleSaveProfile = async () => {
    const artistId = getArtistId();
    if (!artistId) return;

    setIsSaving(true);
    setSaveMessage(null);

    // Basic validation
    if (!editFormData.stageName.trim() || !editFormData.bio.trim()) {
      setSaveMessage({ type: 'error', text: 'Please fill in all required fields.' });
      setIsSaving(false);
      return;
    }

    try {
      const params: UpdateProfileParams = {
        artist_id: artistId,
        stage_name: editFormData.stageName,
        bio: editFormData.bio,
        contact_email: editFormData.contact.email,
        instagram: editFormData.contact.instagram,
        twitter: editFormData.contact.twitter,
        website: editFormData.contact.website,
        spotify_url: editFormData.contact.spotify_url,
        shazam_url: editFormData.contact.shazam_url
      };

      await updateArtistProfile(params);
      
      // Refresh profile data
      await loadProfile(true);
      
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });

      // Close modal after a short delay
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage(null);
      }, 2000);

    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }: {
    id: string;
    label: string;
    icon: any;
    isActive: boolean;
    onClick: (id: string) => void;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
        isActive
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <>
      {/* Enhanced Page Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Artist Profile</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Manage your music profile, track performance, and view earnings
                  </p>
                </div>
              </div>

              {/* Quick Stats in Header */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {(profileData.stats.total_plays || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Plays</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(profileData.stats.total_earnings)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Earnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {profileData.stats.total_songs || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Songs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(profileData.stats.followers || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Followers</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Share2 className="w-4 h-4" />
                <span>Share Profile</span>
              </button>
              <button
                onClick={() => {
                  setIsEditModalOpen(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Error Loading Profile</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
      <div className="space-y-8">
        {/* Artist Header Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {(profileData.profile.stage_name || 'A').split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                {profileData.profile.verified && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 p-1 rounded-full">
                    <Verified className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {profileData.profile.stage_name || 'Artist'}
                  </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-3 max-w-2xl leading-relaxed">{profileData.profile.bio || 'No bio available'}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  {profileData.profile.location && (
                    <>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profileData.profile.location}</span>
                      </div>
                      <span>•</span>
                    </>
                  )}
                  {profileData.profile.join_date && (
                    <>
                      <span>Joined {formatDate(profileData.profile.join_date)}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>
                    {(profileData.stats.followers || 0).toLocaleString()} followers
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  {(profileData.profile.genres || []).map((genre, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profileData.contact.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profileData.contact.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <Instagram className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Instagram</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profileData.contact.instagram || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Twitter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Twitter</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profileData.contact.twitter || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(profileData.achievements || []).map((achievement, idx) => {
              // Map icon name to component
              const IconComponent = achievement.icon === 'Crown' ? Crown : achievement.icon === 'Star' ? Star : Radio;
              return (
              <div key={idx} className="flex items-center space-x-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <IconComponent className={`w-5 h-5 ${achievement.color}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{achievement.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{achievement.description}</p>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-white/10 dark:bg-slate-800/50 backdrop-blur-md rounded-lg border border-white/20 dark:border-slate-700/30">
          <TabButton
            id="overview"
            label="Overview"
            icon={Eye}
            isActive={activeTab === 'overview'}
            onClick={setActiveTab}
          />
          <TabButton
            id="songs"
            label="Songs"
            icon={Music}
            isActive={activeTab === 'songs'}
            onClick={setActiveTab}
          />
          <TabButton
            id="playlogs"
            label="Play Logs"
            icon={Activity}
            isActive={activeTab === 'playlogs'}
            onClick={setActiveTab}
          />
          <TabButton
            id="royalties"
            label="Royalties"
            icon={DollarSign}
            isActive={activeTab === 'royalties'}
            onClick={setActiveTab}
          />
          <TabButton
            id="publisher"
            label="Publisher"
            icon={Users}
            isActive={activeTab === 'publisher'}
            onClick={setActiveTab}
          />
          <TabButton
            id="analytics"
            label="Analytics"
            icon={BarChart3}
            isActive={activeTab === 'analytics'}
            onClick={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {(profileData.recent_activity || []).length > 0 ? (
                    profileData.recent_activity.slice(0, 5).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-800/80 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Radio className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-gray-900 dark:text-white font-medium">
                              {activity.track_title}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {activity.station_name} • {activity.detected_at ? formatDate(activity.detected_at) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="text-blue-600 dark:text-blue-400 text-xs font-semibold">
                          {(activity.confidence_score * 100).toFixed(0)}% match
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Performance */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-500" />
                  This Month's Performance
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">Total Plays</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{(profileData.stats.monthly_plays || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">Total Earnings</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {formatCurrency(profileData.stats.monthly_earnings)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">New Followers</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">+{(profileData.stats.new_followers || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">Radio Coverage</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {profileData.stats.radio_coverage || 0} stations
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Performing Songs */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                  Top Performing Songs
                </h2>
                {profileData.top_tracks ? (
                  <div className="space-y-3">
                    {(profileData.top_tracks || []).slice(0, 3).map((song, idx) => (
                      <div
                        key={song.track_id}
                        className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-800/80 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{song.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(song.total_plays || 0).toLocaleString()} plays</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 dark:text-green-400 text-sm">
                            {formatCurrency(song.total_earnings)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{song.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                  </div>
                )}
              </div>

              {/* Quick Stats Summary */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-amber-500" />
                  Career Highlights
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                    <div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        Total Lifetime Plays
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        All-time performance
                      </div>
                    </div>
                    <div className="text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                      {(profileData.stats.total_plays || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
                    <div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        Total Earnings
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Lifetime royalties
                      </div>
                    </div>
                    <div className="text-green-600 dark:text-green-400 font-bold text-xl">
                      {formatCurrency(profileData.stats.total_earnings)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                    <div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        Radio Stations
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Broadcasting your music
                      </div>
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                      {profileData.stats.radio_coverage || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Songs Tab */}
          {activeTab === 'songs' && (
            <div>
              {(profileData.top_tracks || []).length > 0 ? (
                <div className="space-y-6">
                  {profileData.top_tracks.map((song) => (
                    <div key={song.track_id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl hover:shadow-3xl transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                            <Music className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{song.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {song.duration} • {song.album || 'No Album'} • {song.genre || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Released {song.release_date ? formatDate(song.release_date) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-900 dark:text-white font-semibold">
                            {(song.total_plays || 0).toLocaleString()} plays
                          </div>
                          <div className="text-green-600 dark:text-green-400 text-sm">
                            {formatCurrency(song.total_earnings)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {song.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-white/20 dark:border-slate-700/30 shadow-2xl text-center">
                  <Music className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Songs Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Upload your first track to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Play Logs Tab */}
          {activeTab === 'playlogs' && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Play Logs</h2>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleRefresh}
                    className="flex items-center space-x-2 px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors duration-200"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>
              </div>
              {(profileData.recent_activity || []).length > 0 ? (
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50/80 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-6 py-3">Song</th>
                        <th className="px-6 py-3">Station</th>
                        <th className="px-6 py-3">Date & Time</th>
                        <th className="px-6 py-3">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white">
                      {profileData.recent_activity.map((activity) => (
                        <tr key={activity.id} className="bg-white/50 dark:bg-slate-800/30 border-b border-gray-200 dark:border-slate-600 hover:bg-gray-50/80 dark:hover:bg-slate-800/60">
                          <td className="px-6 py-4 font-medium">{activity.track_title}</td>
                          <td className="px-6 py-4">{activity.station_name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                            {activity.detected_at ? new Date(activity.detected_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              activity.confidence_score >= 0.8 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : activity.confidence_score >= 0.6
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {(activity.confidence_score * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-12">
                  <Activity className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Play Logs Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Your tracks haven't been detected on radio yet</p>
                </div>
              )}
            </div>
          )}

          {/* Royalties Tab */}
          {activeTab === 'royalties' && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Royalty Summary</h2>
              </div>
              
              {/* Royalty Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Lifetime Earnings</h3>
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(profileData.stats.total_earnings)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">All-time royalties</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">This Month</h3>
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(profileData.stats.monthly_earnings)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">From {profileData.stats.monthly_plays} plays</p>
                </div>
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Royalty Information</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Royalties are calculated based on radio plays and streaming activity. Earnings shown are estimates based on processed withdrawals. 
                      For detailed transaction history and withdrawal requests, please visit the Royalties page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Publisher Tab */}
          {activeTab === 'publisher' && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Publishing Information</h2>
              </div>

              {profileData.publisher?.is_self_published ? (
                /* Self-Published Artist */
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-6">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Self-Published Artist</h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                    You maintain full control over your music rights and royalties. You receive 100% of your earnings directly.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800/50">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-3">
                        <Crown className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Full Ownership</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">You own 100% of your music rights</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800/50">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-3">
                        <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Direct Earnings</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive 100% of royalties</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800/50">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto mb-3">
                        <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Full Control</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage your own catalog</p>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg max-w-2xl mx-auto">
                    <div className="flex items-start space-x-3">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <h5 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Interested in Publisher Services?</h5>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Publishers can help with promotion, distribution, and rights management. Contact support to explore partnership opportunities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : profileData.publisher?.publisher ? (
                /* Signed to Publisher */
                <div>
                  {/* Publisher Header Card */}
                  <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-indigo-200 dark:border-indigo-800/50 mb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Users className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                              {profileData.publisher?.publisher?.company_name || 'Publisher'}
                            </h3>
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                              {profileData.publisher?.publisher?.company_type || 'Publisher'}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mb-2">
                            {profileData.publisher?.publisher?.description || 'Your publishing partner'}
                          </p>
                          {(profileData.publisher?.publisher?.city || profileData.publisher?.publisher?.country) && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {[profileData.publisher?.publisher?.city, profileData.publisher?.publisher?.region, profileData.publisher?.publisher?.country]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Publisher Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Contact Information */}
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Phone className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        {profileData.publisher?.publisher?.primary_contact_name && (
                          <div className="flex items-start space-x-3">
                            <User className="w-4 h-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Primary Contact</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {profileData.publisher.publisher.primary_contact_name}
                              </p>
                            </div>
                          </div>
                        )}
                        {profileData.publisher?.publisher?.primary_contact_email && (
                          <div className="flex items-start space-x-3">
                            <Mail className="w-4 h-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {profileData.publisher.publisher.primary_contact_email}
                              </p>
                            </div>
                          </div>
                        )}
                        {profileData.publisher?.publisher?.primary_contact_phone && (
                          <div className="flex items-start space-x-3">
                            <Phone className="w-4 h-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {profileData.publisher.publisher.primary_contact_phone}
                              </p>
                            </div>
                          </div>
                        )}
                        {profileData.publisher?.publisher?.website_url && (
                          <div className="flex items-start space-x-3">
                            <Globe className="w-4 h-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Website</p>
                              <a 
                                href={profileData.publisher.publisher.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                              >
                                Visit Website
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Partnership Benefits */}
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                        Partnership Benefits
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Professional Management</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Expert handling of your music catalog</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Rights Protection</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Legal support and copyright management</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Distribution Network</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Access to wider distribution channels</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Royalty Collection</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Efficient royalty tracking and payment</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Notice */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Publishing Agreement</h5>
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          You are currently signed to {profileData.publisher?.publisher?.company_name}. 
                          For questions about your publishing agreement, revenue splits, or contract terms, please contact your publisher directly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Publisher Data */
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Publisher Information</h3>
                  <p className="text-gray-600 dark:text-gray-400">Publisher information is not available at this time.</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Analytics</h2>
                <select className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>Last year</option>
                </select>
              </div>

              <div className="h-64 flex items-center justify-center bg-gray-50/50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Analytics Dashboard</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Interactive charts showing performance trends and insights
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Success/Error Message */}
              {saveMessage && (
                <div className={`p-4 rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                }`}>
                  <div className={`text-sm font-medium ${
                    saveMessage.type === 'success'
                      ? 'text-green-800 dark:text-green-400'
                      : 'text-red-800 dark:text-red-400'
                  }`}>
                    {saveMessage.text}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.stageName}
                  onChange={(e) => handleInputChange('stageName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your stage name"
                  required
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editFormData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell us about yourself..."
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your location"
                />
              </div>

              {/* Genres */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Genres
                  </label>
                  <button
                    onClick={addGenre}
                    className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Genre</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {editFormData.genres.map((genre, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => handleGenreChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter genre"
                      />
                      {editFormData.genres.length > 1 && (
                        <button
                          onClick={() => removeGenre(index)}
                          className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editFormData.contact.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editFormData.contact.phone}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={editFormData.contact.instagram}
                      onChange={(e) => handleContactChange('instagram', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Twitter
                    </label>
                    <input
                      type="text"
                      value={editFormData.contact.twitter}
                      onChange={(e) => handleContactChange('twitter', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200 dark:border-slate-600">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${
                    isSaving
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  }`}
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
