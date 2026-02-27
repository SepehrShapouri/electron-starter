import { Button } from '@/components/ui/button';
import { type ComposioAccount, integrationsApi } from '@/lib/integrations-api';
import { openExternalUrl } from '@/lib/open-external-url';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, LoaderCircle } from 'lucide-react';
import { getAccountLabel, getAccountMetaLabel } from '../utils';

const GOOGLE_CALENDAR_TOOLKIT = 'googlecalendar';

export function GoogleCalendarIntegrationSheet({
  accounts,
}: {
  accounts: ComposioAccount[];
}) {
  const queryClient = useQueryClient();

  const invalidateStatus = () =>
    queryClient.invalidateQueries({ queryKey: ['integrations-status'] });

  const connectMutation = useMutation({
    mutationFn: () => {
      const redirectUrl = window.electronAPI
        ? 'clawpilot://auth/callback?next=/app/integrations'
        : `${window.location.origin}/app/integrations`;

      return integrationsApi
        .connectComposioToolkit(GOOGLE_CALENDAR_TOOLKIT, redirectUrl)
        .then(result => openExternalUrl(result.url));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectedAccountId: string) =>
      integrationsApi.disconnectComposioAccount(connectedAccountId),
    onSuccess: () => invalidateStatus(),
  });

  return (
    <div className="space-y-4">
      {accounts.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Connected calendars</p>
          <ul className="space-y-1.5" aria-label="Connected calendars">
            {accounts.map(account => {
              const label = getAccountLabel(account, 'Google Calendar account');
              const metaLabel = getAccountMetaLabel(account);
              const isRemoving =
                disconnectMutation.isPending &&
                disconnectMutation.variables === account.connectedAccountId;

              return (
                <li
                  key={account.connectedAccountId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {metaLabel}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      disconnectMutation.mutate(account.connectedAccountId)
                    }
                    disabled={isRemoving || disconnectMutation.isPending}
                  >
                    {isRemoving ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                    ) : (
                      'Remove'
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>

          {disconnectMutation.isError ? (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {disconnectMutation.error instanceof Error
                ? disconnectMutation.error.message
                : 'Failed to disconnect account.'}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t pt-4">
        <Button
          type="button"
          variant={accounts.length > 0 ? 'outline' : 'default'}
          className="w-full"
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
        >
          {connectMutation.isPending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Redirecting…
            </>
          ) : accounts.length > 0 ? (
            'Add another Google Calendar account'
          ) : (
            'Connect Google Calendar'
          )}
        </Button>

        {connectMutation.isError ? (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {connectMutation.error instanceof Error
              ? connectMutation.error.message
              : 'Failed to start connection.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
