import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Unplug,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '../components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../components/ai-elements/prompt-input';
import { authApi } from '../lib/auth-api';
import {
  loadGatewayProfile,
  saveGatewayProfile,
  type GatewayProfile,
} from '../lib/gateway-storage';
import { useGatewayChat } from '../lib/use-gateway-chat';

export default function AppHome() {
  const [profile, setProfile] = useState<GatewayProfile | null>(() =>
    loadGatewayProfile()
  );

  const provisionQuery = useQuery({
    queryKey: ['gateway-provision'],
    queryFn: authApi.provisionGateway,
    enabled: !profile,
  });

  useEffect(() => {
    if (provisionQuery.data && !profile) {
      saveGatewayProfile(provisionQuery.data);
      setProfile(provisionQuery.data);
    }
  }, [provisionQuery.data, profile]);

  const chatConfig = useMemo(
    () => ({
      gatewayUrl: profile?.gatewayUrl ?? '',
      token: profile?.gatewayToken ?? undefined,
      sessionKey: 'main',
    }),
    [profile]
  );

  const {
    status,
    error,
    messages,
    toolStatus,
    connected,
    connect,
    disconnect,
    sendMessage,
    abort,
    loadHistory,
  } = useGatewayChat(chatConfig);

  const reconnect = () => {
    disconnect();
    // Small delay to ensure cleanup before reconnecting
    setTimeout(() => connect(), 100);
  };

  useEffect(() => {
    if (!chatConfig.gatewayUrl || connected) return;
    if (status === 'idle' || status === 'error') {
      connect();
    }
  }, [chatConfig.gatewayUrl, connected, status, connect]);

  const historyLoadedRef = useRef(false);
  useEffect(() => {
    if (!connected || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    loadHistory();
  }, [connected, loadHistory]);

  if (!profile && provisionQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!profile && provisionQuery.isError) {
    const message =
      provisionQuery.error instanceof Error
        ? provisionQuery.error.message
        : 'Failed to provision gateway.';
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-background p-6 shadow-xl shadow-destructive/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-destructive/10 via-transparent to-transparent" />
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20 mb-4">
                <Unplug className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Gateway Setup Failed
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {message}
              </p>
              <Button
                variant="outline"
                className="gap-2 border-destructive/20 bg-background/50 hover:bg-destructive/5 hover:border-destructive/30"
                onClick={() => provisionQuery.refetch()}
                disabled={provisionQuery.isFetching}
              >
                {provisionQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const submitStatus =
    status === 'streaming'
      ? 'streaming'
      : status === 'connecting'
        ? 'submitted'
        : status === 'error'
          ? 'error'
          : 'ready';

  return (
    <div className="relative flex h-full w-full max-w-2xl mx-auto flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent className="px-4 sm:px-6 py-8">
            {messages.length === 0 ? (
              connected ? (
                <ConversationEmptyState
                  title="What can I help you with?"
                  description="Ask me anything. I'm here to assist."
                />
              ) : error ? (
                <ConversationEmptyState
                  title="Connection Issue"
                  description="Check the error below and try again."
                />
              ) : (
                <ConversationEmptyState
                  title={status === 'connecting' ? 'Connecting…' : 'Stand by…'}
                  description="Warming up the gateway."
                >
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">
                      {status === 'connecting'
                        ? 'Negotiating secure channel'
                        : 'Waiting for gateway'}
                    </span>
                  </div>
                </ConversationEmptyState>
              )
            ) : (
              messages.map(message => {
                const isThinking =
                  message.role === 'assistant' &&
                  message.status === 'streaming' &&
                  !message.content;

                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {isThinking ? (
                        <div className="inline-flex items-center gap-1.5 text-muted-foreground leading-none py-1 overflow-visible">
                          <span className="sr-only">Thinking</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
                        </div>
                      ) : (
                        <MessageResponse>
                          {message.content || ' '}
                        </MessageResponse>
                      )}
                    </MessageContent>
                  </Message>
                );
              })
            )}
            {toolStatus ? (
              <Message from="assistant">
                <MessageContent className="text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide">
                      Tool
                    </span>
                    <span className="text-xs">{toolStatus.name}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="sr-only">Tool running</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
                    </span>
                  </div>
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="shrink-0 bg-background/80 backdrop-blur-xl px-4 sm:px-6 pb-6 pt-4">
        {error && (
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-background p-4 shadow-lg shadow-destructive/5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-destructive/10 via-transparent to-transparent" />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
                  {status === 'connecting' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                  ) : error.toLowerCase().includes('network') ||
                    error.toLowerCase().includes('offline') ? (
                    <WifiOff className="h-5 w-5 text-destructive" />
                  ) : error.toLowerCase().includes('refused') ||
                    error.toLowerCase().includes('unreachable') ? (
                    <Unplug className="h-5 w-5 text-destructive" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex-1 space-y-1 pt-0.5">
                  <h4 className="text-sm font-medium text-foreground">
                    {status === 'connecting'
                      ? 'Connection in Progress'
                      : error.toLowerCase().includes('timeout')
                        ? 'Connection Timed Out'
                        : error.toLowerCase().includes('refused')
                          ? 'Gateway Unreachable'
                          : 'Connection Failed'}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {error}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-foreground"
                  onClick={reconnect}
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-destructive/20 bg-background/50 hover:bg-destructive/5 hover:border-destructive/30"
                  onClick={reconnect}
                  disabled={status === 'connecting'}
                >
                  {status === 'connecting' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {status === 'connecting' ? 'Reconnecting...' : 'Try Again'}
                </Button>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive/60" />
                  </span>
                  Disconnected
                </span>
              </div>
            </div>
          </div>
        )}
        <PromptInput
          onSubmit={({ text }) => sendMessage(text)}
          className="[&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:border-border/50 [&_[data-slot=input-group]]:bg-muted/30 [&_[data-slot=input-group]]:shadow-sm [&_[data-slot=input-group]]:transition-shadow [&:focus-within_[data-slot=input-group]]:shadow-md [&:focus-within_[data-slot=input-group]]:border-border"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={connected ? 'Message Jarvis…' : 'Connecting…'}
              className="bg-transparent placeholder:text-muted-foreground/60"
            />
          </PromptInputBody>
          <PromptInputFooter className="items-center">
            <p className="px-2 text-xs text-muted-foreground/70">
              {connected ? '⇧ Enter for newline' : 'Establishing connection…'}
            </p>
            <PromptInputSubmit
              status={submitStatus}
              disabled={!connected}
              onStop={abort}
              className="rounded-xl"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
