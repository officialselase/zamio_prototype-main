import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { OnboardingStepProps } from '../../../../components/onboarding/OnboardingWizard';
import { useArtistOnboarding } from '../ArtistOnboardingContext';

const idTypes = ['Ghana Card', 'Passport', "Driver's License", 'Voter ID'];
const nationalities = ['Ghana', 'Nigeria', 'Kenya', 'South Africa', 'United Kingdom', 'United States', 'Canada', 'Other'];

const idDocumentTypeMap: Record<string, string> = {
  'ghana card': 'id_card',
  passport: 'passport',
  "driver's license": 'drivers_license',
  'voter id': 'id_card',
};

const idTypeCodeToDisplay: Record<string, string> = {
  ghana_card: 'Ghana Card',
  passport: 'Passport',
  drivers_license: "Driver's License",
  voter_id: 'Voter ID',
};

const normalizeIdType = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "driver's license") {
    return 'drivers_license';
  }
  if (normalized === 'passport') {
    return 'passport';
  }
  if (normalized === 'voter id') {
    return 'voter_id';
  }
  if (normalized === 'ghana card') {
    return 'ghana_card';
  }
  return normalized.replace(/\s+/g, '_');
};

type DocumentKey = 'idDocument' | 'proofOfAddress' | 'selfie';

type UploadState = 'pending' | 'uploaded' | 'verified';

