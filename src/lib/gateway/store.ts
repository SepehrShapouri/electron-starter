import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createStore } from 'zustand/vanilla';

import type { GatewayHelloOk } from '@/lib/gateway-client';

import type { GatewayConnectionConfig } from './config';
import type {
  GatewayChatMessage,
  GatewayChatRun,
  GatewayQueueItem,
  GatewayChatRole,
  GatewayChatMessageStatus,
  NormalizedGatewayChatEvent,
  SessionDefaultsSnapshot,
} from './chat';
import {
  getMessageText,
  getToolMessageParts,
  normalizeSessionDefaults,
  normalizeSessionKeyForDefaults,
} from './chat';
import type {
  GatewayToolStreamEntry,
  NormalizedGatewayToolEvent,
} from './tool-stream';

export type GatewayConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'ready'
  | 'degraded'
  | 'reconnecting'
  | 'auth_failed'
  | 'error';

export type GatewayFailureKind =
  | 'auth'
  | 'restart'
  | 'network'
  | 'handshake'
  | null;

type GatewayCapabilitiesState = {
  methods: string[];
  events: string[];
};

type GatewayAuthState = {
  role: string | null;
  scopes: string[];
  issuedAtMs: number | null;
};

type GatewayHealthState = {
  lastHelloAt: number | null;
  lastEventAt: number | null;
  lastSeq: number | null;
  gapDetected: boolean;
  stale: boolean;
  reconnectAttempt: number;
  lastCloseCode: number | null;
  lastFailureKind: GatewayFailureKind;
  lastDisconnectReason: string | null;
  lastError: string | null;
};

type GatewaySystemState = {
  restartExpected: boolean;
  lastShutdownReason: string | null;
};

type GatewayChatState = {
  activeSessionKey: string;
  resolvedSessionKey: string;
  messagesBySession: Record<string, GatewayChatMessage[]>;
  runsById: Record<string, GatewayChatRun>;
  currentRunIdBySession: Record<string, string | null>;
  queuesBySession: Record<string, GatewayQueueItem[]>;
  historyLoadedBySession: Record<string, boolean>;
  toolStreamBySession: Record<string, GatewayToolStreamEntry[]>;
};

type GatewayStoreActions = {
  configure: (config: GatewayConnectionConfig | null) => void;
  resetRuntime: () => void;
  setConnectionStatus: (
      status: GatewayConnectionStatus,
      options?: {
        reconnectAttempt?: number;
        closeCode?: number | null;
        failureKind?: GatewayFailureKind;
        disconnectReason?: string | null;
        error?: string | null;
      }
    ) => void;
  markGatewayError: (error: string | null) => void;
  applyHello: (hello: GatewayHelloOk) => void;
  noteEvent: (seq?: number) => void;
  markGapDetected: (info: { expected: number; received: number }) => void;
  noteShutdown: (reason?: string | null) => void;
  markRecovered: () => void;
  setActiveSessionKey: (sessionKey: string) => void;
  hydrateChatHistory: (
    sessionKey: string,
    messages: GatewayChatMessage[]
  ) => void;
  beginChatRun: (sessionKey: string, runId: string, text: string) => void;
  applyChatEvent: (event: NormalizedGatewayChatEvent) => void;
  applyToolEvent: (event: NormalizedGatewayToolEvent) => void;
  failChatRequest: (runId: string, error: string) => void;
  queueChatMessage: (sessionKey: string, text: string) => GatewayQueueItem;
  removeQueuedMessage: (sessionKey: string, queueId: string) => void;
};

export type GatewayStoreState = {
  config: GatewayConnectionConfig | null;
  connection: {
    status: GatewayConnectionStatus;
    readyAt: number | null;
  };
  capabilities: GatewayCapabilitiesState;
  auth: GatewayAuthState;
  health: GatewayHealthState;
  system: GatewaySystemState;
  sessionDefaults: SessionDefaultsSnapshot | null;
  chat: GatewayChatState;
  actions: GatewayStoreActions;
};

