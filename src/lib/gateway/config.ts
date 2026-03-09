export type GatewayConnectionConfig = {
  gatewayUrl: string;
  token?: string;
  password?: string;
};

const GATEWAY_WS_PORT = '18789';

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function hasGatewayConfig(config: GatewayConnectionConfig | null | undefined) {
  return Boolean(config?.gatewayUrl?.trim());
}

export function toGatewaySocketUrl(rawGatewayUrl: string): string {
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

export function normalizeGatewayConfig(
  config: GatewayConnectionConfig
): GatewayConnectionConfig {
  return {
    gatewayUrl: toGatewaySocketUrl(config.gatewayUrl),
    token: trimOptional(config.token),
    password: trimOptional(config.password),
  };
}

export function areGatewayConfigsEqual(
  left: GatewayConnectionConfig | null,
  right: GatewayConnectionConfig | null
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.gatewayUrl === right.gatewayUrl &&
    trimOptional(left.token) === trimOptional(right.token) &&
    trimOptional(left.password) === trimOptional(right.password)
  );
}
