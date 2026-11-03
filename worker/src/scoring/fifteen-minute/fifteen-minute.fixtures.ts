import { readFileSync } from 'node:fs';

import { type FifteenMinuteParams, fifteenMinuteParamsSchema } from './fifteen-minute.params.ts';

const MIGRATION = new URL(
  '../../../../supabase/migrations/20261103100513_add_fifteen_minute_params.sql',
  import.meta.url,
);

export function migrationParams(): unknown {
  const text = readFileSync(MIGRATION, 'utf8');
  const match = /'(\{[\s\S]*\})'::jsonb/.exec(text);
  if (!match?.[1]) throw new Error('fifteen_minute params not found in the migration');
  return JSON.parse(match[1]) as unknown;
}

export function testParams(overrides: Partial<FifteenMinuteParams> = {}): FifteenMinuteParams {
  return { ...fifteenMinuteParamsSchema.parse(migrationParams()), ...overrides };
}
