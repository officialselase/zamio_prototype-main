import React from 'react';
import { Building2, TrendingUp, Users, DollarSign, FileText, ArrowRight, Music, Crown } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: number;
  totalSteps: number;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const publisherFeatures = [
    {
      icon: Music,
      title: 'Music Rights Management',
      description: 'Comprehensive music publishing rights administration and royalty collection'
    },
    {
      icon: TrendingUp,
      title: 'Revenue Optimization',
      description: 'Maximize earnings through intelligent royalty tracking and performance analytics'
    },
    {
      icon: Users,
      title: 'Artist Relations',
      description: 'Manage songwriter and artist relationships with transparent reporting'
    },
    {
      icon: DollarSign,
      title: 'Global Payments',
      description: 'Secure international payment processing with multi-currency support'
    },
    {
      icon: FileText,
      title: 'Compliance & Reporting',
      description: 'Automated GHAMRO compliance and detailed royalty statements'
    },
    {
      icon: Crown,
      title: 'Publishing Administration',
      description: 'Complete music publishing administration and catalog management'
    }
  ];

  const nextSteps = [
    'Complete your publishing company profile and registration',
    'Configure revenue splits between writers and publishers',
    'Link and manage your songwriter and artist relationships',
    'Set up payment methods for royalty collection and distribution',
    'Access your publisher dashboard and reporting tools'
  ];

  return (
    <div className="py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/20 rounded-full mb-6">
          <Building2 className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-3xl font-semibold text-white mb-4">
          Welcome to Zamio Publisher!
        </h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Ghana's premier music publishing management platform. Set up your publishing company to efficiently collect and distribute royalties for songwriters and artists.
        </p>
      </div>

      {/* Platform Overview */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 mb-8">
        <h4 className="text-xl font-semibold text-white mb-6 text-center">
          What You'll Get
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          {publisherFeatures.map((feature, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <div>
                <h5 className="font-medium text-white mb-1">{feature.title}</h5>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 mb-8">
        <h4 className="text-xl font-semibold text-white mb-6 text-center">
          Your Publisher Setup Journey
        </h4>
        <div className="space-y-4">
          {nextSteps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-medium text-indigo-400">{index + 1}</span>
              </div>
              <p className="text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Publisher Benefits */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 mb-8">
        <h4 className="text-xl font-semibold text-white mb-6 text-center">
          Why Choose Zamio Publisher?
        </h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <h5 className="font-medium text-white mb-2">Maximize Revenue</h5>
            <p className="text-sm text-slate-400">
              Track every play and ensure accurate royalty collection across all platforms
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h5 className="font-medium text-white mb-2">Artist Relations</h5>
            <p className="text-sm text-slate-400">
              Build stronger relationships with transparent reporting and fair distributions
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h5 className="font-medium text-white mb-2">Stay Compliant</h5>
            <p className="text-sm text-slate-400">
              Automated compliance with GHAMRO regulations and international standards
            </p>
          </div>
        </div>
      </div>

      {/* Ghana Context */}
      <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-6 mb-8">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <h5 className="font-medium text-indigo-300">Built for Ghanaian Publishers</h5>
        </div>
        <p className="text-sm text-slate-300">
          Our platform understands the unique needs of Ghanaian music publishers, with local market insights,
          mobile money integration, and seamless GHAMRO compliance for optimal royalty management.
        </p>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
        >
          <span>Start Publisher Setup</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-sm text-slate-400 mt-3">
          This will take approximately 10-15 minutes to complete
        </p>
      </div>
    </div>
  );
};

export default WelcomeStep;
