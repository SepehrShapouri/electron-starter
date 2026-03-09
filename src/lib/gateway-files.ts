import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import { withGatewayRequestClient } from '@/lib/gateway/request-client';

export type { GatewayConnectionConfig } from '@/lib/gateway/config';

export type AgentFileName = string;
export type GatewayAgentFileListEntry = {
  name: string;
  path: string;
  missing: boolean;
};

export async function listGatewayAgentFiles(
  config: GatewayConnectionConfig,
  params: { agentId: 'main' }
): Promise<GatewayAgentFileListEntry[]> {
  return withGatewayRequestClient(config, async ({ client }) => {
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
  return withGatewayRequestClient(config, async ({ client }) => {
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
  await withGatewayRequestClient(config, async ({ client }) => {
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
