import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Building2, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { OnboardingStepProps } from '../../../components/onboarding/OnboardingWizard';
import { useArtistOnboarding } from './ArtistOnboardingContext';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  popular?: boolean;
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const PaymentStep: React.FC<OnboardingStepProps> = ({ registerNextHandler, registerSkipHandler }) => {
  const { status, submitPayment, skipStep } = useArtistOnboarding();
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    routingNumber: '',
    mobileProvider: '',
    mobileNumber: '',
    mobileAccountName: '',
    currency: 'GHS',
    preferredMethod: '',
    internationalInstructions: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const preferences = (status?.payment_preferences ?? {}) as Record<string, unknown>;
    if (!preferences) {
      return;
    }

    const preferred = readString(preferences['preferred_method']) ?? '';
    const currency = readString(preferences['currency']);
    const mobile = (preferences['mobile_money'] ?? {}) as Record<string, unknown>;
    const bank = (preferences['bank_transfer'] ?? {}) as Record<string, unknown>;
    const international = (preferences['international'] ?? {}) as Record<string, unknown>;

    setSelectedMethod(preferred);
    setFormData((prev) => ({
      ...prev,
      preferredMethod: preferred,
      currency: currency ?? prev.currency,
      mobileProvider: readString(mobile['provider']) ?? prev.mobileProvider,
      mobileNumber: readString(mobile['number']) ?? prev.mobileNumber,
      mobileAccountName: readString(mobile['account_name']) ?? prev.mobileAccountName,
      bankName: readString(bank['bank_name']) ?? prev.bankName,
      accountNumber: readString(bank['account_number']) ?? prev.accountNumber,
      accountHolderName: readString(bank['account_holder_name']) ?? prev.accountHolderName,
      routingNumber: readString(bank['routing_number']) ?? prev.routingNumber,
      internationalInstructions:
        readString(international['instructions']) ?? prev.internationalInstructions,
    }));
  }, [status]);

  const paymentMethods: PaymentMethod[] = useMemo(
    () => [
      {
        id: 'mobile-money',
        name: 'Mobile Money',
        icon: Smartphone,
        description: 'MTN, Vodafone, AirtelTigo',
        popular: true,
      },
      {
        id: 'bank-transfer',
        name: 'Bank Transfer',
        icon: Building2,
        description: 'Direct bank account deposit',
      },
      {
        id: 'international',
        name: 'International Transfer',
        icon: CreditCard,
        description: 'PayPal, Wise, or bank wire',
      },
    ],
    [],
  );

  const currencies = [
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];

  const mobileProviders = ['MTN', 'Vodafone', 'AirtelTigo'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setFormData((prev) => ({
      ...prev,
      preferredMethod: methodId,
    }));
  };

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);
    const method = (selectedMethod || formData.preferredMethod).trim();
    if (!method) {
      setErrorMessage('Please choose how you would like to receive your royalties.');
      return false;
    }

    const missingFields: string[] = [];

    if (method === 'mobile-money') {
      if (!formData.mobileProvider.trim()) {
        missingFields.push('mobile money provider');
      }
      if (!formData.mobileNumber.trim()) {
        missingFields.push('mobile money number');
      }
      if (!formData.mobileAccountName.trim()) {
        missingFields.push('account holder name');
      }
    } else if (method === 'bank-transfer') {
      if (!formData.bankName.trim()) {
        missingFields.push('bank name');
      }
      if (!formData.accountNumber.trim()) {
        missingFields.push('account number');
      }
      if (!formData.accountHolderName.trim()) {
        missingFields.push('account holder name');
      }
    } else if (method === 'international') {
      if (!formData.internationalInstructions.trim()) {
        missingFields.push('transfer instructions');
      }
    }

    if (missingFields.length > 0) {
      const readable =
        missingFields.length === 1
          ? missingFields[0]
          : missingFields.length === 2
            ? `${missingFields[0]} and ${missingFields[1]}`
            : `${missingFields.slice(0, -1).join(', ')}, and ${missingFields[missingFields.length - 1]}`;
      const methodLabel =
        method === 'mobile-money'
          ? 'mobile money'
          : method === 'bank-transfer'
            ? 'bank transfer'
            : 'international transfer';
      setErrorMessage(`To use ${methodLabel}, please add your ${readable}.`);
      return false;
    }

    setIsSubmitting(true);
    try {
      await submitPayment({
        preferredMethod: method,
        currency: formData.currency.trim() || 'GHS',
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        routingNumber: formData.routingNumber.trim(),
        mobileProvider: formData.mobileProvider.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        mobileAccountName: formData.mobileAccountName.trim(),
        internationalInstructions: formData.internationalInstructions.trim(),
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not save your payment preferences. Please try again.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedMethod, submitPayment]);

  useEffect(() => {
    registerNextHandler?.(() => handleSubmit());
    registerSkipHandler?.(() =>
      skipStep('payment')
        .then(() => true)
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : 'We could not skip this step right now. Please try again.';
          setErrorMessage(message);
          return false;
        }),
    );

    return () => {
      registerNextHandler?.(null);
      registerSkipHandler?.(null);
    };
  }, [handleSubmit, registerNextHandler, registerSkipHandler, skipStep]);

  const renderMethodForm = () => {
    switch (selectedMethod) {
      case 'mobile-money':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Mobile Money Provider *</label>
              <select
                name="mobileProvider"
                value={formData.mobileProvider}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              >
                <option value="">Select provider</option>
                {mobileProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Mobile Money Number *</label>
              <input
                type="tel"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                placeholder="+233 XX XXX XXXX"
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Account Holder Name *</label>
              <input
                type="text"
                name="mobileAccountName"
                value={formData.mobileAccountName}
                onChange={handleInputChange}
                placeholder="Name registered with mobile money"
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
          </div>
        );

      case 'bank-transfer':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Bank Name *</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="e.g., Access Bank, Ecobank, etc."
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Account Number *</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="1234567890"
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Routing Number</label>
                <input
                  type="text"
                  name="routingNumber"
                  value={formData.routingNumber}
                  onChange={handleInputChange}
                  placeholder="Bank routing code"
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Account Holder Name *</label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleInputChange}
                placeholder="Name on bank account"
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
          </div>
        );

      case 'international':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Transfer Instructions *
              </label>
              <textarea
                name="internationalInstructions"
                value={formData.internationalInstructions}
                onChange={handleInputChange}
                rows={4}
                placeholder="Provide details for PayPal, Wise, or wire transfers"
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="rounded-lg border border-dashed border-white/10 p-6 bg-slate-800/40 text-slate-300">
            Select how you would like to receive your royalty payments to continue.
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Payment Information</h2>
        <p className="text-slate-300">
          Choose how you want to receive your royalty payouts. You can update this anytime from your dashboard.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => handleMethodSelect(method.id)}
              className={`rounded-2xl border px-6 py-5 text-left transition-all ${
                isSelected
                  ? 'border-indigo-400 bg-indigo-500/20 text-white shadow-lg'
                  : 'border-white/10 bg-slate-800/50 text-slate-300 hover:border-indigo-400/50 hover:bg-slate-800/70'
              }`}
              disabled={isSubmitting}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-slate-900/60 p-3">
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{method.name}</p>
                    <p className="text-xs text-slate-400">{method.description}</p>
                  </div>
                </div>
                {method.popular && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                    Popular
                  </span>
                )}
              </div>
              {isSelected && (
                <div className="mt-4 flex items-center space-x-2 text-sm text-indigo-200">
                  <CheckCircle className="h-4 w-4" />
                  <span>Selected as your payout method</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-slate-200">Payout Currency</label>
        <select
          name="currency"
          value={formData.currency}
          onChange={handleInputChange}
          className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          disabled={isSubmitting}
        >
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.name} ({currency.symbol})
            </option>
          ))}
        </select>
      </div>

      {renderMethodForm()}

      <div className="mt-8 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5" />
          <p>
            We’ll notify you by email whenever a payout is processed. You can update your payout method at any time in your
            account settings.
          </p>
        </div>
      </div>

      {isSubmitting && (
        <div className="mt-4 text-sm text-indigo-200">Saving your payment preferences…</div>
      )}
    </div>
  );
};

export default PaymentStep;
