import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import OnboardingWizard, { OnboardingStep } from '../../components/onboarding/OnboardingWizard';
import WelcomeStep from './Onboarding/steps/WelcomeStep';
import CompanyProfileStep from './Onboarding/steps/CompanyProfileStep';
import RevenueSplitStep from './Onboarding/steps/RevenueSplitStep';
import ArtistManagementStep from './Onboarding/steps/ArtistManagementStep';
import PublisherPaymentStep from './Onboarding/steps/PublisherPaymentStep';
import {
  PublisherOnboardingProvider,
  usePublisherOnboarding,
} from './Onboarding/PublisherOnboardingContext';
import { useAuth } from '../../lib/auth';

const validStepIds = new Set(['welcome', 'company-profile', 'revenue-split', 'artist-management', 'payment-setup']);
const backendStepMap: Record<string, string> = {
  profile: 'company-profile',
  'revenue-split': 'revenue-split',
  'link-artist': 'artist-management',
  payment: 'payment-setup',
};

const resolvePublisherId = (user: Record<string, unknown> | null): string | null => {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const value = (user as Record<string, unknown>)['publisher_id'] || (user as Record<string, unknown>)['publisherId'];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const normalizeRouteStep = (stepId?: string): string | null => {
  if (!stepId) {
    return null;
  }
  const normalized = stepId.toLowerCase();
  if (validStepIds.has(normalized)) {
    return normalized;
  }
  const mapped = backendStepMap[normalized];
  return mapped && validStepIds.has(mapped) ? mapped : null;
};

const PublisherOnboardingContent = () => {
  const navigate = useNavigate();
  const { status, currentStep, setCurrentStep, finalizeOnboarding, loading, error, linkedArtists } = usePublisherOnboarding();

  const steps = useMemo<OnboardingStep[]>(() => {
    const progress = status?.progress ?? {};
    return [
      {
        id: 'welcome',
        title: 'Welcome',
        description: 'Introduction to Zamio Publisher platform',
        component: WelcomeStep,
        isCompleted: Boolean(status && (status.onboarding_step && status.onboarding_step !== 'profile')), // consider completed once moved forward
        isRequired: true,
      },
      {
        id: 'company-profile',
        title: 'Company Profile',
        description: 'Complete your publisher company information',
        component: CompanyProfileStep,
        isCompleted: Boolean(progress.profile_completed),
        isRequired: true,
      },
      {
        id: 'revenue-split',
        title: 'Revenue Split',
        description: 'Configure writer and publisher revenue splits',
        component: RevenueSplitStep,
        isCompleted: Boolean(progress.revenue_split_completed),
        isRequired: true,
      },
      {
        id: 'artist-management',
        title: 'Artist Management',
        description: 'Link and manage your artists',
        component: ArtistManagementStep,
        isCompleted: Boolean(progress.link_artist_completed || (linkedArtists?.length ?? 0) > 0),
        isRequired: false,
      },
      {
        id: 'payment-setup',
        title: 'Payment Setup',
        description: 'Configure royalty collection methods',
        component: PublisherPaymentStep,
        isCompleted: Boolean(progress.payment_info_added),
        isRequired: true,
      },
    ];
  }, [status, linkedArtists]);

  const handleComplete = async () => {
    try {
      await finalizeOnboarding();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to finalize publisher onboarding', err);
    } finally {
      navigate('/dashboard', { replace: true });
    }
  };

  if (loading && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm uppercase tracking-widest">Loading onboarding…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 text-center">
          {error}
        </div>
      )}
      <OnboardingWizard
        steps={steps}
        onComplete={handleComplete}
        onStepChange={(stepId) => setCurrentStep(stepId)}
        title="Publisher Onboarding"
        subtitle="Complete your publisher setup for music rights management and royalty collection"
        currentStepId={currentStep ?? 'welcome'}
        initialStepId={currentStep ?? 'welcome'}
        allowStepNavigation={false}
      />
    </>
  );
};

export default function PublisherOnboarding() {
  const { user } = useAuth();
  const params = useParams<{ stepId?: string }>();
  const publisherId = resolvePublisherId(user ?? null);
  const initialStep = normalizeRouteStep(params.stepId) ?? 'welcome';

  if (!publisherId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-semibold">Publisher profile unavailable</h2>
          <p className="text-sm text-slate-400">
            We were unable to locate your publisher account. Please sign out and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublisherOnboardingProvider initialStep={initialStep}>
      <PublisherOnboardingContent />
    </PublisherOnboardingProvider>
  );
}
