import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { CATEGORY_KEYS } from '../scoring/categories.ts';
import { buildReportDocument } from './build-document.ts';
import { fifteenMinuteChapter } from './chapters/fifteen-minute.ts';
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
    const legend = /<div class="key">.*?<\/div>/u.exec(html)?.[0];
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
          zone: { ...noScore, city_avg: 48, city_max: 87 },
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
    expect(html).not.toContain('Media orașului 48.');
    expect(html).not.toContain('Cel mai bun scor 87.');

    const english = (await buildReportDocument({ ...report, locale: 'en' })).html;
    expect(english).toContain('There is not enough data to calculate scores for this address.');
    expect(english).toContain('Scores are not available for this address');
    expect(english).toContain('This report includes seismic risk for context.');
    expect(english).toContain('No green space data is available for this address.');
    expect(english).toContain('Public transport data is not available for this address');
    expect(english).toContain('Air quality and industry data are not available for this address');
    expect(english).not.toContain('None of the available scores are low.');
    expect(english).not.toContain('All scores compared with the city');
    expect(english).not.toContain('City average: 48.');
    expect(english).not.toContain('Best score: 87.');
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
      const english = (await buildReportDocument({ ...report, locale: 'en' })).html;
      expect(english).not.toContain('25 Nov 2026');
      if (displayedDate) {
        expect(html).toContain(`Orare transport public (GTFS) · ${displayedDate}`);
        expect(html).toContain(
          `Orare transport public (GTFS)</span><span class="dt">${displayedDate}`,
        );
        expect(html).toContain(`(GTFS) pentru ${displayedDate}, o zi lucrătoare.`);
        expect(english).toContain('(GTFS) for 3 Nov 2026, a weekday.');
      } else {
        expect(html).toContain(
          quality === 'osm_only'
            ? 'Raportul nu a folosit orarul operatorului, iar timpul de așteptare este estimat.'
            : 'Data orarului nu este disponibilă în raport.',
        );
        expect(html).not.toContain('Orare transport public (GTFS)');
        expect(html).not.toContain(date);
        expect(english).toContain(
          quality === 'osm_only'
            ? 'The report did not use the operator timetable, and waiting times are estimated.'
            : 'No timetable date is available in the report.',
        );
        expect(english).not.toContain('Public transport timetables (GTFS)');
        expect(english).not.toContain(quality === 'osm_only' ? '3 Nov 2026' : date);
      }
      expect(html).toContain('OpenStreetMap · 1 nov. 2026');
      expect(english).toContain('OpenStreetMap · 1 Nov 2026');
    },
  );

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

  it('labels only the estimated Green card and its headline when walks are mixed', async () => {
    const report = toReportData(reportInputSchema.parse(await exampleInput()));
    const section = report.sections.green;
    const park = section?.parks[0];
    if (!section || !park) throw new Error('fixture has no green park');
    report.sections.green = {
      ...section,
      distance_method: 'pedestrian_routing',
      parks: [
        { ...park, name: 'Routed', area_ha: 2, walk_m: 1200, walk_seconds: 240 },
        { ...park, id: 'estimated', name: 'Estimated', area_ha: 2, walk_m: 800 },
      ],
    };

    const chapter = greenChapter(report);
    expect(chapter?.html).toContain('până la circa 10 minute pe jos');
    expect(chapter?.html).toContain('<span>·</span>circa 10 min pe jos');
    expect(chapter?.html).toContain('<span>·</span>4 min pe jos');
    const english = greenChapter({ ...report, locale: 'en' });
    expect(english?.html).toContain('within about a 10-minute walk');
    expect(english?.html).toContain('<span>·</span>about 10 min on foot');
    expect(english?.html).toContain('<span>·</span>4 min on foot');
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
