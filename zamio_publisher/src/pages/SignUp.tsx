import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Users, ArrowRight } from 'lucide-react';
import { isAxiosError } from 'axios';

import { registerPublisher, type ApiErrorMap } from '../lib/api';

type FieldErrors = Record<string, string[]>;

interface FormState {
  firstName: string;
  lastName: string;
  publisherName: string;
  email: string;
  country: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const INITIAL_FORM_STATE: FormState = {
  firstName: '',
  lastName: '',
  publisherName: '',
  email: '',
  country: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false,
};

const normalizeErrors = (errors?: ApiErrorMap): FieldErrors => {
  if (!errors) return {};
  return Object.entries(errors).reduce<FieldErrors>((acc, [key, value]) => {
    if (!value) return acc;
    if (Array.isArray(value)) {
      acc[key] = value.map(String);
    } else {
      acc[key] = [String(value)];
    }
    return acc;
  }, {} as FieldErrors);
};

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serverErrorKeyMap: Record<keyof FormState, string[]> = {
    firstName: ['first_name'],
    lastName: ['last_name'],
    publisherName: ['publisher_name', 'company_name'],
    email: ['email', 'detail'],
    country: ['country'],
    phoneNumber: ['phone'],
    password: ['password'],
    confirmPassword: ['password2'],
    agreeToTerms: ['agreeToTerms'],
  };

  const hasFieldError = useMemo(
    () => (field: keyof FormState | string) => {
      const mapped = field in serverErrorKeyMap ? serverErrorKeyMap[field as keyof FormState] : [];
      return Boolean(fieldErrors[field] || mapped?.some((key) => fieldErrors[key]));
    },
    [fieldErrors],
  );

  const inputClass = (field: keyof FormState, extra?: string) =>
    `w-full rounded-lg border ${
      hasFieldError(field)
        ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
        : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
    } bg-slate-800/50 px-4 py-3 ${extra ?? ''} text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`;

  const renderFieldErrors = (field: keyof FormState) => {
    const keys = [field, ...(serverErrorKeyMap[field] ?? [])];
    const seen = new Set<string>();
    return keys.flatMap((key) => {
      const entries = fieldErrors[key];
      if (!entries) return [];
      return entries.map((message, index) => {
        const composite = `${String(key)}-${index}`;
        if (seen.has(composite)) {
          return null;
        }
        seen.add(composite);
        return (
          <p key={`${String(field)}-${String(key)}-${index}`} className="mt-1 text-xs text-red-400">
            {message}
          </p>
        );
      });
    }).filter(Boolean) as JSX.Element[];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    const relatedServerKeys = serverErrorKeyMap[name as keyof FormState] ?? [];
    if (fieldErrors[name] || relatedServerKeys.some(key => fieldErrors[key])) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        relatedServerKeys.forEach((key) => {
          if (next[key]) {
            delete next[key];
          }
        });
        return next;
      });
    }
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: FieldErrors = {};
    if (formData.password !== formData.confirmPassword) {
      validationErrors.password = ['Passwords do not match'];
      validationErrors.password2 = ['Passwords do not match'];
    }

    if (!formData.agreeToTerms) {
      validationErrors.agreeToTerms = ['You must agree to the Terms of Service to continue'];
    }

    if (!formData.publisherName.trim()) {
      validationErrors.publisher_name = ['Publishing company name is required'];
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setGeneralError('Please correct the highlighted fields and try again.');
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});

    const normalizedEmail = formData.email.trim().toLowerCase();

    try {
      const payload = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        publisher_name: formData.publisherName.trim(),
        email: normalizedEmail,
        phone: formData.phoneNumber.trim(),
        country: formData.country || undefined,
        password: formData.password,
        password2: formData.confirmPassword,
      };

      await registerPublisher(payload);

      navigate(
        {
          pathname: '/verify-email',
          search: normalizedEmail ? `?email=${encodeURIComponent(normalizedEmail)}` : '',
        },
        { state: { email: normalizedEmail } },
      );
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; errors?: ApiErrorMap; detail?: string };
        const normalized = normalizeErrors(data.errors);
        if (data.detail && !normalized.detail) {
          normalized.detail = [data.detail];
        }
        setFieldErrors(normalized);
        setGeneralError(data.message || data.detail || 'Unable to create your account.');
      } else {
        setGeneralError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-black" />
      <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-2xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 mb-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Users className="h-6 w-6" />
            </span>
            <span className="text-2xl font-semibold tracking-tight">Zamio Publisher</span>
          </Link>
          <h2 className="text-3xl font-semibold">Create publisher account</h2>
          <p className="mt-2 text-slate-400">Join the premier music publishing management platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-200 mb-2">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass('firstName')}
                  placeholder="Ama"
                />
                {renderFieldErrors('firstName')}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-200 mb-2">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass('lastName')}
                  placeholder="Mensah"
                />
                {renderFieldErrors('lastName')}
              </div>
            </div>

            <div>
              <label htmlFor="publisherName" className="block text-sm font-medium text-slate-200 mb-2">
                Publishing company name
              </label>
              <input
                id="publisherName"
                name="publisherName"
                type="text"
                required
                value={formData.publisherName}
                onChange={handleChange}
                className={inputClass('publisherName')}
                placeholder="Zamio Publishing Group"
              />
              {renderFieldErrors('publisherName')}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={inputClass('email')}
                placeholder="you@publisher.com"
              />
              {renderFieldErrors('email')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-slate-200 mb-2">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={inputClass('country')}
                >
                  <option value="">Select country</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                  <option value="South Africa">South Africa</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Other">Other</option>
                </select>
                {renderFieldErrors('country')}
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-200 mb-2">
                  Phone number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={inputClass('phoneNumber')}
                  placeholder="+233 XX XXX XXXX"
                />
                {renderFieldErrors('phoneNumber')}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={inputClass('password', 'pr-12')}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {renderFieldErrors('password')}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={inputClass('confirmPassword', 'pr-12')}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {renderFieldErrors('confirmPassword')}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                />
                <span className="ml-2 text-sm text-slate-300">I agree to the Terms of Service</span>
              </label>
              {fieldErrors.agreeToTerms && (
                <p className="text-xs text-red-400">{fieldErrors.agreeToTerms[0]}</p>
              )}
            </div>

            {generalError && (
              <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {generalError}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
