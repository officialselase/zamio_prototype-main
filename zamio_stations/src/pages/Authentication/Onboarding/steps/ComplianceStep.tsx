import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Shield,
} from 'lucide-react';
import { useStationOnboarding } from '../StationOnboardingContext';

interface ComplianceStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

interface ComplianceFormState {
  licenseNumber: string;
  licenseAuthority: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  stationClass: string;
  stationType: string;
  coverageArea: string;
  estimatedListeners: string;
  complianceOfficer: string;
  officerEmail: string;
  officerPhone: string;
  emergencyContact: string;
  regulatoryBody: string;
}

const defaultFormState: ComplianceFormState = {
  licenseNumber: '',
  licenseAuthority: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  stationClass: '',
  stationType: '',
  coverageArea: '',
  estimatedListeners: '',
  complianceOfficer: '',
  officerEmail: '',
  officerPhone: '',
  emergencyContact: '',
  regulatoryBody: '',
};

const stationClassOptions = [
  { value: 'class_a', label: 'Class A - Major Metropolitan' },
  { value: 'class_b', label: 'Class B - Regional' },
  { value: 'class_c', label: 'Class C - Local/Community' },
  { value: 'online', label: 'Online Only' },
  { value: 'community', label: 'Community / Non-Profit' },
];

const stationTypeOptions = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'public', label: 'Public / Educational' },
  { value: 'community', label: 'Community' },
  { value: 'religious', label: 'Religious' },
  { value: 'online', label: 'Online Only' },
];

