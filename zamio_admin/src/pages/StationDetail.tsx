import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Radio,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Settings,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  Signal,
  AlertTriangle,
  DollarSign,
  FileText,
  Shield,
  XCircle,
  TrendingUp,
  Music,
  Wifi,
  WifiOff,
  Globe,
  Building,
} from 'lucide-react';
import { Card } from '@zamio/ui';
import { fetchStationDetails, type StationDetailResponse } from '../lib/api';

const StationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<StationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadStationDetails();
  }, [id]);

  const loadStationDetails = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetchStationDetails(id);
      if (response.data) {
        setStation(response.data);
      }
    } catch (err) {
      console.error('Failed to load station details:', err);
      setError('Failed to load station details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading station details...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Radio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Station Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'The requested station could not be found.'}</p>
          <button
            onClick={() => navigate('/stations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Stations
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'rejected':
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
      case 'suspended':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getStreamStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'inactive':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'testing':
        return <Signal className="w-4 h-4 text-yellow-600" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
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
            onClick={() => navigate('/stations')}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stations</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-6">
            {station.photo ? (
              <img src={station.photo} alt={station.name} className="w-20 h-20 rounded-full object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                <Radio className="w-10 h-10" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{station.name}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">{station.broadcast_frequency || 'No frequency set'}</p>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(station.verification_status)}`}>
                  {getStatusIcon(station.verification_status)}
                  <span className="ml-1 capitalize">{station.verification_status}</span>
                </span>
                <div className="flex items-center space-x-2">
                  {getStreamStatusIcon(station.stream_status)}
                  <span className="text-sm text-gray-600 dark:text-gray-400">{station.stream_status_display}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit Station</span>
            </button>
            {station.verification_status === 'pending' && (
              <button className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Verify</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
          {[
            { id: 'profile', name: 'Profile', icon: Radio },
            { id: 'technical', name: 'Technical', icon: Signal },
            { id: 'compliance', name: 'Compliance', icon: Shield },
            { id: 'payment', name: 'Payment', icon: DollarSign },
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
            {/* Station Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Station Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Station Name</label>
                    <p className="text-gray-900 dark:text-white font-semibold">{station.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Station ID</label>
                    <p className="text-gray-900 dark:text-white">{station.station_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{station.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{station.city}, {station.region}, {station.country}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
                    <p className="text-gray-900 dark:text-white">{station.broadcast_frequency || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Station Type</label>
                    <p className="text-gray-900 dark:text-white capitalize">{station.station_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Station Class</label>
                    <p className="text-gray-900 dark:text-white capitalize">{station.station_class.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Founded Year</label>
                    <p className="text-gray-900 dark:text-white">{station.founded_year || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Listeners</label>
                    <p className="text-gray-900 dark:text-white">{station.estimated_listeners?.toLocaleString() || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coverage Area</label>
                    <p className="text-gray-900 dark:text-white">{station.coverage_area || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Member Since</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{formatDate(station.created_at)}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Updated</label>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{formatDateTime(station.updated_at)}</p>
                    </div>
                  </div>
                </div>

                {station.about && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">About</label>
                    <p className="text-gray-900 dark:text-white">{station.about}</p>
                  </div>
                )}

                {station.website_url && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website</label>
                    <a href={station.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline">
                      <Globe className="w-4 h-4" />
                      <span>{station.website_url}</span>
                    </a>
                  </div>
                )}
              </Card>

              {/* Contact Information */}
              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Contact</label>
                    <p className="text-gray-900 dark:text-white font-semibold">{station.primary_contact_name || 'Not provided'}</p>
                    {station.primary_contact_title && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{station.primary_contact_title}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Email</label>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{station.primary_contact_email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Phone</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{station.primary_contact_phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Emergency Contact</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 dark:text-white">{station.emergency_contact_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Station Status</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Active</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{station.active ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Verification</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(station.verification_status)}`}>
                      {station.verification_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Stream Status</span>
                    <div className="flex items-center space-x-2">
                      {getStreamStatusIcon(station.stream_status)}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{station.stream_status_display}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Monitoring</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{station.monitoring_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  {station.last_monitored && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Last Monitored</span>
                      <span className="text-sm text-gray-900 dark:text-white">{formatDateTime(station.last_monitored)}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Onboarding Progress</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Profile', completed: station.profile_completed },
                    { label: 'Stream Setup', completed: station.stream_setup_completed },
                    { label: 'Staff', completed: station.staff_completed },
                    { label: 'Compliance', completed: station.compliance_completed },
                    { label: 'Payment Info', completed: station.payment_info_added },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{step.label}</span>
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Staff Members</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{station.staff_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Stream Links</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{station.stream_links_count}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Stream Configuration */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Stream Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stream URL</label>
                  <p className="text-gray-900 dark:text-white break-all">{station.stream_url || 'Not configured'}</p>
                </div>
                {station.backup_stream_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Backup Stream URL</label>
                    <p className="text-gray-900 dark:text-white break-all">{station.backup_stream_url}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stream Type</label>
                    <p className="text-gray-900 dark:text-white">{station.stream_type || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bitrate</label>
                    <p className="text-gray-900 dark:text-white">{station.stream_bitrate || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
                    <p className="text-gray-900 dark:text-white">{station.stream_format || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mount Point</label>
                    <p className="text-gray-900 dark:text-white">{station.stream_mount_point || 'Not set'}</p>
                  </div>
                </div>
                {station.stream_validation_errors && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Stream Validation Error</p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{station.stream_validation_errors}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Monitoring Settings */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Monitoring Settings</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Monitoring Enabled</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${station.monitoring_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}`}>
                    {station.monitoring_enabled ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Monitoring Interval</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{station.monitoring_interval_seconds}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Auto Restart</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${station.stream_auto_restart ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}`}>
                    {station.stream_auto_restart ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Quality Check</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${station.stream_quality_check_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}`}>
                    {station.stream_quality_check_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Broadcasting Details */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Broadcasting Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
                    <p className="text-gray-900 dark:text-white">{station.broadcast_frequency || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transmission Power</label>
                    <p className="text-gray-900 dark:text-white">{station.transmission_power || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operating Hours</label>
                    <p className="text-gray-900 dark:text-white">
                      {station.operating_hours_start && station.operating_hours_end
                        ? `${station.operating_hours_start} - ${station.operating_hours_end}`
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                    <p className="text-gray-900 dark:text-white">{station.timezone}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Location Details */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Location Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location Name</label>
                  <p className="text-gray-900 dark:text-white">{station.location_name || 'Not provided'}</p>
                </div>
                {station.lat && station.lng && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latitude</label>
                      <p className="text-gray-900 dark:text-white">{station.lat}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Longitude</label>
                      <p className="text-gray-900 dark:text-white">{station.lng}</p>
                    </div>
                  </div>
                )}
                {station.avg_detection_confidence && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avg Detection Confidence</label>
                    <p className="text-gray-900 dark:text-white">{parseFloat(station.avg_detection_confidence).toFixed(2)}%</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* License Information */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">License Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">License Number</label>
                  <p className="text-gray-900 dark:text-white">{station.license_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issuing Authority</label>
                  <p className="text-gray-900 dark:text-white">{station.license_issuing_authority || 'Not provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issue Date</label>
                    <p className="text-gray-900 dark:text-white">{station.license_issue_date ? formatDate(station.license_issue_date) : 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
                    <p className="text-gray-900 dark:text-white">{station.license_expiry_date ? formatDate(station.license_expiry_date) : 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Regulatory Body</label>
                  <p className="text-gray-900 dark:text-white">{station.regulatory_body || 'Not provided'}</p>
                </div>
              </div>
            </Card>

            {/* Compliance Contact */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Compliance Contact</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Name</label>
                  <p className="text-gray-900 dark:text-white">{station.compliance_contact_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white">{station.compliance_contact_email || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white">{station.compliance_contact_phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Verification Status */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8 lg:col-span-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Verification Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(station.verification_status)}`}>
                    {getStatusIcon(station.verification_status)}
                    <span className="ml-1 capitalize">{station.verification_status}</span>
                  </span>
                </div>
                {station.verified_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Verified At</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(station.verified_at)}</span>
                  </div>
                )}
                {station.verification_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification Notes</label>
                    <p className="text-gray-900 dark:text-white p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">{station.verification_notes}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Business Registration */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8 lg:col-span-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Business Registration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Registration Number</label>
                  <p className="text-gray-900 dark:text-white">{station.business_registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Identification Number</label>
                  <p className="text-gray-900 dark:text-white">{station.tax_identification_number || 'Not provided'}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bank Account */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Bank Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
                  <p className="text-gray-900 dark:text-white">{station.bank_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name</label>
                  <p className="text-gray-900 dark:text-white">{station.bank_account_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
                  <p className="text-gray-900 dark:text-white">{station.bank_account_number || 'Not provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch Code</label>
                    <p className="text-gray-900 dark:text-white">{station.bank_branch_code || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SWIFT Code</label>
                    <p className="text-gray-900 dark:text-white">{station.bank_swift_code || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Mobile Money */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Mobile Money</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                  <p className="text-gray-900 dark:text-white">{station.momo_provider || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name</label>
                  <p className="text-gray-900 dark:text-white">{station.momo_account_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
                  <p className="text-gray-900 dark:text-white">{station.momo_account || 'Not provided'}</p>
                </div>
              </div>
            </Card>

            {/* Payout Preferences */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8 lg:col-span-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Payout Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferred Method</label>
                  <p className="text-gray-900 dark:text-white capitalize">{station.preferred_payout_method || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                  <p className="text-gray-900 dark:text-white">{station.preferred_currency}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
                  <p className="text-gray-900 dark:text-white capitalize">{station.payout_frequency}</p>
                </div>
                {station.minimum_payout_amount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Minimum Payout</label>
                    <p className="text-gray-900 dark:text-white">{station.preferred_currency} {parseFloat(station.minimum_payout_amount).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
};

export default StationDetail;
