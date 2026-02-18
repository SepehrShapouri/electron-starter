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
  const progress = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-background-2">
        <div
          className="h-full rounded-full bg-foreground/40 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <span
              key={step}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isCompleted || isActive
                  ? 'border-foreground/35 bg-foreground/10 text-foreground'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {labels?.[i] ?? `Step ${step}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}
