import { describe, expect, it } from 'vitest';

import { getMessageText, normalizeChatEventPayload } from './chat';

describe('normalizeChatEventPayload', () => {
  it('normalizes structured part updates into tool parts', () => {
    const event = normalizeChatEventPayload(
      'chat.message.part.updated',
      {
        runId: 'run-1',
        sessionKey: 'main',
        messageId: 'msg-1',
        part: {
          id: 'part-1',
          type: 'tool',
          toolName: 'bash',
          state: 'running',
          input: { cmd: 'ls -la' },
        },
      },
      'fallback'
    );

    expect(event).toMatchObject({
      runId: 'run-1',
      sessionKey: 'main',
      state: 'delta',
      messageId: 'msg-1',
      messageRole: 'assistant',
    });
    expect(event?.part).toMatchObject({
      kind: 'tool',
      id: 'part-1',
      toolName: 'bash',
      state: 'input-available',
      input: { cmd: 'ls -la' },
    });
  });

  it('strips hidden think tags from legacy assistant text events', () => {
    const event = normalizeChatEventPayload(
      'chat',
      {
        runId: 'run-1',
        sessionKey: 'main',
        state: 'delta',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: '<think>secret</think>Hello from the gateway',
        },
      },
      'fallback'
    );

    expect(event?.message).toBeDefined();
    expect(getMessageText(event!.message!)).toBe('Hello from the gateway');
  });
});
