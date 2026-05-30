import React from 'react';
import { RadioTower, CheckCircle, TrendingUp, Users, Settings, ArrowRight } from 'lucide-react';

const RadioIcon = RadioTower;

interface WelcomeStepProps {
  onNext: () => void;
  currentStep: number;
  totalSteps: number;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const features = [
    {
      icon: RadioIcon,
      title: 'Real-time Monitoring',
      description: 'Track airplay across FM, TV, and digital streams with minute-level accuracy'
    },
    {
      icon: TrendingUp,
      title: 'Revenue Intelligence',
      description: 'Executive dashboards with trend analysis and automated royalty calculations'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Add staff members, assign roles, and manage station operations efficiently'
    },
    {
      icon: Settings,
      title: 'Compliance Ready',
      description: 'Generate PRO-grade statements and maintain regulatory compliance'
    }
  ];

  const nextSteps = [
    'Complete your station profile and licensing information',
    'Configure your audio streams for monitoring',
    'Add team members and assign roles',
    'Set up compliance and regulatory requirements',
    'Configure payment methods for revenue collection'
  ];

  return (
    <div className="py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/20 rounded-full mb-6">
          <RadioIcon className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-3xl font-semibold text-white mb-4">
          Welcome to Zamio Stations!
        </h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Ghana's premier radio station management platform. Let's get your station set up for comprehensive music monitoring and royalty collection.
        </p>
      </div>

      {/* Platform Overview */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 mb-8">
        <h4 className="text-xl font-semibold text-white mb-6 text-center">
          What You'll Get
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
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
          What's Next
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

      {/* Ghana Context */}
      <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-6 mb-8">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <RadioIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <h5 className="font-medium text-indigo-300">Built for Ghana</h5>
        </div>
        <p className="text-sm text-slate-300">
          Our platform is specifically designed for Ghanaian radio stations with local market insights,
          mobile money integration, and compliance with GHAMRO regulations.
        </p>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
        >
          <span>Start Station Setup</span>
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
