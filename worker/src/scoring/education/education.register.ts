import { join } from 'node:path';

import { downloadOnce } from '../../sources/download.ts';
import { readXlsxRows } from '../../sources/xlsx.ts';
import type { EducationParams } from './education.params.ts';
import { convertSiiirRows, type SiiirConversion } from './education.siiir.ts';

export function registerPath(sourcesDir: string, schoolYear: string): string {
  return join(sourcesDir, 'education', `siiir-${schoolYear}.xlsx`);
}

export async function loadRegister(
  sourcesDir: string,
  register: EducationParams['register'],
): Promise<SiiirConversion> {
  const path = await downloadOnce(register.url, registerPath(sourcesDir, register.school_year));
  return convertSiiirRows(await readXlsxRows(path), register.cities);
}