const EMPTY_CHAT_MESSAGES: GatewayChatMessage[] = [];
const EMPTY_GATEWAY_QUEUE: GatewayQueueItem[] = [];
const EMPTY_TOOL_STREAM_ENTRIES: GatewayToolStreamEntry[] = [];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isLocalMessage(message: GatewayChatMessage) {
  const raw = asRecord(message.raw);
  return raw?.local === true || message.id.startsWith('local:');
}

function buildLocalMessageRaw(
  runId: string,
  placeholder: 'user' | 'assistant'
) {
  return {
    local: true,
    localRunId: runId,
    placeholder,
  };
}

function resolveMessageStatus(
  state: NormalizedGatewayChatEvent['state']
): GatewayChatMessageStatus {
  if (state === 'delta') {
    return 'streaming';
  }

  if (state === 'error') {
    return 'error';
  }

  if (state === 'aborted') {
    return 'aborted';
  }

  return 'final';
}

function sortMessages(messages: GatewayChatMessage[]) {
  return [...messages].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }

    return left.id.localeCompare(right.id);
  });
}

function mergeMessage(
  previous: GatewayChatMessage,
  incoming: GatewayChatMessage
): GatewayChatMessage {
  return {
    ...previous,
    ...incoming,
    id: incoming.id,
    parts:
      incoming.parts.length > 0
        ? mergeParts(previous.parts, incoming.parts)
        : previous.parts,
    raw: incoming.raw ?? previous.raw,
  };
}

function findRunForMessage(
  runsById: Record<string, GatewayChatRun>,
  sessionKey: string,
  messageId: string
) {
  return Object.values(runsById).find(
    run =>
      run.sessionKey === sessionKey &&
      (run.userMessageId === messageId || run.assistantMessageId === messageId)
  );
}

function buildVisibleFingerprint(message: GatewayChatMessage) {
  const text = getMessageText(message);
  if (!text) {
    return null;
  }

  return `${message.role}|${text}`;
}

function reconcileHydratedMessages(params: {
  sessionKey: string;
  incoming: GatewayChatMessage[];
  existing: GatewayChatMessage[];
  runsById: Record<string, GatewayChatRun>;
}) {
  const canonical = sortMessages(
    params.incoming.filter(message => !isLocalMessage(message))
  );
  const canonicalFingerprints = new Set(
    canonical
      .map(message => buildVisibleFingerprint(message))
      .filter((value): value is string => Boolean(value))
  );
  const locals = params.existing.filter(isLocalMessage);

  const keptLocals = locals.filter(message => {
    const visibleFingerprint = buildVisibleFingerprint(message);
    if (visibleFingerprint && canonicalFingerprints.has(visibleFingerprint)) {
      return false;
    }

    if (message.role !== 'assistant') {
      return true;
    }

    const run = findRunForMessage(
      params.runsById,
      params.sessionKey,
      message.id
    );
    if (!run) {
      return message.status === 'streaming';
    }

    const userMessage = params.existing.find(
      existing => existing.id === run.userMessageId
    );
    if (!userMessage) {
      return message.status === 'streaming';
    }

    const userFingerprint = buildVisibleFingerprint(userMessage);
    if (userFingerprint) {
      const canonicalUserIndex = canonical.findIndex(candidate => {
        return (
          candidate.role === 'user' &&
          buildVisibleFingerprint(candidate) === userFingerprint
        );
      });
      if (canonicalUserIndex >= 0) {
        const hasCanonicalAssistantAfterUser = canonical
          .slice(canonicalUserIndex + 1)
          .some(candidate => candidate.role === 'assistant');
        return !hasCanonicalAssistantAfterUser;
      }
    }

    const hasCanonicalAssistantAfterUser = canonical.some(
      candidate =>
        candidate.role === 'assistant' &&
        candidate.createdAt >= userMessage.createdAt
    );
    return !hasCanonicalAssistantAfterUser;
  });

  return sortMessages(mergeMessages(canonical, keptLocals));
}

function mergeMessages(
  incoming: GatewayChatMessage[],
  existing: GatewayChatMessage[]
) {
  const byId = new Map(existing.map(message => [message.id, message]));

  for (const message of incoming) {
    const previous = byId.get(message.id);
    byId.set(
      message.id,
      previous
        ? {
            ...previous,
            ...message,
            parts:
              message.parts.length > 0
                ? mergeParts(previous.parts, message.parts)
                : previous.parts,
          }
        : message
    );
  }

  return [...byId.values()].sort(
    (left, right) => left.createdAt - right.createdAt
  );
}

