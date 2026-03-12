import type {
  GatewayEventFrame,
  GatewayHandshakeFailure,
  GatewayHelloOk,
} from '@/lib/gateway-client';
import { GatewayClient } from '@/lib/gateway-client';

import { normalizeChatEventPayload } from './chat';
import {
  areGatewayConfigsEqual,
  hasGatewayConfig,
  normalizeGatewayConfig,
  type GatewayConnectionConfig,
} from './config';
import { gatewayStore, type GatewayFailureKind } from './store';
import { normalizeGatewayToolEventPayload } from './tool-stream';

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

function isAuthFailureReason(reason?: string | null) {
  const normalized = reason?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return false;
  }

  return [
    'auth',
    'token',
    'credential',
    'password',
    'pair',
    'paired',
    'device',
    'identity',
    'scope',
    'role',
    'unauthorized',
  ].some(fragment => normalized.includes(fragment));
}

type FailureResolution = {
  status: 'idle' | 'reconnecting' | 'auth_failed' | 'error';
  failureKind: GatewayFailureKind;
  error: string | null;
  disconnectReason: string | null;
  closeCode: number | null;
  shouldReconnect: boolean;
};

function nextReconnectDelay(attempt: number) {
  const baseDelay = Math.min(1000 * 2 ** Math.max(attempt - 1, 0), 12_000);
  const jitter = Math.floor(Math.random() * 350);
  return baseDelay + jitter;
}

export class GatewaySessionManager {
  private client: GatewayClient | null = null;
  private config: GatewayConnectionConfig | null = null;
  private desired = false;
  private authRecoveryRequired = false;
  private authFailureError: Error | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private hello: GatewayHelloOk | null = null;
  private readyDeferred: Deferred<GatewayHelloOk> | null = null;
  private listeners = new Set<(event: GatewayEventFrame) => void>();
  private pendingHandshakeFailure: GatewayHandshakeFailure | null = null;

  start(
    config: GatewayConnectionConfig,
    options?: { allowAuthRecovery?: boolean }
  ) {
    if (!hasGatewayConfig(config)) {
      this.stop();
      return;
    }

    const nextConfig = normalizeGatewayConfig(config);
    const connectionStatus = gatewayStore.getState().connection.status;
    const sameConfig = areGatewayConfigsEqual(this.config, nextConfig);
    const allowAuthRecovery =
      options?.allowAuthRecovery === true || !sameConfig;

    if (allowAuthRecovery) {
      this.authRecoveryRequired = false;
      this.authFailureError = null;
    } else if (this.authRecoveryRequired) {
      this.config = nextConfig;
      gatewayStore.getState().actions.configure(nextConfig);
      return;
    }

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
    void this.ensureReady().catch(() => {});
  }

