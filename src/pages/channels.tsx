import { Button } from '@/components/ui/button';
import { ChannelCard } from '@/features/channels/components/channel-card';
import { ChannelDetailsSheet } from '@/features/channels/components/channel-details-sheet';
import {
  ChannelErrorState,
  ChannelLoadingState,
} from '@/features/channels/components/channel-states';
import { STATIC_CHANNELS } from '@/features/channels/constants';
import {
  type ChannelCardStatus,
  getGatewayChannelsStatus,
} from '@/lib/gateway-channels';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function ChannelsPage() {
  const { provisionQuery, gatewayConfig } = useGatewayProvision();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['channels-status', gatewayConfig?.gatewayUrl],
    queryFn: () => getGatewayChannelsStatus(gatewayConfig!, { probe: true }),
    enabled: Boolean(gatewayConfig),
    refetchInterval: 5000,
  });

  const liveChannels = useMemo(() => statusQuery.data?.channels ?? [], [statusQuery.data]);
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
        selfE164: live?.selfE164,
        selfJid: live?.selfJid,
      };
    });
  }, [liveChannels]);

  const selectedChannel = useMemo(
    () => channels.find(channel => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedChannelId(null);
    }
  };

  if (!gatewayConfig && provisionQuery.isLoading) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <ChannelLoadingState />
      </div>
    );
  }

  if (!gatewayConfig && provisionQuery.isError) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <ChannelErrorState
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
          <ChannelErrorState
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

      <section className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3" aria-label="Channels list">
        {channels.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onOpenDetails={() => {
              setSelectedChannelId(channel.id);
              setDetailsOpen(true);
            }}
          />
        ))}
      </section>

      {gatewayConfig ? (
        <ChannelDetailsSheet
          open={detailsOpen}
          onOpenChange={handleDetailsOpenChange}
          channel={selectedChannel}
          gatewayConfig={gatewayConfig}
        />
      ) : null}
    </div>
  );
}
