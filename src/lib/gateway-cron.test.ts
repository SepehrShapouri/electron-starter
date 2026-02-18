import { describe, expect, it } from 'vitest';

import { describeCronExpression, describeCronSchedule, summarizeCronPayload } from './gateway-cron';
import type { CronJob } from './cron-types';

describe('describeCronExpression', () => {
  it('formats daily cron expressions', () => {
    expect(describeCronExpression('0 9 * * *')).toMatch(/^Every day at /);
  });

  it('formats minute-step cron expressions', () => {
    expect(describeCronExpression('*/20 * * * *')).toBe('Every 20 minutes');
  });

  it('falls back for unknown cron patterns', () => {
    expect(describeCronExpression('0 0 1 1 *')).toBe('Cron: 0 0 1 1 *');
  });
});

describe('describeCronSchedule', () => {
  it('formats every schedule', () => {
    expect(describeCronSchedule({ kind: 'every', everyMs: 60_000 })).toBe('Every 1 minute');
  });

  it('formats cron schedule with timezone', () => {
    expect(describeCronSchedule({ kind: 'cron', expr: '*/15 * * * *', tz: 'UTC' })).toBe(
      'Every 15 minutes (UTC)'
    );
  });
});

describe('summarizeCronPayload', () => {
  it('returns system event text', () => {
    const job: CronJob = {
      id: 'job-1',
      name: 'A',
      enabled: true,
      createdAtMs: 1,
      updatedAtMs: 1,
      schedule: { kind: 'every', everyMs: 10_000 },
      sessionTarget: 'main',
      wakeMode: 'now',
      payload: { kind: 'systemEvent', text: 'Wake up' },
    };

    expect(summarizeCronPayload(job)).toBe('Wake up');
  });
});
