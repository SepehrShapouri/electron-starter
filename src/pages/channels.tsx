import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type ChannelCardStatus,
  connectTelegramChannel,
  disconnectTelegramChannel,
  getGatewayChannelsStatus,
} from '@/lib/gateway-channels';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Speech,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { sileo } from 'sileo';

const TELEGRAM_STEPS = [
  'Open Telegram and go to @BotFather.',
  'Start a chat and run /newbot.',
  'Follow prompts to set bot name and username.',
  'Copy the bot token BotFather sends you.',
  'Paste it below and click Connect.',
];

type ChannelVisual = {
  icon: ComponentType<{ className?: string }>;
};

type StaticChannel = {
  id: string;
  label: string;
  description: string;
};

const STATIC_CHANNELS: StaticChannel[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Connect your Telegram bot and start receiving DMs.',
  },
];

const CHANNEL_VISUALS: Record<string, ChannelVisual> = {
  telegram: { icon: Send },
  whatsapp: { icon: MessageCircle },
  discord: { icon: Speech },
};

const toConnectionState = (channel: ChannelCardStatus) => {
  if (channel.connected) {
    return {
      label: 'Connected',
      variant: 'secondarySuccess' as const,
    };
  }

  if (channel.configured || channel.running) {
    return {
      label: 'Connecting',
      variant: 'secondaryWarning' as const,
    };
  }

  return {
    label: 'Not connected',
    variant: 'secondary' as const,
  };
};

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  const { provisionQuery, gatewayConfig } = useGatewayProvision();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState('');

  const statusQuery = useQuery({
    queryKey: ['channels-status', gatewayConfig?.gatewayUrl],
    queryFn: () => getGatewayChannelsStatus(gatewayConfig!, { probe: true }),
    enabled: Boolean(gatewayConfig),
    refetchInterval: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: (params: { token: string }) =>
      connectTelegramChannel(gatewayConfig!, params.token),
    onSuccess: async result => {
      setTelegramToken('');
      sileo.success({
        title: 'Telegram configured',
        description: 'Your bot token was saved successfully.',
      });
      if (result.restartScheduled) {
        sileo.info({
          title: 'Gateway restarting',
          description: 'Reconnecting to apply Telegram changes...',
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ['channels-status', gatewayConfig?.gatewayUrl],
      });
      await queryClient.refetchQueries({
        queryKey: ['channels-status', gatewayConfig?.gatewayUrl],
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectTelegramChannel(gatewayConfig!),
    onSuccess: async result => {
      sileo.success({
        title: 'Telegram disconnected',
        description: 'Telegram was removed from your channel settings.',
      });
      if (result.restartScheduled) {
        sileo.info({
          title: 'Gateway restarting',
          description: 'Reconnecting to apply Telegram changes...',
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ['channels-status', gatewayConfig?.gatewayUrl],
      });
      await queryClient.refetchQueries({
        queryKey: ['channels-status', gatewayConfig?.gatewayUrl],
      });
    },
  });

  const liveChannels = useMemo(
    () => statusQuery.data?.channels ?? [],
    [statusQuery.data]
  );
  const channels = useMemo<ChannelCardStatus[]>(() => {
    const statusById = new Map(liveChannels.map(channel => [channel.id, channel]));
    return STATIC_CHANNELS.map(staticChannel => {
      const live = statusById.get(staticChannel.id);
      return {
        id: staticChannel.id,
        label: staticChannel.label,
        description: staticChannel.description,
        configured: live?.configured ?? false,
        connected: live?.connected ?? false,
        running: live?.running ?? false,
        accountId: live?.accountId ?? 'default',
        mode: live?.mode,
        lastError: live?.lastError,
        tokenSource: live?.tokenSource,
        botUsername: live?.botUsername,
        botId: live?.botId,
      };
    });
  }, [liveChannels]);
  const selectedChannel = useMemo(
    () => channels.find(channel => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const openDetails = (channelId: string) => {
    setSelectedChannelId(channelId);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedChannelId(null);
      setTelegramToken('');
      connectMutation.reset();
      disconnectMutation.reset();
    }
  };

  if (!gatewayConfig && provisionQuery.isLoading) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (!gatewayConfig && provisionQuery.isError) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <ErrorState
          message={
            provisionQuery.error instanceof Error
              ? provisionQuery.error.message
              : 'Unable to load gateway access.'
          }
          onRetry={() => provisionQuery.refetch()}
          isRetrying={provisionQuery.isFetching}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect messaging channels for your agent.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => statusQuery.refetch()}
          disabled={statusQuery.isFetching}
        >
          {statusQuery.isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </header>

      {statusQuery.isError ? (
        <div className="mb-4">
          <ErrorState
            message={
              statusQuery.error instanceof Error
                ? statusQuery.error.message
                : 'Unable to refresh channel status.'
            }
            onRetry={() => statusQuery.refetch()}
            isRetrying={statusQuery.isFetching}
          />
        </div>
      ) : null}

      <section
        className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3"
        aria-label="Channels list"
      >
        {channels.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onOpenDetails={() => openDetails(channel.id)}
          />
        ))}
      </section>

      <ChannelDetailsSheet
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        channel={selectedChannel}
        telegramToken={telegramToken}
        onTelegramTokenChange={setTelegramToken}
        isConnecting={connectMutation.isPending}
        onConnectTelegram={() => {
          connectMutation.mutate({ token: telegramToken });
        }}
        onDisconnectTelegram={() => {
          disconnectMutation.mutate();
        }}
        connectError={
          connectMutation.isError
            ? connectMutation.error instanceof Error
              ? connectMutation.error.message
              : 'Failed to connect Telegram.'
            : null
        }
        disconnectError={
          disconnectMutation.isError
            ? disconnectMutation.error instanceof Error
              ? disconnectMutation.error.message
              : 'Failed to disconnect Telegram.'
            : null
        }
        isDisconnecting={disconnectMutation.isPending}
      />
    </div>
  );
}

function ChannelCard({
  channel,
  onOpenDetails,
}: {
  channel: ChannelCardStatus;
  onOpenDetails: () => void;
}) {
  const visual = CHANNEL_VISUALS[channel.id];
  const Icon = visual?.icon ?? MessageCircle;
  const state = toConnectionState(channel);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetails}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails();
        }
      }}
      className="cursor-pointer rounded-xl p-4 transition-colors hover:bg-neutral-a3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Open details for ${channel.label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <h2 className="truncate text-sm font-semibold">{channel.label}</h2>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {channel.description}
          </p>
        </div>
        <Badge size="sm" variant={state.variant} className="shrink-0">
          {state.label}
        </Badge>
      </div>
    </div>
  );
}

