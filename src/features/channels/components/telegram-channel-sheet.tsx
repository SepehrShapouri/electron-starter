import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ChannelCardStatus, GatewayConnectionConfig } from '@/lib/gateway-channels';
import {
  connectTelegramChannel,
  disconnectTelegramChannel,
} from '@/lib/gateway-channels';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { sileo } from 'sileo';
import { TELEGRAM_STEPS } from '../constants';
import { ChannelDetailRow } from './channel-detail-row';

export function TelegramChannelSheet({
  channel,
  gatewayConfig,
}: {
  channel: ChannelCardStatus;
  gatewayConfig: GatewayConnectionConfig;
}) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');

  const invalidateStatus = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['channels-status', gatewayConfig.gatewayUrl],
    });
    await queryClient.refetchQueries({
      queryKey: ['channels-status', gatewayConfig.gatewayUrl],
    });
  };

  const connectMutation = useMutation({
    mutationFn: () => connectTelegramChannel(gatewayConfig, token),
    onSuccess: async () => {
      setToken('');
      sileo.success({
        title: 'Telegram configured',
        description: 'Your bot token was saved successfully.',
      });
      await invalidateStatus();
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectTelegramChannel(gatewayConfig),
    onSuccess: async () => {
      sileo.success({
        title: 'Telegram disconnected',
        description: 'Telegram was removed from your channel settings.',
      });
      await invalidateStatus();
    },
  });

  const showSetup = !channel.connected;

  return (
    <>
      {showSetup ? (
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
              value={token}
              onChange={event => setToken(event.target.value)}
            />
          </div>

          <Button
            type="button"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || !token.trim()}
          >
            {connectMutation.isPending ? (
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
            <CardDescription>Telegram is connected and accepting messages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <ChannelDetailRow
              label="Bot username"
              value={channel.botUsername ? `@${channel.botUsername}` : 'Unknown'}
            />
            <Button
              type="button"
              variant="destructiveSecondary"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
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

      {connectMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connect failed</AlertTitle>
          <AlertDescription>
            {connectMutation.error instanceof Error
              ? connectMutation.error.message
              : 'Failed to connect Telegram.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {disconnectMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Disconnect failed</AlertTitle>
          <AlertDescription>
            {disconnectMutation.error instanceof Error
              ? disconnectMutation.error.message
              : 'Failed to disconnect Telegram.'}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
