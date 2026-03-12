import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/features/scheduled/components/empty-state';
import { ErrorState } from '@/features/scheduled/components/error-state';
import { LoadingState } from '@/features/scheduled/components/loading-state';
import RunsHistorySheet from '@/features/scheduled/components/run-history-sheet';
import { ScheduledTaskCard } from '@/features/scheduled/components/scheduled-task-card';
import {
  listGatewayCrons,
  removeGatewayCron,
  updateGatewayCronEnabled,
} from '@/lib/gateway-cron';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your scheduled tasks and automations.
        </p>
      </header>

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
        <div className="rounded-sm border border-border bg-card">
          <div className="px-4">
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
          </div>
        </div>
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
        onToggle={enabled => {
          if (!selectedJob) return;
          toggleMutation.mutate({ id: selectedJob.id, enabled });
        }}
        togglePending={
          toggleMutation.isPending &&
          toggleMutation.variables?.id === selectedJob?.id
        }
      />
    </div>
  );
}
