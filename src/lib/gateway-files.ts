import { GatewayClient, type GatewayHelloOk } from './gateway-client';

export type GatewayConnectionConfig = {
  gatewayUrl: string;
  token?: string;
  password?: string;
};

export type AgentFileName = string;
export type GatewayAgentFileListEntry = {
  name: string;
  path: string;
  missing: boolean;
};

const GATEWAY_WS_PORT = '18789';

export async function listGatewayAgentFiles(
  config: GatewayConnectionConfig,
  params: { agentId: 'main' }
): Promise<GatewayAgentFileListEntry[]> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<unknown>('agents.files.list', {
      agentId: params.agentId,
    });
    return parseAgentFileList(payload);
  });
}

export async function getGatewayAgentFile(
  config: GatewayConnectionConfig,
  params: { agentId: 'main'; name: AgentFileName }
): Promise<string> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<unknown>('agents.files.get', {
      agentId: params.agentId,
      name: params.name,
    });
    return parseAgentFileContent(payload);
  });
}

export async function setGatewayAgentFile(
  config: GatewayConnectionConfig,
  params: { agentId: 'main'; name: AgentFileName; content: string }
): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    await client.request('agents.files.set', {
      agentId: params.agentId,
      name: params.name,
      content: params.content,
    });
  });
}

function parseAgentFileContent(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    // Expected Gateway shape:
    // { agentId, workspace, file: { name, path, missing, content } }
    const file = record.file;
    if (file && typeof file === 'object') {
      const fileRecord = file as Record<string, unknown>;
      const fileContent = fileRecord.content;
      if (typeof fileContent === 'string') {
        return fileContent;
      }
    }

    // Back-compat fallback (if some environments return { content: "..." })
    const content = record.content;
    if (typeof content === 'string') {
      return content;
    }
  }

  throw new Error('Invalid response from agents.files.get');
}

function parseAgentFileList(payload: unknown): GatewayAgentFileListEntry[] {
  const filesPayload = extractFilesPayload(payload);
  if (!filesPayload) {
    throw new Error('Invalid response from agents.files.list');
  }

  const byName = new Map<string, GatewayAgentFileListEntry>();
  for (const item of filesPayload) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const name = record.name;
    if (typeof name !== 'string' || !name.trim()) {
      continue;
    }

    byName.set(name, {
      name,
      path: typeof record.path === 'string' ? record.path : name,
      missing: record.missing === true,
    });
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function extractFilesPayload(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.files)) {
      return record.files;
    }
  }

  return null;
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
