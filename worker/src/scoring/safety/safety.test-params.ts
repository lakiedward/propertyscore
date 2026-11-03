import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type SafetyParams, safetyParamsSchema } from './safety.params.ts';

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const PARAMS = /jsonb_build_object\('safety', '([\s\S]*?)'::jsonb\)/;

export function readMigrationParams(): unknown {
  const file = readdirSync(MIGRATIONS).find((name) => name.endsWith('_create_safety_features.sql'));
  if (!file) throw new Error('create_safety_features migration not found');
  const match = PARAMS.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  if (!match?.[1]) throw new Error('params.safety not found in the migration');
  return JSON.parse(match[1]);
}

export function v1Params(overrides: Partial<SafetyParams> = {}): SafetyParams {
  return { ...safetyParamsSchema.parse(readMigrationParams()), ...overrides };
}
