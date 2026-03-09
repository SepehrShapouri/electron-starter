import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import type { GatewayChatConfig } from '@/lib/use-gateway-chat';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { authApi } from './auth-api';

export type GatewayProvisionConfig = GatewayConnectionConfig;

type UseGatewayProvisionOptions = {
  enabled?: boolean;
};

export function useGatewayProvision(options: UseGatewayProvisionOptions = {}) {
  const { enabled = true } = options;

  const provisionQuery = useQuery({
    queryKey: ['gateway-provision'],
    queryFn: authApi.provisionGateway,
    refetchOnMount: 'always',
    staleTime: 0,
    enabled,
  });

  const gatewayConfig = useMemo<GatewayProvisionConfig | null>(() => {
    const profile = provisionQuery.data;

    if (!profile?.gatewayUrl) {
      return null;
    }
return {
      gatewayUrl:'ws://127.0.0.1:18789',
      token:'ad09b52149c8b5c48b133a9761a0aa7682093cf1ecdf4c10'
    }
    return {
      gatewayUrl: profile.gatewayUrl.trim(),
      token: profile.gatewayToken || undefined,
    };
  }, [provisionQuery.data]);

  const chatConfig = useMemo<GatewayChatConfig | null>(() => {
    if (!gatewayConfig) {
      return null;
    }

    return {
      ...gatewayConfig,
      sessionKey: 'main',
    };
  }, [gatewayConfig]);

  return {
    provisionQuery,
    gatewayConfig,
    chatConfig,
  };
}
