import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Upload, MapPin, Phone, Mail, User, FileText, X } from 'lucide-react';
import { isAxiosError } from 'axios';

import {
  usePublisherOnboarding,
  type PublisherCompanyProfileForm,
} from '../PublisherOnboardingContext';

interface CompanyProfileStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

interface FormState {
  companyName: string;
  companyType: string;
  industry: string;
  foundedYear: string;
  employeeCount: string;
  country: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;
  businessRegistration: string;
  taxId: string;
  licenseNumber: string;
  primaryContact: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  complianceOfficer: string;
  officerEmail: string;
  officerPhone: string;
  officerTitle: string;
  description: string;
}

const INITIAL_FORM_STATE: FormState = {
  companyName: '',
  companyType: '',
  industry: '',
  foundedYear: '',
  employeeCount: '',
  country: 'Ghana',
  region: '',
  city: '',
  address: '',
  postalCode: '',
  businessRegistration: '',
  taxId: '',
  licenseNumber: '',
  primaryContact: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  complianceOfficer: '',
  officerEmail: '',
  officerPhone: '',
  officerTitle: '',
  description: '',
};

const sanitize = (value: string) => value.trim();

const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitCompanyProfile } = usePublisherOnboarding();
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hydratedRef = useRef(false);

  const companyTypes = useMemo(
    () => [
      'Music Publishing Company',
      'Record Label',
      'Artist Management',
      'Music Production',
      'Entertainment Company',
      'Independent Publisher',
      'Other',
    ],
    [],
  );

  const industries = useMemo(
    () => [
      'Music Publishing',
      'Entertainment',
      'Media & Broadcasting',
      'Creative Arts',
      'Digital Media',
      'Music Technology',
      'Other',
    ],
    [],
  );

  const regions = useMemo(
    () => [
      'Greater Accra',
      'Ashanti',
      'Western',
      'Central',
      'Eastern',
      'Volta',
      'Northern',
      'Upper East',
      'Upper West',
      'Brong-Ahafo',
      'Other',
    ],
    [],
  );

  useEffect(() => {
    const profile = status?.company_profile;
    if (!profile || hydratedRef.current) {
      return;
    }

    const next: FormState = {
      companyName: profile.company_name ?? '',
      companyType: profile.company_type ?? '',
      industry: profile.industry ?? '',
      foundedYear: profile.founded_year ? String(profile.founded_year) : '',
      employeeCount: profile.employee_count ? String(profile.employee_count) : '',
      country: profile.country ?? 'Ghana',
      region: profile.region ?? '',
      city: profile.city ?? '',
      address: profile.address ?? '',
      postalCode: profile.postal_code ?? '',
      businessRegistration: profile.business_registration_number ?? '',
      taxId: profile.tax_id ?? '',
      licenseNumber: profile.license_number ?? '',
      primaryContact: profile.primary_contact_name ?? '',
      contactEmail: profile.primary_contact_email ?? '',
      contactPhone: profile.primary_contact_phone ?? '',
      website: profile.website_url ?? '',
      complianceOfficer: profile.compliance_officer_name ?? '',
      officerEmail: profile.compliance_officer_email ?? '',
      officerPhone: profile.compliance_officer_phone ?? '',
      officerTitle: profile.compliance_officer_title ?? '',
      description: profile.description ?? '',
    };

    setFormData(next);
    setLogoPreview((profile.logo_url as string | null) ?? null);
    hydratedRef.current = true;
  }, [status?.company_profile]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors[name];
        return nextErrors;
      });
    }
    setApiError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setApiError('Please upload an image file for your company logo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(typeof reader.result === 'string' ? reader.result : null);
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };

  const validateForm = () => {
    const validationErrors: Record<string, string> = {};

    if (!sanitize(formData.companyName)) {
      validationErrors.companyName = 'Company name is required';
    }
    if (!sanitize(formData.companyType)) {
      validationErrors.companyType = 'Company type is required';
    }
    if (!sanitize(formData.country)) {
      validationErrors.country = 'Country is required';
    }
    if (!sanitize(formData.region)) {
      validationErrors.region = 'Region is required';
    }
    if (!sanitize(formData.contactEmail)) {
      validationErrors.contactEmail = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmail.trim())) {
      validationErrors.contactEmail = 'Please enter a valid email address';
    }
    if (!sanitize(formData.contactPhone)) {
      validationErrors.contactPhone = 'Contact phone is required';
    }
    if (!sanitize(formData.complianceOfficer)) {
      validationErrors.complianceOfficer = 'Compliance officer name is required';
    }
    if (!sanitize(formData.description)) {
      validationErrors.description = 'Company description is required';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    const payload: PublisherCompanyProfileForm = {
      companyName: sanitize(formData.companyName),
      companyType: sanitize(formData.companyType) || undefined,
      industry: sanitize(formData.industry) || undefined,
      foundedYear: sanitize(formData.foundedYear) || undefined,
      employeeCount: sanitize(formData.employeeCount) || undefined,
      country: sanitize(formData.country) || undefined,
      region: sanitize(formData.region) || undefined,
      city: sanitize(formData.city) || undefined,
      address: formData.address.trim(),
      postalCode: formData.postalCode.trim(),
      businessRegistration: sanitize(formData.businessRegistration) || undefined,
      taxId: sanitize(formData.taxId) || undefined,
      licenseNumber: sanitize(formData.licenseNumber) || undefined,
      primaryContactName: sanitize(formData.primaryContact) || undefined,
      primaryContactEmail: sanitize(formData.contactEmail) || undefined,
      primaryContactPhone: sanitize(formData.contactPhone) || undefined,
      websiteUrl: sanitize(formData.website) || undefined,
      complianceOfficerName: sanitize(formData.complianceOfficer) || undefined,
      complianceOfficerEmail: sanitize(formData.officerEmail) || undefined,
      complianceOfficerPhone: sanitize(formData.officerPhone) || undefined,
      complianceOfficerTitle: sanitize(formData.officerTitle) || undefined,
      description: formData.description.trim(),
      logoFile,
    };

    setIsSubmitting(true);
    try {
      await submitCompanyProfile(payload);
      onNext();
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; errors?: Record<string, unknown> };
        if (data?.errors) {
          const nextErrors: Record<string, string> = {};
          Object.entries(data.errors).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              nextErrors[key] = String(value[0]);
            } else if (typeof value === 'string') {
              nextErrors[key] = value;
            }
          });
          setErrors((prev) => ({ ...prev, ...nextErrors }));
          if (Object.keys(nextErrors).length > 0) {
            setApiError('Please review the highlighted fields.');
          }
        } else if (data?.message) {
          setApiError(data.message);
        } else {
          setApiError('Unable to save your company profile. Please try again.');
        }
      } else {
        setApiError('Unable to save your company profile. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Company Profile Setup</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Set up your publishing company profile with all the essential business information. This will be used for contracts,
          reporting, and official communications.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Company Information</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-200 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full rounded-lg border ${
                  errors.companyName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="Zamio Music Publishing"
              />
              {errors.companyName && <p className="mt-1 text-xs text-red-400">{errors.companyName}</p>}
            </div>

            <div>
              <label htmlFor="companyType" className="block text-sm font-medium text-slate-200 mb-2">
                Company Type *
              </label>
              <select
                id="companyType"
                name="companyType"
                value={formData.companyType}
                onChange={handleInputChange}
                className={`w-full rounded-lg border ${
                  errors.companyType ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1`}
              >
                <option value="">Select company type</option>
                {companyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.companyType && <p className="mt-1 text-xs text-red-400">{errors.companyType}</p>}
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-slate-200 mb-2">
                Industry Focus
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              >
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="foundedYear" className="block text-sm font-medium text-slate-200 mb-2">
                Founded Year
              </label>
              <input
                type="number"
                id="foundedYear"
                name="foundedYear"
                value={formData.foundedYear}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="2020"
              />
            </div>

            <div>
              <label htmlFor="employeeCount" className="block text-sm font-medium text-slate-200 mb-2">
                Employee Count
              </label>
              <input
                type="number"
                id="employeeCount"
                name="employeeCount"
                value={formData.employeeCount}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="25"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-200 mb-2">
                Company Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full rounded-lg border ${
                  errors.description ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="Describe your publishing company, mission, and catalog."
              />
              {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Location & Registration</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-slate-200 mb-2">
                Country *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-indigo-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 ${
                    errors.country ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="Ghana"
                />
              </div>
              {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country}</p>}
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-slate-200 mb-2">
                Region *
              </label>
              <select
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className={`w-full rounded-lg border ${
                  errors.region ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1`}
              >
                <option value="">Select region</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {errors.region && <p className="mt-1 text-xs text-red-400">{errors.region}</p>}
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-200 mb-2">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="Accra"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-slate-200 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="GA-184-2564"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-slate-200 mb-2">
                Street Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="12 Music Avenue, Spintex Road"
              />
            </div>

            <div>
              <label htmlFor="businessRegistration" className="block text-sm font-medium text-slate-200 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                id="businessRegistration"
                name="businessRegistration"
                value={formData.businessRegistration}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-slate-200 mb-2">
                Tax Identification Number
              </label>
              <input
                type="text"
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-slate-200 mb-2">
                License Number
              </label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Primary Contacts</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="primaryContact" className="block text-sm font-medium text-slate-200 mb-2">
                Primary Contact Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-indigo-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="primaryContact"
                  name="primaryContact"
                  value={formData.primaryContact}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 pl-10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                  placeholder="Ama Boateng"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-indigo-400 absolute left-3 top-3" />
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 ${
                    errors.contactEmail ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="contact@publisher.com"
                />
              </div>
              {errors.contactEmail && <p className="mt-1 text-xs text-red-400">{errors.contactEmail}</p>}
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-200 mb-2">
                Contact Phone *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-indigo-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 ${
                    errors.contactPhone ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="+233 24 000 0000"
                />
              </div>
              {errors.contactPhone && <p className="mt-1 text-xs text-red-400">{errors.contactPhone}</p>}
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-slate-200 mb-2">
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="https://publisher.com"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Compliance Officer</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="complianceOfficer" className="block text-sm font-medium text-slate-200 mb-2">
                Compliance Officer Name *
              </label>
              <input
                type="text"
                id="complianceOfficer"
                name="complianceOfficer"
                value={formData.complianceOfficer}
                onChange={handleInputChange}
                className={`w-full rounded-lg border ${
                  errors.complianceOfficer ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="Yaw Mensah"
              />
              {errors.complianceOfficer && <p className="mt-1 text-xs text-red-400">{errors.complianceOfficer}</p>}
            </div>

            <div>
              <label htmlFor="officerEmail" className="block text-sm font-medium text-slate-200 mb-2">
                Officer Email
              </label>
              <input
                type="email"
                id="officerEmail"
                name="officerEmail"
                value={formData.officerEmail}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="officerPhone" className="block text-sm font-medium text-slate-200 mb-2">
                Officer Phone
              </label>
              <input
                type="tel"
                id="officerPhone"
                name="officerPhone"
                value={formData.officerPhone}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="officerTitle" className="block text-sm font-medium text-slate-200 mb-2">
                Officer Title
              </label>
              <input
                type="text"
                id="officerTitle"
                name="officerTitle"
                value={formData.officerTitle}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Company Branding</h4>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <p className="text-sm text-slate-300 mb-3">Upload your company logo for statements and dashboards.</p>
              <div className="flex items-center space-x-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-lg object-cover border border-white/10" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-slate-900/80 text-white rounded-full hover:bg-red-500/80"
                      aria-label="Remove logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-slate-500">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <label
                    htmlFor="logoUpload"
                    className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-2 text-white text-sm font-medium shadow hover:bg-indigo-400 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo</span>
                  </label>
                  <input id="logoUpload" name="logoUpload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <p className="text-xs text-slate-400 mt-2">PNG, JPG, or SVG up to 5MB.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-4">
                <FileText className="w-5 h-5 text-indigo-300" />
                <h5 className="text-sm font-semibold text-white">Compliance Summary</h5>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Provide accurate business registration and tax details</li>
                <li>• Ensure contact information is kept up to date</li>
                <li>• Compliance officer will receive regulatory notifications</li>
              </ul>
            </div>
          </div>
        </div>

        {apiError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {apiError}
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center space-x-2 rounded-lg border border-white/10 px-6 py-3 text-sm text-slate-300 hover:text-white hover:border-white/30"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Saving...' : 'Save and Continue'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfileStep;
