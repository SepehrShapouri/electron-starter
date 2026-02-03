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
    <div className="relative flex h-full w-full max-w-xl mx-auto flex-col">
      {error && (
        <div className="absolute top-0 left-0 right-0 z-10 px-6">
          <Alert variant="destructive">
            <AlertTitle>Oops</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <Conversation className="h-full">
          <ConversationContent className="px-6 py-6 pb-4">
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="No messages yet"
                description="Your OpenClaw session is ready for a first prompt."
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

      <div className="shrink-0 px-6 pb-6 pt-4">
        <PromptInput
          onSubmit={({ text }) => sendMessage(text)}
          className="bg-background shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={
                connected ? 'Message Jarvis' : 'Connecting to gateway'
              }
              className="bg-transparent"
            />
          </PromptInputBody>
          <PromptInputFooter className="items-center">
            <p className="px-2 text-xs text-muted-foreground">
              {connected ? 'Shift + Enter for newline' : 'Waiting for gateway'}
            </p>
            <PromptInputSubmit
              status={submitStatus}
              disabled={!connected}
              onStop={abort}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
