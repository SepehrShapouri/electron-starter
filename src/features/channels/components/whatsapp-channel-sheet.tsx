import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ChannelCardStatus, GatewayConnectionConfig } from '@/lib/gateway-channels';
import {
  disconnectWhatsAppChannel,
  restartGateway,
  startWhatsAppQrLogin,
  waitForWhatsAppQrLogin,
} from '@/lib/gateway-channels';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { sileo } from 'sileo';
import { WHATSAPP_STEPS } from '../constants';
import {
  isTerminalWhatsAppWaitMessage,
  isWhatsAppQrTimeoutMessage,
  normalizeWhatsAppStatusMessage,
} from '../utils';
import { ChannelDetailRow } from './channel-detail-row';

function log(stage: string, details?: Record<string, unknown>) {
  console.info('[channels][whatsapp]', stage, details ?? {});
}

export function WhatsAppChannelSheet({
  channel,
  gatewayConfig,
}: {
  channel: ChannelCardStatus;
  gatewayConfig: GatewayConnectionConfig;
}) {
  const queryClient = useQueryClient();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const invalidateStatus = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['channels-status', gatewayConfig.gatewayUrl],
    });
    await queryClient.refetchQueries({
      queryKey: ['channels-status', gatewayConfig.gatewayUrl],
    });
  };

  const waitMutation = useMutation({
    mutationFn: (params: { accountId?: string }) => {
      log('wait.request', { accountId: params.accountId ?? 'default' });
      return waitForWhatsAppQrLogin(gatewayConfig, {
        timeoutMs: 120000,
        accountId: params.accountId,
      });
    },
    onSuccess: async result => {
      log('wait.response', { connected: result.connected, message: result.message });

      const normalizedMessage = normalizeWhatsAppStatusMessage(result.message ?? null);
      setMessage(normalizedMessage);

      if (result.connected) {
        setQrDataUrl(null);
        sileo.success({
          title: 'WhatsApp connected',
          description: 'Your account is now linked.',
        });
      } else if (isTerminalWhatsAppWaitMessage(result.message ?? null)) {
        setQrDataUrl(null);
      } else if (result.message?.toLowerCase().includes('still waiting for the qr scan')) {
        waitMutation.mutate({ accountId: channel.accountId });
      } else if (result.message?.toLowerCase().includes('no active whatsapp login in progress')) {
        setQrDataUrl(null);
        sileo.info({
          title: 'QR expired',
          description: 'Please generate a fresh QR and scan again.',
        });
      }

      if (
        result.message?.toLowerCase().includes('status=515') ||
        result.message?.toLowerCase().includes('restart required')
      ) {
        setQrDataUrl(null);
        setMessage('WhatsApp paired — restarting connection…');
        sileo.info({
          title: 'Almost there',
          description: 'WhatsApp is finishing setup. Please wait a moment.',
        });
        try {
          await restartGateway(gatewayConfig);
          log('515.restart_gateway.success');
        } catch {
          log('515.restart_gateway.failed');
        }
        await invalidateStatus();
        return;
      }

      await invalidateStatus();
    },
    onError: error => {
      log('wait.error', { error: error instanceof Error ? error.message : String(error) });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (params: { force: boolean }) => {
      log('start.request', { force: params.force, accountId: channel.accountId });

      // When force-relinking, clear existing auth once up front so Baileys
      // generates a fresh QR instead of silently reconnecting with old creds.
      if (params.force) {
        try {
          await disconnectWhatsAppChannel(gatewayConfig, { accountId: channel.accountId });
          log('start.force_logout.success', { accountId: channel.accountId });
        } catch {
          // Ignore — may not be linked or already logged out.
        }
      }

      const firstAttempt = await startWhatsAppQrLogin(gatewayConfig, {
        force: params.force,
        timeoutMs: 60000,
        accountId: channel.accountId,
      });

      log('start.response', { hasQr: Boolean(firstAttempt.qrDataUrl), message: firstAttempt.message });

      if (!isWhatsAppQrTimeoutMessage(firstAttempt.message)) {
        return { kind: 'start' as const, result: firstAttempt };
      }

      const waitAfterTimeout = await waitForWhatsAppQrLogin(gatewayConfig, {
        timeoutMs: 15000,
        accountId: channel.accountId,
      });
      log('start.timeout_recovery.wait_response', {
        connected: waitAfterTimeout.connected,
        message: waitAfterTimeout.message,
      });

      if (waitAfterTimeout.connected) {
        return { kind: 'connected' as const, message: waitAfterTimeout.message };
      }

      if (waitAfterTimeout.message?.toLowerCase().includes('no active whatsapp login in progress')) {
        const retry = await startWhatsAppQrLogin(gatewayConfig, {
          force: true,
          timeoutMs: 60000,
          accountId: channel.accountId,
        });
        log('start.timeout_recovery.retry_response', {
          hasQr: Boolean(retry.qrDataUrl),
          message: retry.message,
        });
        return { kind: 'start' as const, result: retry };
      }

      return { kind: 'start' as const, result: firstAttempt };
    },
    onSuccess: async mutationResult => {
      if (mutationResult.kind === 'connected') {
        setQrDataUrl(null);
        setMessage(normalizeWhatsAppStatusMessage(mutationResult.message));
        sileo.success({
          title: 'WhatsApp connected',
          description: 'Your account is now linked.',
        });
        await invalidateStatus();
        return;
      }

      const result = mutationResult.result;
      waitMutation.reset();
      setMessage(result.message ?? null);
      setQrDataUrl(result.qrDataUrl ?? null);

      if (result.qrDataUrl) {
        sileo.success({
          title: 'WhatsApp QR ready',
          description: 'Scan it from Linked Devices on your phone.',
        });
        waitMutation.mutate({ accountId: channel.accountId });
        return;
      }

      if (isWhatsAppQrTimeoutMessage(result.message)) {
        sileo.info({
          title: 'Still setting up',
          description: 'Checking if WhatsApp linking is already in progress...',
        });
        waitMutation.mutate({ accountId: channel.accountId });
      }
    },
    onError: error => {
      log('start.error', { error: error instanceof Error ? error.message : String(error) });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectWhatsAppChannel(gatewayConfig, { accountId: channel.accountId }),
    onSuccess: async () => {
      setQrDataUrl(null);
      setMessage('WhatsApp disconnected.');
      sileo.success({
        title: 'WhatsApp disconnected',
        description: 'Your WhatsApp session has been removed.',
      });
      await invalidateStatus();
    },
  });

  const showSetup = !channel.connected;
  const showForceRelink =
    showSetup && !qrDataUrl && Boolean(message?.toLowerCase().includes('already linked'));

  return (
    <>
      {showSetup ? (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">How to link WhatsApp</p>
            <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
              {WHATSAPP_STEPS.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => startMutation.mutate({ force: false })}
              disabled={startMutation.isPending || waitMutation.isPending}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating QR...
                </>
              ) : (
                'Generate QR'
              )}
            </Button>
            {qrDataUrl || showForceRelink ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => startMutation.mutate({ force: true })}
                disabled={startMutation.isPending || waitMutation.isPending}
              >
                Generate fresh QR
              </Button>
            ) : null}
          </div>

          {qrDataUrl ? (
            <div className="rounded-lg border p-3">
              <img
                src={qrDataUrl}
                alt="WhatsApp QR code"
                className="mx-auto h-56 w-56 rounded-md border bg-white object-contain p-2"
              />
            </div>
          ) : null}

          {qrDataUrl ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Waiting for scan</AlertTitle>
              <AlertDescription>
                Scan the QR with WhatsApp. We will connect automatically.
              </AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : (
        <Card className="gap-2 py-5 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">WhatsApp connected</CardTitle>
            <CardDescription>Your WhatsApp account is linked and active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <ChannelDetailRow
              label="Linked account"
              value={channel.selfE164 ?? channel.selfJid ?? 'Unknown'}
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
                'Disconnect WhatsApp'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {message ? (
        <Alert>
          <AlertTitle>WhatsApp status</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {startMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>QR setup failed</AlertTitle>
          <AlertDescription>
            {startMutation.error instanceof Error
              ? startMutation.error.message
              : 'Failed to start WhatsApp login.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {waitMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Login check failed</AlertTitle>
          <AlertDescription>
            {waitMutation.error instanceof Error
              ? waitMutation.error.message
              : 'Failed to check WhatsApp login status.'}
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
              : 'Failed to disconnect WhatsApp.'}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
