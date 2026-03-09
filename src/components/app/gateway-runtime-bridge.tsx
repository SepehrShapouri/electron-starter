import { useEffect } from 'react';

import { getGatewaySessionManager } from '@/lib/gateway/session-manager';
import { useGatewayProvision } from '@/lib/use-gateway-provision';

export function GatewayRuntimeBridge() {
  const { gatewayConfig } = useGatewayProvision();
  const manager = getGatewaySessionManager();

  useEffect(() => {
    if (!gatewayConfig) {
      manager.stop();
      return;
    }

    manager.start(gatewayConfig);
  }, [gatewayConfig, manager]);

  useEffect(
    () => () => {
      manager.stop();
    },
    [manager]
  );

  return null;
}
