import { describe, expect, it } from 'vitest';

import {
  getMessageText,
  normalizeChatEventPayload,
  normalizeChatMessage,
} from './chat';

describe('normalizeChatEventPayload', () => {
  it('ignores tool part updates in the plain-text projection', () => {
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
    expect(event?.part).toBeUndefined();
  });

  it('drops tool-only history parts from the plain-text projection', () => {
    const message = normalizeChatMessage(
      {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            id: 'tool-1',
            type: 'tool',
            tool: 'bash',
            state: {
              status: 'completed',
              input: { cmd: 'pwd' },
              output: '/workspace',
            },
          },
        ],
      },
      'main'
    );

    expect(message).toMatchObject({
      id: 'msg-2',
      role: 'assistant',
      parts: [],
    });
    expect(getMessageText(message!)).toBe('');
  });

  it('includes error parts in the plain-text projection', () => {
    const message = normalizeChatMessage(
      {
        id: 'msg-3',
        role: 'assistant',
        parts: [
          {
            id: 'error-1',
            type: 'error',
            message: 'Gateway exploded',
          },
        ],
      },
      'main'
    );

    expect(message).toMatchObject({
      id: 'msg-3',
      role: 'assistant',
      parts: [
        {
          kind: 'error',
          id: 'error-1',
          message: 'Gateway exploded',
        },
      ],
    });
    expect(getMessageText(message!)).toBe('Gateway exploded');
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

  it('uses provided fallback ids for history messages without ids', () => {
    const message = normalizeChatMessage(
      {
        role: 'assistant',
        content: 'History message',
      },
      'main',
      {
        fallbackMessageId: 'main:history:7',
        fallbackCreatedAt: 7,
      }
    );

    expect(message).toMatchObject({
      id: 'main:history:7',
      createdAt: 7,
      role: 'assistant',
    });
  });
});
