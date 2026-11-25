import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { CATEGORY_KEYS } from '../scoring/categories.ts';
import { buildReportDocument } from './build-document.ts';
import { reportInputSchema, toReportData } from './report-data.ts';

async function exampleInput(): Promise<Record<string, unknown>> {
  const text = await readFile(new URL('./fixtures/example-report.json', import.meta.url), 'utf8');
  return JSON.parse(text) as Record<string, unknown>;
}

describe('buildReportDocument', () => {
  it('builds every chapter of the example report with its maps and fonts', async () => {
    const report = toReportData(reportInputSchema.parse(await exampleInput()));
    const document = await buildReportDocument(report);

    expect(report.unreadableSections).toEqual([]);
    expect(document.html).toContain('<html lang="ro">');
    expect(document.html).toContain(report.addressText);
    expect(document.html).toContain('risc moderat, nu ridicat');
    expect(document.html).toContain('preț cerut');
    expect(document.html).toContain('mai puțin sigur');
    expect(document.html).toContain('class="inv-ex">exemplu');
    expect(document.layoutWidthPx).toBe(1120);
    expect(document.allowedHosts).toEqual(['tiles.openfreemap.org']);
    expect(document.assets.has('/assets/maplibre-gl.mjs')).toBe(true);
    expect(document.assets.has('/assets/fonts/manrope-latin-ext.woff2')).toBe(true);
  });

  it('localizes the English chapters, sources and values from the same report', async () => {
    const input = reportInputSchema.parse({ ...(await exampleInput()), locale: 'en' });
    const report = toReportData(input);
    const accessibility = report.sections.accessibility;
    if (!accessibility) throw new Error('The example report has no accessibility section');
    const destinations = accessibility.destinations.map((destination) => ({
      ...destination,
      label: { ro: 'Destinație de test', en: 'Example destination' },
    }));
    const { html } = await buildReportDocument({
      ...report,
      sections: { ...report.sections, accessibility: { ...accessibility, destinations } },
    });

    expect(html).toContain('<html lang="en">');
    for (const text of [
      'generated on 4 Nov 2026',
      'All scores compared with the city',
      'Example destination',
      'Your everyday checklist',
      '9 large parks',
      'Estimate based on roads',
      'Copernicus CAMS',
      'the USGS and EMSC catalogues',
      '€123,000',
      'Gross annual yield',
      'Data from Nov 2026',
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(/Destinație de test|catalogul USGS și EMSC|preț cerut|Surse și date/);
  });

  it.each([
    { count: 0, expected: { ro: '0 scoruri', en: '0 scores' } },
    { count: 1, expected: { ro: '1 scor', en: '1 score' } },
    { count: 2, expected: { ro: '2 scoruri', en: '2 scores' } },
  ])('uses the right score count for $count available scores', async ({ count, expected }) => {
    const report = toReportData(reportInputSchema.parse(await exampleInput()));
    const categories = { ...report.categories };
    for (const key of CATEGORY_KEYS.slice(count)) {
      categories[key] = { ...categories[key], score: null };
    }
    const zone = count === 0 ? { ...report.zone, score: null } : report.zone;

    for (const locale of ['ro', 'en'] as const) {
      const { html } = await buildReportDocument({ ...report, locale, categories, zone });
      expect(html).toContain(`${expected[locale]} ·`);
      if (count > 0) {
        expect(html).toContain(
          locale === 'ro' ? `Am calculat ${expected.ro} pe` : `We calculated ${expected.en} within`,
        );
      }
      if (count === 1) {
        expect(html).toContain(
          locale === 'ro' ? 'pe singurul scor disponibil.' : 'on the only available score.',
        );
        expect(html).not.toMatch(/1 (?:scoruri|scores)\b/u);
      }
    }
  });

  it('leaves out a section without data and reports one it cannot read', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const report = toReportData({
      ...input,
      result: { ...input.result, noise: { status: 'no_data' }, green: { status: 'scored' } },
    });

    expect(report.sections.noise).toBeNull();
    expect(report.sections.green).toBeNull();
    expect(report.unreadableSections).toEqual(['green']);
    await expect(buildReportDocument(report)).resolves.toMatchObject({
      allowedHosts: ['tiles.openfreemap.org'],
    });
  });

  it('draws the city reach card and leaves out the neighbourhoods line when the city has none', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const withPlaces = toReportData(input);
    expect((await buildReportDocument(withPlaces)).html).toContain('din 23</b> cartiere');

    const reach = withPlaces.sections.accessibility?.reach;
    if (!reach) throw new Error('The example report has no reach block');
    const accessibility = input.result.accessibility as Record<string, unknown>;
    const withoutPlaces = toReportData({
      ...input,
      result: {
        ...input.result,
        accessibility: {
          ...accessibility,
          reach: {
            ...reach,
            neighbourhoods_reached: 0,
            neighbourhoods_total: 0,
            neighbourhoods: [],
          },
        },
      },
    });
    const { html } = await buildReportDocument(withoutPlaces);

    expect(html).toContain('Orașul, în minute de la ușa ta');
    expect(html).not.toContain('cartiere, plecând la 8 dimineața');
  });

  it('leaves out the viewing questions even when the report carries their codes', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const { html } = await buildReportDocument(
      toReportData({
        ...input,
        result: { ...input.result, questions: { codes: ['bedroom_facade_side'] } },
      }),
    );

    expect(html).not.toContain('De întrebat la vizionare');
    expect(html).not.toContain('Spre ce dau dormitoarele');
  });
});
