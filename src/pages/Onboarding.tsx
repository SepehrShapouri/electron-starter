import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { authApi, OnboardingProfile } from '../lib/auth-api';

const integrationOptions = [
  { id: 'email', label: 'Email' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'notes', label: 'Notes' },
  { id: 'browser', label: 'Browser' },
];

const stepOrder = ['integrations', 'plan'] as const;
const totalSteps = stepOrder.length;

export default function Onboarding() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: authApi.getOnboarding,
  });

  const initial = data ?? {};
  const initialStepIndex = Math.max(
    stepOrder.indexOf((initial.onboardingStep ?? 'integrations') as any),
    0
  );
  const [step, setStep] = useState(initialStepIndex);
  const [integrations, setIntegrations] = useState<string[]>(
    integrationOptions.map((item) => item.id)
  );
  const [plan, setPlan] = useState('premium');

  const mutation = useMutation({
    mutationFn: (payload: Partial<OnboardingProfile>) =>
      authApi.saveOnboarding(payload),
  });

  const isLastStep = step >= totalSteps - 1;

  const progressLabel = useMemo(() => {
    return `Step ${step + 1} of ${totalSteps}`;
  }, [step]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const saveAndNext = async () => {
    const payload: Partial<OnboardingProfile> = {
      onboardingStep: stepOrder[Math.min(step + 1, totalSteps - 1)],
      completed: isLastStep,
    };

    await mutation.mutateAsync(payload);

    if (isLastStep) {
      navigate({ to: '/' });
      return;
    }

    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md border-border/60 bg-card shadow-none">
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Clawpilot
            </div>
            <h1 className="text-2xl font-semibold">Let’s set up your assistant</h1>
            <p className="text-sm text-muted-foreground">{progressLabel}</p>
          </div>

          <Separator />

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Connect your tools</Label>
                <p className="text-xs text-muted-foreground">
                  These are on by default. It takes about 5 minutes and you can
                  always do it later.
                </p>
              </div>
              <div className="grid gap-2">
                {integrationOptions.map((option) => {
                  const checked = integrations.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
                      <span>{option.label}</span>
                      <Switch
                        checked={checked}
                        onCheckedChange={(value) => {
                          setIntegrations((prev) =>
                            value
                              ? [...prev, option.id]
                              : prev.filter((item) => item !== option.id)
                          );
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label>Choose your plan</Label>
              <RadioGroup value={plan} onValueChange={setPlan} className="space-y-2">
                <label className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
                  <RadioGroupItem value="premium" />
                  <span>Clawpilot Premium</span>
                </label>
                <label className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
                  <RadioGroupItem value="self" />
                  <span className="text-muted-foreground">I have my own API key</span>
                </label>
              </RadioGroup>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={goBack} disabled={step === 0}>
              Back
            </Button>
            <Button onClick={saveAndNext} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isLastStep ? 'Finish' : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
