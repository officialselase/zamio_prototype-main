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
  completePublisherArtistLink,
  completePublisherOnboarding,
  completePublisherPayment,
  completePublisherProfile,
  completePublisherRevenueSplit,
  createArtistRelationship,
  fetchPublisherOnboardingStatus,
  inviteArtist,
  searchPublisherArtists,
  skipPublisherOnboardingStep,
  type LinkedArtistSummary,
  type PublisherArtistSearchResult,
  type PublisherOnboardingStatus,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface PublisherOnboardingContextValue {
  status: PublisherOnboardingStatus | null;
  loading: boolean;
  error: string | null;
  currentStep: string | null;
  setCurrentStep: (step: string | null) => void;
  refreshStatus: () => Promise<PublisherOnboardingStatus | null>;
  submitCompanyProfile: (payload: PublisherCompanyProfileForm) => Promise<PublisherOnboardingStatus | null>;
  submitRevenueSplit: (payload: PublisherRevenueSplitForm) => Promise<PublisherOnboardingStatus | null>;
  linkArtist: (payload?: LinkArtistPayload) => Promise<PublisherOnboardingStatus | null>;
  submitPayment: (payload: PublisherPaymentForm) => Promise<PublisherOnboardingStatus | null>;
  finalizeOnboarding: () => Promise<PublisherOnboardingStatus | null>;
  skipStep: (step: string) => Promise<PublisherOnboardingStatus | null>;
  searchArtists: (query: string) => Promise<PublisherArtistSearchResult[]>;
  inviteArtist: (payload: InviteArtistPayload) => Promise<void>;
  publisherId: string;
  linkedArtists: LinkedArtistSummary[];
}

const PublisherOnboardingContext = createContext<PublisherOnboardingContextValue | undefined>(undefined);

const wizardStepSet = new Set<string>(['welcome', 'company-profile', 'revenue-split', 'artist-management', 'payment-setup']);

const stepNameMap: Record<string, string> = {
  profile: 'company-profile',
  'revenue-split': 'revenue-split',
  'link-artist': 'artist-management',
  payment: 'payment-setup',
};

const sanitizeOptionalString = (value?: string | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

    if (response?.errors && typeof response.errors === 'object') {
      const firstError = Object.values(response.errors)[0];
      if (Array.isArray(firstError) && typeof firstError[0] === 'string') {
        return firstError[0];
      }
    }

    return error.message || 'Something went wrong while processing your request.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong while processing your request.';
};

const deriveStepFromStatus = (status: PublisherOnboardingStatus | null, fallback: string | null): string | null => {
  if (!status) {
    return fallback;
  }

  const rawStep = (status.next_step || status.onboarding_step || null) as string | null;
  if (!rawStep || rawStep === 'done') {
    return fallback;
  }

  const normalized = stepNameMap[rawStep] || rawStep.replace(/_/g, '-');
  return wizardStepSet.has(normalized) ? normalized : fallback;
};

const resolvePublisherId = (user: Record<string, unknown> | null): string => {
  if (!user || typeof user !== 'object') {
    return '';
  }
  const record = user as Record<string, unknown>;
  const value = record['publisher_id'] || record['publisherId'];
  return typeof value === 'string' ? value : '';
};

export interface PublisherCompanyProfileForm {
  companyName: string;
  companyType?: string;
  industry?: string;
  foundedYear?: string | number;
  employeeCount?: string | number;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  locationName?: string;
  latitude?: string | number;
  longitude?: string | number;
  businessRegistration?: string;
  taxId?: string;
  licenseNumber?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  complianceOfficerName?: string;
  complianceOfficerEmail?: string;
  complianceOfficerPhone?: string;
  complianceOfficerTitle?: string;
  websiteUrl?: string;
  description?: string;
  logoFile?: File | null;
}

export interface PublisherRevenueSplitForm {
  writerSplit: string;
  publisherSplit: string;
  mechanicalShare?: string;
  performanceShare?: string;
  syncShare?: string;
  administrativeFee?: string;
  notes?: string;
}

export interface LinkArtistPayload {
  artistId?: string | null;
  relationshipType?: string;
  royaltySplitPercentage?: number;
  territory?: string;
  startDate?: string;
}

export interface PublisherPaymentForm {
  paymentMethod: 'momo' | 'bank';
  momoProvider?: string;
  momoNumber?: string;
  momoName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranchCode?: string;
  bankSwiftCode?: string;
  currency?: string;
  payoutFrequency?: string;
  minimumPayoutAmount?: string;
  withholdingTaxRate?: string;
  vatRegistration?: string;
  taxId?: string;
  businessRegistration?: string;
}

export interface InviteArtistPayload {
  email: string;
  message?: string;
}

interface PublisherOnboardingProviderProps {
  children: ReactNode;
  initialStep?: string | null;
}

