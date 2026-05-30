import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isCompleted?: boolean;
  isRequired?: boolean;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onStepChange?: (stepId: string, direction: 'next' | 'prev' | 'jump') => void;
  title?: string;
  subtitle?: string;
  initialStepId?: string;
  currentStepId?: string;
  showProgress?: boolean;
  allowStepNavigation?: boolean;
  className?: string;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  steps,
  onComplete,
  onStepChange,
  title = "Station Setup",
  subtitle = "Complete your station configuration",
  initialStepId,
  currentStepId: controlledCurrentStepId,
  showProgress = true,
  allowStepNavigation = true,
  className = ""
}) => {
  const [internalCurrentStepId, setInternalCurrentStepId] = useState(
    initialStepId || steps[0]?.id || ''
  );

  const currentStepId = controlledCurrentStepId || internalCurrentStepId;
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
      return;
    }

    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      setInternalCurrentStepId(nextStep.id);
      onStepChange?.(nextStep.id, 'next');
    }
  }, [currentStepIndex, isLastStep, steps, onComplete, onStepChange]);

  const handlePrevious = useCallback(() => {
    if (isFirstStep) return;

    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      setInternalCurrentStepId(prevStep.id);
      onStepChange?.(prevStep.id, 'prev');
    }
  }, [currentStepIndex, isFirstStep, steps, onStepChange]);

  const handleStepClick = useCallback((stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex <= currentStepIndex || allowStepNavigation) {
      setInternalCurrentStepId(stepId);
      onStepChange?.(stepId, 'jump');
    }
  }, [steps, currentStepIndex, allowStepNavigation, onStepChange]);

  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  if (!currentStep) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const StepComponent = currentStep.component;

  return (
    <div className={`min-h-screen bg-slate-950 ${className}`}>
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              <p className="text-slate-400 mt-1">{subtitle}</p>
            </div>

            {/* Step Navigation */}
            {showProgress && (
              <div className="hidden md:flex items-center space-x-4">
                {steps.map((step, index) => {
                  const isActive = step.id === currentStepId;
                  const isCompleted = index < currentStepIndex;
                  const isClickable = index <= currentStepIndex || allowStepNavigation;

                  return (
                    <button
                      key={step.id}
                      onClick={() => isClickable && handleStepClick(step.id)}
                      disabled={!isClickable}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-500 text-white'
                          : isCompleted
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : isClickable
                          ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                          : 'bg-slate-800/30 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-white' : isCompleted ? 'bg-green-400' : 'bg-slate-500'
                      }`} />
                      <span className="hidden lg:inline">{step.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>Step {currentStepIndex + 1} of {steps.length}</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="h-2 bg-indigo-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Content */}
          <div className="mb-8">
            <StepComponent
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              currentStep={currentStepIndex + 1}
              totalSteps={steps.length}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                isFirstStep
                  ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800/50 hover:bg-slate-800 text-white'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3">
              {/* Step Indicators - Mobile */}
              <div className="md:hidden flex items-center space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStepIndex
                        ? 'bg-indigo-400'
                        : index < currentStepIndex
                        ? 'bg-green-400'
                        : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              {!isLastStep && (
                <button
                  onClick={handleNext}
                  className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
