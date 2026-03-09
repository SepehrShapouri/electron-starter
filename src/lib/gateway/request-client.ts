import type { GatewayHelloOk } from '@/lib/gateway-client';

import type { GatewayConnectionConfig } from './config';
import { getGatewaySessionManager } from './session-manager';

export type GatewayRequestClient = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

export async function withGatewayRequestClient<T>(
  config: GatewayConnectionConfig,
  run: (context: {
    client: GatewayRequestClient;
    hello: GatewayHelloOk;
  }) => Promise<T>
): Promise<T> {
  const manager = getGatewaySessionManager();
  const hello = await manager.ensureReady(config);

  return run({
    client: {
      request: <T = unknown>(method: string, params?: unknown) =>
        manager.request<T>(method, params, { config }),
    },
    hello,
  });
}
