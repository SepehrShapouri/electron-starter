import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CronRunLogEntry } from '@/lib/cron-types';
import { RUN_LIMIT, formatDuration, formatTimestamp, renderStatusIcon, truncate } from '../lib/utils';

export function RunsPanel({
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
        <div className="space-y-1" aria-label="Loading run history">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="border-b border-border/50 py-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-3.5 w-3.5 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
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
      <div className="space-y-1" aria-label="Run history list">
        {entries.slice(0, RUN_LIMIT).map(entry => (
          <div
            key={`${entry.jobId}-${entry.ts}-${entry.status}`}
            className="group border-b border-border/50 py-3 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {renderStatusIcon(entry.status)}
              </div>
  
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(entry.ts)}
                  </span>
  
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 py-0 font-mono text-[10px]"
                  >
                    {typeof entry.durationMs === 'number'
                      ? formatDuration(entry.durationMs)
                      : 'n/a'}
                  </Badge>
                </div>
  
                <p className="text-sm leading-relaxed text-foreground/90">
                  {entry.summary ||
                    (entry.error
                      ? truncate(entry.error, 200)
                      : 'No details available.')}
                </p>
  
                {entry.error && entry.summary ? (
                  <p className="mt-1 text-sm text-destructive">
                    {truncate(entry.error, 200)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  