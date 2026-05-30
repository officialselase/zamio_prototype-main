import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

import { useAuth } from './auth';

const FullscreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      <p className="text-sm font-medium uppercase tracking-wide text-indigo-200">Preparing console…</p>
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

const RootContainer = () => <Outlet />;

import Landing from '../pages/Landing';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import EmailVerification from '../pages/EmailVerification';
import AdminOnboarding from '../pages/Onboarding/AdminOnboarding';
import Dashboard from '../pages/Dashboard';
import UserManagement from '../pages/UserManagement';
import UserDetail from '../pages/UserDetail';
import AddUser from '../pages/AddUser';
import Partners from '../pages/Partners';
import PartnerDetail from '../pages/PartnerDetail';
import Agreements from '../pages/Agreements';
import Disputes from '../pages/Disputes';
import DisputeDetail from '../pages/DisputeDetail';
import DisputesAnalytics from '../pages/DisputesAnalytics';
import PlayLogs from '../pages/PlayLogs';
import WithdrawalApprovals from '../pages/WithdrawalApprovals';
import StationBalances from '../pages/StationBalances';
import StationDeposits from '../pages/StationDeposits';
import Stations from '../pages/Stations';
import StationDetail from '../pages/StationDetail';
import NotFound from '../pages/NotFound';
import Layout from '../components/Layout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootContainer />,
    children: [
      {
        index: true,
        element: (
          <PublicRoute>
            <Landing />
          </PublicRoute>
        ),
      },
      {
        path: 'signin',
        element: (
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        ),
      },
      {
        path: 'verify-email',
        element: (
          <PublicRoute>
            <EmailVerification />
          </PublicRoute>
        ),
      },
      {
        path: 'onboarding/:stepId?',
        element: (
          <PrivateRoute>
            <AdminOnboarding />
          </PrivateRoute>
        ),
      },
      {
        element: (
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        ),
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'user-management', element: <UserManagement /> },
          { path: 'user-management/add', element: <AddUser /> },
          { path: 'user-management/:id', element: <UserDetail /> },
          { path: 'stations', element: <Stations /> },
          { path: 'station/:id', element: <StationDetail /> },
          { path: 'partners', element: <Partners /> },
          { path: 'partners/:id', element: <PartnerDetail /> },
          { path: 'agreements', element: <Agreements /> },
          { path: 'disputes', element: <Disputes /> },
          { path: 'disputes/analytics', element: <DisputesAnalytics /> },
          { path: 'disputes/:id', element: <DisputeDetail /> },
          { path: 'playlogs', element: <PlayLogs /> },
          { path: 'withdrawals', element: <WithdrawalApprovals /> },
          { path: 'station-balances', element: <StationBalances /> },
          { path: 'station-deposits', element: <StationDeposits /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;

