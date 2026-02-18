import type { GatewayChatConfig } from '@/lib/use-gateway-chat';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { authApi } from './auth-api';

export type GatewayProvisionConfig = {
  gatewayUrl: string;
  token?: string;
};

export function useGatewayProvision() {
  const provisionQuery = useQuery({
    queryKey: ['gateway-provision'],
    queryFn: authApi.provisionGateway,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const gatewayConfig = useMemo<GatewayProvisionConfig | null>(() => {
    const profile = provisionQuery.data;
    if (!profile?.gatewayUrl) {
      return null;
    }

    return {
      gatewayUrl: profile.gatewayUrl,
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
