'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import {
  getToolMessageParts,
  getVisibleMessageParts,
  type GatewayChatMessage,
  type GatewayChatToolPart,
} from '@/lib/gateway/chat';
import type {
  GatewayToolStreamEntry,
  GatewayToolStreamState,
} from '@/lib/gateway/tool-stream';

type ChatConversationProps = {
  messages: GatewayChatMessage[];
  toolEntries: GatewayToolStreamEntry[];
};

type ConversationItem =
  | {
      key: string;
      kind: 'message';
      message: GatewayChatMessage;
    }
  | {
      key: string;
      kind: 'tool-entry';
      entry: GatewayToolStreamEntry;
    };

const VALID_TOOL_STATES = new Set<GatewayToolStreamState>([
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
  'output-available',
  'output-error',
  'output-denied',
]);

function isToolState(value: string | undefined): value is GatewayToolStreamState {
  return (
    typeof value === 'string' &&
    VALID_TOOL_STATES.has(value as GatewayToolStreamState)
  );
}

function getHistoricalToolState(
  message: GatewayChatMessage,
  part: GatewayChatToolPart
): GatewayToolStreamState {
  if (message.status === 'error') {
    return 'output-error';
  }

  if (
    part.state === 'output-error' ||
    part.state === 'output-denied' ||
    part.state === 'output-available'
  ) {
    return part.state;
  }

  return 'output-available';
}

function renderThinkingBubble() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2 text-muted-foreground">
      <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
      <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
      <span className="size-2 animate-bounce rounded-full bg-current" />
    </div>
  );
}

function renderToolCard(
  toolName: string,
  state: GatewayToolStreamState,
  input?: unknown,
  output?: unknown,
  errorText?: string
) {
  return (
    <Tool className='bg-background-3 p-3'>
      <ToolHeader type="dynamic-tool" className='p-0' toolName={toolName} state={state} />
      <ToolContent>
        {input !== undefined ? <ToolInput input={input} /> : null}
        {output !== undefined || errorText ? (
          <ToolOutput output={output} errorText={errorText} />
        ) : null}
      </ToolContent>
    </Tool>
  );
}

function isConversationMessage(message: GatewayChatMessage) {
  if (message.role === 'toolResult') {
    return false;
  }

  return (
    message.status === 'streaming' ||
    getVisibleMessageParts(message).length > 0 ||
    getToolMessageParts(message).length > 0
  );
}

export function hasConversationItems(
  messages: GatewayChatMessage[],
  toolEntries: GatewayToolStreamEntry[]
) {
  return messages.some(isConversationMessage) || toolEntries.length > 0;
}

function buildConversationItems(
  messages: GatewayChatMessage[],
  toolEntries: GatewayToolStreamEntry[]
): ConversationItem[] {
  const baseItems: ConversationItem[] = messages
    .filter(isConversationMessage)
    .map(message => ({
      key: `message:${message.id}`,
      kind: 'message',
      message,
    }));

  if (toolEntries.length === 0) {
    return baseItems;
  }

  const toolItemsByMessageId = new Map<string, ConversationItem[]>();
  const trailingToolItems: ConversationItem[] = [];

  for (const entry of toolEntries) {
    const item: ConversationItem = {
      key: `tool-entry:${entry.toolCallId}:${entry.updatedAt}`,
      kind: 'tool-entry',
      entry,
    };

    if (!entry.assistantMessageId) {
      trailingToolItems.push(item);
      continue;
    }

    const existing = toolItemsByMessageId.get(entry.assistantMessageId) ?? [];
    existing.push(item);
    toolItemsByMessageId.set(entry.assistantMessageId, existing);
  }

  const orderedItems: ConversationItem[] = [];
  for (const item of baseItems) {
    if (item.kind === 'message') {
      const anchoredToolItems = toolItemsByMessageId.get(item.message.id);
      if (anchoredToolItems && anchoredToolItems.length > 0) {
        orderedItems.push(...anchoredToolItems);
        toolItemsByMessageId.delete(item.message.id);
      }
    }

    orderedItems.push(item);
  }

  const orphanedToolItems = [...toolItemsByMessageId.values()].flat();
  return [...orderedItems, ...orphanedToolItems, ...trailingToolItems];
}

function renderMessage(message: GatewayChatMessage) {
  const visibleParts = getVisibleMessageParts(message);
  const toolParts = getToolMessageParts(message);

  if (visibleParts.length === 0 && toolParts.length === 0) {
    if (message.role === 'assistant' && message.status === 'streaming') {
      return (
        <Message key={message.id} from="assistant">
          <MessageContent>{renderThinkingBubble()}</MessageContent>
        </Message>
      );
    }

    return null;
  }

  if (visibleParts.length === 0 && toolParts.length > 0) {
    return (
      <Message key={message.id} from="assistant">
        <MessageContent>
          {toolParts.map(part => (
            <div key={part.id}>
              {renderToolCard(
                part.toolName ?? 'tool',
                getHistoricalToolState(message, part),
                part.input,
                part.output,
                part.errorText
              )}
            </div>
          ))}
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message key={message.id} from={message.role === 'user' ? 'user' : 'assistant'}>
      <MessageContent>
        {visibleParts.map(part => (
          <MessageResponse key={part.id}>
            {part.kind === 'text' ? part.text : part.message}
          </MessageResponse>
        ))}
      </MessageContent>
    </Message>
  );
}

function renderToolEntry(entry: GatewayToolStreamEntry) {
  return (
    <Message key={`tool-entry:${entry.toolCallId}`} from="assistant">
      <MessageContent>
        {renderToolCard(
          entry.toolName,
          isToolState(entry.state) ? entry.state : 'input-available',
          entry.input,
          entry.output,
          entry.errorText
        )}
      </MessageContent>
    </Message>
  );
}

export function ChatConversation({
  messages,
  toolEntries,
}: ChatConversationProps) {
  const items = buildConversationItems(messages, toolEntries);

  return (
    <Conversation className="h-full min-h-0">
      <ConversationContent className='py-8 px-0 gap-6'>
        {items.map(item =>
          item.kind === 'message'
            ? renderMessage(item.message)
            : renderToolEntry(item.entry)
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
