import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { CronJob, CronRunLogEntry } from '@/lib/cron-types';
import {
  describeCronSchedule,
  getGatewayCronStatus,
  listGatewayCronRuns,
  listGatewayCrons,
  removeGatewayCron,
  updateGatewayCronEnabled,
  summarizeCronPayload,
} from '@/lib/gateway-cron';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const RUN_LIMIT = 50;

export default function ScheduledPage() {
  const queryClient = useQueryClient();
  const { provisionQuery, gatewayConfig } = useGatewayProvision();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['cron-jobs', gatewayConfig?.gatewayUrl],
    queryFn: () => listGatewayCrons(gatewayConfig!),
    enabled: Boolean(gatewayConfig),
  });

  const statusQuery = useQuery({
    queryKey: ['cron-status', gatewayConfig?.gatewayUrl],
    queryFn: () => getGatewayCronStatus(gatewayConfig!),
    enabled: Boolean(gatewayConfig),
    retry: false,
  });

  const toggleMutation = useMutation({
    mutationFn: (params: { id: string; enabled: boolean }) =>
      updateGatewayCronEnabled(gatewayConfig!, params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['cron-jobs', gatewayConfig?.gatewayUrl],
      });
      await queryClient.invalidateQueries({
        queryKey: ['cron-status', gatewayConfig?.gatewayUrl],
      });
      await queryClient.invalidateQueries({
        queryKey: ['cron-runs', gatewayConfig?.gatewayUrl],
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (params: { id: string }) =>
      removeGatewayCron(gatewayConfig!, params),
    onSuccess: async (_data, variables) => {
      if (variables.id === selectedJobId) {
        setHistoryOpen(false);
        setSelectedJobId(null);
      }
      await queryClient.invalidateQueries({
        queryKey: ['cron-jobs', gatewayConfig?.gatewayUrl],
      });
      await queryClient.invalidateQueries({
        queryKey: ['cron-status', gatewayConfig?.gatewayUrl],
      });
      await queryClient.removeQueries({
        queryKey: ['cron-runs', gatewayConfig?.gatewayUrl, variables.id],
      });
    },
  });

  const jobs = jobsQuery.data ?? [];
  const selectedJob = useMemo(
    () => jobs.find(job => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  useEffect(() => {
    if (selectedJobId && !selectedJob) {
      setHistoryOpen(false);
      setSelectedJobId(null);
    }
  }, [selectedJobId, selectedJob]);

  const openHistory = (jobId: string) => {
    setSelectedJobId(jobId);
    setHistoryOpen(true);
  };

  const handleHistoryOpenChange = (open: boolean) => {
    setHistoryOpen(open);
    if (!open) {
      setSelectedJobId(null);
    }
  };

  if (!gatewayConfig && provisionQuery.isLoading) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  if (!gatewayConfig && provisionQuery.isError) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <ErrorState
          message={
            provisionQuery.error instanceof Error
              ? provisionQuery.error.message
              : 'Unable to load gateway access.'
          }
          onRetry={() => provisionQuery.refetch()}
          isRetrying={provisionQuery.isFetching}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Scheduled</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scheduled tasks</p>
      </header>

      {statusQuery.data ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge
            variant={
              statusQuery.data.enabled ? 'secondarySuccess' : 'secondary'
            }
            size="sm"
          >
            Scheduler {statusQuery.data.enabled ? 'on' : 'off'}
          </Badge>
          <span>{statusQuery.data.jobs} jobs</span>
          {typeof statusQuery.data.nextWakeAtMs === 'number' ? (
            <span>
              Next wake: {formatTimestamp(statusQuery.data.nextWakeAtMs)}
            </span>
          ) : null}
        </div>
      ) : null}

      {jobsQuery.isLoading ? (
        <LoadingState />
      ) : jobsQuery.isError ? (
        <ErrorState
          message={
            jobsQuery.error instanceof Error
              ? jobsQuery.error.message
              : 'Unable to load scheduled tasks.'
          }
          onRetry={() => jobsQuery.refetch()}
          isRetrying={jobsQuery.isFetching}
        />
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="space-y-3" aria-label="Scheduled tasks list">
          {jobs.map(job => (
            <ScheduledTaskCard
              key={job.id}
              job={job}
              onOpenHistory={() => openHistory(job.id)}
              onToggle={enabled =>
                toggleMutation.mutate({ id: job.id, enabled })
              }
              onRemove={() => removeMutation.mutate({ id: job.id })}
              togglePending={
                toggleMutation.isPending &&
                toggleMutation.variables?.id === job.id
              }
              removePending={
                removeMutation.isPending &&
                removeMutation.variables?.id === job.id
              }
            />
          ))}
        </section>
      )}

      {toggleMutation.isError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to update task</AlertTitle>
          <AlertDescription>
            {toggleMutation.error instanceof Error
              ? toggleMutation.error.message
              : 'Please try again.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {removeMutation.isError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to remove task</AlertTitle>
          <AlertDescription>
            {removeMutation.error instanceof Error
              ? removeMutation.error.message
              : 'Please try again.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <RunsHistorySheet
        gatewayConfig={gatewayConfig}
        open={historyOpen}
        onOpenChange={handleHistoryOpenChange}
        job={selectedJob}
      />
    </div>
  );
}

function ScheduledTaskCard({
  job,
  onOpenHistory,
  onToggle,
  onRemove,
  togglePending,
  removePending,
}: {
  job: CronJob;
  onOpenHistory: () => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
  togglePending: boolean;
  removePending: boolean;
}) {
  const nextRun =
    typeof job.state?.nextRunAtMs === 'number'
      ? formatTimestamp(job.state.nextRunAtMs)
      : 'Not scheduled';
  const lastRun =
    typeof job.state?.lastRunAtMs === 'number'
      ? formatTimestamp(job.state.lastRunAtMs)
      : 'No runs yet';

  const handleRemove = () => {
    const confirmed = window.confirm(`Remove "${job.name}"?`);
    if (confirmed) {
      onRemove();
    }
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base leading-6">{job.name}</CardTitle>
            <CardDescription className="mt-1">
              {describeCronSchedule(job.schedule)}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onOpenHistory}
            >
              History
            </Button>
            <div className="flex items-center gap-2">
              <label
                htmlFor={`task-enabled-${job.id}`}
                className="text-sm text-muted-foreground"
              >
                Enabled
              </label>
              <Switch
                id={`task-enabled-${job.id}`}
                checked={job.enabled}
                disabled={togglePending || removePending}
                onCheckedChange={checked => onToggle(Boolean(checked))}
                aria-label={`Toggle ${job.name}`}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRemove}
              disabled={removePending || togglePending}
              aria-label={`Remove ${job.name}`}
            >
              {removePending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Removing
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 sm:px-5">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Next run</dt>
            <dd>{nextRun}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last run</dt>
            <dd>{lastRun}</dd>
          </div>
        </dl>

        <div>
          <p className="text-muted-foreground text-sm">Action</p>
          <p className="text-sm leading-6">{summarizeCronPayload(job)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RunsHistorySheet({
  gatewayConfig,
  open,
  onOpenChange,
  job,
}: {
  gatewayConfig: { gatewayUrl: string; token?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: CronJob | null;
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

  const nextRun =
    typeof job?.state?.nextRunAtMs === 'number'
      ? formatTimestamp(job.state.nextRunAtMs)
      : 'Not scheduled';
  const lastRun =
    typeof job?.state?.lastRunAtMs === 'number'
      ? formatTimestamp(job.state.lastRunAtMs)
      : 'No runs yet';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle>Run History</SheetTitle>
          <SheetDescription>
            {job ? `Recent runs for ${job.name}` : 'No task selected.'}
          </SheetDescription>
        </SheetHeader>

        {job ? (
          <div className="flex flex-1 min-h-0 flex-col px-4 pb-4">
            <div className="space-y-3 border-b py-4">
              <div>
                <p className="text-sm text-muted-foreground">Task name</p>
                <p className="text-sm font-medium leading-6">{job.name}</p>
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Next run</dt>
                  <dd className="text-right">{nextRun}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last run</dt>
                  <dd className="text-right">{lastRun}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Enabled</dt>
                  <dd>
                    <Badge
                      variant={job.enabled ? 'secondarySuccess' : 'secondary'}
                      size="sm"
                    >
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              <RunsPanel
                entries={runsQuery.data ?? []}
                isLoading={runsQuery.isLoading}
                error={runsQuery.error}
              />
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Select a task to view run history.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RunsPanel({
  entries,
  isLoading,
  error,
}: {
  entries: CronRunLogEntry[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading run history">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Unable to load run history.'}
      </p>
    );
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet.</p>;
  }

  return (
    <div className="space-y-2" aria-label="Run history list">
      {entries.slice(0, RUN_LIMIT).map(entry => (
        <div
          key={`${entry.jobId}-${entry.ts}-${entry.status}`}
          className="rounded-md border p-3"
        >
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge size="sm" variant={statusVariant(entry.status)}>
              {entry.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatTimestamp(entry.ts)}
            </span>
            <span className="text-sm text-muted-foreground">
              {typeof entry.durationMs === 'number'
                ? `${entry.durationMs} ms`
                : 'Duration n/a'}
            </span>
          </div>
          {entry.summary ? <p className="text-sm">{entry.summary}</p> : null}
          {entry.error ? (
            <p className="mt-1 text-sm text-destructive">
              {truncate(entry.error, 200)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-label="Loading scheduled tasks">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="gap-3 py-4">
          <CardHeader className="space-y-2 px-4 sm:px-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-2 px-4 sm:px-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="gap-2 py-8">
      <CardHeader className="items-center px-6 text-center">
        <CardTitle className="text-base">No scheduled tasks yet</CardTitle>
        <CardDescription>
          When tasks are scheduled in your gateway, they will appear here.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle className="text-base">
          Could not load scheduled tasks
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrying
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function statusVariant(status: CronRunLogEntry['status']) {
  if (status === 'ok') return 'secondarySuccess';
  if (status === 'error') return 'secondaryDestructive';
  return 'secondary';
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}...`;
}

function formatTimestamp(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestampMs));
}
