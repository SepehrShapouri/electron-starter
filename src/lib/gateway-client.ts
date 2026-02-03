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

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  password?: string;
  onHello?: (hello: GatewayHelloOk) => void;
  onEvent?: (evt: GatewayEventFrame) => void;
  onClose?: (info: { code: number; reason: string }) => void;
  onGap?: (info: { expected: number; received: number }) => void;
  onError?: (err: Error) => void;
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
    this.ws = new WebSocket(this.opts.url);
    this.ws.onopen = () => this.queueConnect();
    this.ws.onmessage = ev => this.handleMessage(String(ev.data ?? ''));
    this.ws.onclose = ev => {
      this.flushPending(new Error('gateway disconnected'));
      this.ws = null;
      this.opts.onClose?.({ code: ev.code, reason: String(ev.reason ?? '') });
    };
    this.ws.onerror = () => {
      this.opts.onError?.(new Error('gateway websocket error'));
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.lastSeq = null;
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
    this.connectSent = true;
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    const isSecureContext = typeof crypto !== 'undefined' && !!crypto.subtle;
    const role = 'operator';
    const scopes = ['operator.admin', 'operator.approvals', 'operator.pairing'];

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
      const { loadOrCreateDeviceIdentity, signDevicePayload } =
        await import('./device-identity');
      const { buildDeviceAuthPayload } = await import('./device-auth-payload');
      const { loadDeviceAuthToken } = await import('./device-auth');

      const deviceIdentity = await loadOrCreateDeviceIdentity();
      const storedToken = loadDeviceAuthToken({
        deviceId: deviceIdentity.deviceId,
        role,
      })?.token;
      authToken = storedToken ?? this.opts.token;
      canFallbackToShared = Boolean(storedToken && this.opts.token);

      const signedAtMs = Date.now();
      const nonce = this.connectNonce ?? undefined;
      const payload = buildDeviceAuthPayload({
        deviceId: deviceIdentity.deviceId,
        clientId: 'openclaw-control-ui',
        clientMode: 'webchat',
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
        id: 'openclaw-control-ui',
        version: '0.1',
        platform: navigator.platform ?? 'web',
        mode: 'webchat',
      },
      role: 'operator',
      scopes,
      device,
      auth,
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    void this.request<GatewayHelloOk>('connect', params)
      .then(async hello => {
        if (hello?.auth?.deviceToken && isSecureContext) {
          const { loadOrCreateDeviceIdentity } =
            await import('./device-identity');
          const { storeDeviceAuthToken } = await import('./device-auth');
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
          const { loadOrCreateDeviceIdentity } =
            await import('./device-identity');
          const { clearDeviceAuthToken } = await import('./device-auth');
          const identity = await loadOrCreateDeviceIdentity();
          clearDeviceAuthToken({ deviceId: identity.deviceId, role });
        }
        this.opts.onError?.(
          err instanceof Error ? err : new Error(String(err))
        );
        this.ws?.close(4008, 'connect failed');
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
        if (payload && typeof payload.nonce === 'string') {
          this.connectNonce = payload.nonce;
          void this.sendConnect();
        }
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
    if (this.connectTimer !== null) window.clearTimeout(this.connectTimer);
    this.connectTimer = window.setTimeout(() => {
      void this.sendConnect();
    }, 750);
  }
}
