import { beforeEach, describe, expect, it, vi } from 'vitest';

const gatewayClientMocks = vi.hoisted(() => {
  class MockGatewayClient {
    static instances: MockGatewayClient[] = [];

    readonly connect = vi.fn();
    readonly disconnect = vi.fn();
    readonly request = vi.fn();

    constructor(
      readonly opts: {
        onAuthenticating?: () => void;
        onHello?: (hello: unknown) => void;
        onEvent?: (event: {
          type: 'event';
          event: string;
          payload?: unknown;
          seq?: number;
        }) => void;
        onClose?: (info: { code: number; reason: string }) => void;
        onError?: (error: Error) => void;
        onGap?: (info: { expected: number; received: number }) => void;
        onHandshakeFailure?: (failure: {
          kind: 'challenge_timeout' | 'invalid_challenge' | 'connect_rejected';
          message: string;
        }) => void;
      }
    ) {
      MockGatewayClient.instances.push(this);
    }

    static reset() {
      MockGatewayClient.instances = [];
    }

    emitAuthenticating() {
      this.opts.onAuthenticating?.();
    }

    emitHello(hello: unknown = { type: 'hello-ok', protocol: 3 }) {
      this.opts.onHello?.(hello);
    }

    emitEvent(event: {
      type: 'event';
      event: string;
      payload?: unknown;
      seq?: number;
    }) {
      this.opts.onEvent?.(event);
    }

    emitClose(code: number, reason = '') {
      this.opts.onClose?.({ code, reason });
    }

    emitError(message = 'gateway websocket error') {
      this.opts.onError?.(new Error(message));
    }

    emitHandshakeFailure(failure: {
      kind: 'challenge_timeout' | 'invalid_challenge' | 'connect_rejected';
      message: string;
    }) {
      this.opts.onHandshakeFailure?.(failure);
    }
  }

  return { MockGatewayClient };
});

vi.mock('@/lib/gateway-client', () => ({
  GatewayClient: gatewayClientMocks.MockGatewayClient,
}));

import { GatewaySessionManager } from '@/lib/gateway/session-manager';
import { gatewayStore } from '@/lib/gateway/store';

function resetGatewayStore() {
  const { actions } = gatewayStore.getState();
  actions.configure(null);
  actions.resetRuntime();
  actions.setActiveSessionKey('main');
}

function latestClient() {
  const client =
    gatewayClientMocks.MockGatewayClient.instances[
      gatewayClientMocks.MockGatewayClient.instances.length - 1
    ];
  if (!client) {
    throw new Error('Missing gateway client');
  }
  return client;
}

describe('GatewaySessionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    gatewayClientMocks.MockGatewayClient.reset();
    resetGatewayStore();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('transitions connecting -> authenticating -> ready on successful handshake', () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    expect(gatewayStore.getState().connection.status).toBe('connecting');

    const client = latestClient();
    client.emitAuthenticating();
    expect(gatewayStore.getState().connection.status).toBe('authenticating');

    client.emitHello();
    expect(gatewayStore.getState().connection.status).toBe('ready');
    expect(gatewayStore.getState().health.lastFailureKind).toBeNull();
  });

  it('transitions to auth_failed on 1008 and does not schedule reconnect', async () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    latestClient().emitClose(1008, 'pairing required');

    expect(gatewayStore.getState().connection.status).toBe('auth_failed');
    expect(gatewayStore.getState().health.lastFailureKind).toBe('auth');

    vi.advanceTimersByTime(20_000);
    expect(gatewayClientMocks.MockGatewayClient.instances).toHaveLength(1);
    await expect(manager.ensureReady()).rejects.toThrow('pairing required');
  });

  it('treats auth-like handshake rejection as auth_failed without reconnecting', async () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    const client = latestClient();
    client.emitHandshakeFailure({
      kind: 'connect_rejected',
      message: 'device identity required',
    });
    client.emitClose(4008, 'device identity required');

    expect(gatewayStore.getState().connection.status).toBe('auth_failed');
    expect(gatewayStore.getState().health.lastFailureKind).toBe('auth');

    vi.advanceTimersByTime(20_000);
    expect(gatewayClientMocks.MockGatewayClient.instances).toHaveLength(1);
    await expect(manager.ensureReady()).rejects.toThrow(
      'device identity required'
    );
  });

  it('schedules reconnect on service restart closes', () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    latestClient().emitClose(1012, 'service restart');

    expect(gatewayStore.getState().connection.status).toBe('reconnecting');
    expect(gatewayStore.getState().health.lastFailureKind).toBe('restart');
    expect(gatewayStore.getState().system.restartExpected).toBe(true);

    vi.advanceTimersByTime(20_000);
    expect(gatewayClientMocks.MockGatewayClient.instances).toHaveLength(2);
  });

  it('schedules reconnect on network close and increments attempt', () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    latestClient().emitClose(1006, '');

    expect(gatewayStore.getState().connection.status).toBe('reconnecting');
    expect(gatewayStore.getState().health.lastFailureKind).toBe('network');

    vi.advanceTimersByTime(20_000);
    expect(gatewayClientMocks.MockGatewayClient.instances).toHaveLength(2);
    expect(gatewayStore.getState().health.reconnectAttempt).toBe(1);
  });

  it('manual stop cancels a pending reconnect and returns to idle', () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    latestClient().emitClose(1006, '');
    manager.stop(false);

    expect(gatewayStore.getState().connection.status).toBe('idle');

    vi.advanceTimersByTime(20_000);
    expect(gatewayClientMocks.MockGatewayClient.instances).toHaveLength(1);
  });

  it('treats raw websocket errors as diagnostic only', () => {
    const manager = new GatewaySessionManager();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    latestClient().emitError('gateway websocket error');

    expect(gatewayStore.getState().connection.status).toBe('connecting');
    expect(gatewayStore.getState().health.lastError).toBeNull();
  });

  it('routes targeted agent tool events into the tool stream store', () => {
    const manager = new GatewaySessionManager();
    const { actions } = gatewayStore.getState();

    manager.start({ gatewayUrl: 'ws://127.0.0.1:18789' });
    latestClient().emitHello();
    actions.beginChatRun('main', 'run-tools', 'Inspect');
    latestClient().emitEvent({
      type: 'event',
      event: 'agent',
      payload: {
        runId: 'run-tools',
        sessionKey: 'main',
        stream: 'tool',
        ts: 10,
        data: {
          phase: 'start',
          name: 'bash',
          toolCallId: 'tool-1',
          args: { cmd: 'ls -la' },
        },
      },
    });

    expect(gatewayStore.getState().chat.toolStreamBySession.main).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-1',
        runId: 'run-tools',
        toolName: 'bash',
      }),
    ]);
  });
});
