export type GatewayEventFrame = {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
};

export type GatewayResponseFrame = {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown };
};

export type GatewayHelloOk = {
  type: 'hello-ok';
  protocol: number;
  features?: { methods?: string[]; events?: string[] };
  snapshot?: unknown;
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
    issuedAtMs?: number;
  };
};

export type GatewayHandshakeFailureKind =
  | 'challenge_timeout'
  | 'invalid_challenge'
  | 'connect_rejected';

export type GatewayHandshakeFailure = {
  kind: GatewayHandshakeFailureKind;
  message: string;
};

export type GatewayClientDeviceAuthDeps = {
  buildDeviceAuthPayload: typeof import('./device-auth-payload').buildDeviceAuthPayload;
  clearDeviceAuthToken: typeof import('./device-auth').clearDeviceAuthToken;
  loadDeviceAuthToken: typeof import('./device-auth').loadDeviceAuthToken;
  loadOrCreateDeviceIdentity: typeof import('./device-identity').loadOrCreateDeviceIdentity;
  signDevicePayload: typeof import('./device-identity').signDevicePayload;
  storeDeviceAuthToken: typeof import('./device-auth').storeDeviceAuthToken;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  password?: string;
  onHello?: (hello: GatewayHelloOk) => void;
  onAuthenticating?: () => void;
  onEvent?: (evt: GatewayEventFrame) => void;
  onHandshakeFailure?: (info: GatewayHandshakeFailure) => void;
  onClose?: (info: { code: number; reason: string }) => void;
  onGap?: (info: { expected: number; received: number }) => void;
  onError?: (err: Error) => void;
};

const CONNECT_FAILED_CLOSE_CODE = 4008;
const CONNECT_CHALLENGE_TIMEOUT_MS = 2_000;
const GATEWAY_CLIENT_ID = 'openclaw-control-ui';
const GATEWAY_CLIENT_MODE = 'webchat';
const GATEWAY_CLIENT_VERSION = '0.1';
const GATEWAY_OPERATOR_ROLE = 'operator';
const GATEWAY_OPERATOR_SCOPES = [
  'operator.admin',
  'operator.approvals',
  'operator.pairing',
] as const;

function truncateCloseReason(reason: string) {
  return reason.slice(0, 123);
}

