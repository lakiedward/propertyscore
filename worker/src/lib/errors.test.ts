import { describe, expect, it } from 'vitest';

import { errorCauseExit, errorCauseTail, errorCode, WorkerError } from './errors.ts';

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

describe('errorCauseTail', () => {
  it('returns the end of the cause message, where a subprocess prints its error', () => {
    const cause = new Error(`Command failed: python3 route.py\n${'x'.repeat(5000)}MemoryError`);
    const tail = errorCauseTail(new WorkerError('transit_routing_failed', 'boom', { cause }));

    expect(tail).toHaveLength(4000);
    expect(tail?.endsWith('MemoryError')).toBe(true);
  });

  it('returns nothing without an error cause', () => {
    expect(errorCauseTail(new WorkerError('osmium_failed', 'boom'))).toBeUndefined();
    expect(errorCauseTail('x')).toBeUndefined();
  });
});

describe('errorCauseExit', () => {
  it('names the signal that killed a subprocess, such as an out-of-memory kill', () => {
    const cause = Object.assign(new Error('Command failed'), { code: null, signal: 'SIGKILL' });
    expect(errorCauseExit(new WorkerError('transit_routing_failed', 'boom', { cause }))).toBe(
      'signal SIGKILL',
    );
  });

  it('gives the exit code of a subprocess that failed on its own', () => {
    const cause = Object.assign(new Error('Command failed'), { code: 1, signal: null });
    expect(errorCauseExit(new WorkerError('osmium_failed', 'boom', { cause }))).toBe('exit 1');
    expect(errorCauseExit(new WorkerError('osmium_failed', 'boom'))).toBeUndefined();
  });
});
