import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchAdminOnboardingStatus,
  completeAdminProfile,
  type AdminOnboardingStatus,
  type CompleteAdminProfilePayload,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface AdminOnboardingContextValue {
  status: AdminOnboardingStatus | null;
  loading: boolean;
  error: string | null;
  refreshStatus: () => Promise<AdminOnboardingStatus | null>;
  submitProfile: (payload: CompleteAdminProfilePayload) => Promise<AdminOnboardingStatus | null>;
  currentStep: string;
}

const AdminOnboardingContext = createContext<AdminOnboardingContextValue | undefined>(undefined);

export const AdminOnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdminOnboardingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminOnboardingStatus();
      const nextStatus = (response?.data as AdminOnboardingStatus | undefined) ?? null;
      setStatus(nextStatus);
      return nextStatus;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load onboarding status.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refreshStatus();
    }
  }, [user, refreshStatus]);

  const submitProfile = useCallback(
    async (payload: CompleteAdminProfilePayload) => {
      setLoading(true);
      setError(null);
      try {
        await completeAdminProfile(payload);
        return await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to complete admin profile.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [refreshStatus],
  );

  const currentStep = useMemo(() => {
    if (!status) {
      return 'profile';
    }
    const rawStep = status.next_step || status.onboarding_step || 'profile';
    return typeof rawStep === 'string' && rawStep.length > 0 ? rawStep.replace(/_/g, '-') : 'profile';
  }, [status]);

  const value = useMemo<AdminOnboardingContextValue>(
    () => ({ status, loading, error, refreshStatus, submitProfile, currentStep }),
    [status, loading, error, refreshStatus, submitProfile, currentStep],
  );

  return <AdminOnboardingContext.Provider value={value}>{children}</AdminOnboardingContext.Provider>;
};

export const useAdminOnboarding = () => {
  const context = useContext(AdminOnboardingContext);
  if (!context) {
    throw new Error('useAdminOnboarding must be used within an AdminOnboardingProvider');
  }
  return context;
};

