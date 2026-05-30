import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './auth';
import { resolveStationOnboardingRedirect } from './onboarding';

import StationOnboarding from '../pages/Authentication/StationOnboarding';
import ZamIOLandingPage from '../pages/Landing';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import EmailVerification from '../pages/EmailVerification';
import ForgotPassword from '../pages/ForgotPassword';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import Layout from '../components/Layout';
import {
  MatchLogs,
  MatchDisputes,
  Profile,
  PlaylogManagement,
  RadioStream,
  AudioStream,
} from '../pages/StationPages';
import StaffManagement from '../pages/StaffManagement';
import Compliance from '../pages/Compliance';
import Notifications from '../pages/Notifications';
import Help from '../pages/Help';
import DisputeDetails from '../pages/MatchDisputeManagement/DisputeDetails';
import Transactions from '../pages/Transactions';

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
    <div className="space-y-3 text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      <p className="text-sm font-medium uppercase tracking-wide text-indigo-200">Preparing your experience…</p>
    </div>
  </div>
);

const resolveNextStep = (user: unknown): string | null => {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const record = user as Record<string, unknown>;
  if (typeof record['next_step'] === 'string') {
    return record['next_step'] as string;
  }
  if (typeof record['onboarding_step'] === 'string') {
    return record['onboarding_step'] as string;
  }
  return null;
};

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  const nextStep = resolveNextStep(user);
  const redirectPath = resolveStationOnboardingRedirect(nextStep);
  if (redirectPath && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const nextStep = resolveNextStep(user);
  const redirectPath = resolveStationOnboardingRedirect(nextStep);
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  const fromState = (location.state as { from?: string } | null)?.from;
  const target = fromState && fromState !== '/signin' ? fromState : '/dashboard';
  return <Navigate to={target} replace />;
};

const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={(
          <PublicRoute>
            <ZamIOLandingPage />
          </PublicRoute>
        )}
      />
      <Route
        path="/signin"
        element={(
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        )}
      />
      <Route
        path="/signup"
        element={(
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        )}
      />
      <Route
        path="/verify-email"
        element={(
          <PublicRoute>
            <EmailVerification />
          </PublicRoute>
        )}
      />
      <Route
        path="/forgot-password"
        element={(
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        )}
      />
      <Route
        path="/onboarding"
        element={(
          <PrivateRoute>
            <StationOnboarding />
          </PrivateRoute>
        )}
      />
      <Route
        path="/onboarding/:stepId"
        element={(
          <PrivateRoute>
            <StationOnboarding />
          </PrivateRoute>
        )}
      />

      <Route
        path="/dashboard"
        element={(
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        )}
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="match-logs" element={<MatchLogs />} />
        <Route path="match-disputes" element={<MatchDisputes />} />
        <Route path="match-dispute-details" element={<DisputeDetails />} />
        <Route path="profile" element={<Profile />} />
        <Route path="staff-management" element={<StaffManagement />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="playlog-management" element={<PlaylogManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="help" element={<Help />} />
        <Route path="radio-stream" element={<RadioStream />} />
        <Route path="audio-stream" element={<AudioStream />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default Router;

