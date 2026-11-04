import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readXlsRows } from './xls.ts';

const FIXTURE = fileURLToPath(new URL('./fixtures/cas-sample.xls', import.meta.url));

function hasXls2csv(): boolean {
  return spawnSync('xls2csv', ['-V'], { stdio: 'ignore' }).error === undefined;
}

describe.skipIf(!hasXls2csv())('readXlsRows', () => {
  it('reads the first sheet only, with diacritics and quoted commas', async () => {
    expect(await readXlsRows(FIXTURE)).toEqual([
      ['Denumire furnizor', 'Adresa'],
      ['Farmacia Ana, Sibiu', 'Sibiu, Str. Mică nr. 2'],
    ]);
  });
});
