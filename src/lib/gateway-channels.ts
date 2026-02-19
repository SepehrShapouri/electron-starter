import { GatewayClient, type GatewayHelloOk } from './gateway-client';

export type GatewayConnectionConfig = {
  gatewayUrl: string;
  token?: string;
  password?: string;
};

export type ChannelCardStatus = {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  connected: boolean;
  running: boolean;
  accountId: string;
  mode?: string | null;
  lastError?: string | null;
  tokenSource?: string | null;
  botUsername?: string | null;
  botId?: string | null;
  selfE164?: string | null;
  selfJid?: string | null;
};

export type ChannelsStatusResult = {
  channels: ChannelCardStatus[];
  raw: unknown;
};

export type ChannelMutationResult = {
  restartScheduled: boolean;
};

const GATEWAY_WS_PORT = '18789';
const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  telegram: 'Connect your Telegram bot and start receiving DMs.',
  slack: 'Add your agent to Slack workspaces and channels.',
  whatsapp: 'Reach users on WhatsApp with one-to-one messaging.',
  discord: 'Deploy your agent to Discord servers.',
  signal: 'Receive and respond to Signal messages.',
  imessage: 'Use the iMessage bridge on macOS devices.',
  web: 'Use Web channel login and session management.',
};

type RawChannelAccount = {
  accountId?: unknown;
  configured?: unknown;
  connected?: unknown;
  running?: unknown;
  mode?: unknown;
  lastError?: unknown;
  tokenSource?: unknown;
  probe?: unknown;
};

type ProbeBot = {
  username?: unknown;
  id?: unknown;
};

type ProbePayload = {
  bot?: unknown;
};

type SelfPayload = {
  e164?: unknown;
  jid?: unknown;
};

export type WhatsAppQrStartResult = {
  message: string | null;
  qrDataUrl: string | null;
};

export type WhatsAppQrWaitResult = {
  connected: boolean;
  message: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readProbeBot(source: unknown): { botUsername: string | null; botId: string | null } {
  const probe = asRecord(source as ProbePayload);
  const bot = asRecord(probe?.bot as ProbeBot);
  const botUsername = asString(bot?.username);
  const idValue = bot?.id;
  const botId =
    typeof idValue === 'number'
      ? String(idValue)
      : typeof idValue === 'string' && idValue.trim()
        ? idValue
        : null;
  return { botUsername, botId };
}

function normalizeChannelsStatus(payload: unknown): ChannelsStatusResult {
  const root = asRecord(payload);
  const order = Array.isArray(root?.channelOrder)
    ? root.channelOrder.filter((item): item is string => typeof item === 'string')
    : [];
  const labels = asRecord(root?.channelLabels) ?? {};
  const channelsSummary = asRecord(root?.channels) ?? {};
  const channelAccounts = asRecord(root?.channelAccounts) ?? {};
  const defaultAccountIds = asRecord(root?.channelDefaultAccountId) ?? {};

  const fallbackIds = [
    ...Object.keys(channelsSummary),
    ...Object.keys(channelAccounts),
  ];
  const ids = (order.length > 0 ? order : fallbackIds).filter(Boolean);

  const channels = ids.map((id): ChannelCardStatus => {
    const summary = asRecord(channelsSummary[id]) ?? {};
    const accountsRaw = Array.isArray(channelAccounts[id])
      ? (channelAccounts[id] as RawChannelAccount[])
      : [];
    const accountId =
      asString(defaultAccountIds[id]) ??
      asString(accountsRaw[0]?.accountId) ??
      'default';
    const account =
      accountsRaw.find(item => asString(item.accountId) === accountId) ??
      accountsRaw[0] ??
      {};

    const configured =
      asBoolean(summary.configured) ?? asBoolean(account.configured) ?? false;
    const running = asBoolean(summary.running) ?? asBoolean(account.running) ?? false;
    const connected =
      asBoolean(summary.connected) ?? asBoolean(account.connected) ?? (configured && running);
    const mode = asString(summary.mode) ?? asString(account.mode);
    const lastError = asString(summary.lastError) ?? asString(account.lastError);
    const tokenSource = asString(summary.tokenSource) ?? asString(account.tokenSource);
    const summaryProbe = readProbeBot(summary.probe);
    const accountProbe = readProbeBot(account.probe);
    const botUsername = summaryProbe.botUsername ?? accountProbe.botUsername;
    const botId = summaryProbe.botId ?? accountProbe.botId;
    const self = asRecord(summary.self as SelfPayload);
    const selfE164 = asString(self?.e164);
    const selfJid = asString(self?.jid);

    return {
      id,
      label: asString(labels[id]) ?? id,
      description: CHANNEL_DESCRIPTIONS[id] ?? 'Configure this channel for your agent.',
      configured,
      connected,
      running,
      accountId,
      mode,
      lastError,
      tokenSource,
      botUsername,
      botId,
      selfE164,
      selfJid,
    };
  });

  return {
    channels,
    raw: payload,
  };
}

type ConfigSnapshot = {
  hash?: unknown;
};

export async function getGatewayChannelsStatus(
  config: GatewayConnectionConfig,
  params?: { probe?: boolean; timeoutMs?: number }
): Promise<ChannelsStatusResult> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request('channels.status', {
      probe: params?.probe ?? false,
      timeoutMs: params?.timeoutMs,
    });
    return normalizeChannelsStatus(payload);
  });
}

