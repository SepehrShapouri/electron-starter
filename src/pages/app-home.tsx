import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { authApi } from '@/lib/auth-api';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Unplug,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
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
import { QueuePill } from '../components/app/queue-pill';
import { useGatewayChat } from '../lib/use-gateway-chat';
import { useGatewayProvision } from '../lib/use-gateway-provision';

export default function AppHome() {
  const { provisionQuery, chatConfig } = useGatewayProvision();

  const profile = provisionQuery.data ?? null;
  const launchInstanceId = profile?.instanceId ?? null;

  const instanceStatusQuery = useQuery({
    queryKey: ['instance-status', launchInstanceId],
    queryFn: () => authApi.getProvisionStatus(launchInstanceId as string),
    enabled:
      Boolean(launchInstanceId) &&
      Boolean(profile) &&
      profile?.status !== 'running',
    refetchInterval: query => {
      const taskStatus =
        query.state.data?.taskStatus ?? query.state.data?.status;
      return taskStatus === 'running' ? false : 10000;
    },
  });

  const effectiveTaskStatus =
    instanceStatusQuery.data?.taskStatus ?? profile?.status ?? 'provisioning';

  useEffect(() => {
    if (effectiveTaskStatus !== 'running') {
      return;
    }

    void provisionQuery.refetch();
  }, [effectiveTaskStatus, provisionQuery]);

  const resolvedChatConfig = useMemo(
    () =>
      chatConfig ?? {
        gatewayUrl: '',
        token: undefined,
        sessionKey: 'main',
      },
    [chatConfig]
  );

  const {
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
    historyLoaded,
  } = useGatewayChat(resolvedChatConfig);

  const reconnect = () => {
    disconnect();
    // Small delay to ensure cleanup before reconnecting
    setTimeout(() => connect(), 100);
  };

  useEffect(() => {
    if (!resolvedChatConfig.gatewayUrl || connected) return;
    if (status === 'idle' || status === 'error') {
      connect();
    }
  }, [resolvedChatConfig.gatewayUrl, connected, status, connect]);

  useEffect(() => {
    if (!connected || historyLoaded) {
      return;
    }

    void loadHistory();
  }, [connected, historyLoaded, loadHistory]);

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

  if (profile && effectiveTaskStatus !== 'running') {
    const progressValue =
      effectiveTaskStatus === 'provisioning'
        ? 10
        : effectiveTaskStatus === 'pending'
          ? 65
          : 10;
    const statusLabel =
      effectiveTaskStatus === 'provisioning'
        ? 'Allocating compute'
        : effectiveTaskStatus === 'pending'
          ? 'Finalizing services'
          : 'Preparing instance';

    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-6">
          <p className="text-xl font-semibold text-foreground">
            Launching your agent...
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment is confirmed. We are preparing your runtime.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Provisioning status</span>
              <span className="font-medium text-foreground">{statusLabel}</span>
            </div>
            <Progress value={progressValue} />
            <p className="text-xs text-muted-foreground">
              This usually takes less than a minute.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (instanceStatusQuery.error) {
    const message =
      instanceStatusQuery.error instanceof Error
        ? instanceStatusQuery.error.message
        : 'Failed to check instance status.';

    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-background p-6 shadow-xl shadow-destructive/5">
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
                <Unplug className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Launch Status Unavailable
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {message}
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => instanceStatusQuery.refetch()}
                disabled={instanceStatusQuery.isFetching}
              >
                {instanceStatusQuery.isFetching ? (
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
                        <>
                          {message.content && (
                            <MessageResponse>{message.content}</MessageResponse>
                          )}
                        </>
                      )}
                    </MessageContent>
                  </Message>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      <QueuePill queue={queue} onRemove={removeFromQueue} />
      <div className="shrink-0  backdrop-blur-xl px-4 sm:px-6 pb-6 pt-4">
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
                  size="iconSm"
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
          className="**:data-[slot=input-group]:rounded-lg **:data-[slot=input-group]:border-0  **:data-[slot=input-group]:bg-floated-blur **:data-[slot=input-group]:shadow-fancy"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={
                resolvedChatConfig.gatewayUrl
                  ? connected
                    ? 'Message your assistant'
                    : 'Message now. It will send when reconnected.'
                  : 'Clawing…'
              }
              className="bg-transparent placeholder:text-muted-foreground/60"
            />
          </PromptInputBody>
          <PromptInputFooter className="items-center">
            <PromptInputSubmit
              status={submitStatus}
              disabled={!resolvedChatConfig.gatewayUrl}
              onStop={abort}
              className="ml-auto"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
