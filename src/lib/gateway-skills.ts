import { GatewayClient, type GatewayHelloOk } from './gateway-client';
import type {
  SkillStatusReport,
  SkillsInstallParams,
  SkillsInstallResult,
  SkillsUpdateParams,
} from './skills-types';

export type GatewayConnectionConfig = {
  gatewayUrl: string;
  token?: string;
  password?: string;
};

const GATEWAY_WS_PORT = '18789';

export async function getGatewaySkillsStatus(
  config: GatewayConnectionConfig
): Promise<SkillStatusReport> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<SkillStatusReport>('skills.status', {});
    return payload;
  });
}

export async function installGatewaySkill(
  config: GatewayConnectionConfig,
  params: SkillsInstallParams
): Promise<SkillsInstallResult> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<SkillsInstallResult>('skills.install', {
      name: params.name,
      installId: params.installId,
      timeoutMs: params.timeoutMs,
    });
    return payload ?? {};
  });
}

export async function updateGatewaySkillEnabled(
  config: GatewayConnectionConfig,
  params: SkillsUpdateParams
): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    await client.request('skills.update', {
      skillKey: params.skillKey,
      enabled: params.enabled,
    });
  });
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
