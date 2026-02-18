import { Check } from 'lucide-react';

type StepIndicatorProps = {
  totalSteps: number;
  currentStep: number;
  labels?: string[];
};

export function StepIndicator({
  totalSteps,
  currentStep,
  labels,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={`h-px w-8 transition-colors ${
                  isCompleted || isActive ? 'bg-foreground' : 'bg-neutral-a4'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex size-5 items-center justify-center rounded-md text-[11px] font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-9 text-white'
                    : isActive
                      ? 'bg-foreground text-background'
                      : 'bg-neutral-a3 text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="size-3" /> : step}
              </div>
              {labels?.[i] && (
                <span
                  className={`text-xs font-medium transition-colors ${
                    isCompleted || isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {labels[i]}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