  stop(clearConfig = true) {
    this.desired = false;
    this.authRecoveryRequired = false;
    this.authFailureError = null;
    this.pendingHandshakeFailure = null;
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

    gatewayStore.getState().actions.setConnectionStatus('idle', {
      reconnectAttempt: 0,
      closeCode: null,
      failureKind: null,
      disconnectReason: null,
      error: null,
    });
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

  async ensureReady(
    config?: GatewayConnectionConfig,
    options?: { allowAuthRecovery?: boolean }
  ) {
    if (config) {
      this.start(config, options);
    }

    if (this.authRecoveryRequired && !options?.allowAuthRecovery) {
      throw (
        this.authFailureError ?? new Error('Gateway authentication required')
      );
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
    if (!this.config || this.client || this.authRecoveryRequired) {
      return;
    }

    this.clearReconnectTimer();
    this.pendingHandshakeFailure = null;
    this.readyDeferred = createDeferred<GatewayHelloOk>();
    gatewayStore
      .getState()
      .actions.setConnectionStatus(
        this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
        {
          reconnectAttempt: this.reconnectAttempt,
          closeCode: null,
          failureKind: null,
          disconnectReason: null,
          error: null,
        }
      );

    const client = new GatewayClient({
      url: this.config.gatewayUrl,
      token: this.config.token,
      password: this.config.password,
      onAuthenticating: () => {
        gatewayStore.getState().actions.setConnectionStatus('authenticating', {
          reconnectAttempt: this.reconnectAttempt,
          closeCode: null,
          failureKind: null,
          disconnectReason: null,
          error: null,
        });
      },
      onHello: hello => {
        this.hello = hello;
        this.authRecoveryRequired = false;
        this.authFailureError = null;
        this.pendingHandshakeFailure = null;
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
      onHandshakeFailure: failure => {
        this.pendingHandshakeFailure = failure;
      },
      onClose: ({ code, reason }) => {
        if (this.client !== client) return;
        this.client = null;
        this.hello = null;

        const resolution = this.resolveFailure({
          code,
          reason,
          handshakeFailure: this.pendingHandshakeFailure,
        });
        this.pendingHandshakeFailure = null;
        this.rejectReady(
          new Error(
            resolution.error ?? reason ?? 'Gateway disconnected'
          )
        );

        if (resolution.failureKind === 'auth') {
          this.authRecoveryRequired = true;
          this.authFailureError = new Error(
            resolution.error ?? 'Gateway authentication required'
          );
          this.desired = false;
        }

        if (resolution.failureKind === 'restart') {
          gatewayStore
            .getState()
            .actions.noteShutdown(
              reason || 'Gateway restart in progress'
            );
        }

        gatewayStore.getState().actions.setConnectionStatus(
          resolution.status,
          {
            reconnectAttempt: this.reconnectAttempt,
            closeCode: resolution.closeCode,
            failureKind: resolution.failureKind,
            disconnectReason: resolution.disconnectReason,
            error: resolution.error,
          }
        );

        if (resolution.shouldReconnect && this.desired && this.config) {
          this.scheduleReconnect();
        } else {
          this.clearReconnectTimer();
        }
      },
      onError: error => {
        console.warn('[gateway] websocket error', error);
      },
    });

    this.client = client;
    client.connect();
  }

  private resolveFailure(params: {
    code: number;
    reason: string;
    handshakeFailure: GatewayHandshakeFailure | null;
  }): FailureResolution {
    if (!this.desired) {
      return {
        status: 'idle',
        failureKind: null,
        error: null,
        disconnectReason: null,
        closeCode: null,
        shouldReconnect: false,
      };
    }

    if (params.code === 1008) {
      return {
        status: 'auth_failed',
        failureKind: 'auth',
        error: params.reason || 'Gateway authentication failed',
        disconnectReason: params.reason || 'Gateway authentication failed',
        closeCode: params.code,
        shouldReconnect: false,
      };
    }

    if (
      params.handshakeFailure?.kind === 'connect_rejected' &&
      isAuthFailureReason(params.handshakeFailure.message)
    ) {
      return {
        status: 'auth_failed',
        failureKind: 'auth',
        error: params.handshakeFailure.message,
        disconnectReason: params.handshakeFailure.message,
        closeCode: params.code || null,
        shouldReconnect: false,
      };
    }

    if (params.handshakeFailure) {
      return {
        status: 'error',
        failureKind: 'handshake',
        error: params.handshakeFailure.message,
        disconnectReason: params.handshakeFailure.message,
        closeCode: params.code || null,
        shouldReconnect: false,
      };
    }

    if (params.code === 1012 || isRestartReason(params.reason)) {
      return {
        status: 'reconnecting',
        failureKind: 'restart',
        error: null,
        disconnectReason: params.reason || 'Gateway restarting',
        closeCode: params.code,
        shouldReconnect: true,
      };
    }

    return {
      status: 'reconnecting',
      failureKind: 'network',
      error: null,
      disconnectReason: params.reason || 'Gateway disconnected',
      closeCode: params.code || null,
      shouldReconnect: true,
    };
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

    const normalizedToolEvent = normalizeGatewayToolEventPayload(
      event.event,
      event.payload
    );
    if (normalizedToolEvent) {
      gatewayStore.getState().actions.applyToolEvent(normalizedToolEvent);
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
