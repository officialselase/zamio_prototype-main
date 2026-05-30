import React from 'react';
import {
  AudioWaveform,
  TrendingUp,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { OnboardingStepProps } from '../../../../components/onboarding/OnboardingWizard';

const WelcomeStep: React.FC<OnboardingStepProps> = ({ onNext }) => {
  const benefits = [
    {
      icon: AudioWaveform,
      title: 'Self-Published Artist',
      description: 'You are automatically set up as a self-published artist with full control over your music catalog.'
    },
    {
      icon: TrendingUp,
      title: 'Direct Royalty Collection',
      description: 'Receive royalty payments directly to your account without needing a publisher intermediary.'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track your music performance across Ghana radio stations with detailed analytics.'
    },
    {
      icon: ShieldCheck,
      title: 'Industry Standards',
      description: 'ZamIO follows ASCAP, BMI, and international PRO standards for professional royalty management.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-indigo-500/20">
          <TrendingUp className="w-10 h-10 text-indigo-300" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-white">
          Welcome to Zamio!
        </h1>
        <p className="text-lg text-slate-300">
          Ghana's premier music royalty management platform. Let's get you set up to start earning from your music.
        </p>
      </div>

      {/* Self-Published Status Highlight */}
      <div className="mb-8 p-6 rounded-lg border-l-4 bg-green-500/10 border-l-green-400">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 mt-0.5 rounded-full bg-green-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              You're Set as Self-Published
            </h3>
            <p className="text-sm text-slate-300">
              Since you registered directly with ZamIO, you're automatically configured as a self-published artist.
              This means you have full control over your music and will receive royalty payments directly.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {benefits.map((benefit, index) => (
          <div key={index}
               className="p-6 rounded-lg border bg-slate-800/50 border-white/10">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <benefit.icon className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {benefit.title}
                </h3>
                <p className="text-sm text-slate-300">
                  {benefit.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* What's Next */}
      <div className="mb-8 p-6 rounded-lg bg-slate-800/50">
        <h3 className="text-lg font-semibold mb-4 text-white">
          What's Next?
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white bg-indigo-500">
              1
            </div>
            <span className="text-slate-300">
              Complete your artist profile with bio and contact information
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white bg-indigo-500">
              2
            </div>
            <span className="text-slate-300">
              Upload KYC documents for account verification (recommended)
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white bg-indigo-500">
              3
            </div>
            <span className="text-slate-300">
              Add payment information for royalty collection
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white bg-indigo-500">
              4
            </div>
            <span className="text-slate-300">
              Upload your first track to start earning royalties
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg font-semibold text-white bg-indigo-500 hover:bg-indigo-400 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
