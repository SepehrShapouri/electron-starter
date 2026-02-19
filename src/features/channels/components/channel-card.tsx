import { Badge } from '@/components/ui/badge';
import type { ChannelCardStatus } from '@/lib/gateway-channels';
import { MessageCircle } from 'lucide-react';
import { CHANNEL_ICONS } from '../constants';
import { toConnectionState } from '../utils';

export function ChannelCard({
  channel,
  onOpenDetails,
}: {
  channel: ChannelCardStatus;
  onOpenDetails: () => void;
}) {
  const Icon = CHANNEL_ICONS[channel.id] ?? MessageCircle;
  const state = toConnectionState(channel);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetails}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails();
        }
      }}
      className="cursor-pointer rounded-xl p-4 transition-colors hover:bg-neutral-a3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Open details for ${channel.label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <h2 className="truncate text-sm font-semibold">{channel.label}</h2>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{channel.description}</p>
        </div>
        <Badge size="sm" variant={state.variant} className="shrink-0">
          {state.label}
        </Badge>
      </div>
    </div>
  );
}
