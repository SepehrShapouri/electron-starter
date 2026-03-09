import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IntegrationsPage from './integrations';

const { getComposioStatus } = vi.hoisted(() => ({
  getComposioStatus: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/integrations-api', () => ({
  integrationsApi: {
    getComposioStatus,
  },
}));

vi.mock('gsap', () => ({
  default: {
    context: (callback: () => void) => {
      callback();
      return {
        revert: vi.fn(),
      };
    },
    timeline: () => {
      const chain = {
        fromTo: vi.fn(() => chain),
      };

      return chain;
    },
    to: vi.fn(),
  },
}));

vi.mock('@/features/integrations/components/integration-card', () => ({
  IntegrationCard: ({
    integration,
  }: {
    integration: { name: string; description: string };
  }) => (
    <article>
      <h2>{integration.name}</h2>
      <p>{integration.description}</p>
    </article>
  ),
}));

vi.mock('@/features/integrations/components/integration-details-sheet', () => ({
  IntegrationDetailsSheet: () => null,
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IntegrationsPage />
    </QueryClientProvider>
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('IntegrationsPage', () => {
  it('filters integrations from the search bar and can clear the query', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search integrations' }),
      'google_calendar'
    );

    expect(screen.queryByText('Gmail')).not.toBeInTheDocument();
    expect(screen.queryByText('Slack')).not.toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });

  it('matches integrations by capabilities, not just visible titles', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search integrations' }),
      'reactions'
    );

    expect(screen.queryByText('Gmail')).not.toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();
  });

  it('shows the shared empty state when search has no matches', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search integrations' }),
      'discord'
    );

    const emptyState = screen
      .getByText('No matching integrations')
      .closest('[data-slot="empty"]');

    expect(emptyState).not.toBeNull();
    expect(
      screen.getByText(
        'No integrations matched "discord". Try another service, capability, or keyword.'
      )
    ).toBeInTheDocument();

    await user.click(
      within(emptyState as HTMLElement).getByRole('button', {
        name: 'Clear search',
      })
    );

    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });
});
