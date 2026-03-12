import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { RUN_LIMIT, formatTimestamp } from '@/features/scheduled/lib/utils';
import type { CronJob } from '@/lib/cron-types';
import {
  describeCronSchedule,
  listGatewayCronRuns,
  summarizeCronPayload
} from '@/lib/gateway-cron';
import { useQuery } from '@tanstack/react-query';
import { RunsPanel } from './runs-panel';

export default function RunsHistorySheet({
  gatewayConfig,
  open,
  onOpenChange,
  job,
  onToggle,
  togglePending,
}: {
  gatewayConfig: { gatewayUrl: string; token?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: CronJob | null;
  onToggle?: (enabled: boolean) => void;
  togglePending?: boolean;
}) {
  const runsQuery = useQuery({
    queryKey: ['cron-runs', gatewayConfig?.gatewayUrl, job?.id],
    queryFn: () =>
      listGatewayCronRuns(gatewayConfig!, {
        id: job?.id ?? '',
        limit: RUN_LIMIT,
      }),
    enabled: open && Boolean(job?.id) && Boolean(gatewayConfig),
  });

  if (!job) return null;

  const nextRun =
    typeof job.state?.nextRunAtMs === 'number'
      ? formatTimestamp(job.state.nextRunAtMs)
      : 'Not scheduled';

  const lastRun =
    typeof job.state?.lastRunAtMs === 'number'
      ? formatTimestamp(job.state.lastRunAtMs)
      : 'No runs yet';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border p-6 pb-4">
          <SheetTitle className="text-base font-medium">{job.name}</SheetTitle>
          <SheetDescription className="text-sm">
            {describeCronSchedule(job.schedule)}
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border p-6">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Action
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">
            {summarizeCronPayload(job)}
          </p>
        </div>

        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Next run</p>
                <p className="font-mono text-xs">
                  {nextRun === 'Not scheduled' ? '—' : nextRun}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Last run</p>
                <p className="font-mono text-xs">{lastRun}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {job.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={job.enabled}
                disabled={togglePending}
                onCheckedChange={onToggle}
                aria-label="Toggle task"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Run History
            </h3>
            <RunsPanel
              entries={runsQuery.data ?? []}
              isLoading={runsQuery.isLoading}
              error={runsQuery.error}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}