const KYCStep: React.FC<OnboardingStepProps> = ({ registerNextHandler, registerSkipHandler, canSkip }) => {
  const {
    status,
    finalizeOnboarding,
    uploadIdentityDocument,
    skipVerification,
    resumeVerification,
    kycDocuments,
    submitIdentityProfile,
  } = useArtistOnboarding();
  const [formData, setFormData] = useState({
    fullName: '',
    idType: '',
    idNumber: '',
    dateOfBirth: '',
    nationality: 'Ghana',
    address: '',
  });
  const [documents, setDocuments] = useState<{ [key in DocumentKey]: File | null }>({
    idDocument: null,
    proofOfAddress: null,
    selfie: null,
  });
  const [uploadStatus, setUploadStatus] = useState<{ [key in DocumentKey]: UploadState }>({
    idDocument: 'pending',
    proofOfAddress: 'pending',
    selfie: 'pending',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const identity = status?.identity_profile as
      | {
          full_name?: string;
          date_of_birth?: string;
          nationality?: string;
          id_type?: string;
          id_number?: string;
          residential_address?: string;
        }
      | undefined;

    if (!identity) {
      return;
    }

    setFormData(prev => {
      const mappedIdType = identity.id_type ? idTypeCodeToDisplay[identity.id_type] ?? prev.idType : prev.idType;
      const nextState = {
        fullName: identity.full_name ?? prev.fullName,
        idType: mappedIdType,
        idNumber: identity.id_number ?? prev.idNumber,
        dateOfBirth: identity.date_of_birth ?? prev.dateOfBirth,
        nationality: identity.nationality ?? prev.nationality,
        address: identity.residential_address ?? prev.address,
      };

      if (
        nextState.fullName === prev.fullName &&
        nextState.idType === prev.idType &&
        nextState.idNumber === prev.idNumber &&
        nextState.dateOfBirth === prev.dateOfBirth &&
        nextState.nationality === prev.nationality &&
        nextState.address === prev.address
      ) {
        return prev;
      }

      return nextState;
    });
  }, [status]);

  const existingDocuments = useMemo(() => {
    if (!kycDocuments || kycDocuments.length === 0) {
      return new Set<string>();
    }
    return new Set(kycDocuments.map(doc => doc.document_type));
  }, [kycDocuments]);

  useEffect(() => {
    if (!kycDocuments || kycDocuments.length === 0) {
      return;
    }

    setUploadStatus(prev => {
      const nextState: { [key in DocumentKey]: UploadState } = { ...prev };
      kycDocuments.forEach(doc => {
        const normalized = doc.document_type;
        const status = doc.status === 'approved' ? 'verified' : 'uploaded';
        if (['id_card', 'drivers_license', 'passport'].includes(normalized)) {
          nextState.idDocument = status;
        } else if (['utility_bill', 'bank_statement', 'tax_certificate'].includes(normalized)) {
          nextState.proofOfAddress = status;
        } else if (normalized === 'selfie') {
          nextState.selfie = status;
        }
      });
      return nextState;
    });
  }, [kycDocuments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = (documentType: DocumentKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setDocuments(prev => ({
      ...prev,
      [documentType]: file,
    }));
    setUploadStatus(prev => ({
      ...prev,
      [documentType]: 'uploaded',
    }));
  };

  const getStatusIcon = (status: UploadState) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'uploaded':
        return <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Upload className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: UploadState) => {
    switch (status) {
      case 'verified':
        return 'Uploaded';
      case 'uploaded':
        return 'Processing...';
      default:
        return 'Upload Required';
    }
  };

  const getStatusColor = (status: UploadState) => {
    switch (status) {
      case 'verified':
        return 'text-green-400';
      case 'uploaded':
        return 'text-indigo-400';
      default:
        return 'text-slate-400';
    }
  };

  const resolveIdDocumentType = () => {
    if (!formData.idType) {
      return 'id_card';
    }
    const key = formData.idType.toLowerCase();
    return idDocumentTypeMap[key] || 'id_card';
  };

  const resolveDocumentTypeForKey = (key: DocumentKey) => {
    if (key === 'idDocument') {
      return resolveIdDocumentType();
    }
    if (key === 'proofOfAddress') {
      return 'utility_bill';
    }
    return 'selfie';
  };

  const ensureDocumentSatisfied = (key: DocumentKey) => {
    if (documents[key]) {
      return true;
    }
    if (key === 'idDocument') {
      return ['id_card', 'passport', 'drivers_license'].some(type => existingDocuments.has(type));
    }
    if (key === 'proofOfAddress') {
      return ['utility_bill', 'bank_statement', 'tax_certificate'].some(type => existingDocuments.has(type));
    }
    return existingDocuments.has('selfie');
  };

  const uploadIfNeeded = useCallback(async (key: DocumentKey) => {
    const file = documents[key];
    if (!file) {
      return;
    }
    setUploadStatus(prev => ({ ...prev, [key]: 'uploaded' }));
    try {
      await uploadIdentityDocument(resolveDocumentTypeForKey(key), file, 'Uploaded during onboarding');
      setUploadStatus(prev => ({ ...prev, [key]: 'verified' }));
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [key]: 'pending' }));
      throw error;
    }
  }, [documents, uploadIdentityDocument]);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);

    if (!formData.fullName.trim() || !formData.idType || !formData.idNumber.trim() || !formData.dateOfBirth) {
      setErrorMessage('Please complete your personal information before continuing.');
      return false;
    }

    if (!ensureDocumentSatisfied('idDocument') || !ensureDocumentSatisfied('proofOfAddress') || !ensureDocumentSatisfied('selfie')) {
      setErrorMessage('Please upload the required verification documents.');
      return false;
    }

    setIsSubmitting(true);
    try {
      await submitIdentityProfile({
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        idType: normalizeIdType(formData.idType),
        idNumber: formData.idNumber,
        residentialAddress: formData.address,
      });

      await uploadIfNeeded('idDocument');
      await uploadIfNeeded('proofOfAddress');
      await uploadIfNeeded('selfie');
      await resumeVerification();
      await finalizeOnboarding();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not complete your onboarding right now. Please try again.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    finalizeOnboarding,
    ensureDocumentSatisfied,
    resumeVerification,
    uploadIfNeeded,
    submitIdentityProfile,
    formData.fullName,
    formData.idNumber,
    formData.idType,
    formData.dateOfBirth,
    formData.nationality,
    formData.address,
  ]);

  const handleSkip = useCallback(async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await skipVerification('Deferred during onboarding');
      await finalizeOnboarding();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not complete your onboarding right now. Please try again.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [finalizeOnboarding, skipVerification]);

  useEffect(() => {
    registerNextHandler?.(() => handleSubmit());
    registerSkipHandler?.(() => handleSkip());
    return () => {
      registerNextHandler?.(null);
      registerSkipHandler?.(null);
    };
  }, [handleSubmit, handleSkip, registerNextHandler, registerSkipHandler]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Identity Verification</h2>
        <p className="text-slate-300">
          Upload KYC documents for account verification. This helps us ensure compliance and security.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="mb-8 p-4 rounded-lg bg-blue-500/10 border border-blue-400/20">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-300 mb-1">Why do we need this?</h3>
            <p className="text-sm text-blue-200">
              Identity verification helps us comply with regulatory requirements and ensures secure royalty payments. This step is
              recommended but optional for demo purposes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-200 mb-2">
                Full Legal Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Enter your full legal name"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-200 mb-2">
                Date of Birth *
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-slate-200 mb-2">
                Nationality
              </label>
              <select
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              >
                {nationalities.map((nationality) => (
                  <option key={nationality} value={nationality}>
                    {nationality}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="idType" className="block text-sm font-medium text-slate-200 mb-2">
                ID Type *
              </label>
              <select
                id="idType"
                name="idType"
                value={formData.idType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              >
                <option value="">Select ID type</option>
                {idTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium text-slate-200 mb-2">
                ID Number *
              </label>
              <input
                id="idNumber"
                name="idNumber"
                type="text"
                value={formData.idNumber}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Enter your ID number"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-200 mb-2">
                Residential Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="House number, street, city"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Document Uploads</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {([
              { key: 'idDocument' as const, label: 'Government ID *', description: 'Upload your Ghana Card, passport, or driver’s license.' },
              { key: 'proofOfAddress' as const, label: 'Proof of Address *', description: 'Utility bill or bank statement issued within the last 3 months.' },
              { key: 'selfie' as const, label: 'Selfie Verification *', description: 'Take a selfie holding your ID to help us confirm identity.' },
            ]).map(({ key, label, description }) => (
              <div key={key} className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                <p className="text-sm font-medium text-slate-200 mb-2">{label}</p>
                <p className="text-xs text-slate-400 mb-4">{description}</p>
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-slate-900/50 text-center text-sm text-slate-300 transition-colors hover:border-indigo-400/50 hover:text-white">
                  <Upload className="mb-2 h-5 w-5" />
                  <span>Click to upload</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload(key)} disabled={isSubmitting} />
                </label>
                <div className={`mt-2 text-xs ${getStatusColor(uploadStatus[key])}`}>{getStatusText(uploadStatus[key])}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-300 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Verification Timeline</p>
              <p className="text-xs text-slate-400">
                KYC review typically takes 1-2 business days. You can continue using the platform while verification is pending.
              </p>
            </div>
          </div>
        </div>
      </div>

      {canSkip && (
        <p className="mt-4 text-xs text-slate-400">You can skip this step for now and return later to complete verification.</p>
      )}

      {isSubmitting && <div className="mt-6 text-sm text-indigo-200">Finalising your onboarding…</div>}
    </div>
  );
};

export default KYCStep;
