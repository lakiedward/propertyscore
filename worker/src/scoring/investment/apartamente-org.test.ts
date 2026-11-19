import { describe, expect, it } from 'vitest';

import {
  INDEX_CSV,
  RENT_ZONE_PAGE,
  SALE_CITY_PAGE,
  SMALL_ZONE_PAGE,
} from './area-statistics.fixtures.ts';
import {
  APARTAMENTE_ORG_INDEX_PATHS,
  APARTAMENTE_ORG_PAGE_PATHS,
  indexCsvPath,
  parseIndexCsv,
  parseStatisticsPage,
  statisticsPagePath,
} from './apartamente-org.ts';

const CITIES = [
  { slug: 'timisoara', name: 'Timișoara' },
  { slug: 'bucuresti', name: 'București' },
  { slug: 'targu-mures', name: 'Târgu Mureș' },
];

describe('statisticsPagePath', () => {
  it('builds only city and zone statistics addresses', () => {
    const cityPath = statisticsPagePath({ city: 'cluj-napoca', transaction: 'rent', zone: null });
    const zonePath = statisticsPagePath({
      city: 'timisoara',
      transaction: 'sale',
      zone: { slug: 'cetate', name: 'Cetate' },
    });
    expect(cityPath).toBe('/apartamente-de-inchiriat/cluj-napoca');
    expect(zonePath).toBe('/apartamente-de-vanzare/timisoara/cetate');
    expect(APARTAMENTE_ORG_PAGE_PATHS.some((pattern) => pattern.test(zonePath))).toBe(true);
    expect(indexCsvPath('2026-10-01')).toBe('/raport-piata/2026-10.csv');
  });

  it.each([
    '/anunt/123',
    '/api/listings',
    '/',
    '/apartamente-de-vanzare/timisoara/cetate/x',
    '/apartamente-de-vanzare/brasov',
    '/apartamente-de-inchiriat/brasov/centru',
    '/apartamente-de-vanzare/timisoara/sub-pretul-zonei',
    '/apartamente-de-vanzare/timisoara/2-camere',
  ])('leaves %s outside the agreed pages', (path) => {
    const patterns = [...APARTAMENTE_ORG_PAGE_PATHS, ...APARTAMENTE_ORG_INDEX_PATHS];
    expect(patterns.some((pattern) => pattern.test(path))).toBe(false);
  });
});

describe('parseStatisticsPage', () => {
  it('reads the city figures, their date, the rooms table and the zone links', () => {
    const page = parseStatisticsPage(SALE_CITY_PAGE, {
      city: 'timisoara',
      transaction: 'sale',
      zone: null,
    });
    expect(page?.rows).toHaveLength(3);
    expect(page?.rows[0]).toEqual({
      city: 'timisoara',
      zone_slug: null,
      zone_name: null,
      is_nearby_locality: false,
      transaction: 'sale',
      property_type: 'apartment',
      rooms_min: null,
      rooms_max: null,
      observed_on: '2026-11-18',
      listing_count: 23627,
      apartment_count: 8755,
      median_eur: 109900,
      p25_eur: 85000,
      p75_eur: 138000,
      median_eur_m2: 1984.13,
      p25_eur_m2: null,
      p75_eur_m2: null,
      median_area_m2: null,
      source_url: 'https://apartamente.org/apartamente-de-vanzare/timisoara',
    });
    expect(page?.rows[1]).toMatchObject({
      rooms_min: 1,
      rooms_max: 1,
      listing_count: 3448,
      apartment_count: null,
      median_eur: 62000,
      p25_eur: null,
      median_eur_m2: 2108,
      p25_eur_m2: 1793,
      p75_eur_m2: 2365,
    });
    expect(page?.rows[2]).toMatchObject({ rooms_min: 4, rooms_max: null, median_eur_m2: 1850 });
    expect(page?.zones).toEqual([
      { slug: 'cetate', name: 'Cetate' },
      { slug: 'dambovita', name: 'Dâmbovița' },
      { slug: 'lipovei-calea-sever-bocu', name: 'Lipovei / Calea Sever Bocu' },
    ]);
  });

  it('reads a rent zone with decimal commas and follows no further links', () => {
    const page = parseStatisticsPage(RENT_ZONE_PAGE, {
      city: 'timisoara',
      transaction: 'rent',
      zone: { slug: 'cetate', name: 'Cetate' },
    });
    expect(page?.zones).toEqual([]);
    expect(page?.rows[0]).toMatchObject({
      zone_slug: 'cetate',
      zone_name: 'Cetate',
      median_eur: 450,
      p25_eur: 380,
      p75_eur: 550,
      median_eur_m2: 8.18,
      source_url: 'https://apartamente.org/apartamente-de-inchiriat/timisoara/cetate',
    });
    expect(page?.rows[1]).toMatchObject({
      rooms_min: 2,
      rooms_max: 2,
      median_eur: 430,
      p25_eur_m2: 7.1,
      median_eur_m2: 8.2,
      p75_eur_m2: 9.6,
    });
  });

  it('keeps a small zone that publishes only its medians', () => {
    const page = parseStatisticsPage(SMALL_ZONE_PAGE, {
      city: 'timisoara',
      transaction: 'sale',
      zone: { slug: 'dambovita', name: 'Dâmbovița' },
    });
    expect(page?.rows).toHaveLength(1);
    expect(page?.rows[0]).toMatchObject({ median_eur_m2: 1759, p25_eur: null, p75_eur: null });
  });

  it('refuses a page that describes another place, such as the city served for a zone', () => {
    expect(
      parseStatisticsPage(SALE_CITY_PAGE, {
        city: 'timisoara',
        transaction: 'sale',
        zone: { slug: 'ronat', name: 'Ronaț' },
      }),
    ).toBeNull();
    expect(
      parseStatisticsPage('<html><body>fără date</body></html>', {
        city: 'timisoara',
        transaction: 'sale',
        zone: null,
      }),
    ).toBeNull();
  });
});

describe('parseIndexCsv', () => {
  it('keeps the covered cities of the city table with the day the edition describes', async () => {
    const result = await parseIndexCsv(INDEX_CSV, '2026-10-01', CITIES);
    expect(result.skipped).toBe(0);
    expect(result.rows.map((row) => [row.city, row.transaction, row.median_eur_m2])).toEqual([
      ['bucuresti', 'sale', 2224.49],
      ['timisoara', 'sale', 1969.7],
      ['timisoara', 'rent', 8.22],
      ['targu-mures', 'rent', 7.5],
    ]);
    expect(result.rows[1]).toMatchObject({
      zone_slug: null,
      observed_on: '2026-10-31',
      apartment_count: 9427,
      median_eur: 108000,
      listing_count: null,
      source_url: 'https://apartamente.org/raport-piata/2026-10.csv',
    });
  });

  it('fails when the file no longer has the expected columns or cities', async () => {
    await expect(
      parseIndexCsv('oras,pret\nTimișoara,1\n', '2026-10-01', CITIES),
    ).rejects.toMatchObject({ code: 'source_columns_changed' });
    await expect(
      parseIndexCsv(INDEX_CSV, '2026-10-01', [{ slug: 'atlantis', name: 'Atlantis' }]),
    ).rejects.toMatchObject({ code: 'source_layout_changed' });
  });
});
