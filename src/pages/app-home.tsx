import Clawpilot from '@/components/icons/Clawpilot.svg';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { InstanceLaunching } from '@/components/app/instance-launching';
import { InstanceSetup } from '@/components/app/instance-setup';
import { ApiError } from '@/lib/axios';
import { useRouteContext } from '@tanstack/react-router';
import { Loader2, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '../components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../components/ai-elements/message';
import {
  Context,
  ContextContent,
  ContextContentHeader,
  ContextTrigger,
} from '../components/ai-elements/context';
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
import { useGatewayChatSession } from '../lib/gateway/store';
import { useContextUsage } from '../lib/use-context-usage';
import { BarsSpinner } from '@/components/bars-spinner';
export default function AppHome() {
  const { session } = useRouteContext({ from: '/app' });
  const { provisionQuery, chatConfig } = useGatewayProvision();

  const profile = provisionQuery.data ?? null;
  const taskStatus = profile?.status ?? 'provisioning';

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
    queue,
    connected,
    connect,
    messages,
    disconnect,
    sendMessage,
    removeFromQueue,
    abort,
    loadHistory,
    historyLoaded,
  } = useGatewayChat(resolvedChatConfig);

  const { sessionKey: resolvedSessionKey } = useGatewayChatSession();
  const contextUsage = useContextUsage(chatConfig, resolvedSessionKey);
  const reconnect = () => {
    disconnect();
    connect();
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
        <BarsSpinner size={20} />
      </div>
    );
  }
  if (
    !profile &&
    provisionQuery.isError &&
    provisionQuery.error instanceof ApiError &&
    provisionQuery.error.status === 404
  ) {
    return <InstanceSetup />;
  }

  if (!profile && provisionQuery.isError) {
    const message =
      provisionQuery.error instanceof Error
        ? provisionQuery.error.message
        : 'Failed to provision gateway.';
        return     <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clawpilot className="text-muted-foreground size-10" />
          </EmptyMedia>
          <Alert variant="secondaryDestructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <EmptyDescription>
            We are having issues waking up your lobster, please try again or if
            the issue persists, reach out to us.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-row justify-center gap-2">
            <Button size="sm" onClick={()=>provisionQuery.refetch()} disabled={provisionQuery.isFetching}>
              Try again
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="mailto:support@clawpilot.ai">Contact us</a>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
  }

  if (profile && taskStatus !== 'running') {
    return <InstanceLaunching status={taskStatus} />;
  }

  const submitStatus =
    status === 'streaming'
      ? 'streaming'
      : status === 'connecting'
        ? 'submitted'
        : status === 'error'
          ? 'error'
          : 'ready';
  const isEmptyConversation = messages.length === 0;
  const displayName = session?.user?.name ?? session?.name ?? null;
  const firstName = displayName?.trim().split(/\s+/)[0] ?? null;
  const promptComposer = (
    <PromptInput
      onSubmit={({ text }) => sendMessage(text)}
      className="**:data-[slot=input-group]:rounded-lg **:data-[slot=input-group]:border-0 **:data-[slot=input-group]:bg-floated **:data-[slot=input-group]:shadow-fancy **:data-[slot=input-group]:dark:shadow-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={
            resolvedChatConfig.gatewayUrl
              ? connected
                ? 'Ask ClawPilot'
                : 'Message now. It will send when reconnected.'
              : 'Clawing…'
          }
          className="bg-transparent placeholder:text-muted-foreground/60"
        />
      </PromptInputBody>
      <PromptInputFooter className="items-center p-1.5">
        {contextUsage ? (
          <Context
            usedTokens={contextUsage.usedTokens}
            maxTokens={contextUsage.maxTokens}
            openDelay={200}
          >
            <ContextTrigger size="sm" />
            <ContextContent>
              <ContextContentHeader />
            </ContextContent>
          </Context>
        ) : (
          <span />
        )}
        <PromptInputSubmit
          status={submitStatus}
          disabled={!resolvedChatConfig.gatewayUrl}
          onStop={abort}
        />
      </PromptInputFooter>
    </PromptInput>
  );

  if (error) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clawpilot className="text-muted-foreground size-10" />
          </EmptyMedia>
          <Alert variant="secondaryDestructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <EmptyDescription>
            We are having issues waking up your lobster, please try again or if
            the issue persists, reach out to us.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-row justify-center gap-2">
            <Button size="sm" onClick={reconnect}>
              Try again
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="mailto:support@clawpilot.ai">Contact us</a>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    );
  }

  if (status === 'connecting') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarsSpinner size={32} />
          </EmptyMedia>
          <EmptyTitle>Waking up your lobster</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        {isEmptyConversation ? (
          <div className="flex h-full items-center px-4 pb-10 pt-4 sm:px-6">
            <div className="w-full flex flex-col">
              <div className="flex flex-col gap-6 items-start">
                <Clawpilot className="h-8 text-neutral-a7" />
                <div className="flex flex-col gap-2">
                  {firstName ? (
                    <p className="text-lg">Hi, {firstName}!</p>
                  ) : null}
                  <h1 className="text-3xl font-medium">
                    Where should we start?
                  </h1>
                </div>
              </div>
              <div className="w-full py-8">{promptComposer}</div>
            </div>
          </div>
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="px-4 py-8 sm:px-6">
              {messages.map(message => {
                const isThinking =
                  message.role === 'assistant' &&
                  message.status === 'streaming' &&
                  !message.content;

                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {isThinking ? (
                        <div className="inline-flex items-center gap-1.5 overflow-visible py-1 leading-none text-muted-foreground">
                          <span className="sr-only">Thinking</span>
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
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
              })}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>
      {!isEmptyConversation ? (
        <>
          <QueuePill queue={queue} onRemove={removeFromQueue} />
          <div className="shrink-0 px-4 pb-6 pt-4 backdrop-blur-xl sm:px-6">
            {promptComposer}
          </div>
        </>
      ) : null}
    </div>
  );
}
