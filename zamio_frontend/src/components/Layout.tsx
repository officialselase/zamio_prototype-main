import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Don't show layout on onboarding and auth pages
  const authPaths = ['/signin', '/signup', '/verify-email', '/onboarding'];
  const isAuthPage = authPaths.includes(location.pathname);

  if (isAuthPage) {
    return <Outlet />;
  }

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Desktop Layout - fixed sidebar, scrollable content */}
      <div className="hidden md:block">
        {/* Desktop Sidebar - fixed position, doesn't scroll */}
        <aside className={`fixed left-0 top-0 h-full transition-all duration-300 ease-in-out z-40 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <Sidebar
            isOpen={true}
            onClose={handleCloseSidebar}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </aside>

        {/* Desktop Main Content - scrollable, accounts for sidebar width */}
        <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Desktop Header - fixed at top */}
          <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm sticky top-0 z-30">
            <Header
              onMenuToggle={handleToggleSidebar}
              isSidebarOpen={sidebarOpen}
              isSidebarCollapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          </header>

          {/* Desktop Page Content - scrollable */}
          <main className="flex-1 overflow-y-auto">
            <div className="h-full p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Layout - overlay system */}
      <div className="md:hidden min-h-screen">
        {/* Mobile Main Content (includes header) */}
        <div className="flex flex-col min-h-screen">
          {/* Mobile Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
            <Header
              onMenuToggle={handleToggleSidebar}
              isSidebarOpen={sidebarOpen}
              isSidebarCollapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          </header>

          {/* Mobile Page Content */}
          <main className="flex-1">
            <div className="h-full p-4">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile Sidebar Overlay - only when open */}
        {sidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={handleCloseSidebar}
            />
            {/* Mobile sidebar */}
            <aside className={`fixed left-0 top-0 h-full w-64 z-40 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <Sidebar
                isOpen={sidebarOpen}
                onClose={handleCloseSidebar}
                isCollapsed={false}
                onToggleCollapse={handleToggleCollapse}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
