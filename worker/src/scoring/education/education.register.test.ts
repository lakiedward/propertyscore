import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { WorkerError } from '../../lib/errors.ts';
import { latestSourceDate, parseRegisterLine, readRegister } from './education.register.ts';

const ROW = {
  siiir_code: '3561100001',
  city_slug: 'timisoara',
  name: 'Școala Gimnazială nr. 15',
  levels: ['primary', 'lower_secondary'],
  ownership: 'public',
  source_date: '2026-09-01',
};

describe('parseRegisterLine', () => {
  it('reads a register row and fills the optional fields', () => {
    expect(parseRegisterLine(JSON.stringify(ROW), 1)).toEqual(ROW);
    expect(parseRegisterLine(JSON.stringify({ ...ROW, ownership: undefined }), 1)?.ownership).toBe(
      'unknown',
    );
  });

  it('skips blank lines and rejects rows outside the schema with a code', () => {
    expect(parseRegisterLine('  ', 3)).toBeNull();
    expect(() => parseRegisterLine('{', 4)).toThrow(WorkerError);
    expect(() => parseRegisterLine(JSON.stringify({ ...ROW, levels: ['doctorate'] }), 5)).toThrow(
      'Register line 5',
    );
  });
});

describe('readRegister', () => {
  const dirs: string[] = [];

  afterAll(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('returns null when no register file is in the sources folder', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'education-register-'));
    dirs.push(dir);
    expect(await readRegister(join(dir, 'register.ndjson'))).toBeNull();
  });

  it('reads every row and reports the newest edition', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'education-register-'));
    dirs.push(dir);
    const path = join(dir, 'register.ndjson');
    await writeFile(
      path,
      [
        JSON.stringify(ROW),
        '',
        JSON.stringify({ ...ROW, siiir_code: '2', source_date: '2025-09-01' }),
      ].join('\n'),
    );
    const rows = await readRegister(path);
    expect(rows).toHaveLength(2);
    expect(latestSourceDate(rows ?? [])).toBe('2026-09-01');
    expect(latestSourceDate([])).toBeNull();
  });
});
