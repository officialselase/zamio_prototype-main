import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  User,
  Building2,
  Settings,
  CreditCard,
  Users,
  PieChart,
  Edit3,
  Save,
  X,
  Upload,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Bell,
  Shield,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  completePublisherProfile,
  fetchPublisherProfile,
  updatePublisherAccountSettings,
  type PublisherProfilePayload,
  type PublisherProfileRevenueSplit,
  type PublisherProfilePaymentMethod,
  type PublisherProfileLinkedArtist,
  type PublisherProfileAccountSettings,
} from '../lib/api';

interface PublisherProfile {
  // Company Information
  companyName: string;
  companyType: string;
  industry: string;
  foundedYear: string;
  employeeCount: string;

  // Location
  country: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;

  // Business Details
  businessRegistration: string;
  taxId: string;
  licenseNumber: string;

  // Contact Information
  primaryContact: string;
  contactEmail: string;
  contactPhone: string;
  website: string;

  // Compliance Officer
  complianceOfficer: string;
  officerEmail: string;
  officerPhone: string;
  officerTitle: string;

  // Company Description
  description: string;

  // Logo
  logoUrl: string;
}

interface AccountSettingsState {
  emailNotifications: boolean;
  royaltyAlerts: boolean;
  weeklyReports: boolean;
  twoFactorAuth: boolean;
  language: string;
  timezone: string;
  currency: string;
}

type RevenueSplit = PublisherProfileRevenueSplit;
type PaymentMethod = PublisherProfilePaymentMethod;
type Artist = PublisherProfileLinkedArtist;

