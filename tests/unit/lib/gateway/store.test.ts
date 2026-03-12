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

  it('keeps the streaming placeholder and stores hidden tool parts on part updates', () => {
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
        id: 'tool-1',
        type: 'tool',
        toolName: 'bash',
        state: 'running',
        input: { cmd: 'ls -la' },
        raw: {
          id: 'tool-1',
          type: 'tool',
          toolName: 'bash',
          state: 'running',
          input: { cmd: 'ls -la' },
        },
      },
    });

    const state = gatewayStore.getState();
    const run = state.chat.runsById['run-1'];
    const assistant = state.chat.messagesBySession.main?.find(
      message => message.id === run?.assistantMessageId
    );

    expect(run?.assistantMessageId).toBe('server-assistant-1');
    expect(assistant?.status).toBe('streaming');
    expect(assistant?.parts).toEqual([
      expect.objectContaining({
        kind: 'tool',
        id: 'tool-1',
        toolName: 'bash',
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

  it('keeps a legacy chat delta/final sequence in a single assistant message', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-legacy', 'Hello?');
    const firstDelta = normalizeChatEventPayload(
      'chat',
      {
        runId: 'run-legacy',
        sessionKey: 'main',
        state: 'delta',
        message: {
          role: 'assistant',
          content: 'First draft',
        },
      },
      'main'
    );
    const finalEvent = normalizeChatEventPayload(
      'chat',
      {
        runId: 'run-legacy',
        sessionKey: 'main',
        state: 'final',
        message: {
          role: 'assistant',
          content: 'Final answer',
        },
      },
      'main'
    );

    actions.applyChatEvent(firstDelta!);
    actions.applyChatEvent(finalEvent!);

    const state = gatewayStore.getState();
    const assistantMessages =
      state.chat.messagesBySession.main?.filter(
        message => message.role === 'assistant'
      ) ?? [];

    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0]).toMatchObject({
      id: 'main:run-legacy:assistant',
      status: 'final',
    });
    expect(assistantMessages[0]?.parts).toEqual([
      expect.objectContaining({
        kind: 'text',
        text: 'Final answer',
      }),
    ]);
  });

  it('keeps all part updates inside one assistant bubble', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-parts', 'Inspect');
    actions.applyChatEvent({
      runId: 'run-parts',
      sessionKey: 'main',
      state: 'delta',
      messageId: 'assistant-msg-1',
      messageRole: 'assistant',
      messageCreatedAt: 20,
      part: {
        kind: 'tool',
        id: 'tool-1',
        type: 'tool',
        toolName: 'bash',
        state: 'running',
        input: { cmd: 'ls -la' },
        raw: {},
      },
    });
    actions.applyChatEvent({
      runId: 'run-parts',
      sessionKey: 'main',
      state: 'delta',
      messageId: 'assistant-msg-1',
      messageRole: 'assistant',
      messageCreatedAt: 20,
      part: {
        kind: 'text',
        id: 'text-1',
        type: 'text',
        text: 'Found 4 files',
        raw: 'Found 4 files',
      },
    });

    const state = gatewayStore.getState();
    const assistantMessages =
      state.chat.messagesBySession.main?.filter(
        message => message.role === 'assistant'
      ) ?? [];

    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0]?.parts).toEqual([
      expect.objectContaining({ kind: 'tool', id: 'tool-1' }),
      expect.objectContaining({ kind: 'text', id: 'text-1', text: 'Found 4 files' }),
    ]);
  });

  it('reconciles local placeholders with hydrated history instead of duplicating them', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-history', 'Hello history');
    actions.hydrateChatHistory('main', [
      {
        id: 'server-user-1',
        sessionKey: 'main',
        role: 'user',
        status: 'final',
        createdAt: 100,
        parts: [
          {
            kind: 'text',
            id: 'server-user-1:part:0',
            type: 'text',
            text: 'Hello history',
            raw: 'Hello history',
          },
        ],
      },
      {
        id: 'server-assistant-1',
        sessionKey: 'main',
        role: 'assistant',
        status: 'final',
        createdAt: 101,
        parts: [
          {
            kind: 'text',
            id: 'server-assistant-1:part:0',
            type: 'text',
            text: 'Hi back',
            raw: 'Hi back',
          },
        ],
      },
    ]);

    const state = gatewayStore.getState();
    const messages = state.chat.messagesBySession.main ?? [];

    expect(messages).toHaveLength(2);
    expect(messages.map(message => message.id)).toEqual([
      'server-user-1',
      'server-assistant-1',
    ]);
  });

  it('stores tool events only for the active run in the active session', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-tools', 'Inspect');
    actions.applyToolEvent({
      runId: 'run-tools',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'start',
      state: 'input-available',
      input: { cmd: 'ls -la' },
      ts: 10,
      raw: {},
    });
    actions.applyToolEvent({
      runId: 'run-other',
      sessionKey: 'main',
      toolCallId: 'tool-2',
      toolName: 'bash',
      phase: 'start',
      state: 'input-available',
      input: { cmd: 'pwd' },
      ts: 11,
      raw: {},
    });

    const state = gatewayStore.getState();
    expect(state.chat.toolStreamBySession.main).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-1',
        runId: 'run-tools',
        toolName: 'bash',
      }),
    ]);
  });

  it('updates tool stream entries in place and keeps them after final chat state', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-tools-final', 'Inspect');
    actions.applyToolEvent({
      runId: 'run-tools-final',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'start',
      state: 'input-available',
      input: { cmd: 'ls -la' },
      ts: 10,
      raw: {},
    });
    actions.applyToolEvent({
      runId: 'run-tools-final',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'update',
      state: 'input-available',
      output: 'partial output',
      ts: 11,
      raw: {},
    });
    actions.applyToolEvent({
      runId: 'run-tools-final',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'result',
      state: 'output-available',
      output: 'done',
      ts: 12,
      raw: {},
    });

    let state = gatewayStore.getState();
    expect(state.chat.toolStreamBySession.main).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-1',
        assistantMessageId: 'local:assistant:run-tools-final',
        input: { cmd: 'ls -la' },
        output: 'done',
        state: 'output-available',
      }),
    ]);

    actions.applyChatEvent({
      runId: 'run-tools-final',
      sessionKey: 'main',
      state: 'final',
      message: {
        id: 'assistant-final',
        sessionKey: 'main',
        role: 'assistant',
        status: 'final',
        createdAt: 20,
        parts: [
          {
            kind: 'text',
            id: 'assistant-final:part:0',
            type: 'text',
            text: 'Done',
            raw: 'Done',
          },
        ],
      },
    });

    state = gatewayStore.getState();
    expect(state.chat.toolStreamBySession.main).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-1',
        assistantMessageId: 'assistant-final',
        input: { cmd: 'ls -la' },
        output: 'done',
        state: 'output-available',
      }),
    ]);
  });

  it('keeps completed tool entries across follow-up sends until history supersedes them', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-tools-history', 'Inspect');
    actions.applyToolEvent({
      runId: 'run-tools-history',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'result',
      state: 'output-available',
      output: 'done',
      ts: 12,
      raw: {},
    });

    actions.beginChatRun('main', 'run-follow-up', 'Follow up');

    expect(gatewayStore.getState().chat.toolStreamBySession.main).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-1',
        runId: 'run-tools-history',
      }),
    ]);
  });

  it('clears only tool entries that are superseded by hydrated canonical history', () => {
    const { actions } = gatewayStore.getState();

    actions.beginChatRun('main', 'run-tools-history', 'Inspect');
    actions.applyToolEvent({
      runId: 'run-tools-history',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'result',
      state: 'output-available',
      output: 'done',
      ts: 12,
      raw: {},
    });
    actions.applyToolEvent({
      runId: 'run-tools-history',
      sessionKey: 'main',
      toolCallId: 'tool-2',
      toolName: 'grep',
      phase: 'result',
      state: 'output-available',
      output: 'found',
      ts: 13,
      raw: {},
    });

    actions.hydrateChatHistory('main', [
      {
        id: 'assistant-final',
        sessionKey: 'main',
        role: 'assistant',
        status: 'final',
        createdAt: 20,
        parts: [
          {
            kind: 'tool',
            id: 'tool-1',
            type: 'toolCall',
            toolName: 'bash',
            state: 'input-available',
            input: { cmd: 'ls -la' },
            raw: {},
          },
        ],
      },
    ]);

    expect(gatewayStore.getState().chat.toolStreamBySession.main).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-2',
      }),
    ]);
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
