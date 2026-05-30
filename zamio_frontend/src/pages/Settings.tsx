import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  CreditCard,
  Shield,
  Globe,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Mail,
  Smartphone,
  DollarSign,
  Calendar,
  Clock,
  Activity,
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Star,
  Heart,
  Users,
  MapPin,
  Phone,
  Instagram,
  Twitter,
  Facebook,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Save,
  RefreshCw,
  Key,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info as InfoIcon,
  MessageSquare,
  FileText,
  PiggyBank,
  Wallet,
  Building,
  Calculator,
  Music,
  Radio,
  Headphones,
  Volume2,
  VolumeX,
  Monitor,
  Moon,
  Sun,
  Palette,
  Zap,
  Crown,
  Gem,
  Target as TargetIcon,
  Layers,
  Database,
  Server,
  Cloud,
  Wifi,
  WifiOff,
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching
} from 'lucide-react';

// Mock settings data
const settingsData = {
  account: {
    profile: {
      name: 'Kofi Mensah',
      stageName: 'K-Mensah',
      email: 'kofi@example.com',
      phone: '+233 24 123 4567',
      location: 'Accra, Ghana',
      bio: "Award-winning Ghanaian artist blending traditional highlife with modern Afrobeats.",
      avatar: '/api/placeholder/150/150',
      verified: true,
      twoFactorEnabled: false,
      lastLogin: '2024-01-15 14:30',
      memberSince: '2020-03-15'
    },
    privacy: {
      profileVisibility: 'public',
      showEarnings: true,
      showPlayCounts: true,
      allowMessages: true,
      dataSharing: false
    }
  },
  notifications: {
    email: {
      newRoyalties: true,
      weeklyReports: true,
      platformUpdates: true,
      marketingEmails: false,
      securityAlerts: true
    },
    push: {
      newRoyalties: true,
      playMilestones: true,
      collaborationRequests: true,
      systemMaintenance: false
    },
    frequency: {
      royaltyAlerts: 'immediate',
      reportFrequency: 'weekly',
      milestoneAlerts: 'immediate'
    }
  },
  payments: {
    payoutMethod: 'bank_transfer',
    currency: 'GHS',
    minimumPayout: 100,
    autoPayout: false,
    payoutSchedule: 'monthly',
    bankDetails: {
      bankName: 'Ghana Commercial Bank',
      accountNumber: '**** **** **** 4567',
      routingNumber: '*** *** 789'
    },
    taxInfo: {
      tin: 'P1234567890',
      taxWithholding: 5.0
    }
  },
  platform: {
    integrations: {
      spotify: false,
      appleMusic: false,
      youtube: false,
      soundcloud: false
    },
    apiAccess: {
      enabled: false,
      apiKey: '•••• •••• •••• ••••'
    },
    dataExport: {
      lastExport: '2024-01-10',
      format: 'CSV',
      frequency: 'monthly'
    },
    display: {
      theme: 'auto',
      language: 'en',
      timezone: 'Africa/Accra',
      dateFormat: 'DD/MM/YYYY'
    }
  },
  security: {
    password: {
      lastChanged: '2023-12-01',
      strength: 'strong'
    },
    sessions: [
      {
        id: 1,
        device: 'Chrome on Windows',
        location: 'Accra, Ghana',
        lastActive: '2024-01-15 14:30',
        current: true
      },
      {
        id: 2,
        device: 'Safari on iPhone',
        location: 'Accra, Ghana',
        lastActive: '2024-01-14 09:15',
        current: false
      }
    ],
    loginAlerts: true,
    suspiciousActivity: false
  }
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState(settingsData);
  const [isLoading, setIsLoading] = useState(false);

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

  const SettingSection = ({ title, description, children, icon: Icon }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    icon?: any;
  }) => (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
      <div className="flex items-center space-x-3 mb-4">
        {Icon && <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );

  const SettingItem = ({
    title,
    description,
    children,
    warning
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    warning?: boolean;
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-800/80 transition-colors duration-200">
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
          {warning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{description}</p>
        )}
      </div>
      <div className="ml-4">
        {children}
      </div>
    </div>
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
                  <SettingsIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Manage your account preferences, notifications, and platform settings
                  </p>
                </div>
              </div>

              {/* Quick Stats in Header */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    5
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    12
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Active Settings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    3
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Pending Changes</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Settings Navigation */}
        <div className="flex flex-wrap gap-2 p-1 bg-white/10 dark:bg-slate-800/50 backdrop-blur-md rounded-lg border border-white/20 dark:border-slate-700/30">
          <TabButton
            id="account"
            label="Account"
            icon={User}
            isActive={activeTab === 'account'}
            onClick={setActiveTab}
          />
          <TabButton
            id="notifications"
            label="Notifications"
            icon={Bell}
            isActive={activeTab === 'notifications'}
            onClick={setActiveTab}
          />
          <TabButton
            id="payments"
            label="Payments"
            icon={CreditCard}
            isActive={activeTab === 'payments'}
            onClick={setActiveTab}
          />
          <TabButton
            id="platform"
            label="Platform"
            icon={Globe}
            isActive={activeTab === 'platform'}
            onClick={setActiveTab}
          />
          <TabButton
            id="security"
            label="Security"
            icon={Shield}
            isActive={activeTab === 'security'}
            onClick={setActiveTab}
          />
        </div>

        {/* Settings Content */}
        <div className="space-y-8">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <SettingSection
                title="Profile Information"
                description="Manage your public profile information"
                icon={User}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={settings.account.profile.name}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Stage Name
                      </label>
                      <input
                        type="text"
                        defaultValue={settings.account.profile.stageName}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={settings.account.profile.email}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        defaultValue={settings.account.profile.phone}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        defaultValue={settings.account.profile.location}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        defaultValue={settings.account.profile.bio}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </SettingSection>

              <SettingSection
                title="Privacy Settings"
                description="Control who can see your information and activity"
                icon={Shield}
              >
                <div className="space-y-4">
                  <SettingItem
                    title="Profile Visibility"
                    description="Who can view your public profile"
                  >
                    <select className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="artists_only">Artists Only</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    title="Show Earnings Publicly"
                    description="Display your royalty earnings on your public profile"
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.account.privacy.showEarnings} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem
                    title="Show Play Counts"
                    description="Display song play statistics publicly"
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.account.privacy.showPlayCounts} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem
                    title="Allow Direct Messages"
                    description="Let other artists and collaborators contact you"
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.account.privacy.allowMessages} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>
                </div>
              </SettingSection>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <SettingSection
                title="Email Notifications"
                description="Choose what email notifications you want to receive"
                icon={Mail}
              >
                <div className="space-y-4">
                  <SettingItem title="New Royalty Payments" description="Get notified when you receive royalty payments">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.email.newRoyalties} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="Weekly Reports" description="Receive weekly performance and earnings reports">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.email.weeklyReports} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="Platform Updates" description="Get notified about platform features and updates">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.email.platformUpdates} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="Security Alerts" description="Important security and account notifications">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.email.securityAlerts} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>
                </div>
              </SettingSection>

              <SettingSection
                title="Push Notifications"
                description="Configure browser and mobile push notifications"
                icon={Smartphone}
              >
                <div className="space-y-4">
                  <SettingItem title="New Royalties" description="Instant notifications for new payments">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.push.newRoyalties} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="Play Milestones" description="Celebrate when your songs reach milestones">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.push.playMilestones} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="Collaboration Requests" description="Notifications for collaboration opportunities">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.notifications.push.collaborationRequests} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>
                </div>
              </SettingSection>
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <SettingSection
                title="Payout Settings"
                description="Configure how and when you receive royalty payments"
                icon={CreditCard}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payout Method
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="paypal">PayPal</option>
                        <option value="crypto">Cryptocurrency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="GHS">Ghanaian Cedi (GHS)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">British Pound (GBP)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Payout Amount
                      </label>
                      <input
                        type="number"
                        defaultValue={settings.payments.minimumPayout}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payout Schedule
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                  </div>

                  <SettingItem
                    title="Automatic Payouts"
                    description="Automatically transfer earnings when minimum threshold is reached"
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.payments.autoPayout} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>
                </div>
              </SettingSection>

              <SettingSection
                title="Banking Information"
                description="Your payment method details"
                icon={Building}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        defaultValue={settings.payments.bankDetails.bankName}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        defaultValue={settings.payments.bankDetails.accountNumber}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </SettingSection>

              <SettingSection
                title="Tax Information"
                description="Tax withholding and reporting information"
                icon={Calculator}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tax Identification Number (TIN)
                      </label>
                      <input
                        type="text"
                        defaultValue={settings.payments.taxInfo.tin}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tax Withholding Rate (%)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings.payments.taxInfo.taxWithholding}
                        step="0.1"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </SettingSection>
            </div>
          )}

          {/* Platform Settings */}
          {activeTab === 'platform' && (
            <div className="space-y-6">
              <SettingSection
                title="Display Preferences"
                description="Customize how the platform looks and feels"
                icon={Palette}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="auto">Auto (System)</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="pt">Portuguese</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                        <option value="Europe/London">Europe/London (GMT+0)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date Format
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </SettingSection>

              <SettingSection
                title="Data & Export"
                description="Manage your data and export options"
                icon={Database}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Export Format
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="CSV">CSV</option>
                        <option value="Excel">Excel</option>
                        <option value="PDF">PDF</option>
                        <option value="JSON">JSON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Export Frequency
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                        <option value="manual">Manual Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Last Export</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{formatDate(settings.platform.dataExport.lastExport)}</p>
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200">
                      <Download className="w-4 h-4" />
                      <span>Export Data</span>
                    </button>
                  </div>
                </div>
              </SettingSection>

              <SettingSection
                title="Platform Integrations"
                description="Connect with music platforms and services"
                icon={Cloud}
              >
                <div className="space-y-4">
                  <SettingItem title="Spotify Integration" description="Sync your Spotify data and analytics">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.platform.integrations.spotify} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="Apple Music Integration" description="Connect your Apple Music catalog">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.platform.integrations.appleMusic} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem title="YouTube Integration" description="Track your YouTube music content">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.platform.integrations.youtube} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>
                </div>
              </SettingSection>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <SettingSection
                title="Password & Authentication"
                description="Manage your account security"
                icon={Lock}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="flex items-end">
                      <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200">
                        Change Password
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-800/60 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Add an extra layer of security to your account</p>
                    </div>
                    <button className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                      settings.account.profile.twoFactorEnabled
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {settings.account.profile.twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Password Strength</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{settings.security.password.strength} • Last changed {formatDate(settings.security.password.lastChanged)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${settings.security.password.strength === 'strong' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span className="text-sm text-blue-700 dark:text-blue-300 capitalize">{settings.security.password.strength}</span>
                    </div>
                  </div>
                </div>
              </SettingSection>

              <SettingSection
                title="Active Sessions"
                description="Manage your active login sessions"
                icon={Monitor}
              >
                <div className="space-y-4">
                  {settings.security.sessions.map((session) => (
                    <div key={session.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                      session.current
                        ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                        : 'bg-gray-50/80 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${session.current ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <Monitor className={`w-4 h-4 ${session.current ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{session.device}</h4>
                            {session.current && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{session.location} • Last active {session.lastActive}</p>
                        </div>
                      </div>
                      {!session.current && (
                        <button className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200">
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SettingSection>

              <SettingSection
                title="Security Alerts"
                description="Configure security monitoring and alerts"
                icon={AlertTriangle}
              >
                <div className="space-y-4">
                  <SettingItem
                    title="Login Notifications"
                    description="Get notified of new logins to your account"
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={settings.security.loginAlerts} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>

                  <SettingItem
                    title="Suspicious Activity Monitoring"
                    description="Alert on unusual account activity"
                    warning
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={!settings.security.suspiciousActivity} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </SettingItem>
                </div>
              </SettingSection>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
