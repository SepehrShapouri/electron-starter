import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MagicLinkPage from '@/pages/magic-link';

const { magicLink, captureAnalyticsEvent } = vi.hoisted(() => ({
  magicLink: vi.fn().mockResolvedValue({}),
  captureAnalyticsEvent: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      magicLink,
    },
  },
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/components/auth/terms-checkbox', () => ({
  default: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <input
        aria-label="Accept terms"
        type="checkbox"
        checked={checked}
        onChange={event => onCheckedChange(event.target.checked)}
      />
      Accept terms
    </label>
  ),
}));

vi.mock('@/components/icons/Clawpilot.svg', () => ({
  default: () => <svg aria-hidden="true" />,
}));

vi.mock('@/components/icons/IconEmail1Sparkle.svg', () => ({
  default: () => <svg aria-hidden="true" />,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('MagicLinkPage analytics', () => {
  it('captures the signup magic link request event', async () => {
    const user = userEvent.setup();
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

    render(
      <QueryClientProvider client={queryClient}>
        <MagicLinkPage mode="signup" />
      </QueryClientProvider>
    );

    await user.type(screen.getByPlaceholderText('Email'), 'jane@example.com');
    await user.click(screen.getByLabelText('Accept terms'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(magicLink).toHaveBeenCalled();
    });

    expect(captureAnalyticsEvent).toHaveBeenCalledWith(
      'app_signup_magic_link_requested',
      {
        method: 'magic_link',
      }
    );
    expect(screen.getByText('Magic link sent.')).toBeInTheDocument();
  });
});
