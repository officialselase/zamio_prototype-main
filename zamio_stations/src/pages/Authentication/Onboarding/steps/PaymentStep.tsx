import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Smartphone,
  Building2,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { useStationOnboarding } from '../StationOnboardingContext';

interface PaymentStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

interface PaymentFormState {
  momoProvider: string;
  momoNumber: string;
  momoName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branchCode: string;
  swiftCode: string;
  currency: string;
  payoutFrequency: string;
  minimumPayout: string;
  taxId: string;
  businessRegistration: string;
}

const defaultFormState: PaymentFormState = {
  momoProvider: '',
  momoNumber: '',
  momoName: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
  branchCode: '',
  swiftCode: '',
  currency: 'GHS',
  payoutFrequency: 'monthly',
  minimumPayout: '',
  taxId: '',
  businessRegistration: '',
};

const mobileMoneyProviders = [
  { id: 'MTN Mobile Money', name: 'MTN Mobile Money', logo: '📱' },
  { id: 'Vodafone Cash', name: 'Vodafone Cash', logo: '💳' },
  { id: 'AirtelTigo Money', name: 'AirtelTigo Money', logo: '💰' },
];

const banks = [
  'Access Bank Ghana',
  'Absa Bank Ghana',
  'Agricultural Development Bank',
  'Bank of Africa',
  'CalBank',
  'Consolidated Bank Ghana',
  'Ecobank Ghana',
  'FBNBank Ghana',
  'Fidelity Bank Ghana',
  'First Atlantic Bank',
  'First National Bank Ghana',
  'GCB Bank',
  'Guaranty Trust Bank',
  'National Investment Bank',
  'OmniBSIC Bank',
  'Prudential Bank',
  'Republic Bank Ghana',
  'Societe Generale Ghana',
  'Stanbic Bank Ghana',
  'Standard Chartered Bank Ghana',
  'United Bank for Africa Ghana',
  'Zenith Bank Ghana',
];

