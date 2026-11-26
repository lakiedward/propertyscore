import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../lib/logger.ts';
import { startLeaseRenewal } from './lease-renewal.ts';

describe('startLeaseRenewal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('extends the lease on every interval until it is stopped', async () => {
    const extend = vi.fn(() => Promise.resolve(true));
    const lease = startLeaseRenewal(
      'r',
      extend,
      1000,
      createLogger('error', () => undefined),
    );
    await vi.advanceTimersByTimeAsync(3000);
    lease.stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(extend).toHaveBeenCalledTimes(3);
  });

  it('stops once the report is no longer in the queue', async () => {
    const extend = vi.fn(() => Promise.resolve(false));
    const lines: string[] = [];
    startLeaseRenewal(
      'r',
      extend,
      1000,
      createLogger('warn', (line) => lines.push(line)),
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(extend).toHaveBeenCalledTimes(1);
    expect(lines.join('\n')).toContain('report lease not extended');
  });

  it('keeps trying after a renewal fails', async () => {
    const extend = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(true);
    const lease = startLeaseRenewal(
      'r',
      extend,
      1000,
      createLogger('error', () => undefined),
    );
    await vi.advanceTimersByTimeAsync(2000);
    lease.stop();
    expect(extend).toHaveBeenCalledTimes(2);
  });
});
