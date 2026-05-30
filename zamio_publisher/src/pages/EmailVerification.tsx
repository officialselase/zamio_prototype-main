import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

import { persistLegacyLoginResponse, type LegacyLoginResponse, type StoredUserPayload } from '@zamio/ui';

import { verifyPublisherEmailCode, type ApiErrorMap } from '../lib/api';
import { useAuth } from '../lib/auth';

const VALID_CODE_REGEX = /^\d{4}$/;

const extractSnapshotFromLegacyResponse = (
  response: LegacyLoginResponse | null | undefined,
): Partial<{ accessToken: string; refreshToken: string; user: StoredUserPayload }> | undefined => {
  if (!response?.data || typeof response.data !== 'object') {
    return undefined;
  }
  const record = response.data as Record<string, unknown>;
  const accessToken = typeof record['access_token'] === 'string' ? record['access_token'] : undefined;
  if (!accessToken) {
    return undefined;
  }
  const refreshToken = typeof record['refresh_token'] === 'string' ? record['refresh_token'] : undefined;
  return {
    accessToken,
    refreshToken,
    user: response.data as StoredUserPayload,
  };
};

export default function EmailVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login: hydrateAuth } = useAuth();

  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fromStateEmail = useMemo(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email;
    return typeof stateEmail === 'string' ? stateEmail : '';
  }, [location.state]);

  const searchEmail = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    return emailParam ? emailParam : '';
  }, [location.search]);

  const [email, setEmail] = useState(() => (fromStateEmail || searchEmail).toLowerCase());

  useEffect(() => {
    if (!email && (fromStateEmail || searchEmail)) {
      setEmail((fromStateEmail || searchEmail).toLowerCase());
    }
  }, [email, fromStateEmail, searchEmail]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...verificationCode];
    newCode[index] = value.replace(/\D/g, '');

    setVerificationCode(newCode);
    setVerificationStatus('idle');
    setErrorMessage('');

    if (value && index < verificationCode.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').slice(0, verificationCode.length);

    if (VALID_CODE_REGEX.test(pastedData)) {
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      setTimeout(() => {
        inputRefs.current[newCode.length - 1]?.focus();
      }, 0);
      setVerificationStatus('idle');
      setErrorMessage('');
    }
  };

  const handleVerify = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError('Email is required to verify your account');
      setVerificationStatus('error');
      return;
    }

    const code = verificationCode.join('');

    if (!VALID_CODE_REGEX.test(code)) {
      setErrorMessage('Please enter the 4-digit verification code.');
      setVerificationStatus('error');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');
    setErrorMessage('');
    setEmailError(null);

    try {
      const response = await verifyPublisherEmailCode({ email: normalizedEmail, code });

      persistLegacyLoginResponse(response);

      const snapshot = extractSnapshotFromLegacyResponse(response);
      if (snapshot) {
        hydrateAuth(snapshot);
      }

      setVerificationStatus('success');

      const dataRecord = (response?.data ?? {}) as Record<string, unknown>;
      const nextStep = (dataRecord['next_step'] || dataRecord['onboarding_step']) as string | undefined;
      const destination = nextStep && typeof nextStep === 'string' && nextStep && nextStep !== 'done'
        ? `/onboarding/${nextStep.replace(/_/g, '-')}`
        : '/dashboard';

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 1200);
    } catch (error) {
      let message = 'Unable to verify your email. Please double-check the code and try again.';
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as {
          message?: string;
          errors?: ApiErrorMap;
          detail?: string;
          error_code?: string;
        };
        const fieldErrors = data?.errors;
        const codeError = fieldErrors?.code;
        const emailFieldError = fieldErrors?.email;
        if (Array.isArray(codeError) && codeError.length > 0) {
          message = codeError[0] as string;
        } else if (typeof codeError === 'string') {
          message = codeError;
        } else if (Array.isArray(emailFieldError) && emailFieldError.length > 0) {
          message = emailFieldError[0] as string;
        } else if (typeof emailFieldError === 'string') {
          message = emailFieldError;
        } else if (data?.message) {
          message = data.message;
        } else if (data?.detail) {
          message = data.detail;
        }
      }
      setErrorMessage(message);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    setVerificationCode(['', '', '', '']);
    setVerificationStatus('idle');
    setErrorMessage('');
    inputRefs.current[0]?.focus();
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const isCodeComplete = verificationCode.every((digit) => digit.length === 1);

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
          <h2 className="text-3xl font-semibold">Verify your email</h2>
          <p className="mt-2 text-slate-400">Enter the 4-digit code sent to your publisher email</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <label htmlFor="verification-email" className="block text-sm font-medium text-slate-300 mb-2">
              Email address
            </label>
            <input
              id="verification-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`w-full rounded-lg border ${
                emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
              } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
              placeholder="you@publisher.com"
              disabled={isVerifying}
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-400">{emailError}</p>
            )}
          </div>

          <div className="mb-6">
            <div className="flex justify-center gap-3 mb-4">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleInputChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  className={`w-14 h-14 text-center text-2xl font-semibold rounded-lg border bg-slate-800/50 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                    verificationStatus === 'error' ? 'border-red-400' : 'border-white/20'
                  }`}
                  disabled={isVerifying}
                />
              ))}
            </div>

            {verificationStatus === 'error' && (
              <div className="flex items-center justify-center text-red-400 text-sm mb-4">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMessage}
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="flex items-center justify-center text-green-400 text-sm mb-4">
                <CheckCircle className="h-4 w-4 mr-2" />
                Email verified successfully! Redirecting to setup...
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying || !isCodeComplete}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-slate-400">
              Haven't received a code?{' '}
              <button
                onClick={handleResendCode}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
                disabled={isVerifying}
              >
                Resend code
              </button>
            </p>
          </div>

          <div className="text-center mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to publisher registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
