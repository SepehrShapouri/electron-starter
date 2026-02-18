import { apiClient, getApiErrorMessage, setAuthToken } from './axios';
import { authClient } from './auth-client';

type AuthResult = {
  token?: string | null;
};

type AuthClientError = {
  message?: string;
  statusText?: string;
};

type AuthClientResponse<T> = {
  data: T;
  error: AuthClientError | null;
};

const getAuthClientErrorMessage = (error: AuthClientError | null) => {
  return error?.message ?? error?.statusText ?? 'Request failed';
};

export type GatewayProvision = {
  gatewayUrl: string;
  gatewayToken: string;
  userId?: string | null;
  status?: string;
};

export type OnboardingProfile = {
  userId?: string | null;
  onboardingStep?: string | null;
  completed?: boolean;
};

export const authApi = {
  getSession: async () => {
    try {
      const response = await apiClient.get('/api/v1/protected/me');
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  signIn: (payload: { email: string; password: string }) =>
    authClient.signIn
      .email(payload)
      .then(result => {
        const response = result as AuthClientResponse<AuthResult>;
        if (response.error) {
          throw new Error(getAuthClientErrorMessage(response.error));
        }

        const data = response.data;
        if (typeof data.token === 'string' && data.token.length > 0) {
          setAuthToken(data.token);
        }
        return data;
      })
      .catch(error => {
        throw new Error(
          error instanceof Error ? error.message : getApiErrorMessage(error)
        );
      }),
  signUp: (payload: { name: string; email: string; password: string }) =>
    authClient.signUp
      .email(payload)
      .then(result => {
        const response = result as AuthClientResponse<AuthResult>;
        if (response.error) {
          throw new Error(getAuthClientErrorMessage(response.error));
        }

        const data = response.data;
        if (typeof data.token === 'string' && data.token.length > 0) {
          setAuthToken(data.token);
        }
        return data;
      })
      .catch(error => {
        throw new Error(
          error instanceof Error ? error.message : getApiErrorMessage(error)
        );
      }),
  signOut: () =>
    authClient
      .signOut()
      .then(result => {
        const response = result as AuthClientResponse<unknown>;
        if (response.error) {
          throw new Error(getAuthClientErrorMessage(response.error));
        }

        setAuthToken(null);
        return response.data;
      })
      .catch(error => {
        throw new Error(
          error instanceof Error ? error.message : getApiErrorMessage(error)
        );
      }),
  provisionGateway: () =>
    apiClient
      .get<GatewayProvision>('/api/v1/infra/provision')
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  getOnboarding: () =>
    apiClient
      .get<OnboardingProfile>('/api/v1/infra/onboarding')
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  saveOnboarding: (payload: Partial<OnboardingProfile>) =>
    apiClient
      .post<OnboardingProfile>('/api/v1/infra/onboarding', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  forgotPassword: (payload: { email: string }) =>
    apiClient
      .post('/api/v1/auth/forgot-password', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  resetPassword: (payload: { token: string; password: string }) =>
    apiClient
      .post('/api/v1/auth/reset-password', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  verifyEmail: (payload: { token: string }) =>
    apiClient
      .post('/api/v1/auth/verify-email', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  resendVerification: (payload: { email: string }) =>
    apiClient
      .post('/api/v1/auth/resend-verification-email', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
};
