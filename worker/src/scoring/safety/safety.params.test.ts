import { describe, expect, it } from 'vitest';

import { SAFETY_TYPES, safetyParamsSchema } from './safety.params.ts';
import { readMigrationParams } from './safety.test-params.ts';

describe('safetyParamsSchema', () => {
  it('accepts the v1 parameters the migration stores, with every type', () => {
    const parsed = safetyParamsSchema.parse(readMigrationParams());
    expect(Object.keys(parsed.types).sort()).toEqual([...SAFETY_TYPES].sort());
    expect(parsed.types.police.walking).toBe(true);
    expect(parsed.types.lighting.night_activity).toEqual({ open: 1, closed: 1, unknown: 1 });
  });

  it('refuses a type without parameters and smoothing that does not add up to 1', () => {
    const params = safetyParamsSchema.parse(readMigrationParams());
    const types = Object.fromEntries(
      Object.entries(params.types).filter(([type]) => type !== 'police'),
    );
    expect(safetyParamsSchema.safeParse({ ...params, types }).success).toBe(false);
    expect(
      safetyParamsSchema.safeParse({ ...params, smoothing: { self: 0.6, neighbours: 0.6 } })
        .success,
    ).toBe(false);
    expect(
      safetyParamsSchema.safeParse({ ...params, moment_weights: { day: 0, night: 0 } }).success,
    ).toBe(false);
  });
});
