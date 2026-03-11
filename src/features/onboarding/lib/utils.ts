export type KeySource = 'credits' | 'byok';

export type OnboardingSecrets = {
  model: string;
  apiKey?: string;
  keySource: KeySource;
};

const PENDING_ONBOARDING_PAYLOAD_KEY = 'clawpilot:pending_onboarding_payload';

export const isPaidStatus = (status: string | null) =>
  status === 'active' || status === 'trialing';

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export async function encryptPayload(
  base64urlKey: string,
  data: OnboardingSecrets
): Promise<string> {
  const raw = Uint8Array.from(
    atob(base64urlKey.replace(/-/g, '+').replace(/_/g, '/')),
    char => char.charCodeAt(0)
  );
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
    'encrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  const combined = new Uint8Array(
    iv.length + new Uint8Array(ciphertext).length
  );
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const getPendingPayload = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(PENDING_ONBOARDING_PAYLOAD_KEY);
};

export const setPendingPayload = (value: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(PENDING_ONBOARDING_PAYLOAD_KEY);
    return;
  }

  window.localStorage.setItem(PENDING_ONBOARDING_PAYLOAD_KEY, value);
};
