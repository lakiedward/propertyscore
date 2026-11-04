import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { downloadOnce, SourceUnavailableError } from '../../sources/download.ts';
import { mirroredSource, type SourceMirror } from '../../sources/mirror.ts';
import { readXlsxRows, streamXlsxRows } from '../../sources/xlsx.ts';
import type { EducationParams } from './education.params.ts';
import { readSchoolingPlan, type SchoolingPlan } from './education.plan.ts';
import { convertSiiirRows, type SiiirConversion } from './education.siiir.ts';

export function registerPath(sourcesDir: string, schoolYear: string): string {
  return join(sourcesDir, 'education', `siiir-${schoolYear}.xlsx`);
}

export function planPath(sourcesDir: string, schoolYear: string): string {
  return join(sourcesDir, 'education', `siiir-plan-${schoolYear}.xlsx`);
}

async function isPresent(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchMirroredPlan(
  mirror: SourceMirror,
  schoolYear: string,
  path: string,
): Promise<boolean> {
  const source = mirroredSource(mirror, `education/siiir-plan-${schoolYear}.xlsx`);
  try {
    await downloadOnce(source.url, path, { headers: source.headers });
    return true;
  } catch (error) {
    if (error instanceof SourceUnavailableError) return false;
    throw error;
  }
}

async function loadPlan(
  sourcesDir: string,
  register: EducationParams['register'],
  mirror: SourceMirror | undefined,
): Promise<SchoolingPlan> {
  const path = planPath(sourcesDir, register.school_year);
  if (register.plan_url) await downloadOnce(register.plan_url, path);
  else if (!(await isPresent(path))) {
    if (!mirror || !(await fetchMirroredPlan(mirror, register.school_year, path))) return new Map();
  }
  return readSchoolingPlan(streamXlsxRows(path));
}

export function registerSource(
  register: EducationParams['register'],
  mirror: SourceMirror | undefined,
): { url: string; headers: Record<string, string> } {
  if (!mirror) return { url: register.url, headers: {} };
  return mirroredSource(mirror, `education/siiir-${register.school_year}.xlsx`);
}

export async function loadRegister(
  sourcesDir: string,
  register: EducationParams['register'],
  mirror?: SourceMirror,
): Promise<SiiirConversion> {
  const source = registerSource(register, mirror);
  const path = await downloadOnce(source.url, registerPath(sourcesDir, register.school_year), {
    headers: source.headers,
  });
  const plan = await loadPlan(sourcesDir, register, mirror);
  return convertSiiirRows(await readXlsxRows(path), register.cities, plan);
}
