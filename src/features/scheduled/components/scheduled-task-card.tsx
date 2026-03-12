import { BarsSpinner } from '@/components/bars-spinner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { formatTimestamp } from '@/features/scheduled/lib/utils';
import type { CronJob } from '@/lib/cron-types';
import {
    describeCronSchedule
} from '@/lib/gateway-cron';
import {
    History,
    MoreHorizontal,
    Trash2
} from 'lucide-react';
export function ScheduledTaskCard({
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
      <div className="flex items-center justify-between border-b border-border py-4 last:border-b-0">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Switch
            disabled={togglePending || removePending}
            checked={job.enabled}
            onCheckedChange={onToggle}
            aria-label={`Toggle ${job.name}`}
          />
  
          <div className="min-w-0 flex-1">
            <button
              onClick={onOpenHistory}
              className="block w-full max-w-2/3 truncate text-left text-sm font-medium text-foreground underline-offset-2 hover:underline"
            >
              {job.name}
            </button>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {describeCronSchedule(job.schedule)}
            </p>
          </div>
        </div>
  
        <div className="flex shrink-0 items-center gap-6 text-xs text-muted-foreground">
          <div className="hidden w-36 sm:block">
            <span className="text-muted-foreground/60">Next</span>{' '}
            <span>{nextRun === 'Not scheduled' ? '—' : nextRun}</span>
          </div>
  
          <div className="hidden w-36 md:block">
            <span className="text-muted-foreground/60">Last</span>{' '}
            <span>{lastRun}</span>
          </div>
  
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
  
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenHistory}>
                <History className="mr-2 h-4 w-4" />
                View history
              </DropdownMenuItem>
  
              <DropdownMenuItem
                disabled={removePending || togglePending}
                onClick={handleRemove}
                className="text-destructive focus:text-destructive"
              >
                {removePending ? (
                  <>
                    <BarsSpinner size={14} />
                    Removing
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }