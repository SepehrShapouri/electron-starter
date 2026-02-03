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
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const content = extractText(message) ?? '';
      return { role, content } satisfies HistoryItem;
    })
    .filter(item => item.content);
}

function historyEquals(a: HistoryItem[], b: HistoryItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.role !== b[i]?.role || a[i]?.content !== b[i]?.content) {
      return false;
    }
  }
  return true;
}

function historyIsPrefix(prefix: HistoryItem[], full: HistoryItem[]): boolean {
  if (prefix.length > full.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (prefix[i]?.role !== full[i]?.role || prefix[i]?.content !== full[i]?.content) {
      return false;
    }
  }
  return true;
}

export function useGatewayChat(config: GatewayChatConfig) {
  const [status, setStatus] = useState<GatewayChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resolvedSessionKey, setResolvedSessionKey] = useState(
    normalizeSessionKeyForDefaults(config.sessionKey)
  );
  const sessionKeyRef = useRef(resolvedSessionKey);
  const clientRef = useRef<GatewayClient | null>(null);
  const runToMessageId = useRef(new Map<string, string>());
  const currentRunId = useRef<string | null>(null);
  const sessionDefaultsRef = useRef<SessionDefaultsSnapshot | null>(null);

  const loadHistory = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      const res = (await clientRef.current.request('chat.history', {
        sessionKey: sessionKeyRef.current,
        limit: 200,
      })) as { messages?: unknown[] };
      const history = toHistoryItems(res.messages ?? []);
      setMessages(prev => {
        const prevHistory = prev.map(item => ({
          role: item.role,
          content: item.content,
        }));
        if (historyEquals(prevHistory, history)) {
          return prev;
        }
        if (historyIsPrefix(prevHistory, history)) {
          const finalized = prev.map(item =>
            item.status === 'streaming' ? { ...item, status: 'final' } : item
          );
          const extra = history.slice(prevHistory.length).map((item, index) => ({
            id: `${item.role}-history-${prevHistory.length + index}`,
            role: item.role,
            content: item.content,
            status: 'final',
          } satisfies ChatMessage));
          return [...finalized, ...extra];
        }
        return history.map((item, index) => ({
          id: `${item.role}-history-${index}`,
          role: item.role,
          content: item.content,
          status: 'final',
        } satisfies ChatMessage));
      });
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
      if (evt.event !== 'chat') return;
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
        void loadHistory();
      }

      if (payload.state === 'error') {
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
        setStatus('ready');
      }
    },
    [loadHistory, resolvedSessionKey]
  );

  const connect = useCallback(() => {
    if (clientRef.current) return;
    setStatus('connecting');
    setError(null);
    const client = new GatewayClient({
      url: config.gatewayUrl,
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
  }, [applySessionDefaults, config.gatewayUrl, config.password, config.token, handleEvent]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('idle');
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !clientRef.current) return;

      const runId = crypto.randomUUID();
      currentRunId.current = runId;

      const userMessage: ChatMessage = {
        id: `user-${runId}`,
        role: 'user',
        content: trimmed,
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
          message: trimmed,
          deliver: false,
          idempotencyKey: runId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('error');
        setMessages(prev =>
          prev.map(item =>
            item.id === assistantMessageId
              ? { ...item, content: `Error: ${message}`, status: 'error' }
              : item
          )
        );
      }
    },
    [resolvedSessionKey]
  );

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
    connected,
    connect,
    disconnect,
    sendMessage,
    abort,
    loadHistory,
    applySessionDefaults,
  };
}
