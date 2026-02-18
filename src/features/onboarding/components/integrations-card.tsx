import IconSlack from '@/components/icons/IconSlack.svg';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  MessageCircle,
  Send,
  Speech,
} from 'lucide-react';
import { useState } from 'react';

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Connect your agent to Telegram and chat with users directly.',
    icon: Send,
    active: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Bring your agent into Slack workspaces.',
    icon: IconSlack,
    active: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Reach users on WhatsApp with your agent.',
    icon: MessageCircle,
    active: false,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Deploy your agent to Discord servers.',
    icon: Speech,
    active: false,
  },
];

const TELEGRAM_STEPS = [
  {
    text: (
      <>
        Open Telegram and go to{' '}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-9 hover:underline"
        >
          @BotFather
        </a>
        .
      </>
    ),
  },
  {
    text: (
      <>
        Start a chat and type{' '}
        <code className="rounded-md bg-neutral-a3 px-1.5 py-0.5 font-mono text-xs">
          /newbot
        </code>
        .
      </>
    ),
  },
  {
    text: 'Follow the prompts to name your bot and choose a username.',
  },
  {
    text: 'BotFather will send your bot token. Copy the full value.',
  },
  {
    text: 'Paste it below and continue.',
  },
];

type IntegrationsCardProps = {
  selectedIntegration: string | null;
  onSelect: (id: string) => void;
  botToken: string;
  onBotTokenChange: (token: string) => void;
};

export function IntegrationsCard({
  selectedIntegration,
  onSelect,
  botToken,
  onBotTokenChange,
}: IntegrationsCardProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map(integration => {
          const isSelected = selectedIntegration === integration.id;
          const Icon = integration.icon;
          const isDisabled = !integration.active;

          return (
            <button
              key={integration.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onSelect(integration.id);
                }
              }}
              className={`relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                isDisabled
                  ? 'cursor-not-allowed border-transparent bg-background opacity-45'
                  : isSelected
                    ? 'cursor-pointer border-foreground bg-neutral-a2'
                    : 'cursor-pointer border-transparent bg-background hover:bg-neutral-a2'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-a3">
                  <Icon className="size-5" />
                </div>
                {isDisabled ? (
                  <Badge variant="secondary" size="sm">
                    Coming soon
                  </Badge>
                ) : isSelected ? (
                  <Badge variant="secondaryAccent" size="sm">
                    Selected
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {integration.name}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {integration.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect('openclaw')}
        className={`relative flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
          selectedIntegration === 'openclaw'
            ? 'border-foreground bg-neutral-a2'
            : 'border-transparent bg-background hover:bg-neutral-a2'
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-a3">
            <img
              src="https://mintcdn.com/clawdhub/4rYvG-uuZrMK_URE/assets/pixel-lobster.svg?fit=max&auto=format&n=4rYvG-uuZrMK_URE&q=85&s=da2032e9eac3b5d9bfe7eb96ca6a8a26"
              className="size-5"
              alt="OpenClaw"
            />
          </div>
          {selectedIntegration === 'openclaw' && (
            <Badge variant="secondaryAccent" size="sm">
              Selected
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            Use your own dashboard
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            Chat via OpenClaw&apos;s built-in dashboard. Add integrations later.
          </span>
        </div>
      </button>

      {selectedIntegration === 'telegram' && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5">
          <p className="text-sm font-medium text-foreground">Enter bot token</p>

          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowHelp(value => !value)}
              className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3"
            >
              <div className="flex items-center gap-2">
                <CircleHelp className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  How to get your bot token
                </span>
              </div>
              {showHelp ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {showHelp && (
              <div className="px-3.5 pb-3.5">
                <ol className="list-inside list-decimal space-y-2.5">
                  {TELEGRAM_STEPS.map((step, index) => (
                    <li
                      key={index}
                      className="text-sm leading-relaxed text-muted-foreground marker:font-medium marker:text-foreground"
                    >
                      {step.text}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <Input
            size="xl"
            type="password"
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            value={botToken}
            onChange={event => onBotTokenChange(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
