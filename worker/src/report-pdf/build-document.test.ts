import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildReportDocument } from './build-document.ts';
import { greenChapter } from './chapters/green.ts';
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

  it('fits the Green map to the full listed park and shows its fastest routed time', async () => {
    const report = toReportData(reportInputSchema.parse(await exampleInput()));
    const section = report.sections.green;
    const park = section?.parks[0];
    if (!section || !park) throw new Error('fixture has no green park');
    const distant = [
      [21.3, 45.9],
      [21.4, 45.9],
      [21.4, 46],
      [21.3, 45.9],
    ];
    const unlisted = [
      [22.3, 46.9],
      [22.4, 46.9],
      [22.4, 47],
      [22.3, 46.9],
    ];
    const chapter = greenChapter({
      ...report,
      sections: {
        ...report.sections,
        green: {
          ...section,
          distance_method: 'pedestrian_routing',
          parks: [{ ...park, walk_m: 1200, walk_seconds: 240 }],
          areas: {
            ...section.areas,
            features: [
              ...section.areas.features,
              {
                type: 'Feature',
                properties: { id: park.id },
                geometry: { type: 'MultiPolygon', coordinates: [[distant]] },
              },
              {
                type: 'Feature',
                properties: { id: 'unlisted' },
                geometry: { type: 'Polygon', coordinates: [unlisted] },
              },
            ],
          },
        },
      },
    });

    if (!chapter) throw new Error('Green chapter was not built');
    const points = chapter.maps[0]?.fit ?? [];
    expect(Math.max(...points.map(([lng]) => lng))).toBe(21.4);
    expect(Math.max(...points.map(([, lat]) => lat))).toBe(46);
    expect(chapter.html).toContain('4 min pe jos');
  });

  it.each([
    { scenario: 'longer estimate', routedMinutes: 4, secondMinutes: 10, estimated: true },
    { scenario: 'shorter estimate', routedMinutes: 10, secondMinutes: 8, estimated: true },
    { scenario: 'all routed', routedMinutes: 4, secondMinutes: 10, estimated: false },
  ])(
    'labels the Green walk and headline for $scenario',
    async ({ routedMinutes, secondMinutes, estimated }) => {
      const report = toReportData(reportInputSchema.parse(await exampleInput()));
      const section = report.sections.green;
      const park = section?.parks[0];
      if (!section || !park) throw new Error('fixture has no green park');
      report.sections.green = {
        ...section,
        distance_method: 'pedestrian_routing',
        parks: [
          { ...park, name: 'Routed', area_ha: 2, walk_m: 1200, walk_seconds: routedMinutes * 60 },
          {
            ...park,
            id: 'second',
            name: 'Second park',
            area_ha: 2,
            walk_m: secondMinutes * 80,
            walk_seconds: estimated ? undefined : secondMinutes * 60,
          },
        ],
      };

      const chapter = greenChapter(report);
      const limit = estimated ? 'până la circa' : 'la cel mult';
      expect(chapter?.html).toContain(`<h2>2 parcuri mari, ${limit} 10 minute pe jos</h2>`);
      expect(chapter?.html).toContain(
        `<span>·</span>${estimated ? 'circa ' : ''}${String(secondMinutes)} min pe jos`,
      );
      expect(chapter?.html).toContain(`<span>·</span>${String(routedMinutes)} min pe jos`);
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
