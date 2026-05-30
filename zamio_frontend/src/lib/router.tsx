import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './auth';

const FullscreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      <p className="text-sm font-medium uppercase tracking-wide text-indigo-200">Preparing your workspace…</p>
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
    const safeDestination = fromState && fromState !== '/signin' ? fromState : '/dashboard';
    return <Navigate to={safeDestination} replace />;
  }

  return <>{children}</>;
};

// Import pages (assuming they exist in pages/)
import Landing from '../pages/Landing';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import EmailVerification from '../pages/EmailVerification';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

// Import new pages
import MatchLogs from '../pages/MatchLogs';
import Analytics from '../pages/Analytics';
import RoyaltyPayments from '../pages/RoyaltyPayments';
import Notifications from '../pages/Notifications';
import Settings from '../pages/Settings';
import AddTrack from '../pages/AddTrack';
import UploadManagement from '../pages/UploadManagement';
import AlbumList from '../pages/AlbumList';
import AlbumDetails from '../pages/AlbumDetails';

import {
  Profile,
  Legal,
  Feedback,
  Help,
  Schedule,
  Collaborations,
  AllArtistSongs,
  TrackDetailsPage
} from '../pages/Pages';

// Import layout and onboarding components
import Layout from '../components/Layout';
import ArtistOnboarding from '../pages/Authentication/ArtistOnboarding';

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
        <ArtistOnboarding />
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
        path: 'match-logs',
        element: <MatchLogs />
      },
      {
        path: 'all-artist-songs',
        element: <AllArtistSongs />
      },
      {
        path: 'analytics',
        element: <Analytics />
      },
      {
        path: 'royalty-payments',
        element: <RoyaltyPayments />
      },
      {
        path: 'notifications',
        element: <Notifications />
      },
      {
        path: 'profile',
        element: <Profile />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'legal',
        element: <Legal />
      },
      {
        path: 'feedback',
        element: <Feedback />
      },
      {
        path: 'help',
        element: <Help />
      },
      {
        path: 'schedule',
        element: <Schedule />
      },
      {
        path: 'collaborations',
        element: <Collaborations />
      },
      {
        path: 'track-details',
        element: <TrackDetailsPage />
      },
      {
        path: 'add-track',
        element: <AddTrack />
      },
      {
        path: 'upload-management',
        element: <UploadManagement />
      },
      {
        path: 'album-list',
        element: <AlbumList />
      },
      {
        path: 'album-details',
        element: <AlbumDetails />
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