const ComplianceStep: React.FC<ComplianceStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitCompliance, skipStep } = useStationOnboarding();

  const [formState, setFormState] = useState<ComplianceFormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const complianceSnapshot = useMemo(() => status?.compliance ?? {}, [status]);
  const profileSnapshot = useMemo(() => status?.profile ?? {}, [status]);

  useEffect(() => {
    const initial: ComplianceFormState = {
      licenseNumber: typeof complianceSnapshot?.license_number === 'string'
        ? complianceSnapshot.license_number ?? ''
        : profileSnapshot?.license_number ?? '',
      licenseAuthority: typeof complianceSnapshot?.license_issuing_authority === 'string'
        ? complianceSnapshot.license_issuing_authority ?? ''
        : '',
      licenseIssueDate: typeof complianceSnapshot?.license_issue_date === 'string' && complianceSnapshot.license_issue_date
        ? complianceSnapshot.license_issue_date.slice(0, 10)
        : '',
      licenseExpiryDate: typeof complianceSnapshot?.license_expiry_date === 'string' && complianceSnapshot.license_expiry_date
        ? complianceSnapshot.license_expiry_date.slice(0, 10)
        : '',
      stationClass: typeof profileSnapshot?.station_class === 'string' ? profileSnapshot.station_class ?? '' : '',
      stationType: typeof profileSnapshot?.station_type === 'string' ? profileSnapshot.station_type ?? '' : '',
      coverageArea: typeof profileSnapshot?.coverage_area === 'string'
        ? profileSnapshot.coverage_area ?? ''
        : typeof complianceSnapshot?.coverage_area === 'string'
          ? complianceSnapshot.coverage_area ?? ''
          : '',
      estimatedListeners: typeof profileSnapshot?.estimated_listeners === 'number'
        ? String(profileSnapshot.estimated_listeners)
        : typeof complianceSnapshot?.estimated_listeners === 'number'
          ? String(complianceSnapshot.estimated_listeners)
          : '',
      complianceOfficer: typeof complianceSnapshot?.compliance_contact_name === 'string'
        ? complianceSnapshot.compliance_contact_name ?? ''
        : '',
      officerEmail: typeof complianceSnapshot?.compliance_contact_email === 'string'
        ? complianceSnapshot.compliance_contact_email ?? ''
        : '',
      officerPhone: typeof complianceSnapshot?.compliance_contact_phone === 'string'
        ? complianceSnapshot.compliance_contact_phone ?? ''
        : '',
      emergencyContact: typeof complianceSnapshot?.emergency_contact_phone === 'string'
        ? complianceSnapshot.emergency_contact_phone ?? ''
        : '',
      regulatoryBody: typeof complianceSnapshot?.regulatory_body === 'string'
        ? complianceSnapshot.regulatory_body ?? ''
        : '',
    };

    setFormState(initial);
  }, [complianceSnapshot, profileSnapshot]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    setApiError(null);
    try {
      await skipStep('compliance');
      onNext();
    } catch (err) {
      const message = resolveApiError(err, setErrors);
      setApiError(message);
    } finally {
      setSkipping(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formState.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    }

    if (!formState.licenseAuthority.trim()) {
      newErrors.licenseAuthority = 'Issuing authority is required';
    }

    if (!formState.complianceOfficer.trim()) {
      newErrors.complianceOfficer = 'Compliance officer name is required';
    }

    if (!formState.officerEmail.trim()) {
      newErrors.officerEmail = 'Compliance officer email is required';
    } else if (!/\S+@\S+\.\S+/.test(formState.officerEmail)) {
      newErrors.officerEmail = 'Please enter a valid email address';
    }

    if (formState.estimatedListeners) {
      const normalized = formState.estimatedListeners.replace(/,/g, '');
      if (!/^\d+$/.test(normalized)) {
        newErrors.estimatedListeners = 'Estimated listeners must be a number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setApiError(null);

    const payload: Record<string, unknown> = {
      license_number: formState.licenseNumber.trim(),
      license_authority: formState.licenseAuthority.trim(),
      compliance_officer: formState.complianceOfficer.trim(),
      officer_email: formState.officerEmail.trim(),
    };

    if (formState.licenseIssueDate) {
      payload.license_issue_date = formState.licenseIssueDate;
    }
    if (formState.licenseExpiryDate) {
      payload.license_expiry_date = formState.licenseExpiryDate;
    }
    if (formState.stationClass) {
      payload.station_class = formState.stationClass;
    }
    if (formState.stationType) {
      payload.station_type = formState.stationType;
    }
    if (formState.coverageArea.trim()) {
      payload.coverage_area = formState.coverageArea.trim();
    }
    if (formState.estimatedListeners) {
      payload.estimated_listeners = Number(formState.estimatedListeners.replace(/,/g, ''));
    }
    if (formState.officerPhone.trim()) {
      payload.officer_phone = formState.officerPhone.trim();
    }
    if (formState.emergencyContact.trim()) {
      payload.emergency_contact = formState.emergencyContact.trim();
    }
    if (formState.regulatoryBody.trim()) {
      payload.regulatory_body = formState.regulatoryBody.trim();
    }

    try {
      await submitCompliance(payload);
      onNext();
    } catch (err) {
      const message = resolveApiError(err, setErrors);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const complianceDocuments = Array.isArray((status as any)?.compliance_documents)
    ? ((status as any).compliance_documents as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Compliance Setup</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Ensure your station meets all regulatory requirements and maintain compliance with Ghanaian broadcasting standards and GHAMRO regulations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {apiError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {apiError}
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">License Information</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-slate-200 mb-2">
                License Number
              </label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formState.licenseNumber}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.licenseNumber
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="NCA/BR/2024/001"
              />
              {errors.licenseNumber && <p className="text-red-400 text-sm mt-1">{errors.licenseNumber}</p>}
            </div>

            <div>
              <label htmlFor="licenseAuthority" className="block text-sm font-medium text-slate-200 mb-2">
                Issuing Authority
              </label>
              <input
                type="text"
                id="licenseAuthority"
                name="licenseAuthority"
                value={formState.licenseAuthority}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.licenseAuthority
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="National Communications Authority"
              />
              {errors.licenseAuthority && <p className="text-red-400 text-sm mt-1">{errors.licenseAuthority}</p>}
            </div>

            <div>
              <label htmlFor="licenseIssueDate" className="block text-sm font-medium text-slate-200 mb-2">
                Issue Date
              </label>
              <input
                type="date"
                id="licenseIssueDate"
                name="licenseIssueDate"
                value={formState.licenseIssueDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="licenseExpiryDate" className="block text-sm font-medium text-slate-200 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                id="licenseExpiryDate"
                name="licenseExpiryDate"
                value={formState.licenseExpiryDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="stationClass" className="block text-sm font-medium text-slate-200 mb-2">
                Station Class
              </label>
              <select
                id="stationClass"
                name="stationClass"
                value={formState.stationClass}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">Select class</option>
                {stationClassOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stationType" className="block text-sm font-medium text-slate-200 mb-2">
                Station Type
              </label>
              <select
                id="stationType"
                name="stationType"
                value={formState.stationType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">Select type</option>
                {stationTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="coverageArea" className="block text-sm font-medium text-slate-200 mb-2">
                Coverage Area
              </label>
              <input
                type="text"
                id="coverageArea"
                name="coverageArea"
                value={formState.coverageArea}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Greater Accra & Eastern Regions"
              />
            </div>

            <div>
              <label htmlFor="estimatedListeners" className="block text-sm font-medium text-slate-200 mb-2">
                Estimated Daily Listeners
              </label>
              <input
                type="text"
                id="estimatedListeners"
                name="estimatedListeners"
                value={formState.estimatedListeners}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.estimatedListeners
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="5000"
              />
              {errors.estimatedListeners && (
                <p className="text-red-400 text-sm mt-1">{errors.estimatedListeners}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Compliance Officer</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="complianceOfficer" className="block text-sm font-medium text-slate-200 mb-2">
                Compliance Officer Name
              </label>
              <input
                type="text"
                id="complianceOfficer"
                name="complianceOfficer"
                value={formState.complianceOfficer}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.complianceOfficer
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="Sarah Johnson"
              />
              {errors.complianceOfficer && <p className="text-red-400 text-sm mt-1">{errors.complianceOfficer}</p>}
            </div>

            <div>
              <label htmlFor="officerEmail" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                id="officerEmail"
                name="officerEmail"
                value={formState.officerEmail}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.officerEmail
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="compliance@radiostation.com"
              />
              {errors.officerEmail && <p className="text-red-400 text-sm mt-1">{errors.officerEmail}</p>}
            </div>

            <div>
              <label htmlFor="officerPhone" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                id="officerPhone"
                name="officerPhone"
                value={formState.officerPhone}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="+233 24 123 4567"
              />
            </div>

            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-slate-200 mb-2">
                Emergency Contact
              </label>
              <input
                type="tel"
                id="emergencyContact"
                name="emergencyContact"
                value={formState.emergencyContact}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="+233 24 987 6543"
              />
            </div>

            <div>
              <label htmlFor="regulatoryBody" className="block text-sm font-medium text-slate-200 mb-2">
                Regulatory Body
              </label>
              <input
                type="text"
                id="regulatoryBody"
                name="regulatoryBody"
                value={formState.regulatoryBody}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="National Communications Authority"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xl font-semibold text-white">Compliance Documents</h4>
              <p className="text-sm text-slate-400">Upload your regulatory compliance documentation for verification.</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-2 text-sm text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="license">Broadcasting License</option>
                <option value="certificate">Technical Certificate</option>
                <option value="report">Compliance Report</option>
                <option value="other">Other Document</option>
              </select>
              <button
                type="button"
                className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                onClick={() => setApiError('Document uploads will be available soon. Please email support@zamio.africa for manual verification.')}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {complianceDocuments.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 bg-slate-800/40 p-6 text-center text-slate-300">
                <p>No compliance documents uploaded yet. Keep your broadcasting license handy for verification.</p>
              </div>
            )}

            {complianceDocuments.map((document, index) => {
              const statusLabel = typeof document.status === 'string' ? document.status : 'pending';
              return (
                <div
                  key={document.id ? String(document.id) : `document-${index}`}
                  className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-lg px-3 py-1 text-xs font-medium ${getStatusColor(statusLabel)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(statusLabel)}
                        <span className="uppercase tracking-wider">{statusLabel}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-medium">{document.name ?? 'Supporting document'}</p>
                      <p className="text-sm text-slate-400">
                        Uploaded {document.uploaded_at ?? 'recently'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    <span className="text-xs text-slate-400">Expiry: {document.expiry_date ?? 'N/A'}</span>
                    <button className="inline-flex items-center space-x-1 rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800/60 transition">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button className="inline-flex items-center space-x-1 rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800/60 transition">
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                    <button className="inline-flex items-center space-x-1 rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition">
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center rounded-lg bg-slate-800/50 px-6 py-3 text-white transition hover:bg-slate-800"
          >
            <Shield className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-white transition hover:bg-slate-800/60 disabled:opacity-60"
            >
              {skipping ? 'Skipping…' : 'Skip'}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            >
              <span>{submitting ? 'Saving…' : 'Next'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'rejected':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'text-green-400 bg-green-500/20';
    case 'rejected':
      return 'text-red-400 bg-red-500/20';
    default:
      return 'text-yellow-400 bg-yellow-500/20';
  }
};

const resolveApiError = (
  error: unknown,
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): string => {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as {
      message?: string;
      detail?: string;
      errors?: Record<string, string[] | string>;
    } | undefined;

    if (response?.errors) {
      setFieldErrors(prev => {
        const next = { ...prev };
        Object.entries(response.errors!).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            next[key] = value[0] ?? '';
          } else if (typeof value === 'string') {
            next[key] = value;
          }
        });
        return next;
      });
    }

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
      if (typeof first === 'string') {
        return first;
      }
    }
    return error.message || 'An unexpected error occurred. Please try again.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

export default ComplianceStep;