export async function connectTelegramChannel(
  config: GatewayConnectionConfig,
  botToken: string
): Promise<ChannelMutationResult> {
  const trimmedToken = botToken.trim();
  if (!trimmedToken) {
    throw new Error('Bot token is required');
  }

  return await withGatewayClient(config, async ({ client }) => {
    const snapshot = await client.request<ConfigSnapshot>('config.get', {});
    const baseHash = asString(snapshot?.hash);
    if (!baseHash) {
      throw new Error('Config hash missing. Please retry.');
    }

    const patch = {
      channels: {
        telegram: {
          enabled: true,
          botToken: trimmedToken,
          dmPolicy: 'open',
          allowFrom: ['*'],
        },
      },
    };

    const patchResult = await client.request('config.patch', {
      baseHash,
      raw: JSON.stringify(patch),
    });

    return {
      restartScheduled: isRestartScheduled(patchResult),
    };
  });
}

export async function disconnectTelegramChannel(
  config: GatewayConnectionConfig
): Promise<ChannelMutationResult> {
  return await withGatewayClient(config, async ({ client }) => {
    try {
      await client.request('channels.logout', {
        channel: 'telegram',
        accountId: 'default',
      });
    } catch {
      // Telegram may not implement logout semantics; config patch is the fallback.
    }

    const snapshot = await client.request<ConfigSnapshot>('config.get', {});
    const baseHash = asString(snapshot?.hash);
    if (!baseHash) {
      throw new Error('Config hash missing. Please retry.');
    }

    const patchResult = await client.request('config.patch', {
      baseHash,
      raw: JSON.stringify({
        channels: {
          telegram: null,
        },
      }),
    });

    return {
      restartScheduled: isRestartScheduled(patchResult),
    };
  });
}

export async function startWhatsAppQrLogin(
  config: GatewayConnectionConfig,
  params?: { force?: boolean; timeoutMs?: number; accountId?: string }
): Promise<WhatsAppQrStartResult> {
  try {
    return await requestWhatsAppQrStart(config, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('web login provider is not available')) {
      throw error;
    }

    await ensureWhatsAppProviderEnabled(config);
    await waitForGatewayRecovery(config, 30_000);

    return await requestWhatsAppQrStart(config, params);
  }
}

