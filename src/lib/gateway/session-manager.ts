import type { GatewayEventFrame, GatewayHelloOk } from '@/lib/gateway-client';
import { GatewayClient } from '@/lib/gateway-client';

import { normalizeChatEventPayload } from './chat';
import {
  areGatewayConfigsEqual,
  hasGatewayConfig,
  normalizeGatewayConfig,
  type GatewayConnectionConfig,
} from './config';
import { gatewayStore } from './store';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function isRestartReason(reason?: string | null) {
  const normalized = reason?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('restart') || normalized.includes('service restart')
  );
}

function nextReconnectDelay(attempt: number) {
  const baseDelay = Math.min(1000 * 2 ** Math.max(attempt - 1, 0), 12_000);
  const jitter = Math.floor(Math.random() * 350);
  return baseDelay + jitter;
}

export class GatewaySessionManager {
  private client: GatewayClient | null = null;
  private config: GatewayConnectionConfig | null = null;
  private desired = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private hello: GatewayHelloOk | null = null;
  private readyDeferred: Deferred<GatewayHelloOk> | null = null;
  private listeners = new Set<(event: GatewayEventFrame) => void>();

  start(config: GatewayConnectionConfig) {
    if (!hasGatewayConfig(config)) {
      this.stop();
      return;
    }

    const nextConfig = normalizeGatewayConfig(config);
    const connectionStatus = gatewayStore.getState().connection.status;
    const sameConfig = areGatewayConfigsEqual(this.config, nextConfig);

    if (
      sameConfig &&
      this.desired &&
      (this.client ||
        connectionStatus === 'connecting' ||
        connectionStatus === 'authenticating' ||
        connectionStatus === 'reconnecting' ||
        connectionStatus === 'ready' ||
        connectionStatus === 'degraded')
    ) {
      return;
    }

    if (!sameConfig) {
      this.stop();
    }

    this.config = nextConfig;
    this.desired = true;
    gatewayStore.getState().actions.configure(nextConfig);
    void this.ensureReady();
  }

  stop(clearConfig = true) {
    this.desired = false;
    this.clearReconnectTimer();
    this.rejectReady(new Error('Gateway session stopped'));
    this.client?.disconnect();
    this.client = null;
    this.hello = null;
    this.reconnectAttempt = 0;

    if (clearConfig) {
      this.config = null;
      gatewayStore.getState().actions.configure(null);
      gatewayStore.getState().actions.resetRuntime();
      gatewayStore.getState().actions.setConnectionStatus('idle');
      return;
    }

    gatewayStore.getState().actions.setConnectionStatus('idle');
  }

  getCurrentConfig() {
    return this.config;
  }

  subscribe(listener: (event: GatewayEventFrame) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async ensureReady(config?: GatewayConnectionConfig) {
    if (config) {
      this.start(config);
    }

    if (!this.config || !this.desired) {
      throw new Error('Missing gateway URL');
    }

    if (
      this.client &&
      this.hello &&
      (gatewayStore.getState().connection.status === 'ready' ||
        gatewayStore.getState().connection.status === 'degraded')
    ) {
      return this.hello;
    }

    if (!this.client) {
      this.openConnection();
    }

    if (!this.readyDeferred) {
      this.readyDeferred = createDeferred<GatewayHelloOk>();
    }

    return this.readyDeferred.promise;
  }

  async request<T = unknown>(
    method: string,
    params?: unknown,
    options?: { config?: GatewayConnectionConfig }
  ): Promise<T> {
    await this.ensureReady(options?.config);

    if (!this.client) {
      throw new Error('Gateway not connected');
    }

    return this.client.request<T>(method, params);
  }

  private openConnection() {
    if (!this.config || this.client) {
      return;
    }

    this.clearReconnectTimer();
    this.readyDeferred = createDeferred<GatewayHelloOk>();
    gatewayStore
      .getState()
      .actions.setConnectionStatus(
        this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
        {
          reconnectAttempt: this.reconnectAttempt,
        }
      );

    const client = new GatewayClient({
      url: this.config.gatewayUrl,
      token: this.config.token,
      password: this.config.password,
      onHello: hello => {
        this.hello = hello;
        this.reconnectAttempt = 0;
        gatewayStore.getState().actions.applyHello(hello);
        gatewayStore.getState().actions.markRecovered();
        this.resolveReady(hello);
      },
      onEvent: event => {
        this.handleEvent(event);
      },
      onGap: info => {
        gatewayStore.getState().actions.markGapDetected(info);
      },
      onClose: ({ reason }) => {
        this.client = null;
        this.hello = null;
        this.rejectReady(new Error(reason || 'Gateway disconnected'));

        if (reason) {
          if (isRestartReason(reason)) {
            gatewayStore.getState().actions.noteShutdown(reason);
          }
          gatewayStore
            .getState()
            .actions.setConnectionStatus(
              this.desired ? 'reconnecting' : 'idle',
              {
                disconnectReason: reason,
              }
            );
        } else {
          gatewayStore
            .getState()
            .actions.setConnectionStatus(
              this.desired ? 'reconnecting' : 'idle'
            );
        }

        if (this.desired && this.config) {
          this.scheduleReconnect();
        }
      },
      onError: error => {
        gatewayStore.getState().actions.markGatewayError(error.message);
        gatewayStore.getState().actions.setConnectionStatus('error', {
          error: error.message,
          reconnectAttempt: this.reconnectAttempt,
        });
      },
    });

    this.client = client;
    client.connect();
  }

  private handleEvent(event: GatewayEventFrame) {
    gatewayStore.getState().actions.noteEvent(event.seq);

    if (event.event === 'shutdown' || event.event === 'gateway.shutdown') {
      gatewayStore
        .getState()
        .actions.noteShutdown(
          typeof event.payload === 'string'
            ? event.payload
            : 'Gateway restart in progress'
        );
    }

    if (event.event === 'gateway.restarting') {
      gatewayStore.getState().actions.noteShutdown('Gateway restarting');
    }

    const fallbackSessionKey =
      gatewayStore.getState().chat.resolvedSessionKey || 'main';
    const normalizedChatEvent = normalizeChatEventPayload(
      event.event,
      event.payload,
      fallbackSessionKey
    );

    if (normalizedChatEvent) {
      gatewayStore.getState().actions.applyChatEvent(normalizedChatEvent);
    }

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectAttempt += 1;
    const delay = nextReconnectDelay(this.reconnectAttempt);

    gatewayStore.getState().actions.setConnectionStatus('reconnecting', {
      reconnectAttempt: this.reconnectAttempt,
    });

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openConnection();
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resolveReady(hello: GatewayHelloOk) {
    this.readyDeferred?.resolve(hello);
    this.readyDeferred = null;
  }

  private rejectReady(error: Error) {
    this.readyDeferred?.reject(error);
    this.readyDeferred = null;
  }
}

let sharedManager: GatewaySessionManager | null = null;

export function getGatewaySessionManager() {
  if (!sharedManager) {
    sharedManager = new GatewaySessionManager();
  }

  return sharedManager;
}
