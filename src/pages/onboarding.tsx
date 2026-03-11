import { BarsSpinner } from '@/components/bars-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DeployCard } from '@/features/onboarding/components/deploy-card';
import { ModelSelectCard } from '@/features/onboarding/components/model-select-card';
import {
  encryptPayload,
  getErrorMessage,
  getPendingPayload,
  isPaidStatus,
  setPendingPayload,
  type KeySource,
} from '@/features/onboarding/lib/utils';
import { authApi } from '@/lib/auth-api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import gsap from 'gsap';
import { Info, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type OnboardingPageProps = {
  checkoutStatus?: 'success' | 'cancel';
  encryptedData?: string;
};

const ONBOARDING_LAUNCH_MOCK_ENABLED = false;

export default function OnboardingPage({
  checkoutStatus,
  encryptedData,
}: OnboardingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState('anthropic');
  const [keySource, setKeySource] = useState<KeySource>('credits');
  const [apiKey, setApiKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [provisionState, setProvisionState] = useState<
    'idle' | 'launching' | 'failed'
  >('idle');
  const provisioningStarted = useRef(false);

  const billingQuery = useQuery({
    queryKey: ['billing-status'],
    queryFn: authApi.getBillingStatus,
  });

  const isSubscribed = Boolean(
    billingQuery.data?.isActive ||
    isPaidStatus(billingQuery.data?.status ?? null)
  );

  const subscribeMutation = useMutation({
    mutationFn: authApi.createOnboardingCheckoutSession,
    onMutate: () => setErrorMessage(''),
    onSuccess: async data => {
      if (window.electronAPI) {
        await window.electronAPI.openExternalUrl(data.url);
        return;
      }

      window.location.href = data.url;
    },
    onError: error => setErrorMessage(getErrorMessage(error)),
  });

  const signOutMutation = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: async () => {
      setPendingPayload(null);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate({ to: '/auth/welcome' });
    },
    onError: error => setErrorMessage(getErrorMessage(error)),
  });

  const runProvision = async (payload: string) => {
    setProvisionState('launching');
    setErrorMessage('');

    try {
      if (ONBOARDING_LAUNCH_MOCK_ENABLED) {
        await new Promise(resolve => {
          window.setTimeout(resolve, 1200);
        });
      } else {
        await authApi.provisionFromOnboarding({
          encryptedPayload: payload,
        });
      }

      await authApi.saveOnboarding({ completed: true });
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      await queryClient.invalidateQueries({ queryKey: ['gateway-provision'] });
      setPendingPayload(null);
      navigate({ to: '/launching' });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setProvisionState('failed');
    }
  };

  useEffect(() => {
    const tween = gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );

    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (!stepContentRef.current) {
      return;
    }

    const tween = gsap.fromTo(
      stepContentRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );

    return () => {
      tween.kill();
    };
  }, [step]);

  useEffect(() => {
    if (checkoutStatus !== 'success' && !encryptedData) {
      return;
    }

    if (!isSubscribed || provisioningStarted.current) {
      return;
    }

    const payload = encryptedData ?? getPendingPayload();
    if (!payload) {
      setErrorMessage(
        'Could not recover your onboarding payload. Please retry checkout.'
      );
      return;
    }

    provisioningStarted.current = true;
    void runProvision(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus, encryptedData, isSubscribed]);

  const isByok = keySource === 'byok';

  const providerKeyInfo: Record<
    string,
    { label: string; placeholder: string; url: string; urlLabel: string }
  > = {
    anthropic: {
      label: 'Anthropic API Key',
      placeholder: 'sk-ant-...',
      url: 'https://console.anthropic.com/settings/keys',
      urlLabel: 'console.anthropic.com',
    },
    openai: {
      label: 'OpenAI API Key',
      placeholder: 'sk-...',
      url: 'https://platform.openai.com/api-keys',
      urlLabel: 'platform.openai.com',
    },
    gemini: {
      label: 'Google AI API Key',
      placeholder: 'AIza...',
      url: 'https://aistudio.google.com/apikey',
      urlLabel: 'aistudio.google.com',
    },
  };

  const keyInfo = providerKeyInfo[selectedModel] ?? providerKeyInfo.anthropic;

  const handleContinue = () => {
    if (step === 1) {
      if (isByok && !apiKey.trim()) {
        setErrorMessage('API key is required');
        return;
      }
      setErrorMessage('');
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step <= 1) {
      return;
    }

    setErrorMessage('');
    setStep(step - 1);
  };

  const handleSubscribe = async () => {
    if (subscribeMutation.isPending) {
      return;
    }

    try {
      if (isByok && !apiKey.trim()) {
        setErrorMessage('API key is required');
        return;
      }

      const existingPayload = encryptedData ?? getPendingPayload();

      if (isSubscribed) {
        const payload = existingPayload;
        if (payload) {
          provisioningStarted.current = false;
          await runProvision(payload);
          return;
        }
      }

      const response = await authApi.getOnboardingEncryptionKey();
      const encryptedPayload = await encryptPayload(response.key, {
        model: selectedModel,
        apiKey: isByok ? apiKey : undefined,
        keySource,
      });

      if (isSubscribed) {
        setPendingPayload(encryptedPayload);
        provisioningStarted.current = false;
        await runProvision(encryptedPayload);
        return;
      }

      setPendingPayload(encryptedPayload);
      subscribeMutation.mutate({
        encryptedPayload,
        useElectronRedirect: Boolean(window.electronAPI),
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  if (provisionState === 'launching') {
    return (
      <div
        ref={containerRef}
        className="mx-auto flex w-full max-w-lg flex-col h-full items-center justify-center gap-5 px-6 py-20"
      >
        <BarsSpinner size={32} />
        <p className="text-2xl font-light tracking-tight text-foreground">
          Waking up your lobster...
        </p>
      </div>
    );
  }

  if (provisionState === 'failed') {
    return (
      <div
        ref={containerRef}
        className="mx-auto h-full flex w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-20"
      >
        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl font-light tracking-tight text-foreground">
            Something went wrong
          </p>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Your payment was successful, but we had trouble launching your
            agent.
          </p>
        </div>

        {errorMessage && (
          <Alert variant="secondaryDestructive" className="max-w-md">
            <Info />
            <AlertTitle>Error details</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Button
          size="lg"
          onClick={() => {
            const payload = encryptedData ?? getPendingPayload();
            if (!payload) {
              setErrorMessage(
                'Missing onboarding payload. Start checkout again.'
              );
              return;
            }

            provisioningStarted.current = false;
            void runProvision(payload);
          }}
        >
          Retry launch
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full h-full max-h-[568px] p-8 rounded-3xl bg-floated-blur backdrop-blur-[100px] flex gap-16'
      )}
    >
      <div className="flex w-full flex-col justify-between h-full">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-muted-foreground">
            {step == 1 ? 'Pick a model' : 'Launch'}
          </p>
          <p className="text-3xl font-medium text-foreground">
            {step == 1
              ? 'The power of your personal agent responses.'
              : 'Confirm your setup, subscribe and launch your personal AI agent'}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {checkoutStatus === 'cancel' && (
            <Alert variant="secondaryWarning" className="mb-4">
              <Info />
              <AlertTitle>Checkout canceled</AlertTitle>
              <AlertDescription>
                No worries. Your onboarding settings are still here.
              </AlertDescription>
            </Alert>
          )}
          {errorMessage && (
            <Alert variant="secondaryDestructive" className="mt-4">
              <Info />
              <AlertTitle>Oops!</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <Label
            className="text-sm font-medium text-foreground cursor-pointer hover:underline transition-all"
            onClick={() => signOutMutation.mutate()}
          >
            Logout
          </Label>
        </div>
      </div>
      <Separator orientation="vertical" />
      <div
        className="flex w-full flex-col justify-between h-full"
        ref={stepContentRef}
      >
        {step === 1 && (
          <>
            <div className="flex flex-col gap-8 w-full">
              <ModelSelectCard
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
              />

              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <Checkbox
                    checked={isByok}
                    id="isByok"
                    onCheckedChange={checked => {
                      setKeySource(checked ? 'byok' : 'credits');
                    }}
                    className="size-6 rounded-[6.8px] cursor-pointer active:scale-99"
                  />
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="isByok"
                      className="text-base leading-[14px] font-medium text-foreground"
                    >
                      Use your own API key
                    </Label>
                    <Label
                      htmlFor="isByok"
                      className="text-sm text-muted-foreground leading-[20px]"
                    >
                      Bring your own provider key for unlimited usage
                    </Label>
                  </div>
                </div>

                {isByok && (
                  <Input
                    size="xl"
                    variant="soft"
                    type="password"
                    placeholder={keyInfo.placeholder}
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                  />
                )}
              </div>
            </div>
            <Button size="xl" onClick={handleContinue}>
              Continue
            </Button>
          </>
        )}

        {step === 2 && (
          <DeployCard
            onBack={handleBack}
            provider={selectedModel}
            keySource={keySource}
            isSubscribing={subscribeMutation.isPending}
            isLaunching={false}
            isLoading={billingQuery.isLoading}
            isSubscribed={isSubscribed}
            canLaunchAfterSubscribe={isSubscribed}
            onSubscribe={handleSubscribe}
          />
        )}
      </div>

      {/* {checkoutStatus === 'cancel' && (
        <Alert variant="secondaryWarning" className="mb-4">
          <Info />
          <AlertTitle>Checkout canceled</AlertTitle>
          <AlertDescription>
            No worries. Your onboarding settings are still here.
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="secondaryDestructive" className="mt-4">
          <Info />
          <AlertTitle>Oops!</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 flex items-center justify-between">
        <div>
          {step > 1 && (
            <Button variant="outline" size="lg" onClick={handleBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}
        </div>
        <div>
          {step === 1 && (
            <div className="flex items-center gap-2">
              <Button size="lg" onClick={handleContinue}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
}
