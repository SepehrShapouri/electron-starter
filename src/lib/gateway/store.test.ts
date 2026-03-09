import { beforeEach, describe, expect, it } from 'vitest';

import { gatewayStore } from './store';

describe('gatewayStore chat events', () => {
  beforeEach(() => {
    const { actions } = gatewayStore.getState();
    actions.configure(null);
    actions.resetRuntime();
    actions.setActiveSessionKey('main');
  });

  it('reconciles local placeholders with structured part updates', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-1', 'List files');
    actions.applyChatEvent({
      runId: 'run-1',
      sessionKey: 'main',
      state: 'delta',
      messageId: 'server-assistant-1',
      messageRole: 'assistant',
      messageCreatedAt: 10,
      part: {
        kind: 'tool',
        id: 'part-1',
        toolName: 'bash',
        toolType: 'tool',
        state: 'input-available',
        input: { cmd: 'ls -la' },
      },
    });

    const state = gatewayStore.getState();
    const run = state.chat.runsById['run-1'];
    const assistant = state.chat.messagesBySession.main?.find(
      message => message.id === 'server-assistant-1'
    );

    expect(run?.assistantMessageId).toBe('server-assistant-1');
    expect(assistant?.status).toBe('streaming');
    expect(assistant?.parts).toEqual([
      expect.objectContaining({
        kind: 'tool',
        id: 'part-1',
      }),
    ]);
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
});
