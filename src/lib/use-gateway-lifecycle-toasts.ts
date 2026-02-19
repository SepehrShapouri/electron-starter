import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useEffect, useRef } from 'react';
import { sileo } from 'sileo';
import { GatewayClient, type GatewayEventFrame } from './gateway-client';

const GATEWAY_WS_PORT = '18789';
const RECONNECT_DELAY_MS = 1500;

function toGatewaySocketUrl(rawGatewayUrl: string): string {
  const raw = rawGatewayUrl.trim();
  if (!raw) {
    throw new Error('Missing gateway URL');
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  const parsed = new URL(hasScheme ? raw : `ws://${raw}`);

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'ws:';
  } else if (parsed.protocol === 'https:') {
    parsed.protocol = 'wss:';
  } else if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`Unsupported gateway URL protocol: ${parsed.protocol}`);
  }

  if (!parsed.port) {
    parsed.port = GATEWAY_WS_PORT;
  }

  return parsed.toString();
}

function isRestartReason(reason: string | undefined): boolean {
  const normalized = (reason ?? '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes('restart') || normalized.includes('service restart');
}

export function useGatewayLifecycleToasts() {
  const { gatewayConfig } = useGatewayProvision();
  const clientRef = useRef<GatewayClient | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const expectingRecoveryRef = useRef(false);
  const restartToastShownRef = useRef(false);

  useEffect(() => {
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const disconnectClient = () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };

    if (!gatewayConfig) {
      clearReconnectTimer();
      disconnectClient();
      expectingRecoveryRef.current = false;
      restartToastShownRef.current = false;
      return;
    }

    let disposed = false;

    const showRestartToast = () => {
      expectingRecoveryRef.current = true;
      if (restartToastShownRef.current) {
        return;
      }
      restartToastShownRef.current = true;
      sileo.info({
        title: 'Lobster is restarting',
        description: 'Applying your changes. Back in a few seconds.',
      });
    };

    const connect = () => {
      if (disposed || clientRef.current) {
        return;
      }

      let socketUrl = '';
      try {
        socketUrl = toGatewaySocketUrl(gatewayConfig.gatewayUrl);
      } catch {
        return;
      }

      const client = new GatewayClient({
        url: socketUrl,
        token: gatewayConfig.token?.trim() || undefined,
        onHello: () => {
          if (expectingRecoveryRef.current) {
            sileo.success({
              title: 'Lobster is back',
              description: 'All set and ready to go.',
            });
          }
          expectingRecoveryRef.current = false;
          restartToastShownRef.current = false;
        },
        onEvent: (event: GatewayEventFrame) => {
          if (event.event === 'shutdown') {
            showRestartToast();
          }
        },
        onClose: ({ reason }) => {
          clientRef.current = null;
          if (isRestartReason(reason)) {
            showRestartToast();
          }
          if (disposed) {
            return;
          }
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
        },
        onError: () => {
          // Wait for close handler to drive reconnect attempts.
        },
      });

      clientRef.current = client;
      client.connect();
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      disconnectClient();
    };
  }, [gatewayConfig?.gatewayUrl, gatewayConfig?.token]);
}
