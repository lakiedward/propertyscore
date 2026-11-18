import { describe, expect, it } from 'vitest';

import { IMOSPOT_CSV } from './area-statistics.fixtures.ts';
import { IMOSPOT_INDEX_PATHS, imospotIndexCsvPath, parseImospotIndexCsv } from './imospot.ts';

const CITIES = [
  { slug: 'timisoara', name: 'Timișoara' },
  { slug: 'bucuresti', name: 'București' },
  { slug: 'targu-mures', name: 'Târgu Mureș' },
];

describe('parseImospotIndexCsv', () => {
  it('keeps the apartments of covered cities and their neighbourhoods', async () => {
    const result = await parseImospotIndexCsv(IMOSPOT_CSV, '2026-11-01', CITIES);
    expect(result.skipped).toBe(1);
    expect(result.rows).toHaveLength(6);
    expect(result.rows[1]).toEqual({
      city: 'timisoara',
      zone_slug: null,
      zone_name: null,
      is_nearby_locality: false,
      transaction: 'sale',
      property_type: 'apartment',
      rooms_min: null,
      rooms_max: null,
      observed_on: null,
      listing_count: 952,
      apartment_count: null,
      median_eur: 107000,
      p25_eur: null,
      p75_eur: null,
      median_eur_m2: 1984,
      p25_eur_m2: 1748,
      p75_eur_m2: 2318,
      median_area_m2: 53,
      source_url: 'https://www.imospot.ro/indicele-imospot',
    });
    expect(result.rows[2]).toMatchObject({
      city: 'bucuresti',
      zone_slug: 'titan-balta-alba',
      zone_name: 'Titan - Balta Albă',
    });
    expect(result.rows[3]).toMatchObject({
      transaction: 'rent',
      median_eur: 580,
      median_eur_m2: null,
      p25_eur_m2: null,
    });
  });

  it('keeps the localities next to a covered city as its nearby localities', async () => {
    const result = await parseImospotIndexCsv(IMOSPOT_CSV, '2026-11-01', CITIES);
    const localities = result.rows.filter((row) => row.is_nearby_locality);
    expect(localities).toHaveLength(2);
    expect(localities[1]).toMatchObject({
      city: 'timisoara',
      zone_slug: 'dumbravita',
      zone_name: 'Dumbrăvița',
      transaction: 'sale',
      listing_count: 43,
      median_eur_m2: 2310,
      p25_eur_m2: 2059,
      p75_eur_m2: 2458,
      median_area_m2: 60,
    });
    expect(result.rows.some((row) => row.zone_slug === 'cristian')).toBe(false);
  });

  it('asks only for the monthly index file', () => {
    const path = imospotIndexCsvPath('2026-11-01');
    expect(path).toBe('/indicele-imospot/2026-11.csv');
    expect(IMOSPOT_INDEX_PATHS.some((pattern) => pattern.test(path))).toBe(true);
    expect(IMOSPOT_INDEX_PATHS.some((pattern) => pattern.test('/anunturi/1'))).toBe(false);
  });

  it('fails on an empty file', async () => {
    const header = IMOSPOT_CSV.split('\n')[0] ?? '';
    await expect(parseImospotIndexCsv(header, '2026-11-01', CITIES)).rejects.toMatchObject({
      code: 'source_layout_changed',
    });
  });
});
