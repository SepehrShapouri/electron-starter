import Claude from '@/components/icons/Claude_AI_symbol 1.svg';
import GPT from '@/components/icons/ChatGPT-Logo 1.svg';
import Gemini from '@/components/icons/gemini-color 1.svg';

type ModelOption = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MODELS: ModelOption[] = [
  {
    id: 'anthropic',
    name: 'Claude 4.5 Sonnet',
    description: 'Top-tier reasoning with reliable, nuanced responses.',
    icon: Claude,
  },
  {
    id: 'openai',
    name: 'GPT-5',
    description: 'Strong all-rounder with broad tool support.',
    icon: GPT,
  },
  {
    id: 'gemini',
    name: 'Gemini 3 Flash Preview',
    description: 'Optimized for speed at the lowest cost per token.',
    icon: Gemini,
  },
];

type ModelSelectCardProps = {
  selectedModel: string;
  onSelect: (modelId: string) => void;
};

export function ModelSelectCard({
  selectedModel,
  onSelect,
}: ModelSelectCardProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {MODELS.map(model => {
        const isSelected = selectedModel === model.id;
        const Icon = model.icon;

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelect(model.id)}
            aria-pressed={isSelected}
            className={`relative flex h-full w-full cursor-pointer flex-col items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors active:scale-99 ${
              isSelected
                ? 'bg-neutral-a4'
                : 'bg-transparent hover:bg-neutral-a3'
            }`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background-2">
              <Icon className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-2 text-sm font-medium text-foreground">
                {model.name}
              </span>
              <span className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {model.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
