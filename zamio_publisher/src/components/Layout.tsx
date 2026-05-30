import React, { useMemo, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import Header from './Header';
import {
  Home,
  Users,
  Music,
  DollarSign,
  BarChart3,
  FileText,
  User,
  HelpCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isDashboard = location.pathname === '/dashboard';

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard',
      description: 'Overview and analytics',
    },
    {
      name: 'Play Logs',
      href: '/dashboard/playlogs',
      icon: Activity,
      current: location.pathname.startsWith('/dashboard/playlogs'),
      description: 'Catalog performance tracking',
    },
    {
      name: 'Artists',
      href: '/dashboard/artists',
      icon: Users,
      current: location.pathname.startsWith('/dashboard/artists'),
      description: 'Manage your artist roster',
    },
    {
      name: 'Catalog',
      href: '/dashboard/catalog',
      icon: Music,
      current: location.pathname.startsWith('/dashboard/catalog'),
      description: 'Music catalog management',
    },
    {
      name: 'Royalties',
      href: '/dashboard/royalties',
      icon: DollarSign,
      current: location.pathname === '/dashboard/royalties' || location.pathname.startsWith('/dashboard/royalties/process'),
      description: 'Earnings and payments',
    },
    {
      name: 'Artist Payments',
      href: '/dashboard/artist-payments',
      icon: Wallet,
      current: location.pathname.startsWith('/dashboard/artist-payments'),
      description: 'Track payments to artists',
    },
    {
      name: 'Reports',
      href: '/dashboard/reports',
      icon: BarChart3,
      current: location.pathname.startsWith('/dashboard/reports'),
      description: 'Analytics and insights',
    },
    {
      name: 'Contracts',
      href: '/dashboard/contracts',
      icon: FileText,
      current: location.pathname.startsWith('/dashboard/contracts'),
      description: 'Legal and agreements',
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      current: location.pathname.startsWith('/dashboard/profile'),
      description: 'Publisher profile settings',
    },
    {
      name: 'Support',
      href: '/dashboard/support',
      icon: HelpCircle,
      current: location.pathname.startsWith('/dashboard/support'),
      description: 'Help and support',
    },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed);

  const publisherName = useMemo(() => {
    if (user && typeof user === 'object') {
      const record = user as Record<string, unknown>;
      if (typeof record.company_name === 'string' && record.company_name.trim()) {
        return record.company_name;
      }
      const firstName = typeof record.first_name === 'string' ? record.first_name : '';
      const lastName = typeof record.last_name === 'string' ? record.last_name : '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        return fullName;
      }
      if (typeof record.email === 'string') {
        return record.email;
      }
    }
    return 'Publisher';
  }, [user]);

  const publisherEmail = useMemo(() => {
    if (user && typeof user === 'object') {
      const record = user as Record<string, unknown>;
      if (typeof record.email === 'string') {
        return record.email;
      }
    }
    return 'publisher@zamio.com';
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex min-h-screen overflow-hidden">
        <aside
          className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-full flex flex-col fixed left-0 top-0 z-50`}
        >
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-2.5 rounded-xl shadow-lg">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-green-600 font-bold text-sm">Z</span>
                </div>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Zamio</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Publisher</p>
                </div>
              )}
            </div>

            <button
              onClick={toggleSidebarCollapse}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
            <div className="space-y-1">
              <div
                className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${sidebarCollapsed ? 'text-center' : ''}`}
              >
                {sidebarCollapsed ? 'MENU' : 'Publisher Management'}
              </div>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    item.current
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border-transparent'
                  } group flex items-center px-3 py-3 text-sm font-medium rounded-xl border transition-all duration-200 ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={`${
                      item.current ? 'text-green-600 dark:text-green-400' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    } w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} flex-shrink-0`}
                  />
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white text-sm font-semibold">{publisherName.charAt(0).toUpperCase()}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{publisherName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{publisherEmail}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={toggleSidebar} />}

        <main className={`flex-1 min-w-0 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 overflow-y-auto`}>
          <Header
            onMenuToggle={toggleSidebar}
            isSidebarOpen={sidebarOpen}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            activeTab={navigation.find((item) => item.current)?.name?.toLowerCase() || 'dashboard'}
          />

          <div className="p-6">{isDashboard ? <Dashboard /> : <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
