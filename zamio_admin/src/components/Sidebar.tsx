import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Radio,
  Building,
  FileText,
  Target,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertTriangle,
  Music,
  Download,
  Activity,
} from 'lucide-react';

import { useAuth } from '../lib/auth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  activeTab = 'overview',
  onTabChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const userSummary = useMemo(() => {
    if (!user || typeof user !== 'object') {
      return { name: 'Admin User', role: 'Administrator' };
    }
    const record = user as Record<string, unknown>;
    const firstName = typeof record['first_name'] === 'string' ? record['first_name'] : '';
    const lastName = typeof record['last_name'] === 'string' ? record['last_name'] : '';
    const email = typeof record['email'] === 'string' ? record['email'] : '';
    const name = `${firstName} ${lastName}`.trim() || email || 'Admin User';
    return { name, role: 'Administrator' };
  }, [user]);

  const navigationItems = [
    {
      name: 'Overview',
      id: 'overview',
      icon: Home,
      current: location.pathname === '/dashboard' && activeTab === 'overview',
      description: 'Platform overview and metrics',
      link: '/dashboard',
      isRoute: true,
      onClick: () => {
        navigate('/dashboard');
        onTabChange?.('overview');
      },
    },
    {
      name: 'Users',
      id: 'users',
      icon: Users,
      current: location.pathname === '/user-management',
      description: 'User management and profiles',
      link: '/user-management',
      isRoute: true,
    },
    {
      name: 'Stations',
      id: 'stations',
      icon: Radio,
      current: location.pathname === '/stations',
      description: 'Station management and monitoring',
      link: '/stations',
      isRoute: true,
    },
    {
      name: 'Disputes',
      id: 'disputes',
      icon: AlertTriangle,
      current: location.pathname === '/disputes',
      description: 'Dispute management and resolution',
      link: '/disputes',
      isRoute: true,
    },
    {
      name: 'Partners',
      id: 'partners',
      icon: Building,
      current: location.pathname === '/partners',
      description: 'Partner agreements and management',
      link: '/partners',
      isRoute: true,
    },
    {
      name: 'Play Logs',
      id: 'playlogs',
      icon: Activity,
      current: location.pathname === '/playlogs',
      description: 'Music play and match logs',
      link: '/playlogs',
      isRoute: true,
    },
    {
      name: 'Withdrawals',
      id: 'withdrawals',
      icon: Download,
      current: location.pathname === '/withdrawals',
      description: 'Approve and manage withdrawals',
      link: '/withdrawals',
      isRoute: true,
    },
    {
      name: 'Station Deposits',
      id: 'station-deposits',
      icon: FileText,
      current: location.pathname === '/station-deposits',
      description: 'Manage station deposit requests',
      link: '/station-deposits',
      isRoute: true,
    },
    {
      name: 'Station Balances',
      id: 'station-balances',
      icon: BarChart3,
      current: location.pathname === '/station-balances',
      description: 'View and manage station balances',
      link: '/station-balances',
      isRoute: true,
    },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-full flex flex-col`}>
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-2.5 rounded-xl shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">ZamIO Admin</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Platform Console</p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-colors duration-200"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          <div className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? 'MENU' : 'ADMIN PANEL'}
          </div>
          {navigationItems.map((item) => {
            const isRoute = item.isRoute;
            const ButtonComponent = isRoute ? Link : 'button';

            return (
              <ButtonComponent
                key={item.id}
                to={isRoute ? item.link : undefined}
                onClick={!isRoute ? item.onClick : item.onClick || undefined}
                className={`${
                  item.current
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border-transparent'
                } group flex items-center px-3 py-3 text-sm font-medium rounded-xl border transition-all duration-200 w-full ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={`${
                    item.current
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                  } w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`}
                />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</div>
                  </div>
                )}
              </ButtonComponent>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white text-sm font-semibold">AD</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userSummary.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userSummary.role}</p>
              <button
                onClick={() => {
                  logout();
                  navigate('/signin', { replace: true });
                  onClose?.();
                }}
                className="mt-2 inline-flex items-center space-x-1 text-xs text-red-500 hover:text-red-400"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

