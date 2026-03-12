import { describe, expect, it } from 'vitest';

import {
  getVisibleMessageParts,
  hasRenderableMessage,
  getMessageText,
  normalizeChatEventPayload,
  normalizeChatMessage,
} from '@/lib/gateway/chat';

describe('normalizeChatEventPayload', () => {
  it('preserves tool part updates in the structured model', () => {
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
      type: 'tool',
      toolName: 'bash',
      state: 'running',
      input: { cmd: 'ls -la' },
    });
  });

  it('preserves tool-only history parts while hiding them from visible text', () => {
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
      parts: [
        {
          kind: 'tool',
          id: 'tool-1',
          type: 'tool',
          toolName: 'bash',
          state: 'completed',
          input: { cmd: 'pwd' },
          output: '/workspace',
        },
      ],
    });
    expect(getVisibleMessageParts(message!)).toEqual([]);
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

  it('defaults part updates to the assistant role when role metadata is missing', () => {
    const event = normalizeChatEventPayload(
      'chat.message.part.updated',
      {
        runId: 'run-2',
        sessionKey: 'main',
        messageId: 'msg-roleless',
        part: {
          id: 'part-roleless',
          type: 'text',
          text: 'Hello there',
        },
      },
      'fallback'
    );

    expect(event).toMatchObject({
      runId: 'run-2',
      sessionKey: 'main',
      messageId: 'msg-roleless',
      messageRole: 'assistant',
      part: {
        kind: 'text',
        text: 'Hello there',
      },
    });
  });

  it('preserves unknown parts for future rendering', () => {
    const message = normalizeChatMessage(
      {
        id: 'msg-unknown',
        role: 'assistant',
        parts: [
          {
            id: 'image-1',
            type: 'image',
            url: 'https://example.com/image.png',
          },
        ],
      },
      'main'
    );

    expect(message).toMatchObject({
      id: 'msg-unknown',
      parts: [
        {
          kind: 'unknown',
          id: 'image-1',
          type: 'image',
        },
      ],
    });
    expect(getVisibleMessageParts(message!)).toEqual([]);
  });

  it('treats tool-only final messages as hidden but keeps streaming placeholders renderable', () => {
    const finalToolOnly = normalizeChatMessage(
      {
        id: 'msg-tool-final',
        role: 'assistant',
        parts: [
          {
            id: 'tool-final',
            type: 'tool',
            toolName: 'bash',
            state: 'output-available',
            output: 'done',
          },
        ],
      },
      'main'
    );
    const streamingPlaceholder = {
      id: 'msg-tool-stream',
      sessionKey: 'main',
      role: 'assistant' as const,
      status: 'streaming' as const,
      createdAt: 1,
      parts: [
        {
          kind: 'tool' as const,
          id: 'tool-stream',
          type: 'tool',
          toolName: 'bash',
          state: 'running',
          raw: {},
        },
      ],
    };

    expect(hasRenderableMessage(finalToolOnly!)).toBe(false);
    expect(hasRenderableMessage(streamingPlaceholder)).toBe(true);
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
