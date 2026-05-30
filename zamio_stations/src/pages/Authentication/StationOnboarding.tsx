import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OnboardingWizard, { OnboardingStep } from '../../components/onboarding/OnboardingWizard';
import WelcomeStep from './Onboarding/steps/WelcomeStep';
import ProfileStep from './Onboarding/steps/ProfileStep';
import StreamSetupStep from './Onboarding/steps/StreamSetupStep';
import StaffStep from './Onboarding/steps/StaffStep';
import ComplianceStep from './Onboarding/steps/ComplianceStep';
import PaymentStep from './Onboarding/steps/PaymentStep';
import { useAuth } from '../../lib/auth';
import { normalizeStationOnboardingStepParam } from '../../lib/onboarding';
import {
  StationOnboardingProvider,
  useStationOnboarding,
} from './Onboarding/StationOnboardingContext';

const onboardingSequence: Array<{ id: string; title: string; description: string; required?: boolean }>
  = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction to Zamio Stations platform',
      required: true,
    },
    {
      id: 'profile',
      title: 'Station Profile',
      description: 'Set up your station details and licensing',
      required: true,
    },
    {
      id: 'stream-setup',
      title: 'Stream Configuration',
      description: 'Configure audio streams for monitoring',
      required: true,
    },
    {
      id: 'staff',
      title: 'Staff Management',
      description: 'Add team members and assign roles',
    },
    {
      id: 'compliance',
      title: 'Compliance Setup',
      description: 'Configure regulatory compliance',
    },
    {
      id: 'payment',
      title: 'Payment Setup',
      description: 'Configure revenue collection methods',
      required: true,
    },
  ];

const StationOnboardingInner = () => {
  const navigate = useNavigate();
  const params = useParams<{ stepId?: string }>();
  const { status, loading, error, currentStep, setCurrentStep, finalizeOnboarding } = useStationOnboarding();

  useEffect(() => {
    const normalizedParam = normalizeStationOnboardingStepParam(params.stepId ?? null);
    if (!params.stepId) {
      if (currentStep !== 'welcome') {
        setCurrentStep('welcome');
      }
      return;
    }
    if (normalizedParam && normalizedParam !== currentStep) {
      setCurrentStep(normalizedParam);
    }
  }, [params.stepId, currentStep, setCurrentStep]);

  useEffect(() => {
    const nextStep = status?.next_step ?? status?.onboarding_step;
    if (nextStep === 'done') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  const progress = status?.progress ?? {};

  const steps: OnboardingStep[] = useMemo(() => onboardingSequence.map(({ id, title, description, required }) => ({
    id,
    title,
    description,
    component:
      id === 'welcome'
        ? WelcomeStep
        : id === 'profile'
          ? ProfileStep
          : id === 'stream-setup'
            ? StreamSetupStep
            : id === 'staff'
              ? StaffStep
              : id === 'compliance'
                ? ComplianceStep
                : PaymentStep,
    isCompleted:
      id === 'welcome'
        ? true
        : id === 'profile'
          ? Boolean(progress.profile_completed)
          : id === 'stream-setup'
            ? Boolean(progress.stream_setup_completed)
            : id === 'staff'
              ? Boolean(progress.staff_completed)
              : id === 'compliance'
                ? Boolean(progress.compliance_completed)
                : id === 'payment'
                  ? Boolean(progress.payment_info_added)
                  : false,
    isRequired: required ?? false,
  })), [progress]);

  const handleStepChange = (stepId: string) => {
    setCurrentStep(stepId);
    const targetPath = stepId ? `/onboarding/${stepId}` : '/onboarding';
    navigate(targetPath, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-200">Preparing your onboarding…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold">We couldn't load your onboarding progress</h2>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingWizard
      steps={steps}
      onComplete={async () => {
        await finalizeOnboarding();
        navigate('/dashboard', { replace: true });
      }}
      title="Station Onboarding"
      subtitle="Complete your station setup for music monitoring and royalty management"
      initialStepId="welcome"
      currentStepId={currentStep || 'welcome'}
      onStepChange={handleStepChange}
      showFooterNavigation={false}
    />
  );
};

export default function StationOnboarding() {
  const params = useParams<{ stepId?: string }>();
  const { user } = useAuth();

  const stationId =
    user && typeof user === 'object' && user !== null
      ? (user['station_id'] as string | undefined)
      : undefined;

  const initialStep = normalizeStationOnboardingStepParam(params.stepId ?? null) ?? 'welcome';

  if (!stationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold">Station profile not found</h2>
          <p className="text-sm text-slate-400">
            We couldn't determine your station account. Please sign out and sign in again to continue onboarding.
          </p>
        </div>
      </div>
    );
  }

  return (
    <StationOnboardingProvider stationId={stationId} initialStep={initialStep}>
      <StationOnboardingInner />
    </StationOnboardingProvider>
  );
}
