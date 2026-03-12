import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createStore } from 'zustand/vanilla';

import type { GatewayHelloOk } from '@/lib/gateway-client';

import type { GatewayConnectionConfig } from './config';
import type {
  GatewayChatMessage,
  GatewayChatRun,
  GatewayQueueItem,
  NormalizedGatewayChatEvent,
  SessionDefaultsSnapshot,
} from './chat';
import {
  normalizeSessionDefaults,
  normalizeSessionKeyForDefaults,
} from './chat';

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

function initialChatState(): GatewayChatState {
  return {
    activeSessionKey: 'main',
    resolvedSessionKey: 'main',
    messagesBySession: {},
    runsById: {},
    currentRunIdBySession: {},
    queuesBySession: {},
    historyLoadedBySession: {},
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
        const existing = state.chat.messagesBySession[sessionKey] ?? [];
        const streamingLocals = existing.filter(
          message => message.status === 'streaming'
        );

        return {
          ...state,
          chat: {
            ...state.chat,
            messagesBySession: {
              ...state.chat.messagesBySession,
              [sessionKey]: mergeMessages(messages, streamingLocals),
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
                  parts: [
                    {
                      kind: 'text',
                      id: `${userMessageId}:part:0`,
                      text,
                    },
                  ],
                },
                {
                  id: assistantMessageId,
                  sessionKey,
                  role: 'assistant',
                  status: 'streaming',
                  createdAt: now + 1,
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
            status:
              event.state === 'delta'
                ? 'streaming'
                : event.state === 'error'
                  ? 'error'
                  : 'final',
          };
          const fallbackMessageId =
            incomingMessage.role === 'assistant'
              ? nextRun.assistantMessageId
              : nextRun.userMessageId;
          const messageIndex = findMessageIndex(
            nextMessages,
            incomingMessage.id,
            fallbackMessageId
          );

          if (messageIndex >= 0) {
            const previous = nextMessages[messageIndex];
            nextMessages[messageIndex] = {
              ...previous,
              ...incomingMessage,
              id: incomingMessage.id,
              parts: mergeParts(previous.parts, incomingMessage.parts),
            };
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
          const fallbackMessageId =
            targetRole === 'assistant'
              ? nextRun.assistantMessageId
              : nextRun.userMessageId;
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
            };
          } else {
            nextMessages.push({
              id: event.messageId,
              sessionKey,
              role: targetRole,
              status: 'streaming',
              createdAt: event.messageCreatedAt ?? Date.now(),
              parts: [event.part],
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
            message: event.errorMessage ?? 'chat error',
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
              status: event.state === 'error' ? 'error' : 'final',
            };
          }
        }

        return {
          ...state,
          chat: {
            ...state.chat,
            messagesBySession: {
              ...state.chat.messagesBySession,
              [sessionKey]: nextMessages.sort(
                (left, right) => left.createdAt - right.createdAt
              ),
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
                    message: error,
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