const ProfileSettings: React.FC = () => {
  const { user, isInitialized } = useAuth();
  const publisherId = useMemo(() => {
    if (!user || typeof user !== 'object') {
      return '';
    }
    const record = user as Record<string, unknown>;
    const value = record['publisher_id'] ?? record['publisherId'];
    return typeof value === 'string' ? value : '';
  }, [user]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const defaultAccountSettings = useMemo<AccountSettingsState>(() => ({
    emailNotifications: true,
    royaltyAlerts: true,
    weeklyReports: false,
    twoFactorAuth: false,
    language: 'en',
    timezone: 'Africa/Accra',
    currency: 'GHS',
  }), []);

  const [profile, setProfile] = useState<PublisherProfile>({
    companyName: '',
    companyType: '',
    industry: '',
    foundedYear: '',
    employeeCount: '',

    country: '',
    region: '',
    city: '',
    address: '',
    postalCode: '',

    businessRegistration: '',
    taxId: '',
    licenseNumber: '',

    primaryContact: '',
    contactEmail: '',
    contactPhone: '',
    website: '',

    complianceOfficer: '',
    officerEmail: '',
    officerPhone: '',
    officerTitle: '',

    description: '',

    logoUrl: ''
  });

  const [revenueSplits, setRevenueSplits] = useState<RevenueSplit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [linkedArtists, setLinkedArtists] = useState<Artist[]>([]);

  const [accountSettings, setAccountSettings] = useState<AccountSettingsState>(defaultAccountSettings);

  const resolveErrorMessage = useCallback((error: unknown): string => {
    if (axios.isAxiosError(error)) {
      const response = error.response?.data as {
        message?: string;
        detail?: string;
        errors?: Record<string, unknown>;
      } | undefined;

      if (response?.message && typeof response.message === 'string') {
        return response.message;
      }

      if (response?.detail && typeof response.detail === 'string') {
        return response.detail;
      }

      if (response?.errors && typeof response.errors === 'object') {
        const firstError = Object.values(response.errors)[0];
        if (Array.isArray(firstError) && typeof firstError[0] === 'string') {
          return firstError[0];
        }
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  }, []);

  const applyProfilePayload = useCallback((payload: PublisherProfilePayload) => {
    const summary = payload.publisher ?? {};
    setProfile({
      companyName: summary.companyName ?? '',
      companyType: summary.companyType ?? '',
      industry: summary.industry ?? '',
      foundedYear: summary.foundedYear !== undefined && summary.foundedYear !== null
        ? String(summary.foundedYear)
        : '',
      employeeCount: summary.employeeCount !== undefined && summary.employeeCount !== null
        ? String(summary.employeeCount)
        : '',
      country: summary.country ?? '',
      region: summary.region ?? '',
      city: summary.city ?? '',
      address: summary.address ?? '',
      postalCode: summary.postalCode ?? '',
      businessRegistration: summary.businessRegistration ?? '',
      taxId: summary.taxId ?? '',
      licenseNumber: summary.licenseNumber ?? '',
      primaryContact: summary.primaryContact ?? '',
      contactEmail: summary.contactEmail ?? '',
      contactPhone: summary.contactPhone ?? '',
      website: summary.website ?? '',
      complianceOfficer: summary.complianceOfficer ?? '',
      officerEmail: summary.officerEmail ?? '',
      officerPhone: summary.officerPhone ?? '',
      officerTitle: summary.officerTitle ?? '',
      description: summary.description ?? '',
      logoUrl: summary.logoUrl ?? '',
    });

    const normalizedSplits = (payload.revenueSplits ?? []).map((split) => {
      const type = ['performance', 'mechanical', 'sync'].includes(split.type)
        ? (split.type as RevenueSplit['type'])
        : 'performance';
      return {
        ...split,
        type,
      };
    });

    setRevenueSplits(normalizedSplits);

    const normalizedPayments = (payload.paymentMethods ?? []).map((method) => ({
      ...method,
      accountNumber: method.accountNumber ?? '',
    }));
    setPaymentMethods(normalizedPayments);

    const normalizedArtists = (payload.linkedArtists ?? []).map((artist) => {
      const parsedDate = artist.linkedDate ? new Date(artist.linkedDate) : null;
      const formattedDate = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleDateString()
        : artist.linkedDate ?? 'N/A';
      return {
        ...artist,
        linkedDate: formattedDate,
      };
    });
    setLinkedArtists(normalizedArtists);

    const settings = payload.accountSettings;
    setAccountSettings({
      emailNotifications: settings?.emailNotifications ?? defaultAccountSettings.emailNotifications,
      royaltyAlerts: settings?.royaltyAlerts ?? defaultAccountSettings.royaltyAlerts,
      weeklyReports: settings?.weeklyReports ?? defaultAccountSettings.weeklyReports,
      twoFactorAuth: settings?.twoFactorAuth ?? defaultAccountSettings.twoFactorAuth,
      language: settings?.language ?? defaultAccountSettings.language,
      timezone: settings?.timezone ?? defaultAccountSettings.timezone,
      currency: settings?.currency ?? defaultAccountSettings.currency,
    });
  }, [defaultAccountSettings]);

  const loadProfile = useCallback(async () => {
    if (!publisherId) {
      setIsLoading(false);
      setLoadError('Unable to determine your publisher profile.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const envelope = await fetchPublisherProfile(publisherId);
      const payload = envelope?.data as PublisherProfilePayload | undefined;
      if (!payload) {
        throw new Error('Publisher profile is unavailable.');
      }
      applyProfilePayload(payload);
    } catch (error) {
      setLoadError(resolveErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [publisherId, resolveErrorMessage, applyProfilePayload]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!publisherId) {
      setIsLoading(false);
      setLoadError('Unable to determine your publisher profile.');
      return;
    }

    loadProfile();
  }, [isInitialized, publisherId, loadProfile]);

  const handleProfileUpdate = (field: keyof PublisherProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!publisherId) {
      setSaveError('Unable to determine your publisher profile.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const formData = new FormData();
    formData.append('publisher_id', publisherId);

    const appendIfDefined = (key: string, value: string) => {
      if (value === undefined || value === null) {
        return;
      }
      const trimmed = value.toString().trim();
      if (trimmed.length === 0) {
        return;
      }
      formData.append(key, trimmed);
    };

    appendIfDefined('company_name', profile.companyName);
    appendIfDefined('company_type', profile.companyType);
    appendIfDefined('industry', profile.industry);
    appendIfDefined('founded_year', profile.foundedYear);
    appendIfDefined('employee_count', profile.employeeCount);
    appendIfDefined('country', profile.country);
    appendIfDefined('region', profile.region);
    appendIfDefined('city', profile.city);
    appendIfDefined('address', profile.address);
    appendIfDefined('postal_code', profile.postalCode);
    appendIfDefined('business_registration_number', profile.businessRegistration);
    appendIfDefined('tax_id', profile.taxId);
    appendIfDefined('license_number', profile.licenseNumber);
    appendIfDefined('primary_contact_name', profile.primaryContact);
    appendIfDefined('primary_contact_email', profile.contactEmail);
    appendIfDefined('primary_contact_phone', profile.contactPhone);
    appendIfDefined('website', profile.website);
    appendIfDefined('compliance_officer_name', profile.complianceOfficer);
    appendIfDefined('compliance_officer_email', profile.officerEmail);
    appendIfDefined('compliance_officer_phone', profile.officerPhone);
    appendIfDefined('compliance_officer_title', profile.officerTitle);
    appendIfDefined('description', profile.description);

    try {
      await completePublisherProfile(formData);
      await updatePublisherAccountSettings(publisherId, {
        email_notifications: accountSettings.emailNotifications,
        royalty_alerts: accountSettings.royaltyAlerts,
        weekly_reports: accountSettings.weeklyReports,
        two_factor_auth: accountSettings.twoFactorAuth,
        language: accountSettings.language,
        timezone: accountSettings.timezone,
        currency: accountSettings.currency,
      });

      await loadProfile();
      setIsEditing(false);
      setSaveSuccess('Profile updated successfully.');
    } catch (error) {
      setSaveError(resolveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountSettingChange = (setting: keyof AccountSettingsState, value: boolean | string) => {
    setAccountSettings(prev => ({
      ...prev,
      [setting]: typeof prev[setting] === 'boolean'
        ? Boolean(value)
        : typeof value === 'string'
          ? value
          : (prev[setting] as string),
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'revenue', label: 'Revenue Splits', icon: PieChart },
    { id: 'artists', label: 'Artist Management', icon: Users },
    { id: 'payments', label: 'Payment Settings', icon: CreditCard },
    { id: 'account', label: 'Account Settings', icon: Settings }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            {(profile.companyName || 'P').charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.companyName}</h2>
            <p className="text-gray-600 dark:text-gray-300">{profile.companyType}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{profile.city}, {profile.country}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{profile.contactPhone}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>{profile.contactEmail}</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('company')}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Artists</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {linkedArtists.filter(a => a.status === 'active').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Catalog</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {linkedArtists.reduce((sum, artist) => sum + artist.catalogSize, 0)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue Splits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {revenueSplits.filter(s => s.isActive).length}
              </p>
            </div>
            <PieChart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Methods</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {paymentMethods.length}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                New artist "Amara Kone" linked to your catalog
              </span>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Revenue split updated for International Mechanical rights
              </span>
              <span className="text-xs text-gray-400">1 day ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Monthly royalty payment processed - $12,500 distributed
              </span>
              <span className="text-xs text-gray-400">3 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompanyProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className={`flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg transition-colors duration-200 ${
                isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Basic Information</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={profile.companyName}
              onChange={(e) => handleProfileUpdate('companyName', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Type
              </label>
              <select
                value={profile.companyType}
                onChange={(e) => handleProfileUpdate('companyType', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
              >
                <option value="Music Publishing Company">Music Publishing Company</option>
                <option value="Record Label">Record Label</option>
                <option value="Artist Management">Artist Management</option>
                <option value="Music Production">Music Production</option>
                <option value="Entertainment Company">Entertainment Company</option>
                <option value="Independent Publisher">Independent Publisher</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Industry
              </label>
              <select
                value={profile.industry}
                onChange={(e) => handleProfileUpdate('industry', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
              >
                <option value="Music Publishing">Music Publishing</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Media & Broadcasting">Media & Broadcasting</option>
                <option value="Creative Arts">Creative Arts</option>
                <option value="Digital Media">Digital Media</option>
                <option value="Music Technology">Music Technology</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Founded Year
              </label>
              <input
                type="number"
                value={profile.foundedYear}
                onChange={(e) => handleProfileUpdate('foundedYear', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee Count
              </label>
              <select
                value={profile.employeeCount}
                onChange={(e) => handleProfileUpdate('employeeCount', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
              >
                <option value="1-5">1-5 employees</option>
                <option value="6-10">6-10 employees</option>
                <option value="11-25">11-25 employees</option>
                <option value="26-50">26-50 employees</option>
                <option value="51-100">51-100 employees</option>
                <option value="100+">100+ employees</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Company Logo</h4>

          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Company Logo" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            {isEditing && (
              <div>
                <button className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200">
                  Change Logo
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PNG, JPG up to 2MB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Location Information</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <select
              value={profile.country}
              onChange={(e) => handleProfileUpdate('country', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            >
              <option value="Ghana">Ghana</option>
              <option value="Nigeria">Nigeria</option>
              <option value="Kenya">Kenya</option>
              <option value="South Africa">South Africa</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Region
            </label>
            <select
              value={profile.region}
              onChange={(e) => handleProfileUpdate('region', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            >
              <option value="Greater Accra">Greater Accra</option>
              <option value="Ashanti">Ashanti</option>
              <option value="Western">Western</option>
              <option value="Central">Central</option>
              <option value="Eastern">Eastern</option>
              <option value="Volta">Volta</option>
              <option value="Northern">Northern</option>
              <option value="Upper East">Upper East</option>
              <option value="Upper West">Upper West</option>
              <option value="Brong-Ahafo">Brong-Ahafo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City
            </label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => handleProfileUpdate('city', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              value={profile.postalCode}
              onChange={(e) => handleProfileUpdate('postalCode', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => handleProfileUpdate('address', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Contact Information</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Contact
            </label>
            <input
              type="text"
              value={profile.primaryContact}
              onChange={(e) => handleProfileUpdate('primaryContact', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={profile.contactEmail}
              onChange={(e) => handleProfileUpdate('contactEmail', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={profile.contactPhone}
              onChange={(e) => handleProfileUpdate('contactPhone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={profile.website}
              onChange={(e) => handleProfileUpdate('website', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Business Registration</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Registration Number
            </label>
            <input
              type="text"
              value={profile.businessRegistration}
              onChange={(e) => handleProfileUpdate('businessRegistration', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tax ID
            </label>
            <input
              type="text"
              value={profile.taxId}
              onChange={(e) => handleProfileUpdate('taxId', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              License Number
            </label>
            <input
              type="text"
              value={profile.licenseNumber}
              onChange={(e) => handleProfileUpdate('licenseNumber', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Compliance Officer */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Compliance Officer</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Officer Name
            </label>
            <input
              type="text"
              value={profile.complianceOfficer}
              onChange={(e) => handleProfileUpdate('complianceOfficer', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={profile.officerTitle}
              onChange={(e) => handleProfileUpdate('officerTitle', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Officer Email
            </label>
            <input
              type="email"
              value={profile.officerEmail}
              onChange={(e) => handleProfileUpdate('officerEmail', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Officer Phone
            </label>
            <input
              type="tel"
              value={profile.officerPhone}
              onChange={(e) => handleProfileUpdate('officerPhone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Company Description */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Company Description</h4>

        <div>
          <textarea
            value={profile.description}
            onChange={(e) => handleProfileUpdate('description', e.target.value)}
            disabled={!isEditing}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 dark:disabled:bg-slate-800"
            placeholder="Describe your company's mission, services, and expertise in music publishing..."
          />
        </div>
      </div>
    </div>
  );

  const renderRevenueSplits = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Split Configuration</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200">
          <PieChart className="w-4 h-4" />
          <span>Add Split</span>
        </button>
      </div>

      <div className="space-y-4">
        {revenueSplits.map((split) => (
          <div key={split.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{split.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {split.territory} • {split.type.charAt(0).toUpperCase() + split.type.slice(1)} Rights
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  split.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {split.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Writer Share</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{split.writerPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${split.writerPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Publisher Share</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{split.publisherPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${split.publisherPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderArtists = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Artists</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200">
          <Users className="w-4 h-4" />
          <span>Link Artist</span>
        </button>
      </div>

      <div className="space-y-4">
        {linkedArtists.map((artist) => (
          <div key={artist.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {artist.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{artist.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {artist.contractType} • Linked {artist.linkedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Catalog Size</p>
                  <p className="font-medium text-gray-900 dark:text-white">{artist.catalogSize} tracks</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Last Royalty</p>
                  <p className="font-medium text-gray-900 dark:text-white">${artist.lastRoyalty.toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  artist.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : artist.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {artist.status.charAt(0).toUpperCase() + artist.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200">
          <CreditCard className="w-4 h-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <div key={method.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{method.accountName}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {method.type === 'bank' ? `Bank Account • ${method.bankName}` :
                     method.type === 'mobile_money' ? `Mobile Money • ${method.mobileProvider}` :
                     `${method.type.charAt(0).toUpperCase() + method.type.slice(1)}`}
                  </p>
                  <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                    {method.accountNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {method.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-medium">
                    Default
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  method.isVerified
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {method.isVerified ? 'Verified' : 'Pending'}
                </span>
                <button className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Settings</h3>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Notification Preferences</h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications about your account activity</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accountSettings.emailNotifications}
                onChange={(e) => handleAccountSettingChange('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Royalty Alerts</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when royalties are processed</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accountSettings.royaltyAlerts}
                onChange={(e) => handleAccountSettingChange('royaltyAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Weekly Reports</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly activity summaries</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accountSettings.weeklyReports}
                onChange={(e) => handleAccountSettingChange('weeklyReports', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Security</h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
            </div>
            <button className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200">
              {accountSettings.twoFactorAuth ? 'Enabled' : 'Enable'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
            </div>
            <button className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200">
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Localization</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={accountSettings.language}
              onChange={(e) => handleAccountSettingChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={accountSettings.timezone}
              onChange={(e) => handleAccountSettingChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
              <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
              <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={accountSettings.currency}
              onChange={(e) => handleAccountSettingChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="GHS">Ghanaian Cedi (GHS)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Data Management</h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Export Data</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Download all your account data</p>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Reset Settings</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reset all settings to default</p>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors duration-200">
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <p className="text-gray-600 dark:text-gray-300">Loading publisher profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6 text-red-600 dark:text-red-300 space-y-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5" />
              <span>{loadError}</span>
            </div>
            {publisherId ? (
              <button
                onClick={loadProfile}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {saveError && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/60 rounded-xl p-4 text-red-700 dark:text-red-300 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span>{saveError}</span>
          </div>
        )}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/60 rounded-xl p-4 text-green-700 dark:text-green-300 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Publisher Profile & Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your company profile, revenue splits, artist relationships, and account preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'company' && renderCompanyProfile()}
          {activeTab === 'revenue' && renderRevenueSplits()}
          {activeTab === 'artists' && renderArtists()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'account' && renderAccountSettings()}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
