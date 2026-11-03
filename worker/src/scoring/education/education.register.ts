import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { downloadOnce } from '../../sources/download.ts';
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

async function loadPlan(
  sourcesDir: string,
  register: EducationParams['register'],
): Promise<SchoolingPlan> {
  const path = planPath(sourcesDir, register.school_year);
  if (register.plan_url) await downloadOnce(register.plan_url, path);
  else if (!(await isPresent(path))) return new Map();
  return readSchoolingPlan(streamXlsxRows(path));
}

export async function loadRegister(
  sourcesDir: string,
  register: EducationParams['register'],
): Promise<SiiirConversion> {
  const path = await downloadOnce(register.url, registerPath(sourcesDir, register.school_year));
  const plan = await loadPlan(sourcesDir, register);
  return convertSiiirRows(await readXlsxRows(path), register.cities, plan);
}
