import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Clawpilot from '@/components/icons/Clawpilot.svg';
import { authApi } from '@/lib/auth-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Info, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DeployCard } from '@/features/onboarding/components/deploy-card';
import { IntegrationsCard } from '@/features/onboarding/components/integrations-card';
import { ModelSelectCard } from '@/features/onboarding/components/model-select-card';
import gsap from 'gsap';

type KeySource = 'credits' | 'byok';

type OnboardingSecrets = {
  model: string;
  apiKey?: string;
  keySource: KeySource;
  telegramBotKey?: string;
};

type OnboardingPageProps = {
  checkoutStatus?: 'success' | 'cancel';
  encryptedData?: string;
};

const PENDING_ONBOARDING_PAYLOAD_KEY = 'clawpilot:pending_onboarding_payload';

const isPaidStatus = (status: string | null) =>
  status === 'active' || status === 'trialing';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

async function encryptPayload(
  base64urlKey: string,
  data: OnboardingSecrets
): Promise<string> {
  const raw = Uint8Array.from(
    atob(base64urlKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
    'encrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  const combined = new Uint8Array(
    iv.length + new Uint8Array(ciphertext).length
  );
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const getPendingPayload = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(PENDING_ONBOARDING_PAYLOAD_KEY);
};

const setPendingPayload = (value: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(PENDING_ONBOARDING_PAYLOAD_KEY);
    return;
  }

  window.localStorage.setItem(PENDING_ONBOARDING_PAYLOAD_KEY, value);
};

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
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    'telegram'
  );
  const [botToken, setBotToken] = useState('');
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
      await authApi.provisionFromOnboarding({ encryptedPayload: payload });
      await authApi.saveOnboarding({ completed: true });
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      await queryClient.invalidateQueries({ queryKey: ['gateway-provision'] });
      setPendingPayload(null);
      navigate({ to: '/app' });
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
      return;
    }

    if (step === 2) {
      if (selectedIntegration === 'telegram' && !botToken.trim()) {
        setErrorMessage('Bot token is required to continue');
        return;
      }
      setErrorMessage('');
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step <= 1) {
      return;
    }

    setErrorMessage('');
    setStep(step - 1);
  };

  const handleSkip = () => {
    if (step !== 2) {
      return;
    }

    setErrorMessage('');
    setSelectedIntegration(null);
    setStep(3);
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

      if (selectedIntegration === 'telegram' && !botToken.trim()) {
        setErrorMessage('Bot token is required to continue');
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
        telegramBotKey:
          selectedIntegration === 'telegram' ? botToken.trim() : undefined,
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
        className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 px-6 py-20"
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-2xl font-light tracking-tight text-foreground">
          Launching your agent...
        </p>
        <p className="text-sm text-muted-foreground">
          Payment received. Setting up your instance now.
        </p>
      </div>
    );
  }

  if (provisionState === 'failed') {
    return (
      <div
        ref={containerRef}
        className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-20"
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
    <div className="h-svh overflow-y-auto">
      <div
        ref={containerRef}
        className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-6"
      >
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOutMutation.mutate()}
            disabled={signOutMutation.isPending}
          >
            {signOutMutation.isPending ? 'Signing out...' : 'Log out'}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Clawpilot className="h-9 w-9 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-light tracking-tight text-foreground sm:text-3xl">
              {step === 1
                ? 'Pick a model'
                : step === 2
                  ? 'Connect an integration'
                  : 'Launch your agent'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? 'This powers your agent responses. You can switch it later.'
                : step === 2
                  ? 'Choose where your agent will live. You can add more later.'
                  : 'Confirm your setup and subscribe to get your agent live.'}
            </p>
          </div>
        </div>

        {checkoutStatus === 'cancel' && (
          <Alert variant="secondaryWarning" className="mb-4">
            <Info />
            <AlertTitle>Checkout canceled</AlertTitle>
            <AlertDescription>
              No worries. Your onboarding settings are still here.
            </AlertDescription>
          </Alert>
        )}

        <div ref={stepContentRef}>
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <ModelSelectCard
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
              />

              <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background-2/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-base font-medium text-foreground">
                      Use your own API key
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bring your own provider key for unlimited usage
                    </p>
                  </div>
                  <Switch
                    checked={isByok}
                    onCheckedChange={checked => {
                      setKeySource(checked ? 'byok' : 'credits');
                    }}
                  />
                </div>

                {isByok && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {keyInfo.label}
                    </p>
                    <Input
                      size="xl"
                      type="password"
                      placeholder={keyInfo.placeholder}
                      value={apiKey}
                      onChange={event => setApiKey(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your key at{' '}
                      <a
                        href={keyInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/80 hover:text-foreground hover:underline"
                      >
                        {keyInfo.urlLabel}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <IntegrationsCard
              selectedIntegration={selectedIntegration}
              onSelect={setSelectedIntegration}
              botToken={botToken}
              onBotTokenChange={setBotToken}
            />
          )}

          {step === 3 && (
            <DeployCard
              provider={selectedModel}
              keySource={keySource}
              integration={
                selectedIntegration === 'openclaw' ? null : selectedIntegration
              }
              isSubscribing={subscribeMutation.isPending}
              isLaunching={false}
              isLoading={billingQuery.isLoading}
              isSubscribed={isSubscribed}
              canLaunchAfterSubscribe={isSubscribed}
              onSubscribe={handleSubscribe}
            />
          )}
        </div>

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
            {(step === 1 || step === 2) && (
              <div className="flex items-center gap-2">
                {step === 2 && (
                  <Button variant="ghost" size="lg" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
                <Button size="lg" onClick={handleContinue}>
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
