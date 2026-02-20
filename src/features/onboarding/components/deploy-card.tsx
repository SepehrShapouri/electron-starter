import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Claude 4.5 Sonnet',
  openai: 'GPT-5',
  gemini: 'Gemini 3 Flash Preview',
};

const INTEGRATION_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  discord: 'Discord',
};

type DeployCardProps = {
  provider: string;
  keySource: 'credits' | 'byok';
  integration?: string | null;
  isSubscribing: boolean;
  isLaunching: boolean;
  isLoading: boolean;
  isSubscribed: boolean;
  canLaunchAfterSubscribe?: boolean;
  onSubscribe: () => void;
};

export function DeployCard({
  provider,
  keySource,
  integration,
  isSubscribing,
  isLaunching,
  isLoading,
  isSubscribed,
  canLaunchAfterSubscribe = false,
  onSubscribe,
}: DeployCardProps) {
  const isBusy = isSubscribing || isLaunching || isLoading;
  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const keySourceLabel =
    keySource === 'byok' ? 'Own API key' : 'Clawpilot credits';
  const integrationLabel = integration
    ? (INTEGRATION_LABELS[integration] ?? integration)
    : null;

  const summaryItems = [
    { label: 'Model', value: providerLabel },
    { label: 'API keys', value: keySourceLabel },
    ...(integrationLabel
      ? [{ label: 'Integration', value: integrationLabel }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium tracking-tight text-foreground">
          Setup summary
        </p>
        <div className="flex flex-col divide-y divide-border/70">
          {summaryItems.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {!!item.value && (
                  <Check className="size-3.5 text-foreground/70" />
                )}
                {item.value ?? '--'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-3xl font-light tracking-tight text-foreground">
            $25
            <span className="text-sm font-normal text-muted-foreground">
              {' '}
              / month
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Includes <span className="font-medium text-foreground">$10</span> in
            AI credits
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>- Secure hosted runtime</p>
          <p>- One-click deployment flow</p>
          <p>- Add more integrations anytime</p>
        </div>

        <Button
          className="h-11 w-full"
          variant={
            isSubscribed && !canLaunchAfterSubscribe ? 'secondary' : 'default'
          }
          disabled={isSubscribed ? !canLaunchAfterSubscribe || isBusy : isBusy}
          size="lg"
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

        {!isSubscribed && (
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll get your credentials once provisioning completes.
          </p>
        )}

        {isSubscribed && canLaunchAfterSubscribe && (
          <p className="text-center text-xs text-muted-foreground">
            Subscription is active. Finish by launching your agent.
          </p>
        )}
      </div>
    </div>
  );
}
