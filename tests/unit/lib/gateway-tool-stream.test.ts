import { describe, expect, it } from 'vitest';

import { normalizeGatewayToolEventPayload } from '@/lib/gateway/tool-stream';

describe('normalizeGatewayToolEventPayload', () => {
  it('normalizes tool start events', () => {
    expect(
      normalizeGatewayToolEventPayload('agent', {
        runId: 'run-1',
        sessionKey: 'main',
        stream: 'tool',
        ts: 10,
        data: {
          phase: 'start',
          name: 'bash',
          toolCallId: 'tool-1',
          args: { cmd: 'ls -la' },
        },
      })
    ).toEqual({
      runId: 'run-1',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      toolName: 'bash',
      phase: 'start',
      state: 'input-available',
      input: { cmd: 'ls -la' },
      ts: 10,
      raw: expect.any(Object),
    });
  });

  it('normalizes tool update events with readable output', () => {
    expect(
      normalizeGatewayToolEventPayload('agent', {
        runId: 'run-1',
        sessionKey: 'main',
        stream: 'tool',
        ts: 11,
        data: {
          phase: 'update',
          name: 'bash',
          toolCallId: 'tool-1',
          partialResult: {
            content: [{ type: 'text', text: 'partial output' }],
          },
        },
      })
    ).toMatchObject({
      runId: 'run-1',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      phase: 'update',
      state: 'input-available',
      output: 'partial output',
    });
  });

  it('normalizes tool result errors', () => {
    expect(
      normalizeGatewayToolEventPayload('agent', {
        runId: 'run-1',
        sessionKey: 'main',
        stream: 'tool',
        ts: 12,
        data: {
          phase: 'result',
          name: 'bash',
          toolCallId: 'tool-1',
          isError: true,
          result: {
            error: 'permission denied',
          },
        },
      })
    ).toMatchObject({
      runId: 'run-1',
      sessionKey: 'main',
      toolCallId: 'tool-1',
      phase: 'result',
      state: 'output-error',
      errorText: 'permission denied',
    });
  });

  it('ignores non-tool agent events', () => {
    expect(
      normalizeGatewayToolEventPayload('agent', {
        runId: 'run-1',
        sessionKey: 'main',
        stream: 'assistant',
        ts: 13,
        data: {
          text: 'hello',
        },
      })
    ).toBeNull();
  });
});
