import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { loadRegister, planPath, registerPath } from './education.register.ts';

const FIXTURE = fileURLToPath(new URL('../../sources/fixtures/siiir-sample.xlsx', import.meta.url));
const PLAN_FIXTURE = fileURLToPath(
  new URL('../../sources/fixtures/siiir-plan-sample.xlsx', import.meta.url),
);

const REGISTER = {
  school_year: '2025-2026',
  url: 'https://data.gov.ro/siiir-2025-2026.xlsx',
  plan_url: null,
  cities: { sibiu: [143469] },
};

describe('loadRegister', () => {
  const dirs: string[] = [];

  afterAll(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('reads the SIIIR export kept in the sources folder for the school year', async () => {
    const sourcesDir = await mkdtemp(join(tmpdir(), 'education-register-'));
    dirs.push(sourcesDir);
    const path = registerPath(sourcesDir, REGISTER.school_year);
    await mkdir(dirname(path), { recursive: true });
    await copyFile(FIXTURE, path);

    const result = await loadRegister(sourcesDir, REGISTER);

    expect(path).toBe(join(sourcesDir, 'education', 'siiir-2025-2026.xlsx'));
    expect(result.sourceDate).toBe('2025-10-08');
    expect(result.skipped).toEqual({ not_a_school: 1 });
    expect(
      result.rows.map((row) => [row.siiir_code, row.name, row.levels, row.is_excluded]),
    ).toEqual([
      ['3261100001', 'ŞCOALA GIMNAZIALĂ NR. 2', ['primary', 'lower_secondary'], false],
      ['3261100002', 'GRĂDINIŢA CU PROGRAM NORMAL NR. 2', ['kindergarten'], false],
      ['3261100003', 'GRĂDINIŢA "PINOCCHIO"', ['kindergarten'], false],
      ['3261100005', 'ŞCOALA POSTLICEALĂ SANITARĂ', ['upper_secondary'], true],
    ]);
    expect(result.rows[1]?.parent_siiir_code).toBe('3261100001');
    expect(result.rows[2]?.ownership).toBe('private');
    expect(result.levelSources).toEqual({ plan: 0, name: 4 });
  });

  it('takes the levels from the schooling plan kept next to the register', async () => {
    const sourcesDir = await mkdtemp(join(tmpdir(), 'education-register-'));
    dirs.push(sourcesDir);
    const path = registerPath(sourcesDir, REGISTER.school_year);
    await mkdir(dirname(path), { recursive: true });
    await copyFile(FIXTURE, path);
    await copyFile(PLAN_FIXTURE, planPath(sourcesDir, REGISTER.school_year));

    const result = await loadRegister(sourcesDir, REGISTER);

    expect(
      result.rows.map((row) => [
        row.siiir_code,
        row.levels,
        row.teaching_languages,
        row.is_excluded,
      ]),
    ).toEqual([
      ['3261100001', ['primary', 'lower_secondary'], ['de', 'ro'], false],
      ['3261100002', ['kindergarten'], ['ro'], false],
      ['3261100003', ['nursery', 'kindergarten'], ['ro'], false],
      ['3261100005', ['upper_secondary'], null, true],
    ]);
    expect(result.levelSources).toEqual({ plan: 3, name: 1 });
  });
});
