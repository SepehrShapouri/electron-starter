import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
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
    connected,
    connect,
    sendMessage,
    abort,
    loadHistory,
  } = useGatewayChat(chatConfig);

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
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {message}
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
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <Alert variant="destructive" className="shadow-lg">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent className="px-4 sm:px-6 py-8">
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="What can I help you with?"
                description="Ask me anything. I'm here to assist."
              />
            ) : (
              messages.map(message => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    <MessageResponse>{message.content || ' '}</MessageResponse>
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="shrink-0 bg-background/80 backdrop-blur-xl px-4 sm:px-6 pb-6 pt-4">
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
