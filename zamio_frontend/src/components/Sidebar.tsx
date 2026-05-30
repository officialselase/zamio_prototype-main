import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Clock,
  Upload,
  BarChart3,
  DollarSign,
  Bell,
  User,
  Settings,
  HelpCircle,
  MessageSquare,
  Calendar,
  MapPin,
  Music,
  Radio,
  TrendingUp,
  FileText,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const location = useLocation();
  const { user } = useAuth();

  const artistName = useMemo(() => {
    if (!user || typeof user !== 'object') {
      return '';
    }
    const record = user as Record<string, unknown>;
    return (
      (typeof record['stage_name'] === 'string' && record['stage_name']) ||
      (typeof record['artist_name'] === 'string' && record['artist_name']) ||
      (typeof record['name'] === 'string' && record['name']) ||
      ''
    );
  }, [user]);

  const artistInitials = useMemo(() => {
    const normalized = artistName.trim();
    if (!normalized) {
      return 'AN';
    }
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return normalized.slice(0, 2).toUpperCase();
    }
    return parts
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('') || 'AN';
  }, [artistName]);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard',
      description: 'Overview and analytics'
    },
    {
      name: 'Play Logs',
      href: '/dashboard/match-logs',
      icon: Clock,
      current: location.pathname.startsWith('/dashboard/match-logs'),
      description: 'View play history and logs'
    },
    {
      name: 'Upload/Management',
      href: '/dashboard/all-artist-songs',
      icon: Upload,
      current: location.pathname.startsWith('/dashboard/all-artist-songs'),
      description: 'Manage your music catalog'
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      current: location.pathname.startsWith('/dashboard/analytics'),
      description: 'Detailed performance metrics'
    },
    {
      name: 'Payments',
      href: '/dashboard/royalty-payments',
      icon: DollarSign,
      current: location.pathname.startsWith('/dashboard/royalty-payments'),
      description: 'Royalty and earnings data'
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
      current: location.pathname.startsWith('/dashboard/notifications'),
      description: 'View notifications and alerts'
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      current: location.pathname.startsWith('/dashboard/profile'),
      description: 'Manage your profile'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      current: location.pathname.startsWith('/dashboard/settings'),
      description: 'Account and preferences'
    },
    {
      name: 'Legal',
      href: '/dashboard/legal',
      icon: HelpCircle,
      current: location.pathname.startsWith('/dashboard/legal'),
      description: 'Legal information and terms'
    },
    {
      name: 'Feedback/Reviews',
      href: '/dashboard/feedback',
      icon: MessageSquare,
      current: location.pathname.startsWith('/dashboard/feedback'),
      description: 'Provide feedback and reviews'
    },
    {
      name: 'Help and Support',
      href: '/dashboard/help',
      icon: HelpCircle,
      current: location.pathname.startsWith('/dashboard/help'),
      description: 'Get help and support'
    }
  ];

  const bottomItems = [
    {
      name: 'Schedule',
      href: '/dashboard/schedule',
      icon: Calendar,
      current: location.pathname.startsWith('/dashboard/schedule'),
      description: 'Manage your schedule'
    },
    {
      name: 'Collaborations',
      href: '/dashboard/collaborations',
      icon: User,
      current: location.pathname.startsWith('/dashboard/collaborations'),
      description: 'Artist partnerships'
    }
  ];

  const settingsItems = [
    {
      name: 'Legal',
      href: '/dashboard/legal',
      icon: HelpCircle,
      current: location.pathname.startsWith('/dashboard/legal'),
      description: 'Legal information and terms'
    },
    {
      name: 'Feedback/Reviews',
      href: '/dashboard/feedback',
      icon: MessageSquare,
      current: location.pathname.startsWith('/dashboard/feedback'),
      description: 'Provide feedback and reviews'
    },
    {
      name: 'Help and Support',
      href: '/dashboard/help',
      icon: HelpCircle,
      current: location.pathname.startsWith('/dashboard/help'),
      description: 'Get help and support'
    }
  ];

  return (
    <>
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-full flex flex-col`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-2.5 rounded-xl shadow-lg">
              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-indigo-600 font-bold text-sm">Z</span>
              </div>
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Zamio</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Royalty Platform</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mt-1 truncate">
                  {artistName || 'Artist'}
                </p>
              </div>
            )}
          </div>

          {/* Collapse button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
          {/* Main Navigation */}
          <div className="space-y-1">
            <div className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? 'MENU' : 'MENU'}
            </div>
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border-transparent'
                } group flex items-center px-3 py-3 text-sm font-medium rounded-xl border transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`${
                  item.current
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                } w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Secondary Navigation */}
          <div className="space-y-1 pt-6">
            <div className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? 'More' : 'Workspace'}
            </div>
            {bottomItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                } group flex items-center px-3 py-3 text-sm font-medium rounded-lg border transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`${
                  item.current
                    ? 'text-indigo-500 dark:text-indigo-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                } w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Settings Section */}
          <div className="space-y-1 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? '⚙️' : 'Account'}
            </div>
            {settingsItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                } group flex items-center px-3 py-3 text-sm font-medium rounded-lg border transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`${
                  item.current
                    ? 'text-indigo-500 dark:text-indigo-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                } w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white text-sm font-semibold">{artistInitials}</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {artistName || '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Premium Artist
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
