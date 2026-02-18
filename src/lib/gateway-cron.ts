import { GatewayClient, type GatewayHelloOk } from './gateway-client';
import type { CronJob, CronRunLogEntry, CronStatus } from './cron-types';

export type GatewayConnectionConfig = {
  gatewayUrl: string;
  token?: string;
  password?: string;
};

const GATEWAY_WS_PORT = '18789';

export async function listGatewayCrons(
  config: GatewayConnectionConfig
): Promise<CronJob[]> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<{ jobs?: CronJob[] }>('cron.list', {
      includeDisabled: true,
    });
    return Array.isArray(payload.jobs) ? payload.jobs : [];
  });
}

export async function updateGatewayCronEnabled(
  config: GatewayConnectionConfig,
  params: { id: string; enabled: boolean }
): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    await client.request('cron.update', {
      id: params.id,
      patch: { enabled: params.enabled },
    });
  });
}

export async function removeGatewayCron(
  config: GatewayConnectionConfig,
  params: { id: string }
): Promise<void> {
  await withGatewayClient(config, async ({ client }) => {
    await client.request('cron.remove', { id: params.id });
  });
}

export async function listGatewayCronRuns(
  config: GatewayConnectionConfig,
  params: { id: string; limit?: number }
): Promise<CronRunLogEntry[]> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<{ entries?: CronRunLogEntry[] }>('cron.runs', {
      id: params.id,
      limit: params.limit ?? 50,
    });
    return Array.isArray(payload.entries) ? payload.entries : [];
  });
}

export async function getGatewayCronStatus(
  config: GatewayConnectionConfig
): Promise<CronStatus | null> {
  return withGatewayClient(config, async ({ client }) => {
    const payload = await client.request<CronStatus>('cron.status', {});
    return payload ?? null;
  });
}

export function describeCronSchedule(schedule: CronJob['schedule']): string {
  if (schedule.kind === 'at') {
    const date = safeDate(schedule.at);
    return date ? `Runs once at ${formatDateTime(date)}` : 'Runs once';
  }

  if (schedule.kind === 'every') {
    if (!Number.isFinite(schedule.everyMs) || schedule.everyMs <= 0) {
      return 'Repeats';
    }
    return `Every ${describeDuration(schedule.everyMs)}`;
  }

  const description = describeCronExpression(schedule.expr);
  return schedule.tz ? `${description} (${schedule.tz})` : description;
}

export function summarizeCronPayload(job: CronJob): string {
  if (job.payload.kind === 'systemEvent') {
    return truncate(job.payload.text, 180);
  }
  return truncate(job.payload.message, 180);
}

export function describeCronExpression(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5) {
    return `Cron: ${expression}`;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  const minuteStepMatch = /^\*\/(\d+)$/.exec(minute);
  if (minuteStepMatch && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${minuteStepMatch[1]} minutes`;
  }

  if (isNumeric(minute) && isNumeric(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every day at ${formatTime(Number(hour), Number(minute))}`;
  }

  if (isNumeric(minute) && isNumeric(hour) && dayOfMonth === '*' && month === '*' && isNumeric(dayOfWeek)) {
    return `Every ${dayName(Number(dayOfWeek))} at ${formatTime(Number(hour), Number(minute))}`;
  }

  if (isNumeric(minute) && isNumeric(hour) && isNumeric(dayOfMonth) && month === '*' && dayOfWeek === '*') {
    return `Day ${dayOfMonth} of each month at ${formatTime(Number(hour), Number(minute))}`;
  }

  return `Cron: ${expression}`;
}

function safeDate(value: string): Date | null {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return new Date(ms);
}

function describeDuration(ms: number): string {
  if (ms < 60 * 1000) {
    const seconds = Math.round(ms / 1000);
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
  if (ms < 60 * 60 * 1000) {
    const minutes = Math.round(ms / (60 * 1000));
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  if (ms < 24 * 60 * 60 * 1000) {
    const hours = Math.round(ms / (60 * 60 * 1000));
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function formatTime(hour: number, minute: number): string {
  const date = new Date(2000, 0, 1, hour, minute, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function dayName(dayIndex: number): string {
  const names = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return names[dayIndex] ?? 'day';
}

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}...`;
}

function toGatewaySocketUrl(rawGatewayUrl: string): string {
  const raw = rawGatewayUrl.trim();
  if (!raw) {
    throw new Error('Missing gateway URL');
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  const parsed = new URL(hasScheme ? raw : `ws://${raw}`);

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'ws:';
  } else if (parsed.protocol === 'https:') {
    parsed.protocol = 'wss:';
  } else if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`Unsupported gateway URL protocol: ${parsed.protocol}`);
  }

  if (!parsed.port) {
    parsed.port = GATEWAY_WS_PORT;
  }

  return parsed.toString();
}

async function withGatewayClient<T>(
  config: GatewayConnectionConfig,
  run: (context: { client: GatewayClient; hello: GatewayHelloOk }) => Promise<T>
): Promise<T> {
  let settled = false;

  return new Promise<T>((resolve, reject) => {
    const client = new GatewayClient({
      url: toGatewaySocketUrl(config.gatewayUrl),
      token: config.token?.trim() || undefined,
      password: config.password?.trim() || undefined,
      onHello: hello => {
        if (settled) {
          return;
        }
        settled = true;
        void run({ client, hello })
          .then(result => resolve(result))
          .catch(error => reject(error))
          .finally(() => {
            client.disconnect();
          });
      },
      onError: error => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      },
      onClose: ({ reason }) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error(reason || 'Gateway disconnected'));
      },
    });

    client.connect();

    window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      client.disconnect();
      reject(new Error('Timed out while connecting to gateway'));
    }, 10000);
  });
}
