import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Signup from '@/pages/Signup';

const {
  signUp,
  captureAnalyticsEvent,
  clearPendingSignupIntent,
  identifyAnalyticsUser,
  navigate,
} = vi.hoisted(() => ({
  signUp: vi.fn().mockResolvedValue({}),
  captureAnalyticsEvent: vi.fn(),
  clearPendingSignupIntent: vi.fn(),
  identifyAnalyticsUser: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/lib/auth-api', () => ({
  authApi: {
    signUp,
  },
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent,
  clearPendingSignupIntent,
  identifyAnalyticsUser,
  setPendingSignupIntent: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => navigate,
}));

vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(() => ({
      kill: vi.fn(),
    })),
    timeline: vi.fn(() => {
      const chain = {
        to: vi.fn(() => chain),
      };

      return chain;
    }),
  },
}));

vi.mock('@/components/icons/Google.svg', () => ({
  default: () => <svg aria-hidden="true" />,
}));

vi.mock('@/components/icons/IconScanTextSparkle.svg', () => ({
  default: () => <svg aria-hidden="true" />,
}));

const renderPage = () => {
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
      <Signup />
    </QueryClientProvider>
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('Signup analytics', () => {
  it('captures app_signup after email sign up succeeds', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByPlaceholderText('Enter your name'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Email'), 'jane@example.com');
    await user.type(
      screen.getByPlaceholderText('Enter password'),
      'password123'
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalled();
    });

    expect(signUp.mock.calls[0]?.[0]).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    });
    expect(clearPendingSignupIntent).toHaveBeenCalledTimes(1);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('app_signup', {
      method: 'email_password',
    });
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding' });
  });
});
