import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OnboardingPage from '@/pages/onboarding';

const {
  getBillingStatus,
  createOnboardingCheckoutSession,
  getOnboardingEncryptionKey,
  provisionFromOnboarding,
  saveOnboarding,
  encryptPayload,
  setPendingPayload,
  captureAnalyticsEvent,
  setPendingSubscriptionIntent,
  clearPendingSubscriptionIntent,
  consumePendingSubscriptionIntent,
  navigate,
  openExternalUrl,
} = vi.hoisted(() => ({
  getBillingStatus: vi.fn(),
  createOnboardingCheckoutSession: vi.fn(),
  getOnboardingEncryptionKey: vi.fn(),
  provisionFromOnboarding: vi.fn(),
  saveOnboarding: vi.fn(),
  encryptPayload: vi.fn(),
  setPendingPayload: vi.fn(),
  captureAnalyticsEvent: vi.fn(),
  setPendingSubscriptionIntent: vi.fn(),
  clearPendingSubscriptionIntent: vi.fn(),
  consumePendingSubscriptionIntent: vi.fn(),
  navigate: vi.fn(),
  openExternalUrl: vi.fn(),
}));

vi.mock('@/lib/auth-api', () => ({
  authApi: {
    getBillingStatus,
    createOnboardingCheckoutSession,
    getOnboardingEncryptionKey,
    provisionFromOnboarding,
    saveOnboarding,
  },
}));

vi.mock('@/features/onboarding/lib/utils', () => ({
  encryptPayload,
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong',
  getPendingPayload: vi.fn(() => null),
  isPaidStatus: (status: string | null) =>
    status === 'active' || status === 'trialing',
  providerKeyInfo: {
    anthropic: {
      label: 'Anthropic API Key',
      placeholder: 'sk-ant-...',
      url: 'https://console.anthropic.com/settings/keys',
      urlLabel: 'console.anthropic.com',
    },
  },
  setPendingPayload,
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent,
  setPendingSubscriptionIntent,
  clearPendingSubscriptionIntent,
  consumePendingSubscriptionIntent,
}));

vi.mock('@/hooks/use-signout', () => ({
  default: () => ({
    signout: vi.fn(),
    isSigningout: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(() => ({
      kill: vi.fn(),
    })),
  },
}));

vi.mock('@/components/bars-spinner', () => ({
  BarsSpinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/features/onboarding/components/model-select-card', () => ({
  ModelSelectCard: () => <div>Model selector</div>,
}));

vi.mock('@/features/onboarding/components/deploy-card', () => ({
  DeployCard: ({ onSubscribe }: { onSubscribe: () => void }) => (
    <button type="button" onClick={onSubscribe}>
      Subscribe
    </button>
  ),
}));

const renderPage = (props?: {
  checkoutStatus?: 'success' | 'cancel';
  encryptedData?: string;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingPage {...props} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  getBillingStatus.mockResolvedValue({
    status: null,
    isActive: false,
    planLabel: null,
  });
  getOnboardingEncryptionKey.mockResolvedValue({ key: 'encryption-key' });
  encryptPayload.mockResolvedValue('encrypted-payload');
  createOnboardingCheckoutSession.mockResolvedValue({
    url: 'https://checkout.example.com',
  });
  provisionFromOnboarding.mockResolvedValue({});
  saveOnboarding.mockResolvedValue({});
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      openExternalUrl,
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: undefined,
  });
});

describe('Onboarding analytics', () => {
  it('captures checkout start before redirecting to billing', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(createOnboardingCheckoutSession).toHaveBeenCalled();
    });

    expect(createOnboardingCheckoutSession.mock.calls[0]?.[0]).toEqual({
      encryptedPayload: 'encrypted-payload',
      useElectronRedirect: true,
    });
    expect(setPendingPayload).toHaveBeenCalledWith('encrypted-payload');
    expect(setPendingSubscriptionIntent).toHaveBeenCalledWith({
      provider: 'anthropic',
      keySource: 'credits',
    });
    expect(captureAnalyticsEvent).toHaveBeenCalledWith(
      'app_subscription_checkout_started',
      {
        provider: 'anthropic',
        key_source: 'credits',
        source: 'onboarding',
      }
    );
    expect(openExternalUrl).toHaveBeenCalledWith(
      'https://checkout.example.com'
    );
  });

  it('captures subscription activation after a successful checkout return', async () => {
    getBillingStatus.mockResolvedValue({
      status: 'active',
      isActive: true,
      planLabel: 'Pro',
    });
    consumePendingSubscriptionIntent.mockReturnValue({
      provider: 'anthropic',
      keySource: 'credits',
      createdAt: Date.now(),
    });

    renderPage({
      checkoutStatus: 'success',
      encryptedData: 'encrypted-payload',
    });

    await waitFor(() => {
      expect(captureAnalyticsEvent).toHaveBeenCalledWith(
        'app_subscription_started',
        {
          provider: 'anthropic',
          key_source: 'credits',
          source: 'onboarding',
          billing_status: 'active',
          plan_label: 'Pro',
        }
      );
    });

    expect(provisionFromOnboarding).toHaveBeenCalledWith({
      encryptedPayload: 'encrypted-payload',
    });
    expect(saveOnboarding).toHaveBeenCalledWith({ completed: true });
    expect(navigate).toHaveBeenCalledWith({ to: '/app' });
  });
});
