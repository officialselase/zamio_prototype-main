import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, MailCheck, Save } from 'lucide-react';

import { AdminOnboardingProvider, useAdminOnboarding } from './AdminOnboardingContext';

interface ProfileFormState {
  address: string;
  city: string;
  postalCode: string;
}

const INITIAL_FORM_STATE: ProfileFormState = {
  address: '',
  city: '',
  postalCode: '',
};

const ProfileStep = () => {
  const navigate = useNavigate();
  const { status, loading, error, submitProfile } = useAdminOnboarding();
  const [formData, setFormData] = useState<ProfileFormState>(INITIAL_FORM_STATE);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const profile = status?.profile ?? {};

  useEffect(() => {
    if (status && (status.next_step === 'done' || status.onboarding_step === 'done')) {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    setFormData({
      address: typeof profile.address === 'string' ? profile.address : '',
      city: typeof profile.city === 'string' ? profile.city : '',
      postalCode: typeof profile.postal_code === 'string' ? profile.postal_code : '',
    });
  }, [profile.address, profile.city, profile.postal_code]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    const payload = {
      address: formData.address.trim(),
      city: formData.city.trim(),
      postal_code: formData.postalCode.trim(),
    };
    const result = await submitProfile(payload);
    if (result && (result.next_step === 'done' || result.onboarding_step === 'done')) {
      setSuccessMessage('Profile saved successfully. Redirecting to dashboard…');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 800);
    } else {
      setSuccessMessage('Profile updated. Continue to complete onboarding.');
    }
  };

  const progress = useMemo(() => status?.progress ?? {}, [status]);
  const profileCompleted = Boolean(progress.profile_completed);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-xl bg-indigo-500/20 px-4 py-2 text-indigo-200">
            <Building2 className="mr-2 h-5 w-5" />
            Admin Onboarding
          </div>
          <h1 className="text-3xl font-semibold">Set up your administrative profile</h1>
          <p className="text-slate-400">Provide key contact details to activate your admin console.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur space-y-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-slate-200 mb-2">
                Office address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Enter the primary office address"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-200 mb-2">
                City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-10 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="e.g., Accra"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-slate-200 mb-2">
                Postal code
              </label>
              <div className="relative">
                <MailCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-10 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="e.g., GA-123-4567"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {profileCompleted ? 'Profile complete. You can update these details anytime.' : 'Complete these fields to activate your admin workspace.'}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminOnboarding = () => (
  <AdminOnboardingProvider>
    <ProfileStep />
  </AdminOnboardingProvider>
);

export default AdminOnboarding;

