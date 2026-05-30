import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RadioTower, CheckCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

import {
  requestPasswordReset,
  resendPasswordResetRequest,
  verifyPasswordResetCode,
  type ApiErrorMap,
} from '../lib/api';

type Step = 'request' | 'reset' | 'success';

const VALID_CODE_REGEX = /^\d{4}$/;

const normalizeErrors = (errors?: ApiErrorMap) => {
  if (!errors) return {};
  return Object.entries(errors).reduce<Record<string, string[]>>((acc, [key, value]) => {
    if (!value) return acc;
    if (Array.isArray(value)) {
      acc[key] = value.map(String);
    } else {
      acc[key] = [String(value)];
    }
    return acc;
  }, {} as Record<string, string[]>);
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'reset') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError('Email is required to reset your password');
      return;
    }

    setLoading(true);
    setEmailError(null);
    setGeneralError(null);

    try {
      await requestPasswordReset({ email: normalizedEmail, method: 'code' });
      setStep('reset');
      setResendMessage('A reset code has been sent to your email. Enter the code and create a new password.');
      setResendError(null);
    } catch (error) {
      let message = 'Unable to start the password reset process. Please try again shortly.';
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; error?: string };
        if (data?.message) {
          message = data.message;
        } else if (data?.error) {
          message = data.error;
        }
      }
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const sanitized = value.replace(/\D/g, '');
    const next = [...code];
    next[index] = sanitized;
    setCode(next);
    setFieldErrors((prev) => ({ ...prev, code: [] }));
    setGeneralError(null);

    if (sanitized && index < code.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').slice(0, code.length);
    if (VALID_CODE_REGEX.test(pasted)) {
      const digits = pasted.split('');
      setCode(digits);
      setTimeout(() => {
        inputRefs.current[digits.length - 1]?.focus();
      }, 0);
    }
  };

  const handleVerifyReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError('Email is required to reset your password');
      return;
    }

    const validationErrors: Record<string, string[]> = {};
    if (!VALID_CODE_REGEX.test(code.join(''))) {
      validationErrors.code = ['Enter the 4-digit reset code sent to your email'];
    }
    if (!newPassword) {
      validationErrors.password = ['New password is required'];
    }
    if (newPassword !== confirmPassword) {
      validationErrors.password = [...(validationErrors.password ?? []), 'Passwords do not match'];
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setGeneralError('Please resolve the highlighted issues and try again.');
      return;
    }

    setLoading(true);
    setGeneralError(null);
    setFieldErrors({});

    try {
      await verifyPasswordResetCode({
        email: normalizedEmail,
        code: code.join(''),
        new_password: newPassword,
        new_password2: confirmPassword,
      });
      setStep('success');
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; errors?: ApiErrorMap; detail?: string };
        const normalized = normalizeErrors(data.errors);
        setFieldErrors(normalized);
        if (normalized.email && normalized.email.length > 0) {
          setEmailError(normalized.email[0]);
        }
        setGeneralError(data.message || data.detail || 'Unable to reset your password.');
      } else {
        setGeneralError('Unable to reset your password right now. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError('Email is required to resend the reset code');
      return;
    }

    setResendMessage(null);
    setResendError(null);
    try {
      await resendPasswordResetRequest({ email: normalizedEmail, method: 'code' });
      setCode(['', '', '', '']);
      setResendMessage('We have sent another reset code to your email.');
      inputRefs.current[0]?.focus();
    } catch (error) {
      let message = 'Unable to resend the reset code at the moment. Please wait and try again.';
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

  const renderRequestStep = () => (
    <form onSubmit={handleRequestReset} className="space-y-6">
      <div>
        <label htmlFor="reset-email" className="block text-sm font-medium text-slate-200 mb-2">
          Email address
        </label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
            setGeneralError(null);
          }}
          className={`w-full rounded-lg border ${
            emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
          } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
          placeholder="station@radiostation.com"
          disabled={loading}
        />
        {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
      </div>

      {generalError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {generalError}
        </div>
      )}

      <button
        type="submit"
        className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? 'Sending reset code…' : 'Send reset code'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>
    </form>
  );

  const isCodeComplete = useMemo(() => code.every((digit) => digit.length === 1), [code]);

  const renderResetStep = () => (
    <form onSubmit={handleVerifyReset} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200">Verification code</label>
        <div className="flex justify-center gap-3">
          {code.map((digit, index) => (
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
              onChange={(event) => handleCodeChange(index, event.target.value)}
              onKeyDown={(event) => handleCodeKeyDown(index, event)}
              onPaste={handleCodePaste}
              className={`w-14 h-14 text-center text-2xl font-semibold rounded-lg border bg-slate-800/50 text-white focus:outline-none focus:ring-1 ${
                fieldErrors.code?.length
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
              }`}
              disabled={loading}
            />
          ))}
        </div>
        {fieldErrors.code && fieldErrors.code.length > 0 && (
          <p className="text-xs text-red-400 text-center">{fieldErrors.code[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="new-password" className="block text-sm font-medium text-slate-200">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, password: [] }));
            setGeneralError(null);
          }}
          className={`w-full rounded-lg border ${
            fieldErrors.password?.length
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
              : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
          } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
          placeholder="Create a strong password"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-200">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, password: [] }));
            setGeneralError(null);
          }}
          className={`w-full rounded-lg border ${
            fieldErrors.password?.length
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
              : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
          } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
          placeholder="Confirm your new password"
          disabled={loading}
        />
        {fieldErrors.password && fieldErrors.password.length > 0 && (
          <p className="text-xs text-red-400">{fieldErrors.password[0]}</p>
        )}
      </div>

      {generalError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {generalError}
        </div>
      )}

      <button
        type="submit"
        className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
        disabled={loading || !isCodeComplete}
      >
        {loading ? 'Resetting password…' : 'Reset password'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>

      <div className="text-center text-sm text-slate-400">
        Didn't receive the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          className="font-medium text-indigo-400 hover:text-indigo-300"
          disabled={loading}
        >
          Resend code
        </button>
      </div>
      {resendMessage && <p className="text-xs text-green-400 text-center">{resendMessage}</p>}
      {resendError && <p className="text-xs text-red-400 text-center">{resendError}</p>}
    </form>
  );

  const renderSuccessStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-green-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold">Password updated</h3>
        <p className="mt-2 text-sm text-slate-300">
          Your password has been reset successfully. You can now sign in with your new credentials.
        </p>
      </div>
      <button
        onClick={() => navigate('/signin', { replace: true })}
        className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
      >
        Back to sign in
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>
    </div>
  );

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
          <h2 className="text-3xl font-semibold">Reset your password</h2>
          <p className="mt-2 text-slate-400">
            {step === 'request'
              ? 'Enter your email and we will send a code to help you set a new password.'
              : 'Enter the code we emailed you and choose a new password.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur space-y-6">
          {step === 'request' && renderRequestStep()}
          {step === 'reset' && renderResetStep()}
          {step === 'success' && renderSuccessStep()}
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <Link to="/signin" className="inline-flex items-center text-indigo-400 hover:text-indigo-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

