'use client';

import { useCallback, useEffect, useMemo } from 'react';

import {
  normalizeChatMessage,
  type GatewayChatMessage,
  type GatewayChatMessagePart,
  type GatewayQueueItem,
} from '@/lib/gateway/chat';
import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import { getGatewaySessionManager } from '@/lib/gateway/session-manager';
import { useGatewayStore } from '@/lib/gateway/store';

export type ChatMessage = GatewayChatMessage;
export type QueueItem = GatewayQueueItem;
export type ChatMessagePart = GatewayChatMessagePart;

export type GatewayChatStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'streaming'
  | 'error';

export type GatewayChatConfig = GatewayConnectionConfig & {
  sessionKey: string;
};

const EMPTY_CHAT_MESSAGES: GatewayChatMessage[] = [];
const EMPTY_GATEWAY_QUEUE: GatewayQueueItem[] = [];

export function useGatewayChat(config: GatewayChatConfig) {
  const manager = useMemo(() => getGatewaySessionManager(), []);
  const actions = useGatewayStore(state => state.actions);
  const connection = useGatewayStore(state => state.connection);
  const health = useGatewayStore(state => state.health);
  const resolvedSessionKey = useGatewayStore(
    state => state.chat.resolvedSessionKey
  );
  const messages = useGatewayStore(
    state =>
      state.chat.messagesBySession[state.chat.resolvedSessionKey] ??
      EMPTY_CHAT_MESSAGES
  );
  const queue = useGatewayStore(
    state =>
      state.chat.queuesBySession[state.chat.resolvedSessionKey] ??
      EMPTY_GATEWAY_QUEUE
  );
  const currentRunId = useGatewayStore(
    state =>
      state.chat.currentRunIdBySession[state.chat.resolvedSessionKey] ?? null
  );
  const historyLoaded = useGatewayStore(
    state =>
      state.chat.historyLoadedBySession[state.chat.resolvedSessionKey] ?? false
  );

  useEffect(() => {
    actions.setActiveSessionKey(config.sessionKey);
  }, [actions, config.sessionKey]);

  useEffect(() => {
    if (!config.gatewayUrl.trim()) {
      return;
    }

    manager.start(config);
  }, [config, manager]);

  const loadHistory = useCallback(async () => {
    if (!resolvedSessionKey) {
      return;
    }

    try {
      const payload = await manager.request<{ messages?: unknown[] }>(
        'chat.history',
        {
          sessionKey: resolvedSessionKey,
          limit: 200,
        },
        { config }
      );

      const nextMessages = (payload.messages ?? [])
        .map(message => normalizeChatMessage(message, resolvedSessionKey))
        .filter((message): message is GatewayChatMessage => Boolean(message));

      actions.hydrateChatHistory(resolvedSessionKey, nextMessages);
    } catch (error) {
      actions.markGatewayError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }, [actions, config, manager, resolvedSessionKey]);

  useEffect(() => {
    if (health.gapDetected && !currentRunId && resolvedSessionKey) {
      void loadHistory();
    }
  }, [currentRunId, health.gapDetected, loadHistory, resolvedSessionKey]);

  const sendMessageNow = useCallback(
    async (text: string) => {
      if (!resolvedSessionKey) {
        return false;
      }

      const runId = crypto.randomUUID();
      actions.beginChatRun(resolvedSessionKey, runId, text);

      try {
        await manager.request(
          'chat.send',
          {
            sessionKey: resolvedSessionKey,
            message: text,
            deliver: false,
            idempotencyKey: runId,
          },
          { config }
        );
        return true;
      } catch (error) {
        actions.failChatRequest(
          runId,
          error instanceof Error ? error.message : String(error)
        );
        actions.markGatewayError(
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    },
    [actions, config, manager, resolvedSessionKey]
  );

  useEffect(() => {
    if (currentRunId || queue.length === 0 || !resolvedSessionKey) {
      return;
    }

    if (connection.status !== 'ready' && connection.status !== 'degraded') {
      return;
    }

    const [next] = queue;
    if (!next) {
      return;
    }

    actions.removeQueuedMessage(resolvedSessionKey, next.id);
    void sendMessageNow(next.text);
  }, [
    actions,
    connection.status,
    currentRunId,
    queue,
    resolvedSessionKey,
    sendMessageNow,
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      if (!resolvedSessionKey) {
        return;
      }

      const readyToSend =
        connection.status === 'ready' || connection.status === 'degraded';

      if (currentRunId || !readyToSend) {
        actions.queueChatMessage(resolvedSessionKey, trimmed);
        if (!readyToSend) {
          manager.start(config);
        }
        return;
      }

      await sendMessageNow(trimmed);
    },
    [
      actions,
      config,
      connection.status,
      currentRunId,
      manager,
      resolvedSessionKey,
      sendMessageNow,
    ]
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      if (!resolvedSessionKey) {
        return;
      }

      actions.removeQueuedMessage(resolvedSessionKey, id);
    },
    [actions, resolvedSessionKey]
  );

  const abort = useCallback(async () => {
    if (!resolvedSessionKey) {
      return;
    }

    try {
      await manager.request(
        'chat.abort',
        currentRunId
          ? { sessionKey: resolvedSessionKey, runId: currentRunId }
          : { sessionKey: resolvedSessionKey },
        { config }
      );
    } catch (error) {
      actions.markGatewayError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }, [actions, config, currentRunId, manager, resolvedSessionKey]);

  const connect = useCallback(() => {
    manager.start(config);
  }, [config, manager]);

  const disconnect = useCallback(() => {
    manager.stop();
  }, [manager]);

  const status = useMemo<GatewayChatStatus>(() => {
    if (connection.status === 'error') {
      return 'error';
    }

    if (currentRunId) {
      return 'streaming';
    }

    if (
      connection.status === 'connecting' ||
      connection.status === 'authenticating' ||
      connection.status === 'reconnecting'
    ) {
      return 'connecting';
    }

    if (connection.status === 'ready' || connection.status === 'degraded') {
      return 'ready';
    }

    return 'idle';
  }, [connection.status, currentRunId]);

  const connected =
    connection.status === 'ready' || connection.status === 'degraded';

  return {
    status,
    error: health.lastError,
    messages,
    queue,
    connected,
    connect,
    disconnect,
    sendMessage,
    removeFromQueue,
    abort,
    loadHistory,
    historyLoaded,
  };
}
