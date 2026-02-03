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

export function useGatewayChat(config: GatewayChatConfig) {
  const [status, setStatus] = useState<GatewayChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const clientRef = useRef<GatewayClient | null>(null);
  const runToMessageId = useRef(new Map<string, string>());
  const currentRunId = useRef<string | null>(null);

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

      if (!payload || payload.sessionKey !== config.sessionKey) return;
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
    [config.sessionKey]
  );

  const connect = useCallback(() => {
    if (clientRef.current) return;
    setStatus('connecting');
    setError(null);
    const client = new GatewayClient({
      url: config.gatewayUrl,
      token: config.token?.trim() || undefined,
      password: config.password?.trim() || undefined,
      onHello: () => {
        setStatus('ready');
        setError(null);
      },
      onEvent: evt => handleEvent(evt),
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
  }, [config.gatewayUrl, config.password, config.token, handleEvent]);

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
          sessionKey: config.sessionKey,
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
    [config.sessionKey]
  );

  const abort = useCallback(async () => {
    if (!clientRef.current) return;
    const runId = currentRunId.current;
    try {
      await clientRef.current.request(
        'chat.abort',
        runId
          ? { sessionKey: config.sessionKey, runId }
          : { sessionKey: config.sessionKey }
      );
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [config.sessionKey]);

  const loadHistory = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      const res = (await clientRef.current.request('chat.history', {
        sessionKey: config.sessionKey,
        limit: 200,
      })) as { messages?: unknown[] };
      const mapped = (res.messages ?? [])
        .map((message, index) => {
          const m = message as Record<string, unknown>;
          const role = m.role === 'assistant' ? 'assistant' : 'user';
          const content = extractText(message) ?? '';
          return {
            id: `${role}-${index}-${Date.now()}`,
            role,
            content,
            status: 'final',
          } satisfies ChatMessage;
        })
        .filter(m => m.content);
      setMessages(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [config.sessionKey]);

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
  };
}
