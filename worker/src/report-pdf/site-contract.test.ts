import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { investmentChapter } from './chapters/investment.ts';
import { reportInputSchema, toReportData } from './report-data.ts';

const SITE_FIXTURE = new URL(
  '../../../src/test/factories/fixtures/smart-check-report-freidorf.json',
  import.meta.url,
);

async function freidorfReport() {
  const result = JSON.parse(await readFile(SITE_FIXTURE, 'utf8')) as unknown;
  return reportInputSchema.parse({
    number: 1,
    address_text: 'Freidorf, Timișoara',
    latitude: 45.72912,
    longitude: 21.18007,
    generated_at: '2026-11-19T13:59:23.517Z',
    result,
  });
}

describe('report contract with the site', () => {
  it('renders every section of the real report the site validates', async () => {
    expect(toReportData(await freidorfReport()).unreadableSections).toEqual([]);
  });

  it('preserves the declared decimal and stored estimates in the PDF chapter', async () => {
    const html = investmentChapter(toReportData(await freidorfReport()))?.html;
    expect(html).toContain('Pentru 58,5 m², cam 116.000 €, preț cerut.');
    expect(html).toContain('Suprafața declarată</span><b>58,5 m²');
    expect(html).toContain('circa 480 €');
  });

  it('prints the actual same-room rent and total-price yield calculation for 84 m²', async () => {
    const report = toReportData(await freidorfReport());
    const section = report.sections.investment;
    if (!section) throw new Error('Missing Investment fixture');
    section.declared = { area_m2: 84 };
    section.sale = { precision: 'radius', median_eur_m2: 2250, estimate_eur: 189000 };
    section.rent = {
      precision: 'radius',
      basis: 'same_rooms',
      median_eur: 620,
      median_eur_m2: 7.6,
    };
    section.yield = { gross_pct: 3.9 };

    const html = investmentChapter(report)?.html;
    expect(html).toContain('circa 620 €');
    expect(html).not.toContain('circa 640 €');
    expect(html).toContain('Mediana chiriilor pentru același număr de camere.');
    expect(html).toContain('Calcul pentru suprafața declarată: 12 × 620 € pe lună ÷ 189.000 €.');
    expect(html).toContain('3,9%');
  });

  it('renders radius precision and excludes rent without a home estimate or area basis', async () => {
    const report = toReportData(await freidorfReport());
    const section = report.sections.investment;
    if (!section?.sale) throw new Error('Missing Investment fixture');
    section.sale = { ...section.sale, precision: 'radius' };
    section.rent = { basis: 'all', median_eur: 420 };

    const html = investmentChapter(report)?.html;
    expect(html).toContain('În jurul adresei se cer');
    expect(html).not.toContain('tot orașul');
    expect(html).not.toContain('Chirie cerută estimată');
  });

  it.each([
    ['radius', 'city', 'Preț în jurul adresei · chirie la nivelul orașului'],
    ['city', 'radius', 'Preț la nivelul orașului · chirie în jurul adresei'],
    ['radius', 'radius', 'În jurul adresei'],
    ['city', 'city', 'Timișoara'],
    ['radius', undefined, 'Date de piață'],
  ] as const)('labels the yield inputs for sale %s and rent %s', async (sale, rent, label) => {
    const report = toReportData(await freidorfReport());
    const section = report.sections.investment;
    if (!section?.sale || !section.rent) throw new Error('Missing Investment fixture');
    section.sale = { ...section.sale, precision: sale };
    section.rent = { ...section.rent, precision: rent };
    expect(investmentChapter(report)?.html).toContain(
      `<div class="inv-yb z"><span>${label}</span>`,
    );
  });

  it('uses elapsed months and retains the actual price and history sources', async () => {
    const report = toReportData(await freidorfReport());
    const section = report.sections.investment;
    if (!section?.sale || !section.rent || !section.history)
      throw new Error('Missing Investment fixture');
    const source = {
      source: 'apartamente_org_index',
      period: '2026-11-01',
      url: 'https://apartamente.org/raport-piata/2026-11.csv',
    };
    section.sale = { ...section.sale, source, count: 102 };
    section.rent = { ...section.rent, source, count: 19 };
    section.yield = {
      gross_pct: 4.5,
      basis: { sale_eur_m2: 1872.4, rent_eur_m2: 7, sale_source: source, rent_source: source },
    };
    section.history.months = section.history.months.filter(({ period }) =>
      /-(08|11)-01$/.test(period),
    );

    const html = investmentChapter(report)?.html;
    expect(html).toContain('în 3 luni');
    expect(html).toContain('Istoricul prețurilor cerute');
    expect(html).toContain('Timișoara · vânzare · 102 apartamente');
    expect(html).toContain('Timișoara · închiriere · 19 apartamente');
    expect(html).toMatch(/Calcul: 12 × 7 €\/m².*÷ 1\.872,4 €\/m².*2026/);
  });

  it('uses the singular for an adjacent month in the PDF', async () => {
    const report = toReportData(await freidorfReport());
    const history = report.sections.investment?.history;
    if (!history) throw new Error('Missing Investment history');
    history.months = history.months.slice(0, 2);

    expect(investmentChapter(report)?.html).toContain('în 1 lună');
  });
});
