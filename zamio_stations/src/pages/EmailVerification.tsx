import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RadioTower, CheckCircle, AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

import { persistLegacyLoginResponse, type LegacyLoginResponse, type StoredUserPayload } from '@zamio/ui';

import { resendStationVerification, verifyStationEmailCode, type ApiErrorMap } from '../lib/api';
import { useAuth } from '../lib/auth';
import { resolveStationOnboardingRedirect } from '../lib/onboarding';

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

const EmailVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login: hydrateAuth } = useAuth();

  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
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

    const sanitized = value.replace(/\D/g, '');
    const next = [...verificationCode];
    next[index] = sanitized;
    setVerificationCode(next);
    setVerificationStatus('idle');
    setErrorMessage('');

    if (sanitized && index < verificationCode.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').slice(0, verificationCode.length);
    if (VALID_CODE_REGEX.test(pasted)) {
      const digits = pasted.split('');
      setVerificationCode(digits);
      setTimeout(() => {
        inputRefs.current[digits.length - 1]?.focus();
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
    setResendMessage(null);
    setResendError(null);

    try {
      const response = await verifyStationEmailCode({ email: normalizedEmail, code });
      persistLegacyLoginResponse(response);
      const snapshot = extractSnapshotFromLegacyResponse(response);
      hydrateAuth(snapshot);

      setVerificationStatus('success');
      setTimeout(() => {
        const rawNextStep = typeof response?.data?.next_step === 'string' ? response.data.next_step : null;
        const rawOnboardingStep =
          typeof response?.data?.onboarding_step === 'string' ? response.data.onboarding_step : null;
        const destination = resolveStationOnboardingRedirect(rawNextStep ?? rawOnboardingStep) ?? '/dashboard';
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
          setEmailError(emailFieldError[0] as string);
        } else if (typeof emailFieldError === 'string') {
          message = emailFieldError;
          setEmailError(emailFieldError);
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

  const handleResendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError('Email is required to resend a verification code');
      setVerificationStatus('error');
      return;
    }

    setResendMessage(null);
    setResendError(null);
    try {
      await resendStationVerification({ email: normalizedEmail, method: 'code' });
      setVerificationCode(['', '', '', '']);
      setVerificationStatus('idle');
      setErrorMessage('');
      setResendMessage('A new verification code has been sent to your email.');
      inputRefs.current[0]?.focus();
    } catch (error) {
      let message = 'Unable to resend the verification code right now. Please try again shortly.';
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; error?: string; retry_after?: number };
        if (data?.message) {
          message = data.message;
        } else if (data?.error) {
          message = data.error;
        }
        if (data?.retry_after) {
          message = `${message} Try again in ${data.retry_after} seconds.`;
        }
      }
      setResendError(message);
    }
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
              <RadioTower className="h-6 w-6" />
            </span>
            <span className="text-2xl font-semibold tracking-tight">Zamio Stations</span>
          </Link>
          <h2 className="text-3xl font-semibold">Verify your email</h2>
          <p className="mt-2 text-slate-400">Enter the 4-digit code sent to your station email</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <label htmlFor="verification-email" className="block text-sm font-medium text-slate-200 mb-2">
              Email address
            </label>
            <input
              id="verification-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
                if (verificationStatus === 'error') {
                  setVerificationStatus('idle');
                }
              }}
              className={`w-full rounded-lg border ${
                emailError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
              } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
              placeholder="station@radioexample.com"
              autoComplete="email"
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
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleInputChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  className={`w-14 h-14 text-center text-2xl font-semibold rounded-lg border bg-slate-800/50 text-white focus:outline-none focus:ring-1 ${
                    verificationStatus === 'error'
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  disabled={isVerifying}
                />
              ))}
            </div>

            {verificationStatus === 'error' && errorMessage && (
              <div className="flex items-center justify-center text-red-400 text-sm mb-4">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMessage}
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="flex items-center justify-center text-green-400 text-sm mb-4">
                <CheckCircle className="h-4 w-4 mr-2" />
                Email verified successfully! Redirecting to your account…
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying || !isCodeComplete}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying…' : 'Verify Email'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">
              Didn't receive the code?{' '}
              <button
                onClick={handleResendCode}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
                disabled={isVerifying}
              >
                Resend code
              </button>
            </p>
            {resendMessage && (
              <p className="text-xs text-green-400">{resendMessage}</p>
            )}
            {resendError && (
              <p className="text-xs text-red-400">{resendError}</p>
            )}
          </div>

          <div className="text-center mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to station registration
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            By verifying your email, you agree to our{' '}
            <Link to="/terms" className="text-indigo-400 hover:text-indigo-300">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;

