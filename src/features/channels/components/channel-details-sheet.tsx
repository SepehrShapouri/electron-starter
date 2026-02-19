import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ChannelCardStatus, GatewayConnectionConfig } from '@/lib/gateway-channels';
import { toConnectionState } from '../utils';
import { TelegramChannelSheet } from './telegram-channel-sheet';
import { WhatsAppChannelSheet } from './whatsapp-channel-sheet';

export function ChannelDetailsSheet({
  open,
  onOpenChange,
  channel,
  gatewayConfig,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelCardStatus | null;
  gatewayConfig: GatewayConnectionConfig;
}) {
  const state = channel ? toConnectionState(channel) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle>{channel?.label ?? 'Channel details'}</SheetTitle>
          <SheetDescription>
            {channel ? channel.description : 'Choose a channel card to view details.'}
          </SheetDescription>
        </SheetHeader>

        {channel ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <div className="space-y-3 border-b py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Connection</span>
                {state ? (
                  <Badge size="sm" variant={state.variant}>
                    {state.label}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Configured</span>
                <Badge
                  size="sm"
                  variant={channel.configured ? 'secondarySuccess' : 'secondary'}
                >
                  {channel.configured ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
              {channel.id === 'telegram' ? (
                <TelegramChannelSheet
                  channel={channel}
                  gatewayConfig={gatewayConfig}
                />
              ) : channel.id === 'whatsapp' ? (
                <WhatsAppChannelSheet
                  channel={channel}
                  gatewayConfig={gatewayConfig}
                />
              ) : (
                <Card className="gap-2 py-5 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-sm">Coming soon</CardTitle>
                    <CardDescription>
                      Setup UI for this channel is not available yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">Select a channel from the list.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
