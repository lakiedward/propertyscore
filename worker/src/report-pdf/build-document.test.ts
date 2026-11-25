import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildReportDocument } from './build-document.ts';
import { fifteenMinuteChapter } from './chapters/fifteen-minute.ts';
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

  it('labels saved straight-line times without drawing a walking zone', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const walking = input.result.fifteen_minute as Record<string, unknown>;
    const report = toReportData({
      ...input,
      result: {
        ...input.result,
        fifteen_minute: { ...walking, distance_method: 'straight_line', isochrones: [] },
      },
    });
    const chapter = fifteenMinuteChapter(report);
    if (!chapter) throw new Error('The example report has no 15-minute chapter');
    const { html, maps } = chapter;

    expect(html).toContain('adresă · estimare în linie dreaptă');
    expect(html).toContain('Timpii pe jos sunt estimați din distanța în linie dreaptă');
    expect(html).not.toContain('străzi și alei');
    const legend = (/<div class="key">.*?<\/div>/u.exec(html))?.[0];
    expect(legend).toContain('Locuri de zi cu zi');
    expect(legend).not.toContain('15 minute pe jos');
    expect(maps[0]?.layers.map((layer) => layer.kind)).toEqual(['circle']);
  });

  it('explains routed times and only states the walking pace when saved', async () => {
    const input = reportInputSchema.parse(await exampleInput());
    const walking = input.result.fifteen_minute as Record<string, unknown>;
    const makeChapter = (speed: number | undefined) =>
      fifteenMinuteChapter(
        toReportData({
          ...input,
          result: { ...input.result, fifteen_minute: { ...walking, walk_speed_kmh: speed } },
        }),
      );

    expect(makeChapter(4.5)?.html).toContain('străzi și alei), la 75 m/min.');
    expect(makeChapter(undefined)?.html).toContain('străzi și alei).');
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
