'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GatewayClient, type GatewayEventFrame } from './gateway-client';
import { extractText } from './message-extract';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'final' | 'error';
};

export type GatewayChatStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'streaming'
  | 'error';

export type GatewayChatConfig = {
  gatewayUrl: string;
  token?: string;
  password?: string;
  sessionKey: string;
};

type SessionDefaultsSnapshot = {
  defaultAgentId?: string;
  mainKey?: string;
  mainSessionKey?: string;
  scope?: string;
};

const GATEWAY_WS_PORT = '18789';

function toGatewayWebSocketUrl(rawGatewayUrl: string): string {
  const raw = rawGatewayUrl.trim();
  if (!raw) return '';

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  const parsed = new URL(hasScheme ? raw : `ws://${raw}`);

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'ws:';
  } else if (parsed.protocol === 'https:') {
    parsed.protocol = 'wss:';
  } else if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`Unsupported gateway URL protocol: ${parsed.protocol}`);
  }

  if (!parsed.port) {
    parsed.port = GATEWAY_WS_PORT;
  }

  return parsed.toString();
}

function normalizeSessionKeyForDefaults(
  value: string,
  defaults?: SessionDefaultsSnapshot | null
): string {
  const raw = (value ?? '').trim();
  const mainSessionKey = defaults?.mainSessionKey?.trim();
  if (!mainSessionKey) {
    return raw;
  }
  if (!raw) {
    return mainSessionKey;
  }
  const mainKey = defaults?.mainKey?.trim() || 'main';
  const defaultAgentId = defaults?.defaultAgentId?.trim();
  const isAlias =
    raw === 'main' ||
    raw === mainKey ||
    (defaultAgentId &&
      (raw === `agent:${defaultAgentId}:main` ||
        raw === `agent:${defaultAgentId}:${mainKey}`));
  return isAlias ? mainSessionKey : raw;
}

type HistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

function toHistoryItems(messages: unknown[]): HistoryItem[] {
  return messages
    .map(message => {
      const m = message as Record<string, unknown>;
      const role =
        m.role === 'assistant'
          ? 'assistant'
          : m.role === 'user'
            ? 'user'
            : null;
      if (!role) return null;
      const content = extractText(message) ?? '';
      return { role, content } satisfies HistoryItem;
    })
    .filter((item): item is HistoryItem => Boolean(item?.content));
}

export type QueueItem = {
  id: string;
  text: string;
  createdAt: number;
};

