import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';
import { EDUCATION_LEVELS } from './education.osm.ts';

const registerRowSchema = z.object({
  siiir_code: z.string().min(1).max(40),
  parent_siiir_code: z.string().min(1).max(40).nullish(),
  city_slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1).max(300),
  levels: z.array(z.enum(EDUCATION_LEVELS)).min(1),
  ownership: z.enum(['public', 'private', 'unknown']).default('unknown'),
  teaching_languages: z.array(z.string().min(1).max(40)).nullish(),
  address: z.string().min(1).max(500).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  source_date: z.iso.date(),
});

export type RegisterRow = z.infer<typeof registerRowSchema>;

export function registerPath(sourcesDir: string): string {
  return join(sourcesDir, 'education', 'register.ndjson');
}

export function parseRegisterLine(line: string, lineNumber: number): RegisterRow | null {
  if (line.trim() === '') return null;
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (error) {
    throw new WorkerError('education_register_invalid', `Register line ${lineNumber} is not JSON`, {
      cause: error,
    });
  }
  const parsed = registerRowSchema.safeParse(value);
  if (!parsed.success) {
    throw new WorkerError(
      'education_register_invalid',
      `Register line ${lineNumber} does not match the register schema`,
    );
  }
  return parsed.data;
}

export async function readRegister(path: string): Promise<RegisterRow[] | null> {
  try {
    await access(path);
  } catch {
    return null;
  }
  const rows: RegisterRow[] = [];
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    const row = parseRegisterLine(line, lineNumber);
    if (row) rows.push(row);
  }
  return rows;
}

export function latestSourceDate(rows: readonly RegisterRow[]): string | null {
  return rows.reduce<string | null>(
    (latest, row) => (latest === null || row.source_date > latest ? row.source_date : latest),
    null,
  );
}
