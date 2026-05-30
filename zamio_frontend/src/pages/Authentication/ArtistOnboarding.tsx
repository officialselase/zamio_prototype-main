import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OnboardingWizard, { OnboardingStep } from '../../components/onboarding/OnboardingWizard';
import WelcomeStep from './Onboarding/steps/WelcomeStep';
import ProfileStep from './Onboarding/steps/ProfileStep';
import KYCStep from './Onboarding/steps/KYCStep';
import SocialMediaInfo from './Onboarding/SocialMediaInfo';
import PaymentInfo from './Onboarding/PaymentInfo';
import Publisher from './Onboarding/Publisher';
import { useAuth } from '../../lib/auth';
import {
  ArtistOnboardingProvider,
  useArtistOnboarding,
} from './Onboarding/ArtistOnboardingContext';

const onboardingSequence: Array<{ id: string; title: string; description: string; required?: boolean }>
  = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Learn about ZamIO and your self-publishing setup',
      required: true,
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Complete your artist profile information',
      required: true,
    },
    {
      id: 'social-media',
      title: 'Social Media',
      description: 'Connect your social media accounts',
    },
    {
      id: 'payment',
      title: 'Payment Info',
      description: 'Add your payment information for royalty collection',
      required: true,
    },
    {
      id: 'publisher',
      title: 'Publisher (Optional)',
      description: 'Connect with a publisher if you have one',
    },
    {
      id: 'kyc',
      title: 'Identity Verification',
      description: 'Upload KYC documents for account verification',
    },
  ];

const ArtistOnboardingInner = () => {
  const navigate = useNavigate();
  const params = useParams<{ stepId?: string }>();
  const { status, loading, error, currentStep, setCurrentStep } = useArtistOnboarding();

  useEffect(() => {
    const target = params.stepId;
    if (target && target !== currentStep) {
      setCurrentStep(target);
    }
  }, [params.stepId, currentStep, setCurrentStep]);

  useEffect(() => {
    const nextStep = status?.next_step ?? status?.onboarding_step;
    if (nextStep === 'done') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  const progress = status?.progress ?? {};

  const steps: OnboardingStep[] = useMemo(() => {
    return onboardingSequence.map(({ id, title, description, required }) => ({
      id,
      title,
      description,
      component:
        id === 'welcome'
          ? WelcomeStep
          : id === 'profile'
            ? ProfileStep
            : id === 'social-media'
              ? SocialMediaInfo
              : id === 'payment'
                ? PaymentInfo
                : id === 'publisher'
                  ? Publisher
                  : KYCStep,
      isCompleted:
        id === 'welcome'
          ? true
          : id === 'profile'
            ? Boolean(progress.profile_completed)
            : id === 'social-media'
              ? Boolean(progress.social_media_added)
              : id === 'payment'
                ? Boolean(progress.payment_info_added)
                : id === 'publisher'
                  ? Boolean(progress.publisher_added)
                  : false,
      isRequired: required ?? false,
    }));
  }, [progress]);

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
      onComplete={() => navigate('/dashboard')}
      title="Artist Onboarding"
      subtitle="Let's get you set up to start earning from your music"
      initialStepId="welcome"
      currentStepId={currentStep || 'welcome'}
      onStepChange={handleStepChange}
    />
  );
};

export default function ArtistOnboarding() {
  const { user } = useAuth();
  const params = useParams<{ stepId?: string }>();
  const artistId =
    user && typeof user === 'object' && user !== null
      ? (user['artist_id'] as string | undefined)
      : undefined;

  const initialStep = params.stepId ?? 'welcome';

  if (!artistId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold">Artist profile not found</h2>
          <p className="text-sm text-slate-400">
            We couldn't determine your artist account. Please sign out and sign in again to continue onboarding.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ArtistOnboardingProvider artistId={artistId} initialStep={initialStep}>
      <ArtistOnboardingInner />
    </ArtistOnboardingProvider>
  );
}
