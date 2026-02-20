import { Check, Circle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

type LaunchStatus = 'provisioning' | 'pending' | 'running';
type StepStatus = 'pending' | 'active' | 'completed';

type ProvisioningStep = {
  label: string;
  minStatus: LaunchStatus;
};

const PROVISIONING_STEPS: ProvisioningStep[] = [
  { label: 'Validating launch request', minStatus: 'provisioning' },
  { label: 'Allocating secure compute', minStatus: 'provisioning' },
  { label: 'Applying model configuration', minStatus: 'pending' },
  { label: 'Starting gateway services', minStatus: 'pending' },
  { label: 'Verifying agent health checks', minStatus: 'running' },
];

const STATUS_RANK: Record<LaunchStatus, number> = {
  provisioning: 0,
  pending: 1,
  running: 2,
};

type ProvisioningStepsLoaderProps = {
  status: LaunchStatus;
};

const toStepStatus = (
  index: number,
  activeStep: number,
  completedUntil: number,
  done: boolean
): StepStatus => {
  if (done || index <= completedUntil) {
    return 'completed';
  }

  if (index === activeStep) {
    return 'active';
  }

  return 'pending';
};

export function ProvisioningStepsLoader({
  status,
}: ProvisioningStepsLoaderProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const completedUntil = useMemo(() => {
    const rank = STATUS_RANK[status];
    let index = -1;

    for (let i = 0; i < PROVISIONING_STEPS.length; i += 1) {
      if (STATUS_RANK[PROVISIONING_STEPS[i].minStatus] <= rank) {
        index = i;
      }
    }

    return index;
  }, [status]);

  const done = status === 'running';

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    const items = listRef.current.querySelectorAll('[data-step-item]');
    const tween = gsap.fromTo(
      items,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        stagger: 0.06,
        ease: 'power2.out',
      }
    );

    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (done) {
      setActiveStep(PROVISIONING_STEPS.length - 1);
      return;
    }

    setActiveStep(current =>
      Math.max(current, Math.min(completedUntil + 1, 3))
    );
  }, [completedUntil, done]);

  useEffect(() => {
    if (done) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveStep(current => {
        const next = Math.min(current + 1, 3);
        return next === current ? 1 : next;
      });
    }, 1400);

    return () => {
      window.clearInterval(timer);
    };
  }, [done]);

  return (
    <div ref={listRef} className="flex flex-col gap-1.5">
      {PROVISIONING_STEPS.map((step, index) => {
        const state = toStepStatus(index, activeStep, completedUntil, done);
        const isCompleted = state === 'completed';
        const isActive = state === 'active';

        return (
          <div
            key={step.label}
            data-step-item
            className="flex items-center gap-3 rounded-lg px-2.5 py-2"
          >
            <span
              className={
                isCompleted || isActive
                  ? 'h-1.5 w-1.5 rounded-full bg-foreground'
                  : 'h-1.5 w-1.5 rounded-full bg-foreground/25'
              }
            />
            <span className="flex size-5 items-center justify-center">
              {isCompleted ? (
                <Check className="size-4 text-foreground" />
              ) : isActive ? (
                <Loader2 className="size-4 animate-spin text-foreground" />
              ) : (
                <Circle className="size-3.5 text-muted-foreground" />
              )}
            </span>
            <p
              className={
                isActive
                  ? 'text-sm font-medium text-foreground'
                  : isCompleted
                    ? 'text-sm text-muted-foreground'
                    : 'text-sm text-muted-foreground/70'
              }
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
