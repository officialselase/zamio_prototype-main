import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '@zamio/ui';

import { useAuth } from '../lib/auth';

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
}

const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleCollapse,
  activeTab = 'overview',
}) => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const notifications = [
    { id: 1, title: 'New airplay detected', message: 'Track detected on Adom FM', time: '2 minutes ago', unread: true },
    { id: 2, title: 'Payment processed', message: '₵45.67 deposited to account', time: '1 hour ago', unread: true },
    { id: 3, title: 'New station added', message: 'Station now available', time: '3 hours ago', unread: false },
    { id: 4, title: 'Monthly report ready', message: 'September report available', time: '1 day ago', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search handler could route to a search page in future iterations
  };

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  const userSummary = useMemo(() => {
    if (!user || typeof user !== 'object') {
      return { name: 'Admin User', email: '' };
    }
    const record = user as Record<string, unknown>;
    const firstName = typeof record['first_name'] === 'string' ? record['first_name'] : '';
    const lastName = typeof record['last_name'] === 'string' ? record['last_name'] : '';
    const email = typeof record['email'] === 'string' ? record['email'] : '';
    const name = `${firstName} ${lastName}`.trim() || email || 'Admin User';
    return { name, email };
  }, [user]);

  const getTabName = (tab: string) => {
    const tabNames: Record<string, string> = {
      overview: 'Overview',
      users: 'Users',
      stations: 'Stations',
      partners: 'Partners',
      disputes: 'Disputes',
      qa: 'Attribution QA',
      analytics: 'Analytics',
      system: 'System',
    };
    return tabNames[tab] || 'Dashboard';
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, artists, royalties..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center space-x-4">
            <button className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800">
              <Search className="w-5 h-5" />
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 relative transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-slate-700 backdrop-blur-sm">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-l-4 transition-colors duration-200 ${
                          notification.unread ? 'border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.unread ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${notification.unread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{notification.message}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">{notification.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggle}
              className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-all duration-200"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-slate-700 backdrop-blur-sm">
                  <div className="py-2">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{userSummary.name}</p>
                      {userSummary.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{userSummary.email}</p>
                      )}
                    </div>
                    <button className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

