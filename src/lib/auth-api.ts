const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type JsonRecord = Record<string, unknown>;

async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: JsonRecord } = {}
): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.code ?? 'Request failed');
  }

  return payload;
}

export const authApi = {
  getSession: () => request('/api/v1/protected/me'),
  signIn: (payload: { email: string; password: string }) =>
    request('/api/v1/auth/sign-in/email', { body: payload }),
  signUp: (payload: { name: string; email: string; password: string }) =>
    request('/api/v1/auth/sign-up/email', { body: payload }),
  signOut: () => request('/api/v1/auth/sign-out', { body: {} }),
  forgotPassword: (payload: { email: string }) =>
    request('/api/v1/auth/forgot-password', { body: payload }),
  resetPassword: (payload: { token: string; password: string }) =>
    request('/api/v1/auth/reset-password', { body: payload }),
  verifyEmail: (payload: { token: string }) =>
    request('/api/v1/auth/verify-email', { body: payload }),
  resendVerification: (payload: { email: string }) =>
    request('/api/v1/auth/resend-verification-email', { body: payload }),
};
