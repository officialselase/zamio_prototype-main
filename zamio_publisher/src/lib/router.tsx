import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

import { useAuth } from './auth';

const FullscreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-200">Preparing your workspace…</p>
    </div>
  </div>
);

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { isInitialized, isAuthenticated } = useAuth();

  if (!isInitialized) {
    return <FullscreenLoader />;
  }

  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
    return <Navigate to="/signin" replace state={{ from: target }} />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { isInitialized, isAuthenticated } = useAuth();

  if (!isInitialized) {
    return <FullscreenLoader />;
  }

  if (isAuthenticated) {
    const fromState = (location.state as { from?: string } | null)?.from;
    const destination = fromState && fromState !== '/signin' ? fromState : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};

// Import pages (assuming they exist in pages/)
import Landing from '../pages/Landing';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import EmailVerification from '../pages/EmailVerification';
import PublisherOnboarding from '../pages/Authentication/PublisherOnboarding';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import Layout from '../components/Layout';

// Import new publisher pages
import {
  ArtistsManagement,
  CatalogManagement,
  RoyaltiesPayments,
  ReportsAnalytics,
  ContractsLegal,
  ProfileSettings,
  Support,
  PlayLogs,
  PaymentProcessing
} from '../pages/PublisherPages';
import ArtistPayments from '../pages/ArtistPayments';
import RequestPayout from '../pages/RequestPayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PublicRoute>
        <Landing />
      </PublicRoute>
    ),
  },
  {
    path: '/signin',
    element: (
      <PublicRoute>
        <SignIn />
      </PublicRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <PublicRoute>
        <SignUp />
      </PublicRoute>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <PublicRoute>
        <EmailVerification />
      </PublicRoute>
    ),
  },
  {
    path: '/onboarding/:stepId?',
    element: (
      <PrivateRoute>
        <PublisherOnboarding />
      </PrivateRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <PrivateRoute>
        <Layout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: 'artists',
        element: <ArtistsManagement />
      },
      {
        path: 'catalog',
        element: <CatalogManagement />
      },
      {
        path: 'royalties',
        element: <RoyaltiesPayments />
      },
      {
        path: 'royalties/process-payments',
        element: <PaymentProcessing />
      },
      {
        path: 'artist-payments',
        element: <ArtistPayments />
      },
      {
        path: 'request-payout',
        element: <RequestPayout />
      },
      {
        path: 'reports',
        element: <ReportsAnalytics />
      },
      {
        path: 'playlogs',
        element: <PlayLogs />
      },
      {
        path: 'contracts',
        element: <ContractsLegal />
      },
      {
        path: 'profile',
        element: <ProfileSettings />
      },
      {
        path: 'support',
        element: <Support />
      }
    ]
  },
  // Catch-all route for 404 errors - must be last
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
