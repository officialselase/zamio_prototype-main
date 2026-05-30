import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

import {
  usePublisherOnboarding,
  type PublisherRevenueSplitForm,
} from '../PublisherOnboardingContext';

interface RevenueSplitStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

type FormState = {
  writerSplit: string;
  publisherSplit: string;
  mechanicalShare: string;
  performanceShare: string;
  syncShare: string;
  administrativeFee: string;
  notes: string;
};

const INITIAL_FORM_STATE: FormState = {
  writerSplit: '50',
  publisherSplit: '50',
  mechanicalShare: '',
  performanceShare: '',
  syncShare: '',
  administrativeFee: '',
  notes: '',
};

const normalizeDecimal = (value: string) => value.replace(/[^0-9.]/g, '');

const RevenueSplitStep: React.FC<RevenueSplitStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitRevenueSplit } = usePublisherOnboarding();
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const revenueSplit = status?.revenue_split;
    if (!revenueSplit || hydratedRef.current) {
      return;
    }

    setFormData({
      writerSplit: revenueSplit.writer_split ? String(revenueSplit.writer_split) : '50',
      publisherSplit: revenueSplit.publisher_split ? String(revenueSplit.publisher_split) : '50',
      mechanicalShare: revenueSplit.mechanical_share ? String(revenueSplit.mechanical_share) : '',
      performanceShare: revenueSplit.performance_share ? String(revenueSplit.performance_share) : '',
      syncShare: revenueSplit.sync_share ? String(revenueSplit.sync_share) : '',
      administrativeFee: revenueSplit.administrative_fee_percentage ? String(revenueSplit.administrative_fee_percentage) : '',
      notes: revenueSplit.notes ? String(revenueSplit.notes) : '',
    });
    hydratedRef.current = true;
  }, [status?.revenue_split]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const nextValue = name === 'notes' ? value : normalizeDecimal(value);
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setStatusMessage(null);
  };

  const validateForm = () => {
    const validationErrors: Record<string, string> = {};
    const writer = parseFloat(formData.writerSplit);
    const publisher = parseFloat(formData.publisherSplit);

    if (Number.isNaN(writer)) {
      validationErrors.writerSplit = 'Writer split is required and must be a number';
    }

    if (Number.isNaN(publisher)) {
      validationErrors.publisherSplit = 'Publisher split is required and must be a number';
    }

    if (!Number.isNaN(writer) && !Number.isNaN(publisher) && Math.abs(writer + publisher - 100) > 0.01) {
      validationErrors.writerSplit = 'Writer and publisher splits must total 100%';
      validationErrors.publisherSplit = 'Writer and publisher splits must total 100%';
    }

    const optionalFields: Array<{ key: keyof FormState; label: string }> = [
      { key: 'mechanicalShare', label: 'Mechanical share' },
      { key: 'performanceShare', label: 'Performance share' },
      { key: 'syncShare', label: 'Sync share' },
      { key: 'administrativeFee', label: 'Administrative fee' },
    ];

    optionalFields.forEach(({ key, label }) => {
      const rawValue = formData[key];
      if (!rawValue) {
        return;
      }
      const parsed = parseFloat(rawValue);
      if (Number.isNaN(parsed)) {
        validationErrors[key] = `${label} must be a number`;
      } else if (parsed < 0 || parsed > 100) {
        validationErrors[key] = `${label} must be between 0 and 100`; 
      }
    });

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!validateForm()) {
      return;
    }

    const payload: PublisherRevenueSplitForm = {
      writerSplit: formData.writerSplit,
      publisherSplit: formData.publisherSplit,
      mechanicalShare: formData.mechanicalShare || undefined,
      performanceShare: formData.performanceShare || undefined,
      syncShare: formData.syncShare || undefined,
      administrativeFee: formData.administrativeFee || undefined,
      notes: formData.notes.trim(),
    };

    setIsSubmitting(true);
    try {
      await submitRevenueSplit(payload);
      setStatusMessage({ type: 'success', message: 'Revenue split saved successfully.' });
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
        }
        setStatusMessage({
          type: 'error',
          message: data?.message || 'Unable to save your revenue split. Please review the inputs.',
        });
      } else {
        setStatusMessage({ type: 'error', message: 'Unable to save your revenue split. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Revenue Split Configuration</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Configure how royalties are shared between songwriters and your publishing company. Adjust the split to match your agreements and document any special arrangements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6 flex items-center space-x-3">
            <TrendingUp className="w-5 h-5 text-indigo-300" />
            <span>Primary Splits *</span>
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="writerSplit" className="block text-sm font-medium text-slate-200 mb-2">
                Writer Percentage *
              </label>
              <input
                type="text"
                id="writerSplit"
                name="writerSplit"
                value={formData.writerSplit}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.writerSplit ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="50"
              />
              {errors.writerSplit && <p className="mt-1 text-xs text-red-400">{errors.writerSplit}</p>}
            </div>

            <div>
              <label htmlFor="publisherSplit" className="block text-sm font-medium text-slate-200 mb-2">
                Publisher Percentage *
              </label>
              <input
                type="text"
                id="publisherSplit"
                name="publisherSplit"
                value={formData.publisherSplit}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.publisherSplit ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="50"
              />
              {errors.publisherSplit && <p className="mt-1 text-xs text-red-400">{errors.publisherSplit}</p>}
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Writer and publisher percentages must total 100%.
          </p>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6 flex items-center space-x-3">
            <Calculator className="w-5 h-5 text-indigo-300" />
            <span>Optional Adjustments</span>
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="mechanicalShare" className="block text-sm font-medium text-slate-200 mb-2">
                Mechanical Share (%)
              </label>
              <input
                type="text"
                id="mechanicalShare"
                name="mechanicalShare"
                value={formData.mechanicalShare}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.mechanicalShare ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="30"
              />
              {errors.mechanicalShare && <p className="mt-1 text-xs text-red-400">{errors.mechanicalShare}</p>}
            </div>

            <div>
              <label htmlFor="performanceShare" className="block text-sm font-medium text-slate-200 mb-2">
                Performance Share (%)
              </label>
              <input
                type="text"
                id="performanceShare"
                name="performanceShare"
                value={formData.performanceShare}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.performanceShare ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="30"
              />
              {errors.performanceShare && <p className="mt-1 text-xs text-red-400">{errors.performanceShare}</p>}
            </div>

            <div>
              <label htmlFor="syncShare" className="block text-sm font-medium text-slate-200 mb-2">
                Sync Share (%)
              </label>
              <input
                type="text"
                id="syncShare"
                name="syncShare"
                value={formData.syncShare}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.syncShare ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="10"
              />
              {errors.syncShare && <p className="mt-1 text-xs text-red-400">{errors.syncShare}</p>}
            </div>

            <div>
              <label htmlFor="administrativeFee" className="block text-sm font-medium text-slate-200 mb-2">
                Administrative Fee (%)
              </label>
              <input
                type="text"
                id="administrativeFee"
                name="administrativeFee"
                value={formData.administrativeFee}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.administrativeFee ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                placeholder="5"
              />
              {errors.administrativeFee && <p className="mt-1 text-xs text-red-400">{errors.administrativeFee}</p>}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-200 mb-2">
              Notes or Special Arrangements
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              placeholder="Document any special terms, co-publishing arrangements, or collection notes."
            />
          </div>
        </div>

        {statusMessage && (
          <div
            className={`flex items-center space-x-2 rounded-xl border px-4 py-3 text-sm ${
              statusMessage.type === 'success'
                ? 'border-green-500/40 bg-green-500/10 text-green-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{statusMessage.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center space-x-2 rounded-lg border border-white/10 px-6 py-3 text-sm text-slate-300 hover:text-white hover:border-white/30"
          >
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Saving...' : 'Save and Continue'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default RevenueSplitStep;
