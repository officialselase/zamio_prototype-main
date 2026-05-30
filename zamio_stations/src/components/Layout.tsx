import React, { useState, useMemo } from 'react';
import { Link, useLocation, Outlet, NavLink } from 'react-router-dom';
import Header from './Header';
import {
  Home,
  BarChart3,
  Music,
  RadioTower,
  FileText,
  Search,
  AlertTriangle,
  User,
  Users,
  Shield,
  Bell,
  HelpCircle,
  RadioTower as RadioIcon,
  Headphones,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Get station name and initials
  const stationName = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      return user['station_name'] || 'Station';
    }
    return 'Station';
  }, [user]);

  const stationInitials = useMemo(() => {
    return stationName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [stationName]);

  // Check if current page is dashboard
  const isDashboard = location.pathname === '/dashboard';

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: Home,
      description: 'Station dashboard and overview'
    },
    {
      name: 'Transactions',
      href: '/dashboard/transactions',
      icon: DollarSign,
      description: 'Account balance and transactions'
    },
    {
      name: 'Match Logs',
      href: '/dashboard/match-logs',
      icon: Search,
      description: 'View play history and logs'
    },
    {
      name: 'Disputes',
      href: '/dashboard/match-disputes',
      icon: AlertTriangle,
      description: 'Match dispute management'
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      description: 'Manage station profile'
    },
    {
      name: 'Staff',
      href: '/dashboard/staff-management',
      icon: Users,
      description: 'Staff management and permissions'
    },
    {
      name: 'Compliance',
      href: '/dashboard/compliance',
      icon: Shield,
      description: 'License and regulatory compliance'
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
      description: 'View notifications and alerts'
    },
    {
      name: 'Help & Support',
      href: '/dashboard/help',
      icon: HelpCircle,
      description: 'Get help and support'
    },
    {
      name: 'Radio Stream',
      href: '/dashboard/radio-stream',
      icon: RadioIcon,
      description: 'Radio stream monitoring tools'
    },
    {
      name: 'Audio Stream',
      href: '/dashboard/audio-stream',
      icon: Headphones,
      description: 'Audio file matching system'
    },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex min-h-screen overflow-hidden">
        {/* Fixed Sidebar */}
        <aside className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-full flex flex-col fixed left-0 top-0 z-50`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <RadioTower className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Zamio</h2>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Stations</p>
                </div>
              )}
            </div>

            {/* Collapse button */}
            <button
              onClick={toggleSidebarCollapse}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
            {/* Main Navigation */}
            <div className="space-y-1">
              <div className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${sidebarCollapsed ? 'text-center' : ''}`}>
                {sidebarCollapsed ? 'MENU' : 'Station Management'}
              </div>
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/dashboard'}
                  className={({ isActive }) => `${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border-transparent'
                  } group flex items-start px-3 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 ${sidebarCollapsed ? 'justify-center items-center' : ''}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      } w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3 mt-0.5'} flex-shrink-0`} />
                      {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="font-medium leading-tight">{item.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-tight">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white text-sm font-semibold">{stationInitials}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {stationName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Radio Station
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={toggleSidebar}
          />
        )}

        {/* Main content */}
        <main className={`flex-1 min-w-0 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 overflow-y-auto`}>
          {/* Top header bar - show for all pages */}
          <Header
            onMenuToggle={toggleSidebar}
            isSidebarOpen={sidebarOpen}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            activeTab={navigation.find(item => window.location.pathname === item.href)?.name?.toLowerCase() || 'dashboard'}
          />

          {/* Page content */}
          <div className="p-6">
            {isDashboard ? <Dashboard /> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
