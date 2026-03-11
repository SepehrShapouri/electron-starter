import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import { withGatewayRequestClient } from '@/lib/gateway/request-client';

export type SessionUsage = {
  usedTokens: number;
  maxTokens: number;
};

export async function getGatewaySessionUsage(
  config: GatewayConnectionConfig,
  sessionKey: string
): Promise<SessionUsage | null> {
  return withGatewayRequestClient(config, async ({ client }) => {
    const payload = await client.request<{ sessions?: unknown[] }>(
      'sessions.list',
      { limit: 50 }
    );

    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    const session = sessions.find((s): s is Record<string, unknown> => {
      if (typeof s !== 'object' || s === null) return false;
      const obj = s as Record<string, unknown>;
      return obj.sessionKey === sessionKey || obj.key === sessionKey;
    });

    if (!session) return null;

    const usedTokens =
      typeof session.totalTokens === 'number' ? session.totalTokens : null;
    const maxTokens =
      typeof session.contextTokens === 'number' ? session.contextTokens : null;

    if (usedTokens === null || maxTokens === null || maxTokens === 0) {
      return null;
    }

    return { usedTokens, maxTokens };
  });
}
