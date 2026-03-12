import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as gatewayClientModule from '@/lib/gateway-client';

const { GatewayClient } = gatewayClientModule;

type MockDeviceTokenEntry = {
  token: string;
  role: string;
  scopes: string[];
  updatedAtMs: number;
};

const deviceIdentityMocks = {
  buildDeviceAuthPayload: vi.fn(() => 'signed-payload'),
  clearDeviceAuthToken: vi.fn(),
  loadDeviceAuthToken: vi.fn<
    (...args: Array<unknown>) => MockDeviceTokenEntry | null
  >(() => null),
  loadOrCreateDeviceIdentity: vi.fn(async () => ({
    deviceId: 'device-1',
    publicKey: 'public-key',
    privateKey: 'private-key',
  })),
  signDevicePayload: vi.fn(async () => 'signature'),
  storeDeviceAuthToken: vi.fn(),
};

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readonly sent: string[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage:
    | ((event: { data?: string | null }) => void)
    | null = null;
  onclose:
    | ((event: { code: number; reason: string }) => void)
    | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.closes.push({ code, reason });
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '' });
  }

  emitMessage(frame: unknown) {
    const data =
      typeof frame === 'string' ? frame : JSON.stringify(frame);
    this.onmessage?.({ data });
  }
}

function lastSocket() {
  const socket =
    MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!socket) {
    throw new Error('Missing mock websocket');
  }
  return socket;
}

async function flushMicrotasks(times = 20) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('GatewayClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.reset();
    vi.clearAllMocks();
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'request-id'),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits for connect.challenge before sending connect', () => {
    const client = new GatewayClient({ url: 'ws://127.0.0.1:18789' });

    client.connect();
    const socket = lastSocket();
    socket.open();

    vi.advanceTimersByTime(1_500);
    expect(socket.sent).toHaveLength(0);
  });

  it('closes on missing or blank nonce', () => {
    const onHandshakeFailure = vi.fn();
    const client = new GatewayClient({
      url: 'ws://127.0.0.1:18789',
      onHandshakeFailure,
    });

    client.connect();
    const socket = lastSocket();
    socket.open();
    socket.emitMessage({
      type: 'event',
      event: 'connect.challenge',
      payload: { nonce: '   ' },
    });

    expect(onHandshakeFailure).toHaveBeenCalledWith({
      kind: 'invalid_challenge',
      message: 'Gateway challenge nonce missing',
    });
    expect(socket.closes[socket.closes.length - 1]).toEqual({
      code: 4008,
      reason: 'Gateway challenge nonce missing',
    });
    expect(socket.sent).toHaveLength(0);
  });

  it('closes on challenge timeout without sending connect', () => {
    const onHandshakeFailure = vi.fn();
    const client = new GatewayClient({
      url: 'ws://127.0.0.1:18789',
      onHandshakeFailure,
    });

    client.connect();
    const socket = lastSocket();
    socket.open();

    vi.advanceTimersByTime(2_000);

    expect(onHandshakeFailure).toHaveBeenCalledWith({
      kind: 'challenge_timeout',
      message: 'Gateway challenge timeout',
    });
    expect(socket.closes[socket.closes.length - 1]).toEqual({
      code: 4008,
      reason: 'Gateway challenge timeout',
    });
    expect(socket.sent).toHaveLength(0);
  });

  it('emits onAuthenticating exactly once for a valid challenge', async () => {
    const onAuthenticating = vi.fn();
    const client = new GatewayClient({
      url: 'ws://127.0.0.1:18789',
      onAuthenticating,
    });

    client.connect();
    const socket = lastSocket();
    socket.open();
    socket.emitMessage({
      type: 'event',
      event: 'connect.challenge',
      payload: { nonce: 'nonce-1' },
    });
    socket.emitMessage({
      type: 'event',
      event: 'connect.challenge',
      payload: { nonce: 'nonce-2' },
    });
    await Promise.resolve();

    expect(onAuthenticating).toHaveBeenCalledTimes(1);
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0]!)).toMatchObject({
      type: 'req',
      method: 'connect',
      params: expect.objectContaining({
        caps: ['tool-events'],
        client: expect.objectContaining({
          id: 'openclaw-control-ui',
          mode: 'webchat',
        }),
      }),
    });
  });

  it('clears cached device token on connect rejection', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'request-id'),
      subtle: {},
    });
    deviceIdentityMocks.loadDeviceAuthToken.mockReturnValue({
      token: 'device-token',
      role: 'operator',
      scopes: [],
      updatedAtMs: Date.now(),
    });
    vi.spyOn(gatewayClientModule.gatewayDeviceAuthDeps, 'load').mockResolvedValue({
      buildDeviceAuthPayload: deviceIdentityMocks.buildDeviceAuthPayload,
      clearDeviceAuthToken: deviceIdentityMocks.clearDeviceAuthToken,
      loadDeviceAuthToken: deviceIdentityMocks.loadDeviceAuthToken,
      loadOrCreateDeviceIdentity: deviceIdentityMocks.loadOrCreateDeviceIdentity,
      signDevicePayload: deviceIdentityMocks.signDevicePayload,
      storeDeviceAuthToken: deviceIdentityMocks.storeDeviceAuthToken,
    });
    const onHandshakeFailure = vi.fn();
    const client = new GatewayClient({
      url: 'ws://127.0.0.1:18789',
      token: 'shared-token',
      onHandshakeFailure,
    });
    const socket = new MockWebSocket('ws://127.0.0.1:18789');
    socket.readyState = MockWebSocket.OPEN;
    (client as unknown as { ws: WebSocket | null }).ws =
      socket as unknown as WebSocket;
    (
      client as unknown as {
        connectNonce: string | null;
        request: (method: string, params?: unknown) => Promise<unknown>;
        sendConnect: () => Promise<void>;
      }
    ).connectNonce = 'nonce-1';
    vi.spyOn(client, 'request').mockRejectedValue(new Error('pairing required'));

    await (
      client as unknown as {
        sendConnect: () => Promise<void>;
      }
    ).sendConnect();
    await flushMicrotasks();

    expect(deviceIdentityMocks.clearDeviceAuthToken).toHaveBeenCalledWith({
      deviceId: 'device-1',
      role: 'operator',
    });
    expect(onHandshakeFailure).toHaveBeenCalledWith({
      kind: 'connect_rejected',
      message: 'pairing required',
    });
  });
});
