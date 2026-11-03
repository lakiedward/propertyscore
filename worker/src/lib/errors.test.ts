import { describe, expect, it } from 'vitest';

import { errorCode, WorkerError } from './errors.ts';

describe('errorCode', () => {
  it('keeps the code of a worker error', () => {
    expect(errorCode(new WorkerError('osmium_failed', 'boom'))).toBe('osmium_failed');
  });

  it('reads the code a Postgres function raised', () => {
    const raised = Object.assign(new Error('snapshot_already_building'), { code: 'P0001' });
    expect(errorCode(raised)).toBe('snapshot_already_building');
  });

  it('never passes a free-text database message through', () => {
    const raised = Object.assign(new Error('Something went wrong'), { code: 'P0001' });
    expect(errorCode(raised)).toBe('database_rule');
    expect(errorCode(new Error('x'))).toBe('unknown');
    expect(errorCode('x')).toBe('unknown');
  });
});
