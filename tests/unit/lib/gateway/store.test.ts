import { beforeEach, describe, expect, it } from 'vitest';

import { normalizeChatEventPayload } from '@/lib/gateway/chat';
import { gatewayStore } from '@/lib/gateway/store';

describe('gatewayStore chat events', () => {
  beforeEach(() => {
    const { actions } = gatewayStore.getState();
    actions.configure(null);
    actions.resetRuntime();
    actions.setActiveSessionKey('main');
  });

  it('keeps the streaming placeholder when non-text part updates are ignored', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-1', 'List files');
    actions.applyChatEvent({
      runId: 'run-1',
      sessionKey: 'main',
      state: 'delta',
      messageId: 'server-assistant-1',
      messageRole: 'assistant',
      messageCreatedAt: 10,
    });

    const state = gatewayStore.getState();
    const run = state.chat.runsById['run-1'];
    const assistant = state.chat.messagesBySession.main?.find(
      message => message.id === run?.assistantMessageId
    );

    expect(run?.assistantMessageId).toBe('local:assistant:run-1');
    expect(assistant?.status).toBe('streaming');
    expect(assistant?.parts).toEqual([]);
  });

  it('marks assistant messages as errored when a run fails', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-2', 'Do the thing');
    actions.applyChatEvent({
      runId: 'run-2',
      sessionKey: 'main',
      state: 'error',
      errorMessage: 'Gateway exploded',
    });

    const state = gatewayStore.getState();
    const run = state.chat.runsById['run-2'];
    const assistant = state.chat.messagesBySession.main?.find(
      message => message.id === run?.assistantMessageId
    );

    expect(run?.status).toBe('error');
    expect(assistant?.status).toBe('error');
    expect(assistant?.parts[0]).toEqual(
      expect.objectContaining({
        kind: 'error',
        message: 'Gateway exploded',
      })
    );
  });

  it('replaces streaming assistant text instead of stacking each delta', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-3', 'Hello?');

    const firstDelta = normalizeChatEventPayload(
      'chat',
      {
        runId: 'run-3',
        sessionKey: 'main',
        state: 'delta',
        message: {
          role: 'assistant',
          content: "I'm good! Honestly, I'm in",
        },
      },
      'main'
    );
    const secondDelta = normalizeChatEventPayload(
      'chat',
      {
        runId: 'run-3',
        sessionKey: 'main',
        state: 'delta',
        message: {
          role: 'assistant',
          content:
            'I\'m good! Honestly, I\'m in that weird "first day of existence" vibe',
        },
      },
      'main'
    );

    actions.applyChatEvent(firstDelta!);
    actions.applyChatEvent(secondDelta!);

    const state = gatewayStore.getState();
    const assistant = state.chat.messagesBySession.main?.find(
      message => message.role === 'assistant'
    );

    expect(assistant?.parts).toHaveLength(1);
    expect(assistant?.parts[0]).toEqual(
      expect.objectContaining({
        kind: 'text',
        text: 'I\'m good! Honestly, I\'m in that weird "first day of existence" vibe',
      })
    );
  });

  it('keeps queued messages when the connection enters auth_failed', () => {
    const { actions } = gatewayStore.getState();

    const queued = actions.queueChatMessage('main', 'Retry later');
    actions.setConnectionStatus('auth_failed', {
      closeCode: 1008,
      failureKind: 'auth',
      disconnectReason: 'pairing required',
      error: 'pairing required',
    });

    const state = gatewayStore.getState();
    expect(state.connection.status).toBe('auth_failed');
    expect(state.health.lastFailureKind).toBe('auth');
    expect(state.health.lastCloseCode).toBe(1008);
    expect(state.chat.queuesBySession.main).toEqual([queued]);
  });
});
