import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GatewayChatMessage } from '@/lib/gateway/chat';
import type { GatewayToolStreamEntry } from '@/lib/gateway/tool-stream';
import AppHome from '@/pages/app-home';

const messageParts = vi.hoisted(() => ({
  messages: [] as GatewayChatMessage[],
  toolEntries: [] as GatewayToolStreamEntry[],
}));

vi.mock('@tanstack/react-router', () => ({
  useRouteContext: () => ({
    session: null,
  }),
}));

vi.mock('@/lib/use-gateway-provision', () => ({
  useGatewayProvision: () => ({
    provisionQuery: {
      data: {
        status: 'running',
      },
      isLoading: false,
      isError: false,
      error: null,
    },
    chatConfig: {
      gatewayUrl: 'ws://127.0.0.1:18789',
      sessionKey: 'main',
    },
  }),
}));

vi.mock('@/lib/use-gateway-chat', () => ({
  useGatewayChat: () => ({
    status: 'ready',
    error: null,
    queue: [],
    connected: true,
    connect: vi.fn(),
    messages: messageParts.messages,
    toolEntries: messageParts.toolEntries,
    sendMessage: vi.fn(),
    removeFromQueue: vi.fn(),
    abort: vi.fn(),
    loadHistory: vi.fn(),
    historyLoaded: true,
  }),
}));

vi.mock('@/lib/gateway/store', () => ({
  useGatewayChatSession: () => ({
    sessionKey: 'main',
  }),
  useGatewayConnection: () => ({
    status: 'ready',
    lastFailureKind: null,
  }),
}));

vi.mock('@/lib/use-context-usage', () => ({
  useContextUsage: () => null,
}));

vi.mock('@/components/bars-spinner', () => ({
  BarsSpinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/app/queue-pill', () => ({
  QueuePill: () => null,
}));

vi.mock('@/components/app/instance-launching', () => ({
  InstanceLaunching: () => <div>Launching</div>,
}));

vi.mock('@/components/app/instance-setup', () => ({
  InstanceSetup: () => <div>Setup</div>,
}));

vi.mock('@/components/ai-elements/conversation', () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation-content">{children}</div>
  ),
  ConversationScrollButton: () => null,
}));

vi.mock('@/components/ai-elements/message', () => ({
  Message: ({
    children,
    from,
  }: {
    children: React.ReactNode;
    from: string;
  }) => (
    <div data-testid="message" data-from={from}>
      {children}
    </div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-content">{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-response">{children}</div>
  ),
}));

vi.mock('@/components/ai-elements/context', () => ({
  Context: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextContentHeader: () => null,
  ContextTrigger: () => null,
}));

vi.mock('@/components/ai-elements/tool', () => ({
  Tool: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tool-card">{children}</div>
  ),
  ToolHeader: ({
    toolName,
    state,
  }: {
    toolName: string;
    state: string;
  }) => <div>{`${toolName}:${state}`}</div>,
  ToolContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolInput: ({ input }: { input: unknown }) => (
    <div>{JSON.stringify(input)}</div>
  ),
  ToolOutput: ({
    output,
    errorText,
  }: {
    output?: unknown;
    errorText?: string;
  }) => <div>{errorText ?? JSON.stringify(output)}</div>,
}));

vi.mock('@/components/ai-elements/prompt-input', () => ({
  PromptInput: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: () => <button type="button">Submit</button>,
  PromptInputTextarea: () => <textarea aria-label="Prompt" />,
}));

