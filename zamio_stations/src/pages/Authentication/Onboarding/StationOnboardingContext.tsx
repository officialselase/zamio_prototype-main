import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import {
  completeStationCompliance,
  completeStationOnboarding,
  completeStationPayment,
  completeStationProfile,
  completeStationStaff,
  completeStationStreamSetup,
  fetchStationOnboardingStatus,
  getStoredAuth,
  skipStationOnboardingStep,
  type StationOnboardingStatus,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

const wizardStepMap: Record<string, string> = {
  profile: 'profile',
  stream: 'stream-setup',
  staff: 'staff',
  compliance: 'compliance',
  payment: 'payment',
};

const resolveWizardStep = (backendStep?: string | null): string | null => {
  if (!backendStep) {
    return null;
  }
  const normalized = backendStep.replace(/_/g, '-');
  if (wizardStepMap[backendStep]) {
    return wizardStepMap[backendStep];
  }
  if (wizardStepMap[normalized]) {
    return wizardStepMap[normalized];
  }
  return backendStep === 'done' ? null : normalized;
};

const deriveStepFromStatus = (
  status: StationOnboardingStatus | null,
  currentStep: string | null,
): string | null => {
  if (!status) {
    return null;
  }
  const target = status.next_step ?? status.onboarding_step ?? null;
  const resolved = resolveWizardStep(typeof target === 'string' ? target : null);
  if (!resolved) {
    return null;
  }
  if (resolved === 'profile' && currentStep === 'welcome') {
    return null;
  }
  return resolved;
};

const resolveErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as { message?: string; detail?: string; errors?: Record<string, unknown> } | undefined;
    if (response?.message && typeof response.message === 'string') {
      return response.message;
    }
    if (response?.detail && typeof response.detail === 'string') {
      return response.detail;
    }
    if (response?.errors) {
      const first = Object.values(response.errors)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') {
        return first[0];
      }
    }
    return error.message || 'An unexpected error occurred. Please try again.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

interface StationStaffMemberSubmission {
  name: string;
  email?: string;
  role?: string;
}

interface StationOnboardingContextValue {
  status: StationOnboardingStatus | null;
  loading: boolean;
  error: string | null;
  currentStep: string | null;
  stationId: string;
  setCurrentStep: (step: string | null) => void;
  refreshStatus: () => Promise<StationOnboardingStatus | null>;
  submitProfile: (formData: FormData) => Promise<StationOnboardingStatus | null>;
  submitStreamSetup: (payload: Record<string, unknown>) => Promise<StationOnboardingStatus | null>;
  submitStaff: (staff: StationStaffMemberSubmission[]) => Promise<StationOnboardingStatus | null>;
  submitCompliance: (payload: Record<string, unknown>) => Promise<StationOnboardingStatus | null>;
  submitPayment: (payload: Record<string, unknown>) => Promise<StationOnboardingStatus | null>;
  finalizeOnboarding: () => Promise<StationOnboardingStatus | null>;
  skipStep: (step: string) => Promise<StationOnboardingStatus | null>;
}

const StationOnboardingContext = createContext<StationOnboardingContextValue | undefined>(undefined);

interface StationOnboardingProviderProps {
  stationId: string;
  initialStep?: string | null;
  children: ReactNode;
}

