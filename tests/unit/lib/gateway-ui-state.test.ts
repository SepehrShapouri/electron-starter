import { describe, expect, it } from 'vitest';

import { getGatewayBadgeState } from '@/components/app/app-layout';
import {
  getGatewayErrorContent,
  shouldShowGatewayWakeState,
} from '@/pages/app-home';
import { getGatewayChatStatus } from '@/lib/use-gateway-chat';

describe('gateway UI state', () => {
  it('returns auth-specific badge copy for auth failures', () => {
    expect(
      getGatewayBadgeState({ status: 'auth_failed', stale: false })
    ).toEqual({
      variant: 'secondaryDestructive',
      label: 'Auth required',
    });
  });

  it('returns auth-specific error copy for auth failures', () => {
    expect(getGatewayErrorContent(true)).toEqual({
      title: 'Authentication required',
      description:
        'Your gateway credentials or device pairing were rejected. Refresh access or repair the device, then reconnect.',
      actionLabel: 'Reconnect',
    });
  });

  it('keeps retry-oriented copy for generic connection issues', () => {
    expect(getGatewayErrorContent(false)).toEqual({
      title: 'Connection issue',
      description:
        'We are having issues waking up your lobster, please try again or if the issue persists, reach out to us.',
      actionLabel: 'Try again',
    });
  });

  it('maps reconnecting connections to a non-blocking chat status', () => {
    expect(
      getGatewayChatStatus({
        connectionStatus: 'reconnecting',
        currentRunId: null,
      })
    ).toBe('reconnecting');
  });

  it('only shows the wake screen for initial connecting with no history', () => {
    expect(
      shouldShowGatewayWakeState({
        status: 'connecting',
        historyLoaded: false,
        isEmptyConversation: true,
      })
    ).toBe(true);

    expect(
      shouldShowGatewayWakeState({
        status: 'reconnecting',
        historyLoaded: false,
        isEmptyConversation: false,
      })
    ).toBe(false);
  });
});
