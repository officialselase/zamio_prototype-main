import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, User, LogOut, Menu, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ThemeToggle } from '@zamio/ui';
import { useAuth } from '../lib/auth';

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
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

  // Sample notification data
  const notifications = [
    {
      id: 1,
      title: "New airplay detected",
      message: "Your track 'Sunset Dreams' was played on Adom FM",
      time: "2 minutes ago",
      unread: true,
      type: "airplay"
    },
    {
      id: 2,
      title: "Payment received",
      message: "₵45.67 deposited to your account",
      time: "1 hour ago",
      unread: true,
      type: "payment"
    },
    {
      id: 3,
      title: "New station added",
      message: "Your music is now available on Peace FM",
      time: "3 hours ago",
      unread: false,
      type: "station"
    },
    {
      id: 4,
      title: "Monthly report ready",
      message: "Your September performance report is available",
      time: "1 day ago",
      unread: false,
      type: "report"
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/signin', { replace: true });
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - mobile menu button and desktop collapse button only */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse button */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Center - Search bar (hidden on mobile) */}
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

          {/* Right side - Notifications, Settings, User menu */}
          <div className="flex items-center space-x-4">
            {/* Search button for mobile */}
            <button className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800">
              <Search className="w-5 h-5" />
            </button>

            <div className="hidden md:flex flex-col text-right mr-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">Artist</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {artistName || '—'}
              </span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 relative transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-slate-700 backdrop-blur-sm">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Notifications list */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.slice(0, 4).map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-l-4 transition-colors duration-200 ${
                          notification.unread
                            ? 'border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.unread ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              notification.unread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* View all link */}
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors duration-200"
                    >
                      View All Notifications ({notifications.length})
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings */}
            <Link
              to="/settings"
              className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {artistName || '—'}
                </span>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-slate-700 backdrop-blur-sm">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{artistName || '—'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium Artist</p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-4">
        <form onSubmit={handleSearch}>
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
    </header>
  );
};

export default Header;