function ChannelDetailsSheet({
  open,
  onOpenChange,
  channel,
  telegramToken,
  onTelegramTokenChange,
  isConnecting,
  onConnectTelegram,
  onDisconnectTelegram,
  connectError,
  disconnectError,
  isDisconnecting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelCardStatus | null;
  telegramToken: string;
  onTelegramTokenChange: (value: string) => void;
  isConnecting: boolean;
  onConnectTelegram: () => void;
  onDisconnectTelegram: () => void;
  connectError: string | null;
  disconnectError: string | null;
  isDisconnecting: boolean;
}) {
  const state = channel ? toConnectionState(channel) : null;
  const isTelegram = channel?.id === 'telegram';
  const showTelegramSetup = Boolean(isTelegram && channel && !channel.connected);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle>{channel?.label ?? 'Channel details'}</SheetTitle>
          <SheetDescription>
            {channel
              ? channel.description
              : 'Choose a channel card to view details.'}
          </SheetDescription>
        </SheetHeader>

        {channel ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <div className="space-y-3 border-b py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Connection</span>
                {state ? (
                  <Badge size="sm" variant={state.variant}>
                    {state.label}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Configured</span>
                <Badge
                  size="sm"
                  variant={channel.configured ? 'secondarySuccess' : 'secondary'}
                >
                  {channel.configured ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
              {isTelegram ? (
                <>
                  {showTelegramSetup ? (
                    <>
                      <div>
                        <p className="mb-2 text-sm font-medium">How to get your bot token</p>
                        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
                          {TELEGRAM_STEPS.map(step => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium">Telegram bot token</p>
                        <Input
                          size="xl"
                          type="password"
                          placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                          value={telegramToken}
                          onChange={event => onTelegramTokenChange(event.target.value)}
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={onConnectTelegram}
                        disabled={isConnecting || !telegramToken.trim()}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect Telegram'
                        )}
                      </Button>
                    </>
                  ) : (
                    <Card className="gap-2 py-5 shadow-none">
                      <CardHeader className="px-4">
                        <CardTitle className="text-sm">Bot connection details</CardTitle>
                        <CardDescription>
                          Telegram is connected and accepting messages.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4">
                        <DetailRow
                          label="Bot username"
                          value={channel.botUsername ? `@${channel.botUsername}` : 'Unknown'}
                        />
                        <Button
                          type="button"
                          variant="destructiveSecondary"
                          onClick={onDisconnectTelegram}
                          disabled={isDisconnecting}
                        >
                          {isDisconnecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Disconnecting...
                            </>
                          ) : (
                            'Disconnect Telegram'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {channel.lastError && (channel.connected || channel.running) ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Latest channel error</AlertTitle>
                      <AlertDescription>{channel.lastError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {connectError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Connect failed</AlertTitle>
                      <AlertDescription>{connectError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {disconnectError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Disconnect failed</AlertTitle>
                      <AlertDescription>{disconnectError}</AlertDescription>
                    </Alert>
                  ) : null}
                </>
              ) : (
                <Card className="gap-2 py-5 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-sm">Coming soon</CardTitle>
                    <CardDescription>
                      Setup UI for this channel is not available yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Select a channel from the list.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LoadingState() {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3"
      aria-label="Loading channels"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle className="text-base">Could not load channels</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrying
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
