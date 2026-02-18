import Claude from '@/components/icons/Claude_AI_symbol 1.svg';
import GPT from '@/components/icons/ChatGPT-Logo 1.svg';
import Gemini from '@/components/icons/gemini-color 1.svg';
import { Badge } from '@/components/ui/badge';

type ModelOption = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
};

const MODELS: ModelOption[] = [
  {
    id: 'anthropic',
    name: 'Claude 4.5 Sonnet',
    description: 'Top-tier reasoning with reliable, nuanced responses.',
    icon: Claude,
    recommended: true,
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
    <div className="grid gap-3 sm:grid-cols-3">
      {MODELS.map(model => {
        const isSelected = selectedModel === model.id;
        const Icon = model.icon;

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelect(model.id)}
            className={`relative flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              isSelected
                ? 'border-foreground bg-neutral-a2'
                : 'border-transparent bg-background hover:bg-neutral-a2'
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-a3">
                <Icon className="size-5" />
              </div>
              {model.recommended && (
                <Badge variant="secondaryAccent" size="sm">
                  Recommended
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                {model.name}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {model.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
