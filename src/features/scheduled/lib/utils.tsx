import { CronRunLogEntry } from "@/lib/cron-types";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

export function formatTimestamp(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestampMs));
}
export const RUN_LIMIT = 50;

export function renderStatusIcon(status: CronRunLogEntry['status']) {
  if (status === 'ok') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-5" />;
  }

  if (status === 'error') {
    return <XCircle className="h-3.5 w-3.5 text-red-5" />;
  }

  return <AlertCircle className="h-3.5 w-3.5 text-yellow-5" />;
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}