export const StationOnboardingProvider = ({
  stationId,
  initialStep = 'welcome',
  children,
}: StationOnboardingProviderProps) => {
  const { login, user: authUser } = useAuth();
  const [status, setStatus] = useState<StationOnboardingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStepState] = useState<string | null>(initialStep);

  const statusRef = useRef<StationOnboardingStatus | null>(null);
  const authUserRef = useRef(authUser);
  const currentStepRef = useRef<string | null>(initialStep);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const updateAuthFromStatus = useCallback((nextStatus: StationOnboardingStatus | null) => {
    if (!nextStatus) {
      return;
    }

    const stored = getStoredAuth();
    const baseUser =
      (stored.user && typeof stored.user === 'object' ? stored.user : null)
      || (authUserRef.current && typeof authUserRef.current === 'object' ? (authUserRef.current as Record<string, unknown>) : null)
      || {};

    const mergedUser: Record<string, unknown> = { ...baseUser };

    if (nextStatus.station_id) {
      mergedUser['station_id'] = nextStatus.station_id;
    }
    if (nextStatus.station_name) {
      mergedUser['station_name'] = nextStatus.station_name;
      mergedUser['name'] = nextStatus.station_name;
      mergedUser['display_name'] = nextStatus.station_name;
    }
    if (nextStatus.onboarding_step) {
      mergedUser['onboarding_step'] = nextStatus.onboarding_step;
    }
    if (nextStatus.next_step) {
      mergedUser['next_step'] = nextStatus.next_step;
    }

    const profile = nextStatus.profile ?? {};
    if (profile && typeof profile === 'object') {
      const profileRecord = profile as Record<string, unknown>;
      if (typeof profileRecord['country'] === 'string' && profileRecord['country']) {
        mergedUser['country'] = profileRecord['country'];
      }
      if (typeof profileRecord['phone'] === 'string' && profileRecord['phone']) {
        mergedUser['phone'] = profileRecord['phone'];
      }
    }

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('zamio_user_payload', JSON.stringify(mergedUser));
      }
    } catch (_err) {
      // Ignore storage errors in non-browser contexts
    }

    login({ user: mergedUser });
  }, [login]);

  const applyStatus = useCallback((nextStatus: StationOnboardingStatus | null) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    updateAuthFromStatus(nextStatus);

    const suggestedStep = deriveStepFromStatus(nextStatus, currentStepRef.current);
    if (suggestedStep) {
      setCurrentStepState(prev => (prev === suggestedStep ? prev : suggestedStep));
    }

    return nextStatus;
  }, [updateAuthFromStatus]);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const envelope = await fetchStationOnboardingStatus(stationId);
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      statusRef.current = null;
      setStatus(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [stationId, applyStatus]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const envelope = await fetchStationOnboardingStatus(stationId);
        if (!active) {
          return;
        }
        const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
        applyStatus(nextStatus);
      } catch (err) {
        if (!active) {
          return;
        }
        const message = resolveErrorMessage(err);
        setError(message);
        statusRef.current = null;
        setStatus(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [stationId, applyStatus]);

  const setCurrentStep = useCallback((step: string | null) => {
    setCurrentStepState(step);
  }, []);

  const submitProfile = useCallback(async (formData: FormData) => {
    formData.set('station_id', stationId);
    setError(null);
    try {
      const envelope = await completeStationProfile(formData);
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const submitStreamSetup = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    try {
      const envelope = await completeStationStreamSetup({ ...payload, station_id: stationId });
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const submitStaff = useCallback(async (staff: StationStaffMemberSubmission[]) => {
    setError(null);
    try {
      const envelope = await completeStationStaff({ station_id: stationId, staff });
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const submitCompliance = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    try {
      const envelope = await completeStationCompliance({ ...payload, station_id: stationId });
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const submitPayment = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    try {
      const envelope = await completeStationPayment({ ...payload, station_id: stationId });
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const finalizeOnboarding = useCallback(async () => {
    setError(null);
    try {
      const envelope = await completeStationOnboarding({ station_id: stationId });
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const skipStep = useCallback(async (step: string) => {
    setError(null);
    try {
      const envelope = await skipStationOnboardingStep({ station_id: stationId, step });
      const nextStatus = (envelope?.data ?? null) as StationOnboardingStatus | null;
      return applyStatus(nextStatus);
    } catch (err) {
      const message = resolveErrorMessage(err);
      setError(message);
      throw err;
    }
  }, [stationId, applyStatus]);

  const value = useMemo<StationOnboardingContextValue>(() => ({
    status,
    loading,
    error,
    currentStep,
    stationId,
    setCurrentStep,
    refreshStatus,
    submitProfile,
    submitStreamSetup,
    submitStaff,
    submitCompliance,
    submitPayment,
    finalizeOnboarding,
    skipStep,
  }), [status, loading, error, currentStep, stationId, setCurrentStep, refreshStatus, submitProfile, submitStreamSetup, submitStaff, submitCompliance, submitPayment, finalizeOnboarding, skipStep]);

  return <StationOnboardingContext.Provider value={value}>{children}</StationOnboardingContext.Provider>;
};

export const useStationOnboarding = () => {
  const context = useContext(StationOnboardingContext);
  if (!context) {
    throw new Error('useStationOnboarding must be used within a StationOnboardingProvider');
  }
  return context;
};

