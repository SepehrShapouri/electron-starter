import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ComposioAccount } from '@/lib/integrations-api';
import { Check, LoaderCircle, Zap } from 'lucide-react';
import {
  INTEGRATION_ICONS,
  STATUS_CONFIG,
  type Integration,
  type IntegrationStatus,
} from '../constants';
import { GmailIntegrationSheet } from './gmail-integration-sheet';
import { GoogleCalendarIntegrationSheet } from './google-calendar-integration-sheet';
import { SlackIntegrationSheet } from './slack-integration-sheet';

function IntegrationSheetBody({
  integration,
  accounts,
}: {
  integration: Integration;
  accounts: ComposioAccount[];
}) {
  switch (integration.id) {
    case 'gmail':
      return <GmailIntegrationSheet accounts={accounts} />;
    case 'slack':
      return <SlackIntegrationSheet accounts={accounts} />;
    case 'google-calendar':
      return <GoogleCalendarIntegrationSheet accounts={accounts} />;
    default:
      return null;
  }
}

export function IntegrationDetailsSheet({
  integration,
  accounts,
  open,
  isRefreshing,
  onOpenChange,
}: {
  integration: Integration | null;
  accounts: ComposioAccount[];
  open: boolean;
  isRefreshing: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const Icon = integration ? INTEGRATION_ICONS[integration.id] : null;
  const isLoading = integration?.status === 'loading';
  const statusConfig =
    integration && !isLoading
      ? STATUS_CONFIG[
          integration.status as Exclude<IntegrationStatus, 'loading'>
        ]
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {integration ? (
          <>
            <SheetHeader className="pb-0">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${integration.bgColor}`}>
                  {Icon ? (
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  ) : null}
                </div>
                <div>
                  <SheetTitle className="text-base">
                    {integration.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    {integration.description}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
              {/* Scrollable body */}
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    {isRefreshing && !isLoading ? (
                      <LoaderCircle
                        className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                    {isLoading ? (
                      <Skeleton className="h-4 w-20 rounded-full" />
                    ) : statusConfig ? (
                      <Badge size="sm" variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {integration.longDescription}
                </p>

                {/* Capabilities */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Zap
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    Capabilities
                  </p>
                  <ul
                    className="space-y-1.5"
                    aria-label="Integration capabilities"
                  >
                    {integration.features.map(feature => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 text-sm text-muted-foreground"
                      >
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Integration-specific connect/disconnect UI */}
                {!isLoading ? (
                  <IntegrationSheetBody
                    integration={integration}
                    accounts={accounts}
                  />
                ) : (
                  <Skeleton className="h-9 w-full rounded-md" />
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
