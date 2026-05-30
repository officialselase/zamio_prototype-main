export const normalizeStationOnboardingStepParam = (
  step?: string | null,
): string | null => {
  if (!step) {
    return null;
  }

  const canonical = step.toString().trim().toLowerCase();
  if (!canonical) {
    return null;
  }

  if (canonical === 'welcome') {
    return 'welcome';
  }

  if (canonical === 'stream' || canonical === 'stream-setup' || canonical === 'stream_setup') {
    return 'stream-setup';
  }

  if (canonical === 'profile' || canonical === 'staff' || canonical === 'compliance' || canonical === 'payment') {
    return canonical;
  }

  if (canonical === 'done') {
    return null;
  }

  return canonical.replace(/_/g, '-');
};

export const resolveStationOnboardingRedirect = (step?: string | null): string | null => {
  if (!step) {
    return null;
  }

  const canonical = step.toString().trim().toLowerCase();
  if (!canonical || canonical === 'done') {
    return null;
  }

  if (canonical === 'profile') {
    return '/onboarding/welcome';
  }

  if (canonical === 'stream' || canonical === 'stream-setup' || canonical === 'stream_setup') {
    return '/onboarding/stream-setup';
  }

  if (canonical === 'welcome') {
    return '/onboarding/welcome';
  }

  return `/onboarding/${canonical.replace(/_/g, '-')}`;
};