export const PublisherOnboardingProvider = ({ children, initialStep = 'welcome' }: PublisherOnboardingProviderProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PublisherOnboardingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStepInternal] = useState<string | null>(initialStep ?? 'welcome');
  const publisherId = useMemo(() => resolvePublisherId(user ?? null), [user]);
  const initializedRef = useRef(false);
  const currentStepInternalRef = useRef(currentStep);

  const setCurrentStep = useCallback((step: string | null) => {
    if (!step) {
      setCurrentStepInternal(null);
      return;
    }
    const normalized = wizardStepSet.has(step) ? step : stepNameMap[step] || step;
    setCurrentStepInternal(normalized);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!publisherId) {
      setStatus(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchPublisherOnboardingStatus(publisherId);
      const nextStatus = (response?.data as PublisherOnboardingStatus | undefined) ?? null;
      setStatus(nextStatus);
      const derivedStep = deriveStepFromStatus(nextStatus, currentStep ?? initialStep ?? 'welcome');
      if (derivedStep && derivedStep !== currentStepInternalRef.current) {
        setCurrentStepInternal(derivedStep);
      }
      return nextStatus;
    } catch (err) {
      setError(resolveErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publisherId, initialStep, currentStep]);

  useEffect(() => {
    currentStepInternalRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      void refreshStatus();
    }
  }, [refreshStatus]);

  const submitCompanyProfile = useCallback(
    async (payload: PublisherCompanyProfileForm) => {
      if (!publisherId) {
        throw new Error('Unable to determine your publisher profile.');
      }
      const formData = new FormData();
      formData.append('publisher_id', publisherId);
      formData.append('company_name', payload.companyName);
      if (payload.companyType) formData.append('company_type', payload.companyType);
      if (payload.industry) formData.append('industry', payload.industry);
      if (payload.foundedYear) formData.append('founded_year', String(payload.foundedYear));
      if (payload.employeeCount) formData.append('employee_count', String(payload.employeeCount));
      if (payload.country) formData.append('country', payload.country);
      if (payload.region) formData.append('region', payload.region);
      if (payload.city) formData.append('city', payload.city);
      if (payload.address !== undefined) formData.append('address', payload.address ?? '');
      if (payload.postalCode !== undefined) formData.append('postal_code', payload.postalCode ?? '');
      if (payload.locationName) formData.append('location_name', payload.locationName);
      if (payload.latitude !== undefined) formData.append('latitude', String(payload.latitude));
      if (payload.longitude !== undefined) formData.append('longitude', String(payload.longitude));
      if (payload.businessRegistration) formData.append('business_registration_number', payload.businessRegistration);
      if (payload.taxId) formData.append('tax_id', payload.taxId);
      if (payload.licenseNumber) formData.append('license_number', payload.licenseNumber);
      if (payload.primaryContactName) formData.append('primary_contact_name', payload.primaryContactName);
      if (payload.primaryContactEmail) formData.append('primary_contact_email', payload.primaryContactEmail);
      if (payload.primaryContactPhone) formData.append('primary_contact_phone', payload.primaryContactPhone);
      if (payload.complianceOfficerName) formData.append('compliance_officer_name', payload.complianceOfficerName);
      if (payload.complianceOfficerEmail) formData.append('compliance_officer_email', payload.complianceOfficerEmail);
      if (payload.complianceOfficerPhone) formData.append('compliance_officer_phone', payload.complianceOfficerPhone);
      if (payload.complianceOfficerTitle) formData.append('compliance_officer_title', payload.complianceOfficerTitle);
      if (payload.websiteUrl) formData.append('website_url', payload.websiteUrl);
      if (payload.description !== undefined) formData.append('description', payload.description ?? '');
      if (payload.logoFile) {
        formData.append('photo', payload.logoFile);
      }

      await completePublisherProfile(formData);
      return await refreshStatus();
    },
    [publisherId, refreshStatus],
  );

  const submitRevenueSplit = useCallback(
    async (payload: PublisherRevenueSplitForm) => {
      if (!publisherId) {
        throw new Error('Unable to determine your publisher profile.');
      }
      const requestPayload: Record<string, unknown> = {
        publisher_id: publisherId,
        writer_split: payload.writerSplit,
        publisher_split: payload.publisherSplit,
      };
      if (payload.mechanicalShare) requestPayload.mechanical_share = payload.mechanicalShare;
      if (payload.performanceShare) requestPayload.performance_share = payload.performanceShare;
      if (payload.syncShare) requestPayload.sync_share = payload.syncShare;
      if (payload.administrativeFee) requestPayload.administrative_fee_percentage = payload.administrativeFee;
      if (payload.notes !== undefined) requestPayload.revenue_split_notes = payload.notes;

      await completePublisherRevenueSplit(requestPayload);
      return await refreshStatus();
    },
    [publisherId, refreshStatus],
  );

  const submitPayment = useCallback(
    async (payload: PublisherPaymentForm) => {
      if (!publisherId) {
        throw new Error('Unable to determine your publisher profile.');
      }
      const requestPayload: Record<string, unknown> = {
        publisher_id: publisherId,
        payment_method: payload.paymentMethod,
      };
      if (payload.paymentMethod === 'momo') {
        if (payload.momoProvider) requestPayload.momo_provider = payload.momoProvider;
        if (payload.momoNumber) requestPayload.momo_account = payload.momoNumber;
        if (payload.momoName) requestPayload.momo_account_name = payload.momoName;
      } else {
        if (payload.bankName) requestPayload.bank_name = payload.bankName;
        if (payload.bankAccountNumber) requestPayload.bank_account_number = payload.bankAccountNumber;
        if (payload.bankAccountName) requestPayload.bank_account_name = payload.bankAccountName;
        if (payload.bankBranchCode) requestPayload.bank_branch_code = payload.bankBranchCode;
        if (payload.bankSwiftCode) requestPayload.bank_swift_code = payload.bankSwiftCode;
      }
      if (payload.currency) requestPayload.currency = payload.currency;
      if (payload.payoutFrequency) requestPayload.payout_frequency = payload.payoutFrequency;
      if (payload.minimumPayoutAmount) requestPayload.minimum_payout_amount = payload.minimumPayoutAmount;
      if (payload.withholdingTaxRate) requestPayload.withholding_tax_rate = payload.withholdingTaxRate;
      if (payload.vatRegistration !== undefined) requestPayload.vat_registration_number = payload.vatRegistration ?? '';
      if (payload.taxId !== undefined) requestPayload.tax_id = payload.taxId ?? '';
      if (payload.businessRegistration !== undefined) {
        requestPayload.business_registration_number = payload.businessRegistration ?? '';
      }

      await completePublisherPayment(requestPayload);
      return await refreshStatus();
    },
    [publisherId, refreshStatus],
  );

  const linkArtist = useCallback(
    async (payload: LinkArtistPayload = {}) => {
      if (!publisherId) {
        throw new Error('Unable to determine your publisher profile.');
      }
      const requestPayload: Record<string, unknown> = {
        publisher_id: publisherId,
      };
      if (payload.artistId) {
        requestPayload.artist_id = payload.artistId;
      }

      await completePublisherArtistLink(requestPayload);

      if (payload.artistId) {
        await createArtistRelationship({
          publisher_id: publisherId,
          artist_id: payload.artistId,
          relationship_type: payload.relationshipType ?? 'exclusive',
          royalty_split_percentage: payload.royaltySplitPercentage ?? 50,
          territory: payload.territory ?? 'Ghana',
          start_date: payload.startDate,
        });
      }

      return await refreshStatus();
    },
    [publisherId, refreshStatus],
  );

  const skipStep = useCallback(
    async (step: string) => {
      if (!publisherId) {
        throw new Error('Unable to determine your publisher profile.');
      }
      const normalized = stepNameMap[step] ? step : Object.entries(stepNameMap).find(([, value]) => value === step)?.[0] || step;
      await skipPublisherOnboardingStep({ publisher_id: publisherId, step: normalized });
      return await refreshStatus();
    },
    [publisherId, refreshStatus],
  );

  const finalizeOnboarding = useCallback(async () => {
    if (!publisherId) {
      throw new Error('Unable to determine your publisher profile.');
    }
    await completePublisherOnboarding({ publisher_id: publisherId });
    return await refreshStatus();
  }, [publisherId, refreshStatus]);

  const searchArtistsHandler = useCallback(
    async (query: string) => {
      if (!publisherId || !query.trim()) {
        return [];
      }
      const response = await searchPublisherArtists(publisherId, query.trim());
      const payload = (response?.data as { results?: PublisherArtistSearchResult[] } | undefined) ?? undefined;
      return payload?.results ?? [];
    },
    [publisherId],
  );

  const inviteArtistHandler = useCallback(
    async (payload: InviteArtistPayload) => {
      if (!publisherId) {
        throw new Error('Unable to determine your publisher profile.');
      }
      await inviteArtist({
        publisher_id: publisherId,
        email: payload.email,
        message: sanitizeOptionalString(payload.message),
      });
    },
    [publisherId],
  );

  const value = useMemo<PublisherOnboardingContextValue>(() => ({
    status,
    loading,
    error,
    currentStep,
    setCurrentStep,
    refreshStatus,
    submitCompanyProfile,
    submitRevenueSplit,
    submitPayment,
    finalizeOnboarding,
    skipStep,
    searchArtists: searchArtistsHandler,
    inviteArtist: inviteArtistHandler,
    linkArtist,
    publisherId,
    linkedArtists: status?.linked_artists ?? [],
  }), [
    status,
    loading,
    error,
    currentStep,
    setCurrentStep,
    refreshStatus,
    submitCompanyProfile,
    submitRevenueSplit,
    submitPayment,
    finalizeOnboarding,
    skipStep,
    searchArtistsHandler,
    inviteArtistHandler,
    linkArtist,
    publisherId,
  ]);

  return <PublisherOnboardingContext.Provider value={value}>{children}</PublisherOnboardingContext.Provider>;
};

export const usePublisherOnboarding = () => {
  const context = useContext(PublisherOnboardingContext);
  if (!context) {
    throw new Error('usePublisherOnboarding must be used within a PublisherOnboardingProvider');
  }
  return context;
};
