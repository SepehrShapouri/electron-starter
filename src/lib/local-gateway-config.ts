export const LOCAL_GATEWAY_URL = '127.0.0.1';
export const LOCAL_GATEWAY_TOKEN =
  'ad09b52149c8b5c48b133a9761a0aa7682093cf1ecdf4c10';
export const LOCAL_GATEWAY_WS_URL = `ws://${LOCAL_GATEWAY_URL}:18789`;

export const LOCAL_GATEWAY_CONFIG = {
  gatewayUrl: LOCAL_GATEWAY_URL,
  token: LOCAL_GATEWAY_TOKEN,
};

export const LOCAL_GATEWAY_CHAT_CONFIG = {
  ...LOCAL_GATEWAY_CONFIG,
  sessionKey: 'main',
};
