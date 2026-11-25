import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

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

  it.each([
    { quality: 'gtfs', date: 'not-a-date', displayedDate: null },
    { quality: 'gtfs', date: '2026-02-30', displayedDate: null },
    { quality: 'gtfs', date: '2026-11-03', displayedDate: '3 nov. 2026' },
    { quality: 'osm_only', date: '2026-11-03', displayedDate: null },
  ])(
    'cites only the timetable used ($quality, $date)',
    async ({ quality, date, displayedDate }) => {
      const input = reportInputSchema.parse(await exampleInput());
      const accessibility = input.result.accessibility;
      if (!accessibility || typeof accessibility !== 'object') {
        throw new Error('The example report has no accessibility section');
      }
      const report = toReportData({
        ...input,
        result: {
          ...input.result,
          accessibility: { ...accessibility, data_quality: quality, reference_date: date },
          snapshot: {
            ...input.result.snapshot,
            source_dates: { gtfs: '2026-11-25', osm: '2026-11-01' },
          },
        },
      });
      const { html } = await buildReportDocument(report);

      expect(report.unreadableSections).not.toContain('accessibility');
      expect(html).not.toContain('25 nov. 2026');
      if (displayedDate) {
        expect(html).toContain(`Orare transport public (GTFS) · ${displayedDate}`);
        expect(html).toContain(
          `Orare transport public (GTFS)</span><span class="dt">${displayedDate}`,
        );
        expect(html).toContain(`(GTFS) pentru ${displayedDate}, o zi lucrătoare.`);
      } else {
        expect(html).toContain(
          quality === 'osm_only'
            ? 'Raportul nu a folosit orarul operatorului, iar timpul de așteptare este estimat.'
            : 'Data orarului nu este disponibilă în raport.',
        );
        expect(html).not.toContain('Orare transport public (GTFS)');
        expect(html).not.toContain(date);
      }
      expect(html).toContain('OpenStreetMap · 1 nov. 2026');
    },
  );

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