export function useGatewayChat(config: GatewayChatConfig) {
  const [status, setStatus] = useState<GatewayChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [resolvedSessionKey, setResolvedSessionKey] = useState(
    normalizeSessionKeyForDefaults(config.sessionKey)
  );
  const sessionKeyRef = useRef(resolvedSessionKey);
  const clientRef = useRef<GatewayClient | null>(null);
  const runToMessageId = useRef(new Map<string, string>());
  const currentRunId = useRef<string | null>(null);
  const sessionDefaultsRef = useRef<SessionDefaultsSnapshot | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const isBusyRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flushQueueRef = useRef<() => Promise<void>>(async () => {});

  const loadHistory = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      const res = (await clientRef.current.request('chat.history', {
        sessionKey: sessionKeyRef.current,
        limit: 200,
      })) as { messages?: unknown[] };
      const rawMessages = res.messages ?? [];
      const history = toHistoryItems(rawMessages);
      setMessages(
        history.map((item, index): ChatMessage => ({
          id: `${item.role}-history-${index}`,
          role: item.role,
          content: item.content,
          status: 'final',
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [resolvedSessionKey]);

  const applySessionDefaults = useCallback(
    (defaults?: SessionDefaultsSnapshot | null) => {
      sessionDefaultsRef.current = defaults ?? null;
      const next = normalizeSessionKeyForDefaults(config.sessionKey, defaults);
      if (next && next !== resolvedSessionKey) {
        sessionKeyRef.current = next;
        setResolvedSessionKey(next);
      }
    },
    [config.sessionKey, resolvedSessionKey]
  );

  const handleEvent = useCallback(
    (evt: GatewayEventFrame) => {
      if (evt.event !== 'chat') {
        return;
      }

      const payload = evt.payload as
        | {
            runId: string;
            sessionKey: string;
            state: 'delta' | 'final' | 'aborted' | 'error';
            message?: unknown;
            errorMessage?: string;
          }
        | undefined;

      if (!payload || payload.sessionKey !== sessionKeyRef.current) return;
      const messageId = runToMessageId.current.get(payload.runId);
      const nextText = payload.message ? extractText(payload.message) : null;

      if (
        payload.state === 'delta' &&
        messageId &&
        typeof nextText === 'string'
      ) {
        setMessages(prev =>
          prev.map(item =>
            item.id === messageId
              ? { ...item, content: nextText, status: 'streaming' }
              : item
          )
        );
        return;
      }

      if (payload.state === 'final') {
        isBusyRef.current = false;
        setStatus('ready');
        if (messageId) {
          setMessages(prev =>
            prev.map(item =>
              item.id === messageId
                ? {
                    ...item,
                    content: nextText ?? item.content,
                    status: 'final',
                  }
                : item
            )
          );
        }
        void flushQueueRef.current();
      }

      if (payload.state === 'error') {
        isBusyRef.current = false;
        setStatus('error');
        const message = payload.errorMessage ?? 'chat error';
        setError(message);
        if (messageId) {
          setMessages(prev =>
            prev.map(item =>
              item.id === messageId
                ? { ...item, content: `Error: ${message}`, status: 'error' }
                : item
            )
          );
        }
      }

      if (payload.state === 'aborted') {
        isBusyRef.current = false;
        setStatus('ready');
        void flushQueueRef.current();
      }
    },
    [resolvedSessionKey]
  );

  const connect = useCallback(() => {
    if (clientRef.current) return;
    setStatus('connecting');
    setError(null);

    let gatewaySocketUrl = '';
    try {
      gatewaySocketUrl = toGatewayWebSocketUrl(config.gatewayUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setError(message);
      return;
    }

    if (!gatewaySocketUrl) {
      setStatus('error');
      setError('Missing gateway URL');
      return;
    }

    const client = new GatewayClient({
      url: gatewaySocketUrl,
      token: config.token?.trim() || undefined,
      password: config.password?.trim() || undefined,
      onHello: hello => {
        const snapshot = hello?.snapshot as
          | { sessionDefaults?: SessionDefaultsSnapshot }
          | undefined;
        applySessionDefaults(snapshot?.sessionDefaults ?? null);
        setStatus('ready');
        setError(null);
      },
      onEvent: evt => handleEvent(evt),
      onGap: () => {
        void loadHistory();
      },
      onClose: ({ reason }) => {
        setStatus('idle');
        if (reason) setError(reason);
      },
      onError: err => {
        setStatus('error');
        setError(err.message);
      },
    });
    client.connect();
    clientRef.current = client;
  }, [
    applySessionDefaults,
    config.gatewayUrl,
    config.password,
    config.token,
    handleEvent,
  ]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('idle');
  }, []);

  const sendMessageNow = useCallback(
    async (text: string) => {
      if (!clientRef.current) return false;

      const runId = crypto.randomUUID();
      currentRunId.current = runId;
      isBusyRef.current = true;

      const userMessage: ChatMessage = {
        id: `user-${runId}`,
        role: 'user',
        content: text,
        status: 'final',
      };
      const assistantMessageId = `assistant-${runId}`;
      runToMessageId.current.set(runId, assistantMessageId);

      setMessages(prev => [
        ...prev,
        userMessage,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          status: 'streaming',
        },
      ]);

      setStatus('streaming');

      try {
        await clientRef.current.request('chat.send', {
          sessionKey: sessionKeyRef.current,
          message: text,
          deliver: false,
          idempotencyKey: runId,
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('error');
        isBusyRef.current = false;
        setMessages(prev =>
          prev.map(item =>
            item.id === assistantMessageId
              ? { ...item, content: `Error: ${message}`, status: 'error' }
              : item
          )
        );
        return false;
      }
    },
    [resolvedSessionKey]
  );

  const flushQueue = useCallback(async () => {
    if (isBusyRef.current) return;
    const [next, ...rest] = queueRef.current;
    if (!next) return;
    queueRef.current = rest;
    setQueue(rest);
    await sendMessageNow(next.text);
  }, [sendMessageNow]);

  flushQueueRef.current = flushQueue;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !clientRef.current) return;

      if (isBusyRef.current) {
        const item: QueueItem = {
          id: crypto.randomUUID(),
          text: trimmed,
          createdAt: Date.now(),
        };
        queueRef.current = [...queueRef.current, item];
        setQueue(prev => [...prev, item]);
        return;
      }

      await sendMessageNow(trimmed);
    },
    [sendMessageNow]
  );

  const removeFromQueue = useCallback((id: string) => {
    queueRef.current = queueRef.current.filter(item => item.id !== id);
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const abort = useCallback(async () => {
    if (!clientRef.current) return;
    const runId = currentRunId.current;
    try {
      await clientRef.current.request(
        'chat.abort',
        runId
          ? { sessionKey: sessionKeyRef.current, runId }
          : { sessionKey: sessionKeyRef.current }
      );
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [resolvedSessionKey]);

  useEffect(() => {
    const next = normalizeSessionKeyForDefaults(
      config.sessionKey,
      sessionDefaultsRef.current
    );
    if (next && next !== resolvedSessionKey) {
      sessionKeyRef.current = next;
      setResolvedSessionKey(next);
    }
  }, [config.sessionKey, resolvedSessionKey]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const connected = useMemo(
    () => status === 'ready' || status === 'streaming',
    [status]
  );

  return {
    status,
    error,
    messages,
    queue,
    connected,
    connect,
    disconnect,
    sendMessage,
    removeFromQueue,
    abort,
    loadHistory,
    applySessionDefaults,
  };
}
