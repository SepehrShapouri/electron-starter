import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GatewayChatMessage } from '@/lib/gateway/chat';
import AppHome from '@/pages/app-home';

const messageParts = vi.hoisted(() => ({
  messages: [] as GatewayChatMessage[],
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

    render(<AppHome />);

    expect(screen.getAllByTestId('message')).toHaveLength(1);
    expect(screen.getAllByTestId('message-response')).toHaveLength(2);
    expect(screen.getByText('First chunk')).toBeInTheDocument();
    expect(screen.getByText('Second chunk')).toBeInTheDocument();
  });
});
