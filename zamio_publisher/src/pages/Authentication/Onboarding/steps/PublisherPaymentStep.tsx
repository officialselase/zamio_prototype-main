import React, { useEffect, useRef, useState } from 'react';
import { Building2, Smartphone, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

import {
  usePublisherOnboarding,
  type PublisherPaymentForm,
} from '../PublisherOnboardingContext';

interface PublisherPaymentStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

type FormState = {
  paymentMethod: 'momo' | 'bank' | '';
  momoProvider: string;
  momoNumber: string;
  momoName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankBranchCode: string;
  bankSwiftCode: string;
  currency: string;
  payoutFrequency: string;
  minimumPayoutAmount: string;
  withholdingTaxRate: string;
  vatRegistration: string;
  taxId: string;
  businessRegistration: string;
};

const INITIAL_FORM_STATE: FormState = {
  paymentMethod: '',
  momoProvider: '',
  momoNumber: '',
  momoName: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankBranchCode: '',
  bankSwiftCode: '',
  currency: 'GHS',
  payoutFrequency: 'monthly',
  minimumPayoutAmount: '',
  withholdingTaxRate: '',
  vatRegistration: '',
  taxId: '',
  businessRegistration: '',
};

const currencies = [
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
];

const payoutFrequencies = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const mobileMoneyProviders = [
  { id: 'mtn', name: 'MTN Mobile Money' },
  { id: 'vodafone', name: 'Vodafone Cash' },
  { id: 'airteltigo', name: 'AirtelTigo Money' },
];

const bankOptions = [
  'Access Bank Ghana',
  'Absa Bank Ghana',
  'Ecobank Ghana',
  'Fidelity Bank Ghana',
  'GCB Bank',
  'Stanbic Bank Ghana',
  'Standard Chartered Bank Ghana',
  'United Bank for Africa Ghana',
];

const PublisherPaymentStep: React.FC<PublisherPaymentStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitPayment } = usePublisherOnboarding();
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const paymentPreferences = status?.payment_preferences;
    if (!paymentPreferences || hydratedRef.current) {
      return;
    }

    setFormData({
      paymentMethod: (paymentPreferences.preferred_method as 'momo' | 'bank' | '') || '',
      momoProvider: paymentPreferences.momo_provider ?? '',
      momoNumber: paymentPreferences.momo_account ?? '',
      momoName: paymentPreferences.momo_account_name ?? '',
      bankName: paymentPreferences.bank_name ?? '',
      bankAccountNumber: paymentPreferences.bank_account_number ?? '',
      bankAccountName: paymentPreferences.bank_account_name ?? '',
      bankBranchCode: paymentPreferences.bank_branch_code ?? '',
      bankSwiftCode: paymentPreferences.bank_swift_code ?? '',
      currency: paymentPreferences.payout_currency ?? 'GHS',
      payoutFrequency: paymentPreferences.payout_frequency ?? 'monthly',
      minimumPayoutAmount: paymentPreferences.minimum_payout_amount ? String(paymentPreferences.minimum_payout_amount) : '',
      withholdingTaxRate: paymentPreferences.withholding_tax_rate ? String(paymentPreferences.withholding_tax_rate) : '',
      vatRegistration: paymentPreferences.vat_registration_number ?? '',
      taxId: paymentPreferences.tax_id ?? '',
      businessRegistration: paymentPreferences.business_registration_number ?? '',
    });
    hydratedRef.current = true;
  }, [status?.payment_preferences]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

    if (!formData.paymentMethod) {
      validationErrors.paymentMethod = 'Select a payout method';
    }

    if (formData.paymentMethod === 'momo') {
      if (!formData.momoProvider) {
        validationErrors.momoProvider = 'Select a mobile money provider';
      }
      if (!formData.momoNumber.trim()) {
        validationErrors.momoNumber = 'Enter your mobile money number';
      }
      if (!formData.momoName.trim()) {
        validationErrors.momoName = 'Enter the account name for mobile money payouts';
      }
    }

    if (formData.paymentMethod === 'bank') {
      if (!formData.bankName) {
        validationErrors.bankName = 'Select your bank';
      }
      if (!formData.bankAccountNumber.trim()) {
        validationErrors.bankAccountNumber = 'Enter your bank account number';
      }
      if (!formData.bankAccountName.trim()) {
        validationErrors.bankAccountName = 'Enter the bank account name';
      }
    }

    if (!formData.currency) {
      validationErrors.currency = 'Select a payout currency';
    }
    if (!formData.payoutFrequency) {
      validationErrors.payoutFrequency = 'Select a payout frequency';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!validateForm()) {
      return;
    }

    const payload: PublisherPaymentForm = {
      paymentMethod: formData.paymentMethod === 'momo' ? 'momo' : 'bank',
      momoProvider: formData.momoProvider || undefined,
      momoNumber: formData.momoNumber.trim() || undefined,
      momoName: formData.momoName.trim() || undefined,
      bankName: formData.bankName || undefined,
      bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
      bankAccountName: formData.bankAccountName.trim() || undefined,
      bankBranchCode: formData.bankBranchCode.trim() || undefined,
      bankSwiftCode: formData.bankSwiftCode.trim() || undefined,
      currency: formData.currency,
      payoutFrequency: formData.payoutFrequency,
      minimumPayoutAmount: formData.minimumPayoutAmount.trim() || undefined,
      withholdingTaxRate: formData.withholdingTaxRate.trim() || undefined,
      vatRegistration: formData.vatRegistration.trim() || undefined,
      taxId: formData.taxId.trim() || undefined,
      businessRegistration: formData.businessRegistration.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await submitPayment(payload);
      setStatusMessage({ type: 'success', message: 'Payment information saved successfully.' });
      onNext();
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; errors?: Record<string, unknown> };
        const nextErrors: Record<string, string> = {};
        if (data?.errors) {
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
          message: data?.message || 'Unable to save your payment preferences. Please review the inputs.',
        });
      } else {
        setStatusMessage({ type: 'error', message: 'Unable to save your payment preferences. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Payment Setup</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Configure how your publishing company will receive royalty payments from music usage. Set up secure payment methods for licensing fees and copyright compliance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Payment Method for Royalties</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'momo' }))}
              className={`p-6 rounded-lg border-2 text-left transition-colors ${
                formData.paymentMethod === 'momo'
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-white/10 bg-slate-800/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <Smartphone className="w-6 h-6 text-indigo-400" />
                <h5 className="font-medium text-white">Mobile Money</h5>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Fast, convenient royalty collection through MTN, Vodafone, or AirtelTigo Money.
              </p>
              <div className="flex flex-wrap gap-2">
                {mobileMoneyProviders.map((provider) => (
                  <span key={provider.id} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    {provider.name}
                  </span>
                ))}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'bank' }))}
              className={`p-6 rounded-lg border-2 text-left transition-colors ${
                formData.paymentMethod === 'bank'
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-white/10 bg-slate-800/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <Building2 className="w-6 h-6 text-indigo-400" />
                <h5 className="font-medium text-white">Bank Transfer</h5>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Secure payouts to your preferred bank account with detailed remittance statements.
              </p>
              <div className="flex flex-wrap gap-2">
                {bankOptions.map((bank) => (
                  <span key={bank} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    {bank}
                  </span>
                ))}
              </div>
            </button>
          </div>
          {errors.paymentMethod && <p className="mt-3 text-xs text-red-400">{errors.paymentMethod}</p>}
        </div>

        {formData.paymentMethod === 'momo' && (
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
            <h4 className="text-xl font-semibold text-white mb-6">Mobile Money Details</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="momoProvider" className="block text-sm font-medium text-slate-200 mb-2">
                  Provider *
                </label>
                <select
                  id="momoProvider"
                  name="momoProvider"
                  value={formData.momoProvider}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errors.momoProvider ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1`}
                >
                  <option value="">Select provider</option>
                  {mobileMoneyProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                {errors.momoProvider && <p className="mt-1 text-xs text-red-400">{errors.momoProvider}</p>}
              </div>

              <div>
                <label htmlFor="momoNumber" className="block text-sm font-medium text-slate-200 mb-2">
                  Mobile Money Number *
                </label>
                <input
                  type="tel"
                  id="momoNumber"
                  name="momoNumber"
                  value={formData.momoNumber}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errors.momoNumber ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="024 000 0000"
                />
                {errors.momoNumber && <p className="mt-1 text-xs text-red-400">{errors.momoNumber}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="momoName" className="block text-sm font-medium text-slate-200 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  id="momoName"
                  name="momoName"
                  value={formData.momoName}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errors.momoName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="Account holder name"
                />
                {errors.momoName && <p className="mt-1 text-xs text-red-400">{errors.momoName}</p>}
              </div>
            </div>
          </div>
        )}

        {formData.paymentMethod === 'bank' && (
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
            <h4 className="text-xl font-semibold text-white mb-6">Bank Account Details</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-slate-200 mb-2">
                  Bank *
                </label>
                <select
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errors.bankName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1`}
                >
                  <option value="">Select your bank</option>
                  {bankOptions.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                {errors.bankName && <p className="mt-1 text-xs text-red-400">{errors.bankName}</p>}
              </div>

              <div>
                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-slate-200 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errors.bankAccountNumber ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="0123456789"
                />
                {errors.bankAccountNumber && <p className="mt-1 text-xs text-red-400">{errors.bankAccountNumber}</p>}
              </div>

              <div>
                <label htmlFor="bankAccountName" className="block text-sm font-medium text-slate-200 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  id="bankAccountName"
                  name="bankAccountName"
                  value={formData.bankAccountName}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errors.bankAccountName ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                  } bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1`}
                  placeholder="Account holder name"
                />
                {errors.bankAccountName && <p className="mt-1 text-xs text-red-400">{errors.bankAccountName}</p>}
              </div>

              <div>
                <label htmlFor="bankBranchCode" className="block text-sm font-medium text-slate-200 mb-2">
                  Branch Code
                </label>
                <input
                  type="text"
                  id="bankBranchCode"
                  name="bankBranchCode"
                  value={formData.bankBranchCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label htmlFor="bankSwiftCode" className="block text-sm font-medium text-slate-200 mb-2">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  id="bankSwiftCode"
                  name="bankSwiftCode"
                  value={formData.bankSwiftCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6 flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-indigo-300" />
            <span>Payout Preferences</span>
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-slate-200 mb-2">
                Payout Currency *
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.currency ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1`}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </select>
              {errors.currency && <p className="mt-1 text-xs text-red-400">{errors.currency}</p>}
            </div>

            <div>
              <label htmlFor="payoutFrequency" className="block text-sm font-medium text-slate-200 mb-2">
                Payout Frequency *
              </label>
              <select
                id="payoutFrequency"
                name="payoutFrequency"
                value={formData.payoutFrequency}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.payoutFrequency ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-400'
                } bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-1`}
              >
                {payoutFrequencies.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.payoutFrequency && <p className="mt-1 text-xs text-red-400">{errors.payoutFrequency}</p>}
            </div>

            <div>
              <label htmlFor="minimumPayoutAmount" className="block text-sm font-medium text-slate-200 mb-2">
                Minimum Payout Amount
              </label>
              <input
                type="text"
                id="minimumPayoutAmount"
                name="minimumPayoutAmount"
                value={formData.minimumPayoutAmount}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="500"
              />
            </div>

            <div>
              <label htmlFor="withholdingTaxRate" className="block text-sm font-medium text-slate-200 mb-2">
                Withholding Tax Rate (%)
              </label>
              <input
                type="text"
                id="withholdingTaxRate"
                name="withholdingTaxRate"
                value={formData.withholdingTaxRate}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                placeholder="5"
              />
            </div>

            <div>
              <label htmlFor="vatRegistration" className="block text-sm font-medium text-slate-200 mb-2">
                VAT Registration Number
              </label>
              <input
                type="text"
                id="vatRegistration"
                name="vatRegistration"
                value={formData.vatRegistration}
                onChange={handleChange}
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
                onChange={handleChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
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
                onChange={handleChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
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
            {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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

export default PublisherPaymentStep;