function mergeParts(
  existing: GatewayChatMessage['parts'],
  incoming: GatewayChatMessage['parts']
) {
  const byId = new Map(existing.map(part => [part.id, part]));
  const orderedIds = existing.map(part => part.id);

  for (const part of incoming) {
    if (!byId.has(part.id)) {
      orderedIds.push(part.id);
    }
    byId.set(part.id, part);
  }

  return orderedIds
    .map(id => byId.get(id))
    .filter((part): part is GatewayChatMessage['parts'][number] =>
      Boolean(part)
    );
}

function findMessageIndex(
  messages: GatewayChatMessage[],
  ...messageIds: Array<string | null | undefined>
) {
  for (const messageId of messageIds) {
    if (!messageId) {
      continue;
    }

    const index = messages.findIndex(message => message.id === messageId);
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function resolveFallbackMessageId(run: GatewayChatRun, role: GatewayChatRole) {
  return role === 'assistant' ? run.assistantMessageId : run.userMessageId;
}

function collectCanonicalToolCallIds(messages: GatewayChatMessage[]) {
  const ids = new Set<string>();

  for (const message of messages) {
    for (const part of getToolMessageParts(message)) {
      ids.add(part.id);
    }
  }

  return ids;
}

const TOOL_STREAM_LIMIT = 50;

function upsertToolStreamEntries(
  entries: GatewayToolStreamEntry[],
  event: NormalizedGatewayToolEvent,
  assistantMessageId?: string
) {
  const next = [...entries];
  const index = next.findIndex(entry => entry.toolCallId === event.toolCallId);
  const previous = index >= 0 ? next[index] : null;
  const entry: GatewayToolStreamEntry = {
    toolCallId: event.toolCallId,
    runId: event.runId,
    sessionKey: event.sessionKey,
    assistantMessageId: assistantMessageId ?? previous?.assistantMessageId,
    toolName: event.toolName,
    state: event.state,
    input: event.input ?? previous?.input,
    output: event.output ?? previous?.output,
    errorText: event.errorText ?? previous?.errorText,
    startedAt: previous?.startedAt ?? event.ts,
    updatedAt: event.ts,
    raw: event.raw,
  };

  if (index >= 0) {
    next[index] = entry;
  } else {
    next.push(entry);
  }

  const sorted = next.sort((left, right) => {
    if (left.startedAt !== right.startedAt) {
      return left.startedAt - right.startedAt;
    }

    return left.toolCallId.localeCompare(right.toolCallId);
  });

  return sorted.slice(Math.max(sorted.length - TOOL_STREAM_LIMIT, 0));
}

function reanchorToolStreamEntries(
  entries: GatewayToolStreamEntry[],
  runId: string,
  assistantMessageId: string
) {
  let changed = false;
  const next = entries.map(entry => {
    if (entry.runId !== runId || entry.assistantMessageId === assistantMessageId) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      assistantMessageId,
    };
  });

  return changed ? next : entries;
}

function initialChatState(): GatewayChatState {
  return {
    activeSessionKey: 'main',
    resolvedSessionKey: 'main',
    messagesBySession: {},
    runsById: {},
    currentRunIdBySession: {},
    queuesBySession: {},
    historyLoadedBySession: {},
    toolStreamBySession: {},
  };
}

function initialState(): Omit<GatewayStoreState, 'actions'> {
  return {
    config: null,
    connection: {
      status: 'idle',
      readyAt: null,
    },
    capabilities: {
      methods: [],
      events: [],
    },
    auth: {
      role: null,
      scopes: [],
      issuedAtMs: null,
    },
    health: {
      lastHelloAt: null,
      lastEventAt: null,
      lastSeq: null,
      gapDetected: false,
      stale: false,
      reconnectAttempt: 0,
      lastCloseCode: null,
      lastFailureKind: null,
      lastDisconnectReason: null,
      lastError: null,
    },
    system: {
      restartExpected: false,
      lastShutdownReason: null,
    },
    sessionDefaults: null,
    chat: initialChatState(),
  };
}

export const gatewayStore = createStore<GatewayStoreState>()(set => ({
  ...initialState(),
  actions: {
    configure: config => {
      set(state => ({
        ...state,
        config,
      }));
    },
    resetRuntime: () => {
      set(state => ({
        ...state,
        ...initialState(),
        config: state.config,
      }));
    },
    setConnectionStatus: (status, options) => {
      set(state => ({
        ...state,
        connection: {
          status,
          readyAt: status === 'ready' ? Date.now() : state.connection.readyAt,
        },
        health: {
          ...state.health,
          reconnectAttempt:
            typeof options?.reconnectAttempt === 'number'
              ? options.reconnectAttempt
              : state.health.reconnectAttempt,
          lastCloseCode:
            options?.closeCode !== undefined
              ? options.closeCode
              : state.health.lastCloseCode,
          lastFailureKind:
            options?.failureKind !== undefined
              ? options.failureKind
              : state.health.lastFailureKind,
          lastDisconnectReason:
            options?.disconnectReason !== undefined
              ? options.disconnectReason
              : state.health.lastDisconnectReason,
          lastError:
            options?.error !== undefined
              ? options.error
              : state.health.lastError,
          stale: status === 'degraded' ? true : state.health.stale,
        },
      }));
    },
    markGatewayError: error => {
      set(state => ({
        ...state,
        health: {
          ...state.health,
          lastError: error,
        },
      }));
    },
    applyHello: hello => {
      const nextDefaults = normalizeSessionDefaults(hello.snapshot);
      set(state => ({
        ...state,
        connection: {
          status: 'ready',
          readyAt: Date.now(),
        },
        capabilities: {
          methods: hello.features?.methods ?? [],
          events: hello.features?.events ?? [],
        },
        auth: {
          role: hello.auth?.role ?? null,
          scopes: hello.auth?.scopes ?? [],
          issuedAtMs: hello.auth?.issuedAtMs ?? null,
        },
        health: {
          ...state.health,
          lastHelloAt: Date.now(),
          lastError: null,
          lastCloseCode: null,
          lastFailureKind: null,
          gapDetected: false,
          stale: false,
          reconnectAttempt: 0,
          lastDisconnectReason: null,
        },
        system: {
          restartExpected: false,
          lastShutdownReason: state.system.lastShutdownReason,
        },
        sessionDefaults: nextDefaults,
        chat: {
          ...state.chat,
          resolvedSessionKey: normalizeSessionKeyForDefaults(
            state.chat.activeSessionKey,
            nextDefaults
          ),
          toolStreamBySession: {},
        },
      }));
    },
    noteEvent: seq => {
      set(state => ({
        ...state,
        health: {
          ...state.health,
          lastEventAt: Date.now(),
          lastSeq: typeof seq === 'number' ? seq : state.health.lastSeq,
        },
      }));
    },
    markGapDetected: ({ received }) => {
      set(state => ({
        ...state,
        connection: {
          ...state.connection,
          status:
            state.connection.status === 'ready'
              ? 'degraded'
              : state.connection.status,
        },
        health: {
          ...state.health,
          lastEventAt: Date.now(),
          lastSeq: received,
          gapDetected: true,
          stale: true,
        },
      }));
    },
    noteShutdown: reason => {
      set(state => ({
        ...state,
        system: {
          restartExpected: true,
          lastShutdownReason: reason ?? state.system.lastShutdownReason,
        },
      }));
    },
    markRecovered: () => {
      set(state => ({
        ...state,
        system: {
          ...state.system,
          restartExpected: false,
        },
      }));
    },
    setActiveSessionKey: sessionKey => {
      const nextKey = sessionKey.trim() || 'main';
      set(state => ({
        ...state,
        chat: {
          ...state.chat,
          activeSessionKey: nextKey,
          resolvedSessionKey: normalizeSessionKeyForDefaults(
            nextKey,
            state.sessionDefaults
          ),
        },
      }));
    },
    hydrateChatHistory: (sessionKey, messages) => {
      set(state => {
        const reconciledMessages = reconcileHydratedMessages({
          sessionKey,
          incoming: messages,
          existing: state.chat.messagesBySession[sessionKey] ?? [],
          runsById: state.chat.runsById,
        });
        const canonicalToolCallIds = collectCanonicalToolCallIds(
          reconciledMessages
        );
        const preservedToolEntries = (
          state.chat.toolStreamBySession[sessionKey] ?? []
        ).filter(entry => !canonicalToolCallIds.has(entry.toolCallId));

        return {
          ...state,
          chat: {
            ...state.chat,
            messagesBySession: {
              ...state.chat.messagesBySession,
              [sessionKey]: reconciledMessages,
            },
            toolStreamBySession: {
              ...state.chat.toolStreamBySession,
              [sessionKey]: preservedToolEntries,
            },
            historyLoadedBySession: {
              ...state.chat.historyLoadedBySession,
              [sessionKey]: true,
            },
          },
        };
      });
    },
    beginChatRun: (sessionKey, runId, text) => {
      const now = Date.now();
      const userMessageId = `local:user:${runId}`;
      const assistantMessageId = `local:assistant:${runId}`;

      set(state => ({
        ...state,
        chat: {
          ...state.chat,
          messagesBySession: {
            ...state.chat.messagesBySession,
            [sessionKey]: mergeMessages(
              [
                {
                  id: userMessageId,
                  sessionKey,
                  role: 'user',
                  status: 'final',
                  createdAt: now,
                  raw: buildLocalMessageRaw(runId, 'user'),
                  parts: [
                    {
                      kind: 'text',
                      id: `${userMessageId}:part:0`,
                      type: 'text',
                      text,
                      raw: text,
                    },
                  ],
                },
                {
                  id: assistantMessageId,
                  sessionKey,
                  role: 'assistant',
                  status: 'streaming',
                  createdAt: now + 1,
                  raw: buildLocalMessageRaw(runId, 'assistant'),
                  parts: [],
                },
              ],
              state.chat.messagesBySession[sessionKey] ?? []
            ),
          },
          runsById: {
            ...state.chat.runsById,
            [runId]: {
              id: runId,
              sessionKey,
              userMessageId,
              assistantMessageId,
              status: 'streaming',
            },
          },
          currentRunIdBySession: {
            ...state.chat.currentRunIdBySession,
            [sessionKey]: runId,
          },
        },
      }));
    },
    applyChatEvent: event => {
      set(state => {
        const existingRun = state.chat.runsById[event.runId];
        const sessionKey = event.sessionKey;
        const run =
          existingRun ??
          ({
            id: event.runId,
            sessionKey,
            userMessageId: `local:user:${event.runId}`,
            assistantMessageId: `local:assistant:${event.runId}`,
            status:
              event.state === 'error'
                ? 'error'
                : event.state === 'aborted'
                  ? 'aborted'
                  : 'streaming',
            error: event.errorMessage,
          } satisfies GatewayChatRun);

        const nextRun: GatewayChatRun = { ...run };
        const nextMessages = [
          ...(state.chat.messagesBySession[sessionKey] ?? []),
        ];

        if (event.removedMessageId) {
          const messageIndex = findMessageIndex(
            nextMessages,
            event.removedMessageId,
            nextRun.assistantMessageId,
            nextRun.userMessageId
          );

          if (messageIndex >= 0) {
            nextMessages.splice(messageIndex, 1);
          }
        }

        if (event.message) {
          const incomingMessage: GatewayChatMessage = {
            ...event.message,
            sessionKey,
            status: resolveMessageStatus(event.state),
          };
          const fallbackMessageId = resolveFallbackMessageId(
            nextRun,
            incomingMessage.role
          );
          const messageIndex = findMessageIndex(
            nextMessages,
            incomingMessage.id,
            fallbackMessageId
          );

          if (messageIndex >= 0) {
            const previous = nextMessages[messageIndex];
            nextMessages[messageIndex] = mergeMessage(previous, incomingMessage);
          } else {
            nextMessages.push(incomingMessage);
          }

          if (incomingMessage.role === 'assistant') {
            nextRun.assistantMessageId = incomingMessage.id;
          } else {
            nextRun.userMessageId = incomingMessage.id;
          }
        }

        if (event.part && event.messageId) {
          const targetRole = event.messageRole ?? 'assistant';
          const fallbackMessageId = resolveFallbackMessageId(nextRun, targetRole);
          const messageIndex = findMessageIndex(
            nextMessages,
            event.messageId,
            fallbackMessageId
          );

          if (messageIndex >= 0) {
            const previous = nextMessages[messageIndex];
            nextMessages[messageIndex] = {
              ...previous,
              id: event.messageId,
              sessionKey,
              role: targetRole,
              status: 'streaming',
              createdAt: event.messageCreatedAt ?? previous.createdAt,
              parts: mergeParts(previous.parts, [event.part]),
              raw: previous.raw,
            };
          } else {
            nextMessages.push({
              id: event.messageId,
              sessionKey,
              role: targetRole,
              status: 'streaming',
              createdAt: event.messageCreatedAt ?? Date.now(),
              parts: [event.part],
              raw: event.part.raw,
            });
          }

          if (targetRole === 'assistant') {
            nextRun.assistantMessageId = event.messageId;
          } else {
            nextRun.userMessageId = event.messageId;
          }
        }

        if (event.removedPartId && event.messageId) {
          const messageIndex = findMessageIndex(
            nextMessages,
            event.messageId,
            nextRun.assistantMessageId,
            nextRun.userMessageId
          );

          if (messageIndex >= 0) {
            nextMessages[messageIndex] = {
              ...nextMessages[messageIndex],
              id: event.messageId,
              parts: nextMessages[messageIndex].parts.filter(
                part => part.id !== event.removedPartId
              ),
            };
          }
        }

        if (!event.message && !event.part && event.state === 'error') {
          const errorPart = {
            kind: 'error' as const,
            id: `${nextRun.assistantMessageId}:error`,
            type: 'error',
            message: event.errorMessage ?? 'chat error',
            raw: event.errorMessage ?? 'chat error',
          };

          const assistantIndex = findMessageIndex(
            nextMessages,
            nextRun.assistantMessageId
          );

          if (assistantIndex >= 0) {
            nextMessages[assistantIndex] = {
              ...nextMessages[assistantIndex],
              status: 'error',
              parts:
                nextMessages[assistantIndex].parts.length > 0
                  ? nextMessages[assistantIndex].parts
                  : [errorPart],
            };
          } else {
            nextMessages.push({
              id: nextRun.assistantMessageId,
              sessionKey,
              role: 'assistant',
              status: 'error',
              createdAt: Date.now(),
              parts: [errorPart],
            });
          }
        }

        if (event.state !== 'delta') {
          const assistantIndex = findMessageIndex(
            nextMessages,
            nextRun.assistantMessageId
          );

          if (assistantIndex >= 0) {
            nextMessages[assistantIndex] = {
              ...nextMessages[assistantIndex],
              status: resolveMessageStatus(event.state),
            };
          }
        }

        const anchoredToolEntries = reanchorToolStreamEntries(
          state.chat.toolStreamBySession[sessionKey] ?? [],
          event.runId,
          nextRun.assistantMessageId
        );

        return {
          ...state,
          chat: {
            ...state.chat,
            messagesBySession: {
              ...state.chat.messagesBySession,
              [sessionKey]: sortMessages(nextMessages),
            },
            toolStreamBySession: {
              ...state.chat.toolStreamBySession,
              [sessionKey]: anchoredToolEntries,
            },
            runsById: {
              ...state.chat.runsById,
              [event.runId]: {
                ...nextRun,
                status:
                  event.state === 'delta'
                    ? 'streaming'
                    : event.state === 'final'
                      ? 'final'
                      : event.state === 'aborted'
                        ? 'aborted'
                        : 'error',
                error: event.errorMessage,
              },
            },
            currentRunIdBySession: {
              ...state.chat.currentRunIdBySession,
              [sessionKey]: event.state === 'delta' ? event.runId : null,
            },
          },
        };
      });
    },
    applyToolEvent: event => {
      set(state => {
        const activeRunId = state.chat.currentRunIdBySession[event.sessionKey];
        const activeSessionKey = state.chat.resolvedSessionKey;
        const run = state.chat.runsById[event.runId];

        if (!activeRunId || activeRunId !== event.runId) {
          return state;
        }

        if (event.sessionKey !== activeSessionKey) {
          return state;
        }

        return {
          ...state,
          chat: {
            ...state.chat,
            toolStreamBySession: {
              ...state.chat.toolStreamBySession,
              [event.sessionKey]: upsertToolStreamEntries(
                state.chat.toolStreamBySession[event.sessionKey] ?? [],
                event,
                run?.assistantMessageId
              ),
            },
          },
        };
      });
    },
    failChatRequest: (runId, error) => {
      set(state => {
        const run = state.chat.runsById[runId];
        if (!run) {
          return state;
        }

        const sessionMessages =
          state.chat.messagesBySession[run.sessionKey] ?? [];
        const nextMessages = sessionMessages.map(message =>
          message.id === run.assistantMessageId
            ? {
                ...message,
                status: 'error' as const,
                parts: [
                  {
                    kind: 'error' as const,
                    id: `${message.id}:error`,
                    type: 'error',
                    message: error,
                    raw: error,
                  },
                ],
              }
            : message
        );

        return {
          ...state,
          chat: {
            ...state.chat,
            messagesBySession: {
              ...state.chat.messagesBySession,
              [run.sessionKey]: nextMessages,
            },
            toolStreamBySession: state.chat.toolStreamBySession,
            runsById: {
              ...state.chat.runsById,
              [runId]: {
                ...run,
                status: 'error',
                error,
              },
            },
            currentRunIdBySession: {
              ...state.chat.currentRunIdBySession,
              [run.sessionKey]: null,
            },
          },
        };
      });
    },
    queueChatMessage: (sessionKey, text) => {
      const item: GatewayQueueItem = {
        id: crypto.randomUUID(),
        sessionKey,
        text,
        createdAt: Date.now(),
      };

      set(state => ({
        ...state,
        chat: {
          ...state.chat,
          queuesBySession: {
            ...state.chat.queuesBySession,
            [sessionKey]: [
              ...(state.chat.queuesBySession[sessionKey] ?? []),
              item,
            ],
          },
        },
      }));

      return item;
    },
    removeQueuedMessage: (sessionKey, queueId) => {
      set(state => ({
        ...state,
        chat: {
          ...state.chat,
          queuesBySession: {
            ...state.chat.queuesBySession,
            [sessionKey]: (state.chat.queuesBySession[sessionKey] ?? []).filter(
              item => item.id !== queueId
            ),
          },
        },
      }));
    },
  },
}));

export function useGatewayStore<T>(selector: (state: GatewayStoreState) => T) {
  return useStore(gatewayStore, selector);
}

export function useGatewayConnection() {
  return useGatewayStore(
    useShallow(state => ({
      status: state.connection.status,
      readyAt: state.connection.readyAt,
      lastError: state.health.lastError,
      lastCloseCode: state.health.lastCloseCode,
      lastFailureKind: state.health.lastFailureKind,
      stale: state.health.stale,
      restartExpected: state.system.restartExpected,
      reconnectAttempt: state.health.reconnectAttempt,
    }))
  );
}

export function useGatewayHealth() {
  return useGatewayStore(state => state.health);
}

export function useGatewaySystem() {
  return useGatewayStore(state => state.system);
}

export function useGatewayCapabilities() {
  return useGatewayStore(state => state.capabilities);
}

export function useGatewaySessionDefaults() {
  return useGatewayStore(state => state.sessionDefaults);
}

export function useGatewayChatSession(sessionKey?: string) {
  return useGatewayStore(
    useShallow(state => {
      const resolvedSessionKey = sessionKey ?? state.chat.resolvedSessionKey;

      return {
        sessionKey: resolvedSessionKey,
        messages:
          state.chat.messagesBySession[resolvedSessionKey] ?? EMPTY_CHAT_MESSAGES,
        toolEntries:
          state.chat.toolStreamBySession[resolvedSessionKey] ??
          EMPTY_TOOL_STREAM_ENTRIES,
        queue:
          state.chat.queuesBySession[resolvedSessionKey] ?? EMPTY_GATEWAY_QUEUE,
        currentRunId:
          state.chat.currentRunIdBySession[resolvedSessionKey] ?? null,
        historyLoaded:
          state.chat.historyLoadedBySession[resolvedSessionKey] ?? false,
      };
    })
  );
}
