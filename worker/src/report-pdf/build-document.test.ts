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

  it('explains missing scores and missing chapter data without drawing conclusions', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const noScore = { score: null, percentile: null, city_avg: null, histogram: [] };
    const categories = Object.fromEntries(
      CATEGORY_KEYS.map((key) => [key, { ...noScore, weight: 0 }]),
    );
    const missingSections = Object.fromEntries(
      CATEGORY_KEYS.map((key) => [key, { status: 'no_data' }]),
    );
    const report = toReportData(
      reportInputSchema.parse({
        ...input,
        result: {
          ...input.result,
          ...missingSections,
          investment: { status: 'no_data' },
          categories,
          zone: noScore,
        },
      }),
    );
    const { html } = await buildReportDocument(report);

    expect(report.unreadableSections).toEqual([]);
    expect(html).toContain('Nu avem suficiente date pentru a calcula scorurile acestei adrese.');
    expect(html).toContain('Scoruri indisponibile pentru această adresă');
    expect(html).toContain('Raportul include riscul seismic ca informații de context.');
    expect(html).toContain('Nu avem date despre spațiile verzi pentru această adresă.');
    expect(html).toContain('Datele despre transportul public nu sunt disponibile');
    expect(html).toContain('Datele despre aer și industrie nu sunt disponibile');
    expect(html).not.toContain('Niciun parc mare la o plimbare de adresă');
    expect(html).not.toContain('Calitatea aerului');
    expect(html).not.toContain('Niciunul dintre scorurile disponibile nu e slab');
    expect(html).not.toContain('Toate scorurile, față de tot orașul');
  });

  it('treats a score of zero as a weak result, not as missing data', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const report = toReportData({
      ...input,
      result: {
        ...input.result,
        categories: {
          ...input.result.categories,
          safety: { ...input.result.categories.safety, score: 0 },
        },
      },
    });
    const { html } = await buildReportDocument(report);

    expect(html).toContain('Punctul slab e siguranță.');
    expect(html).not.toContain('Scoruri indisponibile pentru această adresă');
  });

  it('uses only the industry registry for the headline when air data is missing', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const report = toReportData({
      ...input,
      result: {
        ...input.result,
        air: { status: 'no_data' },
        categories: {
          ...input.result.categories,
          air: { ...input.result.categories.air, score: null },
        },
      },
    });
    const { html } = await buildReportDocument(report);

    expect(html).toMatch(/<h2>(?:Fabrici la peste|Nicio fabrică în registru aproape)/u);
    expect(html).toContain('Datele despre aer nu sunt disponibile pentru această adresă.');
    expect(html).not.toContain('Calitatea aerului,');
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
