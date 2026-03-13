import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';

const mockUpdateState: AppUpdateState = {
  status: 'disabled',
  supported: false,
  currentVersion: '1.0.0',
  availableVersion: null,
  releaseNotes: null,
  checkedAt: null,
  message: 'Automatic updates are disabled in development builds.',
};

beforeEach(() => {
  window.electronAPI = {
    isFullscreen: vi.fn(async () => false),
    onFullscreenChange: vi.fn(() => () => {}),
    getAppUpdateState: vi.fn(async () => mockUpdateState),
    checkForAppUpdates: vi.fn(async () => mockUpdateState),
    installAppUpdate: vi.fn(async () => false),
    onAppUpdateStateChange: vi.fn(() => () => {}),
    openExternalUrl: vi.fn(async () => undefined),
    getPendingAuthDeepLink: vi.fn(async () => null),
    onAuthDeepLink: vi.fn(() => () => {}),
  };
});

describe('App', () => {
  it('renders the starter shell', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: /electron update starter/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/single-route boilerplate with updater wiring/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /electron/i })
    ).toBeInTheDocument();
  });
});
