import axios from 'axios';

export type ApiErrorPayload = {
  message?: string;
  code?: string;
};

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const AUTH_TOKEN_STORAGE_KEY = 'clawpilot.auth.token';

export const apiClient = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

export const loadAuthToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

loadAuthToken();

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    return (
      payload?.message ?? payload?.code ?? error.message ?? 'Request failed'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed';
};
