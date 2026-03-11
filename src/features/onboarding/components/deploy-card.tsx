import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Claude 4.5 Sonnet',
  openai: 'GPT-5',
  gemini: 'Gemini 3 Flash Preview',
};

type DeployCardProps = {
  provider: string;
  keySource: 'credits' | 'byok';
  isSubscribing: boolean;
  isLaunching: boolean;
  isLoading: boolean;
  isSubscribed: boolean;
  canLaunchAfterSubscribe?: boolean;
  onSubscribe: () => void;
  onBack: () => void;
};

export function DeployCard({
  provider,
  keySource,
  isSubscribing,
  isLaunching,
  isLoading,
  isSubscribed,
  canLaunchAfterSubscribe = false,
  onSubscribe,
  onBack,
}: DeployCardProps) {
  const isBusy = isSubscribing || isLaunching || isLoading;
  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const keySourceLabel =
    keySource === 'byok' ? 'Own API key' : 'Clawpilot credits';

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col gap-6">
        <p className="text-sm font-medium text-muted-foreground">
          Confirm your setup
        </p>
        <div className="p-4 flex flex-col gap-4 rounded-lg bg-floated-blur w-full">
          <div className="flex w-full justify-between">
            <p className="text-base">Model</p>
            <p className="text-base font-medium">{providerLabel}</p>
          </div>
          <Separator />
          <div className="flex w-full justify-between">
            <p className="text-base">API Keys</p>
            <p className="text-base font-medium">{keySourceLabel}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <Separator />
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-medium">$25 / month</p>
          {keySource == 'credits' && (
            <p className="text-sm text-muted-foreground">
              Includes $10 in AI credits
            </p>
          )}
        </div>
        <div className="flex gap-2 w-full">
          <Button onClick={onBack} variant="secondary" size="iconXl">
            <ArrowLeft />
          </Button>
          <Button
            variant={
              isSubscribed && !canLaunchAfterSubscribe ? 'secondary' : 'default'
            }
            disabled={
              isSubscribed ? !canLaunchAfterSubscribe || isBusy : isBusy
            }
            size="xl"
            className="flex-1"
            onClick={onSubscribe}
          >
            {isLaunching
              ? 'Launching...'
              : isSubscribed && canLaunchAfterSubscribe
                ? 'Launch agent'
                : isSubscribed
                  ? 'Subscribed!'
                  : isSubscribing
                    ? 'Redirecting to checkout...'
                    : isLoading
                      ? 'Loading...'
                      : 'Subscribe & Launch'}
          </Button>
        </div>
        {isSubscribed && canLaunchAfterSubscribe && (
          <p className="text-center text-xs text-muted-foreground">
            Subscription is active. Finish by launching your agent.
          </p>
        )}
      </div>
    </div>
  );
}