const currencies = [
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

const payoutFrequencies = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const PaymentStep: React.FC<PaymentStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitPayment } = useStationOnboarding();

  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'bank' | ''>('');
  const [formState, setFormState] = useState<PaymentFormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const paymentSnapshot = useMemo(() => status?.payment_preferences ?? {}, [status]);

  useEffect(() => {
    const initialMethod: 'momo' | 'bank' | '' = paymentSnapshot?.momo_account
      ? 'momo'
      : paymentSnapshot?.bank_account_number || paymentSnapshot?.bank_name
        ? 'bank'
        : '';

    const initial: PaymentFormState = {
      momoProvider: typeof paymentSnapshot?.momo_provider === 'string'
        ? paymentSnapshot.momo_provider ?? ''
        : '',
      momoNumber: typeof paymentSnapshot?.momo_account === 'string'
        ? paymentSnapshot.momo_account ?? ''
        : '',
      momoName: typeof paymentSnapshot?.momo_account_name === 'string'
        ? paymentSnapshot.momo_account_name ?? ''
        : '',
      bankName: typeof paymentSnapshot?.bank_name === 'string'
        ? paymentSnapshot.bank_name ?? ''
        : '',
      accountNumber: typeof paymentSnapshot?.bank_account_number === 'string'
        ? paymentSnapshot.bank_account_number ?? ''
        : typeof paymentSnapshot?.bank_account === 'string'
          ? paymentSnapshot.bank_account ?? ''
          : '',
      accountName: typeof paymentSnapshot?.bank_account_name === 'string'
        ? paymentSnapshot.bank_account_name ?? ''
        : '',
      branchCode: typeof paymentSnapshot?.bank_branch_code === 'string'
        ? paymentSnapshot.bank_branch_code ?? ''
        : '',
      swiftCode: typeof paymentSnapshot?.bank_swift_code === 'string'
        ? paymentSnapshot.bank_swift_code ?? ''
        : '',
      currency: typeof paymentSnapshot?.preferred_currency === 'string'
        ? paymentSnapshot.preferred_currency ?? 'GHS'
        : 'GHS',
      payoutFrequency: typeof paymentSnapshot?.payout_frequency === 'string'
        ? paymentSnapshot.payout_frequency ?? 'monthly'
        : 'monthly',
      minimumPayout: paymentSnapshot?.minimum_payout_amount
        ? String(paymentSnapshot.minimum_payout_amount)
        : '',
      taxId: typeof paymentSnapshot?.tax_identification_number === 'string'
        ? paymentSnapshot.tax_identification_number ?? ''
        : '',
      businessRegistration: typeof paymentSnapshot?.business_registration_number === 'string'
        ? paymentSnapshot.business_registration_number ?? ''
        : '',
    };

    setPaymentMethod(initialMethod);
    setFormState(initial);
  }, [paymentSnapshot]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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

  const handleSelectMethod = (method: 'momo' | 'bank') => {
    setPaymentMethod(method);
    setErrors(prev => ({ ...prev, paymentMethod: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Select a payout method to continue';
    }

    if (!formState.currency) {
      newErrors.currency = 'Preferred currency is required';
    }

    if (!formState.payoutFrequency) {
      newErrors.payoutFrequency = 'Select how frequently payouts should occur';
    }

    if (formState.minimumPayout) {
      if (!/^\d+(\.\d{1,2})?$/.test(formState.minimumPayout.trim())) {
        newErrors.minimumPayout = 'Enter a valid amount (e.g. 100 or 150.50)';
      }
    }

    if (paymentMethod === 'momo') {
      if (!formState.momoProvider) {
        newErrors.momoProvider = 'Select your mobile money provider';
      }
      if (!formState.momoNumber.trim()) {
        newErrors.momoNumber = 'Mobile money number is required';
      } else if (!/^(\+233|0)[2-9]\d{8}$/.test(formState.momoNumber.replace(/\s/g, ''))) {
        newErrors.momoNumber = 'Please enter a valid Ghanaian mobile number';
      }
      if (!formState.momoName.trim()) {
        newErrors.momoName = 'Account holder name is required';
      }
    } else if (paymentMethod === 'bank') {
      if (!formState.bankName) {
        newErrors.bankName = 'Bank name is required';
      }
      if (!formState.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      }
      if (!formState.accountName.trim()) {
        newErrors.accountName = 'Account holder name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setApiError(null);

    const payload: Record<string, unknown> = {
      preferred_method: paymentMethod,
      currency: formState.currency,
      payout_frequency: formState.payoutFrequency,
    };

    if (formState.minimumPayout.trim()) {
      payload.minimum_payout = formState.minimumPayout.trim();
    }
    if (formState.taxId.trim()) {
      payload.tax_id = formState.taxId.trim();
    }
    if (formState.businessRegistration.trim()) {
      payload.business_registration = formState.businessRegistration.trim();
    }

    if (paymentMethod === 'momo') {
      payload.momo = formState.momoNumber.trim();
      payload.momo_provider = formState.momoProvider;
      payload.momo_name = formState.momoName.trim();
    } else if (paymentMethod === 'bank') {
      payload.bank_name = formState.bankName;
      payload.bank_account_number = formState.accountNumber.trim();
      payload.bank_account_name = formState.accountName.trim();
      if (formState.branchCode.trim()) {
        payload.bank_branch_code = formState.branchCode.trim();
      }
      if (formState.swiftCode.trim()) {
        payload.bank_swift_code = formState.swiftCode.trim();
      }
    }

    try {
      await submitPayment(payload);
      onNext();
    } catch (err) {
      const message = resolveApiError(err, setErrors);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const summaryItems: Array<{ label: string; value: string | undefined }> = [
    { label: 'Preferred Method', value: paymentSnapshot?.preferred_payout_method as string | undefined },
    { label: 'Currency', value: paymentSnapshot?.preferred_currency as string | undefined },
    { label: 'Payout Frequency', value: paymentSnapshot?.payout_frequency as string | undefined },
  ];

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Payment Setup</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Configure how your station will receive royalty payments and reimbursements from Zamio. Set up secure payout methods and frequency preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {apiError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {apiError}
          </div>
        )}

        {paymentSnapshot && Object.keys(paymentSnapshot).length > 0 && (
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
            <h4 className="text-sm font-semibold text-indigo-300 uppercase tracking-widest mb-3">Current payout summary</h4>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              {summaryItems.map(item => (
                <div key={item.label} className="rounded-lg bg-slate-800/60 border border-white/5 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-white">{item.value || 'Not set'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Payment Method</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => handleSelectMethod('momo')}
              className={`p-6 rounded-lg border-2 text-left transition-colors ${
                paymentMethod === 'momo'
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-white/10 bg-slate-800/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <Smartphone className="w-6 h-6 text-indigo-400" />
                <h5 className="font-medium text-white">Mobile Money</h5>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Fast, convenient royalty payments through MTN, Vodafone, or AirtelTigo Money
              </p>
              <div className="flex flex-wrap gap-2">
                {mobileMoneyProviders.map(provider => (
                  <span key={provider.id} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    {provider.logo} {provider.name}
                  </span>
                ))}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMethod('bank')}
              className={`p-6 rounded-lg border-2 text-left transition-colors ${
                paymentMethod === 'bank'
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-white/10 bg-slate-800/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <Building2 className="w-6 h-6 text-indigo-400" />
                <h5 className="font-medium text-white">Bank Transfer</h5>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Secure payouts to your Ghanaian bank account with SWIFT support for international transfers
              </p>
              <div className="flex flex-wrap gap-2">
                {banks.slice(0, 4).map(bank => (
                  <span key={bank} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    {bank}
                  </span>
                ))}
                <span className="text-xs text-slate-400">+ more</span>
              </div>
            </button>
          </div>
          {errors.paymentMethod && <p className="text-red-400 text-sm mt-3">{errors.paymentMethod}</p>}
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Payout Preferences</h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-slate-200 mb-2">
                Preferred Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formState.currency}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                  errors.currency
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
              {errors.currency && <p className="text-red-400 text-sm mt-1">{errors.currency}</p>}
            </div>

            <div>
              <label htmlFor="payoutFrequency" className="block text-sm font-medium text-slate-200 mb-2">
                Payout Frequency
              </label>
              <select
                id="payoutFrequency"
                name="payoutFrequency"
                value={formState.payoutFrequency}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                  errors.payoutFrequency
                    ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                    : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                }`}
              >
                {payoutFrequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
              {errors.payoutFrequency && <p className="text-red-400 text-sm mt-1">{errors.payoutFrequency}</p>}
            </div>

            <div>
              <label htmlFor="minimumPayout" className="block text-sm font-medium text-slate-200 mb-2">
                Minimum Payout Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  id="minimumPayout"
                  name="minimumPayout"
                  value={formState.minimumPayout}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-9 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.minimumPayout
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="100.00"
                />
              </div>
              {errors.minimumPayout && <p className="text-red-400 text-sm mt-1">{errors.minimumPayout}</p>}
            </div>
          </div>
        </div>

        {paymentMethod === 'momo' && (
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
            <h4 className="text-xl font-semibold text-white mb-6">Mobile Money Details</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="momoProvider" className="block text-sm font-medium text-slate-200 mb-2">
                  Mobile Money Provider
                </label>
                <select
                  id="momoProvider"
                  name="momoProvider"
                  value={formState.momoProvider}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                    errors.momoProvider
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                >
                  <option value="">Select provider</option>
                  {mobileMoneyProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                {errors.momoProvider && <p className="text-red-400 text-sm mt-1">{errors.momoProvider}</p>}
              </div>

              <div>
                <label htmlFor="momoNumber" className="block text-sm font-medium text-slate-200 mb-2">
                  Mobile Money Number
                </label>
                <input
                  type="text"
                  id="momoNumber"
                  name="momoNumber"
                  value={formState.momoNumber}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.momoNumber
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="024 123 4567"
                />
                {errors.momoNumber && <p className="text-red-400 text-sm mt-1">{errors.momoNumber}</p>}
              </div>

              <div>
                <label htmlFor="momoName" className="block text-sm font-medium text-slate-200 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  id="momoName"
                  name="momoName"
                  value={formState.momoName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.momoName
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="Ama Radio"
                />
                {errors.momoName && <p className="text-red-400 text-sm mt-1">{errors.momoName}</p>}
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'bank' && (
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
            <h4 className="text-xl font-semibold text-white mb-6">Bank Account Details</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-slate-200 mb-2">
                  Bank Name
                </label>
                <select
                  id="bankName"
                  name="bankName"
                  value={formState.bankName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                    errors.bankName
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                >
                  <option value="">Select bank</option>
                  {banks.map(bank => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                {errors.bankName && <p className="text-red-400 text-sm mt-1">{errors.bankName}</p>}
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-200 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  value={formState.accountNumber}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.accountNumber
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="0123456789"
                />
                {errors.accountNumber && <p className="text-red-400 text-sm mt-1">{errors.accountNumber}</p>}
              </div>

              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-slate-200 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  value={formState.accountName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.accountName
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="Ama Radio"
                />
                {errors.accountName && <p className="text-red-400 text-sm mt-1">{errors.accountName}</p>}
              </div>

              <div>
                <label htmlFor="branchCode" className="block text-sm font-medium text-slate-200 mb-2">
                  Branch Code (optional)
                </label>
                <input
                  type="text"
                  id="branchCode"
                  name="branchCode"
                  value={formState.branchCode}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="001"
                />
              </div>

              <div>
                <label htmlFor="swiftCode" className="block text-sm font-medium text-slate-200 mb-2">
                  SWIFT / BIC (optional)
                </label>
                <input
                  type="text"
                  id="swiftCode"
                  name="swiftCode"
                  value={formState.swiftCode}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="ABCDGHAC"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Tax & Compliance</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-slate-200 mb-2">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                id="taxId"
                name="taxId"
                value={formState.taxId}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="C123456789"
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
                value={formState.businessRegistration}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="BR123456"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center rounded-lg bg-slate-800/50 px-6 py-3 text-white transition hover:bg-slate-800"
          >
            <Wallet className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            >
              <span>{submitting ? 'Saving…' : 'Next'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const resolveApiError = (
  error: unknown,
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): string => {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as {
      message?: string;
      detail?: string;
      errors?: Record<string, string[] | string>;
    } | undefined;

    if (response?.errors) {
      setFieldErrors(prev => {
        const next = { ...prev };
        Object.entries(response.errors!).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            next[key] = value[0] ?? '';
          } else if (typeof value === 'string') {
            next[key] = value;
          }
        });
        return next;
      });
    }

    if (response?.message && typeof response.message === 'string') {
      return response.message;
    }
    if (response?.detail && typeof response.detail === 'string') {
      return response.detail;
    }
    if (response?.errors) {
      const first = Object.values(response.errors)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') {
        return first[0];
      }
      if (typeof first === 'string') {
        return first;
      }
    }
    return error.message || 'An unexpected error occurred. Please try again.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

export default PaymentStep;
