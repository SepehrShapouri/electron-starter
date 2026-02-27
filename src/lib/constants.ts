const DEFAULT_MARKETING_SITE_URL = 'https://clawpilot.ai';

export const MARKETING_SITE_URL = (
  import.meta.env.VITE_MARKETING_SITE_URL ?? DEFAULT_MARKETING_SITE_URL
).replace(/\/$/, '');

export const LEGAL_URLS = {
  termsOfService: `${MARKETING_SITE_URL}/terms-of-service`,
  privacyPolicy: `${MARKETING_SITE_URL}/privacy-policy`,
  eula: `${MARKETING_SITE_URL}/eula`,
} as const;
