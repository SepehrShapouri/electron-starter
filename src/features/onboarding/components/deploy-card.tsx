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
  integration: string | null;
  isSubscribing: boolean;
  isLoading: boolean;
  isSubscribed: boolean;
  onSubscribe: () => void;
};

export function DeployCard({
  provider,
  keySource,
  integration,
  isSubscribing,
  isLoading,
  isSubscribed,
  onSubscribe,
}: DeployCardProps) {
  const isBusy = isSubscribing || isLoading;
  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const keySourceLabel =
    keySource === 'byok' ? 'Own API key' : 'Clawpilot credits';
  const integrationLabel = integration
    ? INTEGRATION_LABELS[integration] ?? integration
    : null;

  const summaryItems = [
    { label: 'Model', value: providerLabel },
    { label: 'API keys', value: keySourceLabel },
    { label: 'Integration', value: integrationLabel },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-background p-5">
        <p className="mb-4 text-sm font-semibold text-foreground">
          Setup summary
        </p>
        <div className="flex flex-col gap-3">
          {summaryItems.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {!!item.value && <Check className="size-3.5 text-green-9" />}
                {item.value ?? '--'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-semibold text-foreground">
            $25
            <span className="text-sm font-normal text-muted-foreground">
              {' '}
              / month
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Includes <span className="font-medium text-foreground">$10</span>{' '}
            in AI credits
          </p>
        </div>

        <Button
          className="w-full"
          variant={isSubscribed ? 'secondary' : 'default'}
          disabled={isSubscribed || isBusy}
          size="xl"
          onClick={onSubscribe}
        >
          {isSubscribed
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
      </div>
    </div>
  );
}
