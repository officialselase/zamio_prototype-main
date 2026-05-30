import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RadioTower, ArrowRight, Headphones } from 'lucide-react';
import { legacyRoleLogin, persistLegacyLoginResponse } from '@zamio/ui';

import type { LegacyLoginResponse } from '@zamio/ui';
import { useAuth } from '../lib/auth';
import { resolveStationOnboardingRedirect } from '../lib/onboarding';

export default function SignIn() {
  const navigate = useNavigate();
  const { login: hydrateAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  interface StationLoginData extends Record<string, unknown> {
    next_step?: string;
    onboarding_step?: string;
  }

  type StationLoginResponse = LegacyLoginResponse & {
    data?: StationLoginData | null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fcm_token: 'web-station-client',
      };

      const response = await legacyRoleLogin<StationLoginResponse>('/api/accounts/login-station/', payload);
      persistLegacyLoginResponse(response);

      let loginSnapshot: {
        accessToken?: string;
        refreshToken?: string;
        user?: Record<string, unknown> | null;
      } | undefined;

      if (response?.data && typeof response.data === 'object') {
        const record = response.data as Record<string, unknown>;
        const accessToken = record['access_token'];
        const refreshToken = record['refresh_token'];
        loginSnapshot = {
          accessToken: typeof accessToken === 'string' ? accessToken : undefined,
          refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
          user: response.data,
        };
      }

      hydrateAuth(loginSnapshot);

      const rawNextStep = typeof response?.data?.next_step === 'string' ? response.data.next_step : null;
      const rawOnboardingStep =
        typeof response?.data?.onboarding_step === 'string' ? response.data.onboarding_step : null;
      const redirectPath = resolveStationOnboardingRedirect(rawNextStep ?? rawOnboardingStep);
      navigate(redirectPath ?? '/dashboard');
    } catch (err) {
      const maybeResponse = (err as { response?: { data?: { message?: string; errors?: Record<string, unknown>; }; }; }).response;
      const message = maybeResponse?.data?.message;
      const errorKeys = maybeResponse?.data?.errors ? Object.keys(maybeResponse.data.errors) : [];
      if (message) {
        setError(message);
      } else if (errorKeys.length > 0) {
        setError(`Issues with: ${errorKeys.join(', ')}`);
      } else {
        setError('Unable to sign in. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-black" />
      <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-2xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 mb-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <RadioTower className="h-6 w-6" />
            </span>
            <span className="text-2xl font-semibold tracking-tight">Zamio Stations</span>
          </Link>
          <h2 className="text-3xl font-semibold">Welcome back</h2>
          <p className="mt-2 text-slate-400">Sign in to manage your station's royalty tracking</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          <div className="space-y-4">
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
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="station@radiostation.com"
              />
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
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 pr-12 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                />
                <span className="ml-2 text-sm text-slate-300">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>

          <p className="text-center text-sm text-slate-400">
            Don't have a station account?{' '}
            <Link to="/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
              Register your station
            </Link>
          </p>
        </form>

        {/* Station Features */}
        <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Headphones className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">Station Access</span>
          </div>
          <p className="text-xs text-slate-300 text-center">
            Monitor airplay across FM, TV & digital • Track royalty earnings • Generate compliance reports
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>By signing in, you agree to our{' '}
            <Link to="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
