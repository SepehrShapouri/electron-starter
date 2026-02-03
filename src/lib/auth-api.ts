import { apiClient, getApiErrorMessage } from './axios';

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
    apiClient
      .post('/api/v1/auth/sign-in/email', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  signUp: (payload: { name: string; email: string; password: string }) =>
    apiClient
      .post('/api/v1/auth/sign-up/email', payload)
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  signOut: () =>
    apiClient
      .post('/api/v1/auth/sign-out', {})
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  provisionGateway: () =>
    apiClient
      .get<GatewayProvision>('/api/v1/provision')
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  getOnboarding: () =>
    apiClient
      .get<OnboardingProfile>('/api/v1/onboarding')
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
  saveOnboarding: (payload: Partial<OnboardingProfile>) =>
    apiClient
      .post<OnboardingProfile>('/api/v1/onboarding', payload)
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
