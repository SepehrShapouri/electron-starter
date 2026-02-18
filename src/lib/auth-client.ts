import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'https://api.clawpilot.ai';

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  basePath: '/api/v1/auth',
  plugins: [magicLinkClient()],
});