export const gatewayDeviceAuthDeps = {
  load: async (): Promise<GatewayClientDeviceAuthDeps> => {
    const deviceIdentity = await import('./device-identity');
    const deviceAuthPayload = await import('./device-auth-payload');
    const deviceAuth = await import('./device-auth');

    return {
      buildDeviceAuthPayload: deviceAuthPayload.buildDeviceAuthPayload,
      clearDeviceAuthToken: deviceAuth.clearDeviceAuthToken,
      loadDeviceAuthToken: deviceAuth.loadDeviceAuthToken,
      loadOrCreateDeviceIdentity: deviceIdentity.loadOrCreateDeviceIdentity,
      signDevicePayload: deviceIdentity.signDevicePayload,
      storeDeviceAuthToken: deviceAuth.storeDeviceAuthToken,
    };
  },
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private connectNonce: string | null = null;
  private connectSent = false;
  private connectTimer: number | null = null;
  private lastSeq: number | null = null;

  constructor(private opts: GatewayClientOptions) {}

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.ws) return;
    this.lastSeq = null;
    this.connectNonce = null;
    this.connectSent = false;
    this.ws = new WebSocket(this.opts.url);
    this.ws.onopen = () => this.queueConnect();
    this.ws.onmessage = ev => this.handleMessage(String(ev.data ?? ''));
    this.ws.onclose = ev => {
      this.clearConnectTimer();
      this.flushPending(new Error('gateway disconnected'));
      this.ws = null;
      this.connectNonce = null;
      this.connectSent = false;
      this.opts.onClose?.({ code: ev.code, reason: String(ev.reason ?? '') });
    };
    this.ws.onerror = () => {
      this.opts.onError?.(new Error('gateway websocket error'));
    };
  }

  disconnect() {
    this.clearConnectTimer();
    this.ws?.close();
    this.ws = null;
    this.lastSeq = null;
    this.connectNonce = null;
    this.connectSent = false;
    this.flushPending(new Error('gateway disconnected'));
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('gateway not connected'));
    }
    const id = crypto.randomUUID();
    const frame = { type: 'req', id, method, params };
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: value => resolve(value as T), reject });
    });
    this.ws.send(JSON.stringify(frame));
    return promise;
  }

  private flushPending(err: Error) {
    for (const pending of this.pending.values()) {
      pending.reject(err);
    }
    this.pending.clear();
  }

  private async sendConnect() {
    if (this.connectSent) return;
    const nonce = this.connectNonce?.trim();
    if (!nonce) {
      this.handleHandshakeFailure(
        'invalid_challenge',
        'Gateway challenge nonce missing'
      );
      return;
    }

    this.connectSent = true;
    this.clearConnectTimer();
    this.opts.onAuthenticating?.();

    const isSecureContext = typeof crypto !== 'undefined' && !!crypto.subtle;
    const role = GATEWAY_OPERATOR_ROLE;
    const scopes = [...GATEWAY_OPERATOR_SCOPES];

    let device:
      | {
          id: string;
          publicKey: string;
          signature: string;
          signedAt: number;
          nonce?: string;
        }
      | undefined;

    let authToken = this.opts.token;
    let canFallbackToShared = false;

    if (isSecureContext) {
      const {
        buildDeviceAuthPayload,
        loadDeviceAuthToken,
        loadOrCreateDeviceIdentity,
        signDevicePayload,
      } = await gatewayDeviceAuthDeps.load();

      const deviceIdentity = await loadOrCreateDeviceIdentity();
      const storedToken = loadDeviceAuthToken({
        deviceId: deviceIdentity.deviceId,
        role,
      })?.token;
      authToken = storedToken ?? this.opts.token;
      canFallbackToShared = Boolean(storedToken && this.opts.token);

      const signedAtMs = Date.now();
      const payload = buildDeviceAuthPayload({
        deviceId: deviceIdentity.deviceId,
        clientId: GATEWAY_CLIENT_ID,
        clientMode: GATEWAY_CLIENT_MODE,
        role,
        scopes,
        signedAtMs,
        token: authToken ?? null,
        nonce,
      });
      const signature = await signDevicePayload(
        deviceIdentity.privateKey,
        payload
      );
      device = {
        id: deviceIdentity.deviceId,
        publicKey: deviceIdentity.publicKey,
        signature,
        signedAt: signedAtMs,
        nonce,
      };
    }

    const auth =
      authToken || this.opts.password
        ? { token: authToken, password: this.opts.password }
        : undefined;

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: GATEWAY_CLIENT_ID,
        version: GATEWAY_CLIENT_VERSION,
        platform: navigator.platform ?? 'web',
        mode: GATEWAY_CLIENT_MODE,
      },
      role,
      scopes,
      device,
      auth,
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    void this.request<GatewayHelloOk>('connect', params)
      .then(async hello => {
        if (hello?.auth?.deviceToken && isSecureContext) {
          const { loadOrCreateDeviceIdentity, storeDeviceAuthToken } =
            await gatewayDeviceAuthDeps.load();
          const identity = await loadOrCreateDeviceIdentity();
          storeDeviceAuthToken({
            deviceId: identity.deviceId,
            role: hello.auth.role ?? role,
            token: hello.auth.deviceToken,
            scopes: hello.auth.scopes ?? [],
          });
        }
        this.opts.onHello?.(hello);
      })
      .catch(async err => {
        if (canFallbackToShared && isSecureContext) {
          const { clearDeviceAuthToken, loadOrCreateDeviceIdentity } =
            await gatewayDeviceAuthDeps.load();
          const identity = await loadOrCreateDeviceIdentity();
          clearDeviceAuthToken({ deviceId: identity.deviceId, role });
        }
        const error =
          err instanceof Error ? err : new Error(String(err));
        this.opts.onError?.(error);
        this.handleHandshakeFailure('connect_rejected', error.message);
      });
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const frame = parsed as { type?: unknown };
    if (frame.type === 'event') {
      const evt = parsed as GatewayEventFrame;
      if (evt.event === 'connect.challenge') {
        const payload = evt.payload as { nonce?: unknown } | undefined;
        const nonce =
          payload && typeof payload.nonce === 'string'
            ? payload.nonce.trim()
            : '';
        if (!nonce) {
          this.handleHandshakeFailure(
            'invalid_challenge',
            'Gateway challenge nonce missing'
          );
          return;
        }
        this.connectNonce = nonce;
        void this.sendConnect();
        return;
      }
      if (typeof evt.seq === 'number') {
        if (this.lastSeq !== null && evt.seq > this.lastSeq + 1) {
          this.opts.onGap?.({ expected: this.lastSeq + 1, received: evt.seq });
        }
        this.lastSeq = evt.seq;
      }
      this.opts.onEvent?.(evt);
      return;
    }

    if (frame.type === 'res') {
      const res = parsed as GatewayResponseFrame;
      const pending = this.pending.get(res.id);
      if (!pending) return;
      this.pending.delete(res.id);
      if (res.ok) pending.resolve(res.payload);
      else pending.reject(new Error(res.error?.message ?? 'request failed'));
    }
  }

  private queueConnect() {
    this.connectNonce = null;
    this.connectSent = false;
    this.clearConnectTimer();
    this.connectTimer = window.setTimeout(() => {
      if (this.connectSent || this.ws?.readyState !== WebSocket.OPEN) {
        return;
      }
      this.handleHandshakeFailure(
        'challenge_timeout',
        'Gateway challenge timeout'
      );
    }, CONNECT_CHALLENGE_TIMEOUT_MS);
  }

  private clearConnectTimer() {
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private handleHandshakeFailure(
    kind: GatewayHandshakeFailureKind,
    message: string
  ) {
    this.opts.onHandshakeFailure?.({ kind, message });
    this.clearConnectTimer();
    this.ws?.close(CONNECT_FAILED_CLOSE_CODE, truncateCloseReason(message));
  }
}
