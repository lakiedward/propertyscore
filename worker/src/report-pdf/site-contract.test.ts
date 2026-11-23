import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { reportInputSchema, toReportData } from './report-data.ts';

const SITE_FIXTURE = new URL(
  '../../../src/test/factories/fixtures/smart-check-report-freidorf.json',
  import.meta.url,
);

describe('report contract with the site', () => {
  it('renders every section of the real report the site validates', async () => {
    const result = JSON.parse(await readFile(SITE_FIXTURE, 'utf8')) as unknown;
    const parsed = reportInputSchema.safeParse({
      number: 1,
      address_text: 'Freidorf, Timișoara',
      latitude: 45.72912,
      longitude: 21.18007,
      generated_at: '2026-11-19T13:59:23.517Z',
      result,
    });

    expect(parsed.error?.issues).toBeUndefined();
    expect(parsed.success && toReportData(parsed.data).unreadableSections).toEqual([]);
  });
});