describe('AppHome structured chat rendering', () => {
  it('renders multiple message parts inside a single chat bubble', () => {
    messageParts.messages = [
      {
        id: 'assistant-1',
        sessionKey: 'main',
        role: 'assistant',
        status: 'streaming',
        createdAt: 1,
        parts: [
          {
            kind: 'tool',
            id: 'tool-1',
            type: 'tool',
            toolName: 'bash',
            state: 'running',
            raw: {},
          },
          {
            kind: 'text',
            id: 'text-1',
            type: 'text',
            text: 'First chunk',
            raw: 'First chunk',
          },
          {
            kind: 'text',
            id: 'text-2',
            type: 'text',
            text: 'Second chunk',
            raw: 'Second chunk',
          },
        ],
      },
    ];
    messageParts.toolEntries = [];

    render(<AppHome />);

    expect(screen.getAllByTestId('message')).toHaveLength(1);
    expect(screen.getAllByTestId('message-response')).toHaveLength(2);
    expect(screen.getByText('First chunk')).toBeInTheDocument();
    expect(screen.getByText('Second chunk')).toBeInTheDocument();
  });

  it('renders tool cards as separate assistant activity without duplicating message bubbles', () => {
    messageParts.messages = [
      {
        id: 'user-1',
        sessionKey: 'main',
        role: 'user',
        status: 'final',
        createdAt: 1,
        parts: [
          {
            kind: 'text',
            id: 'user-1:part:0',
            type: 'text',
            text: 'Inspect this',
            raw: 'Inspect this',
          },
        ],
      },
      {
        id: 'assistant-1',
        sessionKey: 'main',
        role: 'assistant',
        status: 'streaming',
        createdAt: 2,
        parts: [],
      },
    ];
    messageParts.toolEntries = [
      {
        toolCallId: 'tool-1',
        runId: 'run-1',
        sessionKey: 'main',
        assistantMessageId: 'assistant-1',
        toolName: 'bash',
        state: 'input-available',
        input: { cmd: 'ls -la' },
        startedAt: 3,
        updatedAt: 3,
      },
    ];

    render(<AppHome />);

    expect(screen.getAllByTestId('message')).toHaveLength(3);
    expect(screen.getAllByTestId('tool-card')).toHaveLength(1);
    expect(screen.getByText('bash:input-available')).toBeInTheDocument();
  });

  it('keeps a completed tool card anchored before its original assistant message after follow-up starts', () => {
    messageParts.messages = [
      {
        id: 'assistant-old',
        sessionKey: 'main',
        role: 'assistant',
        status: 'final',
        createdAt: 1,
        parts: [
          {
            kind: 'text',
            id: 'assistant-old:part:0',
            type: 'text',
            text: 'First answer',
            raw: 'First answer',
          },
        ],
      },
      {
        id: 'user-follow-up',
        sessionKey: 'main',
        role: 'user',
        status: 'final',
        createdAt: 2,
        parts: [
          {
            kind: 'text',
            id: 'user-follow-up:part:0',
            type: 'text',
            text: 'What next?',
            raw: 'What next?',
          },
        ],
      },
      {
        id: 'assistant-follow-up',
        sessionKey: 'main',
        role: 'assistant',
        status: 'streaming',
        createdAt: 3,
        parts: [
          {
            kind: 'text',
            id: 'assistant-follow-up:part:0',
            type: 'text',
            text: 'Follow-up answer',
            raw: 'Follow-up answer',
          },
        ],
      },
    ];
    messageParts.toolEntries = [
      {
        toolCallId: 'tool-1',
        runId: 'run-old',
        sessionKey: 'main',
        assistantMessageId: 'assistant-old',
        toolName: 'bash',
        state: 'output-available',
        input: { cmd: 'ls -la' },
        output: 'done',
        startedAt: 1,
        updatedAt: 2,
      },
    ];

    render(<AppHome />);

    const conversation = screen.getByTestId('conversation-content');
    const text = conversation.textContent ?? '';
    expect(text.indexOf('bash:output-available')).toBeLessThan(
      text.indexOf('First answer')
    );
    expect(text.indexOf('First answer')).toBeLessThan(
      text.indexOf('What next?')
    );
  });

  it('renders canonical tool call history after the live stream is gone', () => {
    messageParts.messages = [
      {
        id: 'assistant-tool-call',
        sessionKey: 'main',
        role: 'assistant',
        status: 'final',
        createdAt: 3,
        parts: [
          {
            kind: 'tool',
            id: 'call_1',
            type: 'toolCall',
            toolName: 'bash',
            state: 'input-available',
            input: { cmd: 'ls -la' },
            raw: {},
          },
        ],
      },
    ];
    messageParts.toolEntries = [];

    render(<AppHome />);

    expect(screen.getAllByTestId('tool-card')).toHaveLength(1);
    expect(screen.getByText('bash:output-available')).toBeInTheDocument();
    expect(screen.queryByTestId('message-response')).not.toBeInTheDocument();
  });

  it('hides historical tool result messages from the conversation UI', () => {
    messageParts.messages = [
      {
        id: 'assistant-tool-call',
        sessionKey: 'main',
        role: 'assistant',
        status: 'final',
        createdAt: 1,
        raw: {
          content: [
            {
              type: 'toolCall',
              id: 'call_1',
              name: 'bash',
              arguments: { cmd: 'ls -la' },
            },
          ],
        },
        parts: [
          {
            kind: 'tool',
            id: 'call_1',
            type: 'toolCall',
            toolName: 'bash',
            state: 'input-available',
            input: { cmd: 'ls -la' },
            raw: {},
          },
        ],
      },
      {
        id: 'tool-result-1',
        sessionKey: 'main',
        role: 'toolResult',
        status: 'final',
        createdAt: 2,
        raw: {
          toolCallId: 'call_1',
          toolName: 'bash',
        },
        parts: [
          {
            kind: 'text',
            id: 'tool-result-1:part:0',
            type: 'text',
            text: 'command output here',
            raw: 'command output here',
          },
        ],
      },
    ];
    messageParts.toolEntries = [];

    render(<AppHome />);

    expect(screen.getAllByTestId('message')).toHaveLength(1);
    expect(screen.getAllByTestId('tool-card')).toHaveLength(1);
    expect(screen.getByText('bash:output-available')).toBeInTheDocument();
    expect(screen.queryByText('command output here')).not.toBeInTheDocument();
  });
});
