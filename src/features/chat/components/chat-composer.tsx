import {
  Context,
  ContextContent,
  ContextContentHeader,
  ContextTrigger,
} from '@/components/ai-elements/context';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';

type ContextUsageLike = {
  usedTokens: number;
  maxTokens: number;
} | null;

type ChatComposerProps = {
  gatewayUrl: string;
  connected: boolean;
  submitStatus: 'ready' | 'submitted' | 'streaming' | 'error';
  contextUsage: ContextUsageLike;
  onSend: (text: string) => void | Promise<void>;
  onAbort: () => void | Promise<void>;
};

export function ChatComposer({
  gatewayUrl,
  connected,
  submitStatus,
  contextUsage,
  onSend,
  onAbort,
}: ChatComposerProps) {
  return (
    <PromptInput
      onSubmit={({ text }) => onSend(text)}
      className="**:data-[slot=input-group]:rounded-lg **:data-[slot=input-group]:border-0 **:data-[slot=input-group]:bg-floated **:data-[slot=input-group]:shadow-fancy **:data-[slot=input-group]:dark:shadow-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={
            gatewayUrl
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
          disabled={!gatewayUrl}
          onStop={onAbort}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
