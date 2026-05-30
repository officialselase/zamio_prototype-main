import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Circle, SkipForward } from 'lucide-react';

type StepAdvanceHandler = () => Promise<boolean | void> | boolean | void;

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  isCompleted?: boolean;
  isRequired?: boolean;
}

export interface OnboardingStepProps {
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  canSkip?: boolean;
  registerNextHandler?: (handler: StepAdvanceHandler | null) => void;
  registerSkipHandler?: (handler: StepAdvanceHandler | null) => void;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  title: string;
  subtitle?: string;
  initialStepId?: string;
  currentStepId?: string;
  onStepComplete?: (stepId: string) => void;
  onStepSkip?: (stepId: string) => void;
  onStepChange?: (stepId: string) => void;
}

export default function OnboardingWizard({
  steps,
  onComplete,
  title,
  subtitle,
  initialStepId = steps[0]?.id,
  currentStepId,
  onStepComplete,
  onStepSkip,
  onStepChange,
}: OnboardingWizardProps) {
  const [activeStepId, setActiveStepId] = useState(currentStepId || initialStepId);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const nextHandlerRef = useRef<StepAdvanceHandler | null>(null);
  const skipHandlerRef = useRef<StepAdvanceHandler | null>(null);

  useEffect(() => {
    if (currentStepId && currentStepId !== activeStepId) {
      setActiveStepId(currentStepId);
    }
  }, [currentStepId, activeStepId]);

  useEffect(() => {
    nextHandlerRef.current = null;
    skipHandlerRef.current = null;
    setIsAdvancing(false);
  }, [activeStepId]);

  const registerNextHandler = useCallback((handler: StepAdvanceHandler | null) => {
    nextHandlerRef.current = handler;
  }, []);

  const registerSkipHandler = useCallback((handler: StepAdvanceHandler | null) => {
    skipHandlerRef.current = handler;
  }, []);

  const activeStep = steps.find(step => step.id === activeStepId);
  const activeStepIndex = steps.findIndex(step => step.id === activeStepId);
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  const executeHandler = async (handler: StepAdvanceHandler | null) => {
    if (!handler) {
      return true;
    }
    const result = await handler();
    return result !== false;
  };

  const moveToIndex = (index: number) => {
    if (index >= steps.length) {
      onComplete();
      return;
    }
    const target = steps[index];
    if (target) {
      setActiveStepId(target.id);
      onStepChange?.(target.id);
    }
  };

  const handleNext = async () => {
    if (isAdvancing) {
      return;
    }
    setIsAdvancing(true);
    try {
      const proceed = await executeHandler(nextHandlerRef.current);
      if (!proceed) {
        return;
      }

      if (isLastStep) {
        onComplete();
      } else {
        moveToIndex(activeStepIndex + 1);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const handlePrevious = () => {
    if (isFirstStep) return;

    const prevStep = steps[activeStepIndex - 1];
    if (prevStep) {
      setActiveStepId(prevStep.id);
      onStepChange?.(prevStep.id);
    }
  };

  const handleSkip = async () => {
    if (isAdvancing) {
      return;
    }
    setIsAdvancing(true);
    try {
      const proceed = await executeHandler(skipHandlerRef.current);
      if (!proceed) {
        return;
      }
      onStepSkip?.(activeStepId);
      moveToIndex(activeStepIndex + 1);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleStepClick = (stepId: string, stepIndex: number) => {
    // Only allow navigation to completed or current step
    const targetStep = steps[stepIndex];
    if (targetStep?.isCompleted || stepId === activeStepId) {
      setActiveStepId(stepId);
      onStepChange?.(stepId);
    }
  };

  if (!activeStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const StepComponent = activeStep.component;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              {subtitle && (
                <p className="text-slate-400 mt-1">{subtitle}</p>
              )}
            </div>
            <div className="text-sm text-slate-400">
              Step {activeStepIndex + 1} of {steps.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => {
                const isActive = step.id === activeStepId;
                const isCompleted = step.isCompleted || false;
                const isClickable = isCompleted || isActive;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => handleStepClick(step.id, index)}
                      disabled={!isClickable}
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
                        ${isActive
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : isCompleted
                            ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                            : isClickable
                              ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                              : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isActive ? (
                        <Circle className="h-4 w-4 fill-current" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{step.title}</span>
                    </button>

                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-green-500/50' : 'bg-slate-700'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep.isRequired !== false ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {activeStepIndex + 1}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{activeStep.title}</h2>
                <p className="text-slate-400">{activeStep.description}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 backdrop-blur">
            <StepComponent
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
              onComplete={onComplete}
              isFirst={isFirstStep}
              isLast={isLastStep}
              canSkip={activeStep.isRequired === false}
              registerNextHandler={registerNextHandler}
              registerSkipHandler={registerSkipHandler}
            />
          </div>

          {/* Navigation Footer */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isFirstStep
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3">
              {activeStep.isRequired === false && (
                <button
                  onClick={handleSkip}
                  disabled={isAdvancing}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-white/20 text-slate-300 hover:border-indigo-400 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Skip</span>
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={isAdvancing}
                className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <span>{isAdvancing ? 'Saving…' : isLastStep ? 'Complete' : 'Next'}</span>
                {!isLastStep && !isAdvancing && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
