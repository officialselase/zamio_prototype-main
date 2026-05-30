import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Upload, MapPin, Phone, Mail, Building2, Globe, Users, Camera, ArrowLeft } from 'lucide-react';
import { useStationOnboarding } from '../StationOnboardingContext';

interface ProfileStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

interface ProfileFormState {
  stationName: string;
  stationType: string;
  location: string;
  region: string;
  coverageArea: string;
  licenseNumber: string;
  licenseExpiry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  description: string;
}

const stationTypes = [
  'FM Radio',
  'Digital Radio',
  'Community Radio',
  'Campus Radio',
  'Religious Radio',
  'News/Talk Radio',
  'Music Radio',
  'Sports Radio',
];

const regions = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Brong Ahafo',
  'Oti',
  'North East',
  'Ahafo',
  'Bono East',
  'Western North',
  'Savannah',
];

const defaultFormState: ProfileFormState = {
  stationName: '',
  stationType: '',
  location: '',
  region: '',
  coverageArea: '',
  licenseNumber: '',
  licenseExpiry: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  description: '',
};

const ProfileStep: React.FC<ProfileStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitProfile } = useStationOnboarding();
  const [formState, setFormState] = useState<ProfileFormState>(defaultFormState);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const profileSnapshot = useMemo(() => status?.profile ?? {}, [status]);
  const complianceSnapshot = useMemo(() => status?.compliance ?? {}, [status]);

  useEffect(() => {
    const initial: ProfileFormState = {
      stationName: typeof profileSnapshot?.name === 'string' && profileSnapshot.name ? profileSnapshot.name : status?.station_name ?? '',
      stationType: typeof profileSnapshot?.station_category === 'string' && profileSnapshot.station_category
        ? profileSnapshot.station_category
        : typeof profileSnapshot?.station_type === 'string' && profileSnapshot.station_type
          ? profileSnapshot.station_type
          : '',
      location: typeof profileSnapshot?.city === 'string' ? profileSnapshot.city ?? '' : '',
      region: typeof profileSnapshot?.region === 'string' ? profileSnapshot.region ?? '' : '',
      coverageArea: typeof profileSnapshot?.coverage_area === 'string' ? profileSnapshot.coverage_area ?? '' : '',
      licenseNumber: typeof profileSnapshot?.license_number === 'string' ? profileSnapshot.license_number ?? '' : '',
      licenseExpiry: typeof profileSnapshot?.license_expiry_date === 'string' && profileSnapshot.license_expiry_date
        ? profileSnapshot.license_expiry_date.slice(0, 10)
        : typeof complianceSnapshot?.license_expiry_date === 'string' && complianceSnapshot.license_expiry_date
          ? complianceSnapshot.license_expiry_date.slice(0, 10)
          : '',
      contactName: typeof complianceSnapshot?.compliance_contact_name === 'string' ? complianceSnapshot.compliance_contact_name ?? '' : '',
      contactEmail: typeof complianceSnapshot?.compliance_contact_email === 'string' ? complianceSnapshot.compliance_contact_email ?? '' : '',
      contactPhone: typeof complianceSnapshot?.compliance_contact_phone === 'string' ? complianceSnapshot.compliance_contact_phone ?? '' : '',
      website: typeof profileSnapshot?.website_url === 'string' ? profileSnapshot.website_url ?? '' : '',
      description: typeof profileSnapshot?.about === 'string' ? profileSnapshot.about ?? '' : '',
    };
    setFormState(initial);
  }, [profileSnapshot, complianceSnapshot, status?.station_name]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = ev => {
        setLogoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formState.stationName.trim()) {
      newErrors.stationName = 'Station name is required';
    }

    if (!formState.stationType) {
      newErrors.stationType = 'Station type is required';
    }

    if (!formState.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formState.region) {
      newErrors.region = 'Region is required';
    }

    if (!formState.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    }

    if (!formState.contactName.trim()) {
      newErrors.contactName = 'Contact person name is required';
    }

    if (!formState.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formState.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (!formState.contactPhone.trim()) {
      newErrors.contactPhone = 'Contact phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = new FormData();
    payload.append('station_name', formState.stationName.trim());
    if (formState.stationType) {
      payload.append('station_type', formState.stationType);
      payload.append('station_category', formState.stationType);
    }
    payload.append('location', formState.location.trim());
    payload.append('region', formState.region);
    if (formState.coverageArea.trim()) {
      payload.append('coverage_area', formState.coverageArea.trim());
    }
    payload.append('license_number', formState.licenseNumber.trim());
    if (formState.licenseExpiry) {
      payload.append('license_expiry_date', formState.licenseExpiry);
    }
    payload.append('contact_name', formState.contactName.trim());
    payload.append('contact_email', formState.contactEmail.trim());
    payload.append('contact_phone', formState.contactPhone.trim());
    if (formState.website.trim()) {
      payload.append('website_url', formState.website.trim());
    }
    if (formState.description.trim()) {
      payload.append('about', formState.description.trim());
    }
    if (logoFile) {
      payload.append('photo', logoFile);
    }

    setSubmitting(true);
    setApiError(null);
    setErrors(prev => ({ ...prev }));

    try {
      await submitProfile(payload);
      onNext();
    } catch (err) {
      const message = resolveApiError(err, setErrors);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Station Profile Setup</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Configure your station's basic information and licensing details to get started with Zamio Stations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {apiError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {apiError}
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Station Logo</h4>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div
                className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-slate-800/50 ${
                  logoPreview ? 'border-indigo-400' : 'border-slate-600'
                }`}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Station logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center transition-colors"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-slate-200 mb-2">Upload your station logo</p>
              <p className="text-sm text-slate-400">
                JPG, PNG up to 2MB. This will be displayed on your station profile and reports.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Basic Information</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="stationName" className="block text-sm font-medium text-slate-200 mb-2">
                Station Name *
              </label>
              <input
                type="text"
                id="stationName"
                name="stationName"
                value={formState.stationName}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.stationName
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="Radio Zamio 101.5"
              />
              {errors.stationName && <p className="text-red-400 text-sm mt-1">{errors.stationName}</p>}
            </div>

            <div>
              <label htmlFor="stationType" className="block text-sm font-medium text-slate-200 mb-2">
                Station Type *
              </label>
              <select
                id="stationType"
                name="stationType"
                value={formState.stationType}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                  errors.stationType
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
              >
                <option value="">Select station type</option>
                {stationTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.stationType && <p className="text-red-400 text-sm mt-1">{errors.stationType}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-200 mb-2">
                City *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formState.location}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.location
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="Accra"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.location && <p className="text-red-400 text-sm mt-1">{errors.location}</p>}
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-slate-200 mb-2">
                Region *
              </label>
              <select
                id="region"
                name="region"
                value={formState.region}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                  errors.region
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
              >
                <option value="">Select region</option>
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {errors.region && <p className="text-red-400 text-sm mt-1">{errors.region}</p>}
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
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-slate-200 mb-2">
                License Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formState.licenseNumber}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.licenseNumber
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="NCA/BR/2024/001"
                />
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.licenseNumber && <p className="text-red-400 text-sm mt-1">{errors.licenseNumber}</p>}
            </div>

            <div>
              <label htmlFor="licenseExpiry" className="block text-sm font-medium text-slate-200 mb-2">
                License Expiry
              </label>
              <input
                type="date"
                id="licenseExpiry"
                name="licenseExpiry"
                value={formState.licenseExpiry}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Person *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formState.contactName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.contactName
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="Station Manager"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.contactName && <p className="text-red-400 text-sm mt-1">{errors.contactName}</p>}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formState.contactEmail}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.contactEmail
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="manager@radiostation.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.contactEmail && <p className="text-red-400 text-sm mt-1">{errors.contactEmail}</p>}
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Phone *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formState.contactPhone}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.contactPhone
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="+233 24 123 4567"
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.contactPhone && <p className="text-red-400 text-sm mt-1">{errors.contactPhone}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="website" className="block text-sm font-medium text-slate-200 mb-2">
                Station Website
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formState.website}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 pl-10 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="https://www.radiostation.com"
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Station Description</h4>
          <textarea
            id="description"
            name="description"
            value={formState.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="Provide a brief description of your station's programming and audience."
          />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center rounded-lg bg-slate-800/50 px-6 py-3 text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
          >
            <span>{submitting ? 'Saving…' : 'Next'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

const resolveApiError = (
  error: unknown,
  assignFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { errors?: Record<string, string[] | string>; message?: string } | undefined;
    if (responseData?.errors) {
      const fieldErrors: Record<string, string> = {};
      Object.entries(responseData.errors).forEach(([field, value]) => {
        if (Array.isArray(value) && typeof value[0] === 'string') {
          fieldErrors[field] = value[0];
        } else if (typeof value === 'string') {
          fieldErrors[field] = value;
        }
      });
      assignFieldErrors(prev => ({ ...prev, ...fieldErrors }));
    }
    if (responseData?.message) {
      return responseData.message;
    }
    return error.message || 'Unable to save station profile.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unable to save station profile.';
};

export default ProfileStep;

