import { useQuery } from '@tanstack/react-query';

import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import { useGatewayConnection } from '@/lib/gateway/store';
import { getGatewaySessionUsage } from '@/lib/gateway-sessions';

export function useContextUsage(
  config: GatewayConnectionConfig | null,
  sessionKey: string
) {
  const { status } = useGatewayConnection();
  const isReady = status === 'ready' || status === 'degraded';

  const query = useQuery({
    queryKey: ['gateway-context-usage', config?.gatewayUrl, sessionKey],
    queryFn: () => getGatewaySessionUsage(config!, sessionKey),
    enabled: Boolean(config?.gatewayUrl) && isReady,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  return query.data ?? null;
}
