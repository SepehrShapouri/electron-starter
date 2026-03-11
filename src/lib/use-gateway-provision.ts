import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import type { GatewayChatConfig } from '@/lib/use-gateway-chat';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { authApi } from './auth-api';
import { ApiError } from './axios';

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
    refetchInterval: query => {
      if (!query.state.data) return false;
      const status = query.state.data.status;
      return status === 'running' || status === 'stopped' ? false : 5000;
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const gatewayConfig = useMemo<GatewayProvisionConfig | null>(() => {
    const profile = provisionQuery.data;

    if (!profile?.gatewayUrl) {
      return null;
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