async function requestWhatsAppQrStart(
  config: GatewayConnectionConfig,
  params?: { force?: boolean; timeoutMs?: number; accountId?: string }
): Promise<WhatsAppQrStartResult> {
  return await withGatewayClient(config, async ({ client }) => {
    const result = await client.request<{ message?: unknown; qrDataUrl?: unknown }>(
      'web.login.start',
      {
        force: params?.force ?? false,
        timeoutMs: params?.timeoutMs,
        accountId: params?.accountId,
      }
    );

    return {
      message: asString(result?.message),
      qrDataUrl: asString(result?.qrDataUrl),
    };
  });
}

async function ensureWhatsAppProviderEnabled(config: GatewayConnectionConfig): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    const snapshot = await client.request<ConfigSnapshot>('config.get', {});
    const baseHash = asString(snapshot?.hash);
    if (!baseHash) {
      throw new Error('Config hash missing. Please retry.');
    }

    await client.request('config.patch', {
      baseHash,
      raw: JSON.stringify({
        plugins: {
          entries: {
            whatsapp: {
              enabled: true,
            },
          },
        },
      }),
    });
  });
}

async function waitForGatewayRecovery(
  config: GatewayConnectionConfig,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await withGatewayClient(config, async ({ client }) => {
        await client.request('channels.status', { probe: false, timeoutMs: 5000 });
      });
      return;
    } catch {
      await new Promise(resolve => window.setTimeout(resolve, 1200));
    }
  }
  throw new Error('Gateway is still restarting. Please try again in a few seconds.');
}

export async function waitForWhatsAppQrLogin(
  config: GatewayConnectionConfig,
  params?: { timeoutMs?: number; accountId?: string }
): Promise<WhatsAppQrWaitResult> {
  return await withGatewayClient(config, async ({ client }) => {
    const result = await client.request<{ connected?: unknown; message?: unknown }>(
      'web.login.wait',
      {
        timeoutMs: params?.timeoutMs,
        accountId: params?.accountId,
      }
    );

    return {
      connected: asBoolean(result?.connected) ?? false,
      message: asString(result?.message),
    };
  });
}

export async function disconnectWhatsAppChannel(
  config: GatewayConnectionConfig,
  params?: { accountId?: string }
): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    await client.request('channels.logout', {
      channel: 'whatsapp',
      accountId: params?.accountId ?? 'default',
    });
  });
}

/**
 * Trigger a gateway restart by sending a no-op config patch.
 * Useful after a 515 pairing where creds are saved but the channel is stopped.
 */
export async function restartGateway(config: GatewayConnectionConfig): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    const snapshot = await client.request<ConfigSnapshot>('config.get', {});
    const baseHash = asString(snapshot?.hash);
    if (!baseHash) {
      return;
    }
    await client.request('config.patch', {
      baseHash,
      raw: JSON.stringify({}),
    });
  });
}

function isRestartScheduled(payload: unknown): boolean {
  const root = asRecord(payload);
  return Boolean(root?.restart && typeof root.restart === 'object');
}

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

async function withGatewayClient<T>(
  config: GatewayConnectionConfig,
  run: (context: { client: GatewayClient; hello: GatewayHelloOk }) => Promise<T>
): Promise<T> {
  let settled = false;

  return new Promise<T>((resolve, reject) => {
    const client = new GatewayClient({
      url: toGatewaySocketUrl(config.gatewayUrl),
      token: config.token?.trim() || undefined,
      password: config.password?.trim() || undefined,
      onHello: hello => {
        if (settled) {
          return;
        }
        settled = true;
        void run({ client, hello })
          .then(result => resolve(result))
          .catch(error => reject(error))
          .finally(() => {
            client.disconnect();
          });
      },
      onError: error => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      },
      onClose: ({ reason }) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error(reason || 'Gateway disconnected'));
      },
    });

    client.connect();

    window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      client.disconnect();
      reject(new Error('Timed out while connecting to gateway'));
    }, 10000);
  });
}
