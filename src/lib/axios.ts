import axios from 'axios';

export type ApiErrorPayload = {
  message?: string;
  code?: string;
};

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
