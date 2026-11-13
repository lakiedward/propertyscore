import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import {
  CITY_AVERAGE_CSV_COLUMNS,
  importCityAverages,
  normalizeCityAverageRow,
} from './city-averages-import.ts';
import { readActiveInvestmentParams } from './investment.db.ts';
import { shiftMonths } from './investment.dates.ts';
import type { InvestmentParams } from './investment.params.ts';
import { assessInvestmentAtAddress } from './investment.report.ts';

const databaseUrl = process.env.DATABASE_URL;
const silentLogger = createLogger('error', () => undefined);
const SOURCE = 'vitest_city_sample';
const CETATE = { latitude: 45.7546, longitude: 21.2303 };

const PLAUSIBLE = {
  area_m2: [12, 400] as [number, number],
  rooms: [1, 10] as [number, number],
  sale_eur_m2: [300, 8000] as [number, number],
  rent_eur_m2: [2, 40] as [number, number],
};

const ROW = {
  city: 'timisoara',
  period: '2026-09',
  transaction: 'sale',
  property_type: 'apartment',
  rooms: '3',
  price_m2: '1750',
  price_month: '',
  currency: 'EUR',
  source_url: 'https://example.test/sample-sale-index',
};

describe('normalizeCityAverageRow', () => {
  it('keeps a sale average per square metre for one rooms count', () => {
    expect(normalizeCityAverageRow(ROW, PLAUSIBLE, null)).toEqual({
      row: {
        city: 'timisoara',
        period: '2026-09-01',
        transaction: 'sale',
        property_type: 'apartment',
        rooms_min: 3,
        rooms_max: 3,
        price_m2: 1750,
        price_month: null,
        currency: 'EUR',
        eur_m2: 1750,
        eur_month: null,
        source_url: 'https://example.test/sample-sale-index',
      },
    });
  });

  it('reads an open rooms band, every size and a monthly rent in RON', () => {
    expect(normalizeCityAverageRow({ ...ROW, rooms: '4+' }, PLAUSIBLE, null)).toMatchObject({
      row: { rooms_min: 4, rooms_max: null },
    });
    expect(
      normalizeCityAverageRow(
        {
          ...ROW,
          transaction: 'rent',
          rooms: '',
          price_m2: '',
          price_month: '2800',
          currency: 'RON',
          source_url: '',
        },
        PLAUSIBLE,
        5,
      ),
    ).toMatchObject({
      row: { rooms_min: null, rooms_max: null, eur_month: 560, eur_m2: null, source_url: null },
    });
  });

  it('refuses RON prices without a rate', () => {
    expect(() => normalizeCityAverageRow({ ...ROW, currency: 'RON' }, PLAUSIBLE, null)).toThrow(
      expect.objectContaining({ code: 'market_rate_required' }),
    );
  });

  it.each([
    [{ city: 'Timișoara' }, 'invalid_row'],
    [{ period: '2026-13' }, 'invalid_row'],
    [{ rooms: 'trei' }, 'invalid_row'],
    [{ rooms: '14' }, 'invalid_row'],
    [{ price_m2: '' }, 'invalid_row'],
    [{ price_month: '900' }, 'invalid_row'],
    [{ price_m2: '-5' }, 'invalid_row'],
    [{ source_url: 'http://example.test' }, 'invalid_row'],
    [{ price_m2: '150' }, 'implausible_price'],
    [{ transaction: 'rent', price_m2: '', price_month: '9' }, 'implausible_price'],
  ])('rejects %o as %s', (change, code) => {
    expect(normalizeCityAverageRow({ ...ROW, ...change }, PLAUSIBLE, null)).toEqual({
      rejected: code,
    });
  });
});

function csvLine(values: Record<(typeof CITY_AVERAGE_CSV_COLUMNS)[number], string>): string {
  return CITY_AVERAGE_CSV_COLUMNS.map((column) => values[column]).join(',');
}

function sampleCsv(period: string, yearBefore: string): string {
  const sale = {
    city: 'timisoara',
    period,
    transaction: 'sale',
    property_type: 'apartment',
    rooms: '',
    price_m2: '1800',
    price_month: '',
    currency: 'EUR',
    source_url: 'https://example.test/sample-sale-index',
  };
  const rent = {
    ...sale,
    transaction: 'rent',
    rooms: '3',
    price_m2: '',
    price_month: '560',
    source_url: '',
  };
  return `${[
    CITY_AVERAGE_CSV_COLUMNS.join(','),
    csvLine(sale),
    csvLine({ ...sale, rooms: '3', price_m2: '1750' }),
    csvLine({ ...sale, rooms: '3', period: yearBefore, price_m2: '1600' }),
    csvLine(rent),
    csvLine({ ...sale, price_m2: '1810' }),
    csvLine({ ...sale, city: 'atlantis' }),
    csvLine({ ...sale, period: 'last-month' }),
  ].join('\n')}\n`;
}

describe.skipIf(!databaseUrl)('city averages import and the Investment fallback', () => {
  let sql: Sql;
  let directory = '';
  let filePath = '';
  let params: InvestmentParams;
  let cityId = '';
  const period = shiftMonths(new Date().toISOString().slice(0, 10), -1);
  const yearBefore = shiftMonths(period, -12);

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    params = await readActiveInvestmentParams(sql);
    const [city] = await sql<
      { id: string }[]
    >`select id from public.cities where slug = 'timisoara'`;
    cityId = city?.id ?? '';
    directory = await mkdtemp(join(tmpdir(), 'city-averages-'));
    filePath = join(directory, 'city-averages.csv');
    await writeFile(filePath, sampleCsv(period.slice(0, 7), yearBefore.slice(0, 7)));
  });

  afterAll(async () => {
    await sql`delete from private.market_imports where source = ${SOURCE}`;
    await rm(directory, { recursive: true, force: true });
    await sql.end({ timeout: 5 });
  });

  it('imports the averages once and counts what it rejected', async () => {
    const options = {
      sql,
      source: SOURCE,
      filePath,
      eurRonRate: null,
      params,
      logger: silentLogger,
    };
    const result = await importCityAverages(options);

    expect(result).toMatchObject({
      period,
      accepted: 4,
      rejected: { duplicate_row: 1, unknown_city: 1, invalid_row: 1 },
    });
    await expect(importCityAverages(options)).rejects.toMatchObject({
      code: 'market_import_exists',
    });
  });

  it('gives the city average, its change over a year, the estimate, the rent and the yield', async () => {
    const report = await assessInvestmentAtAddress(
      sql,
      { cityId, cutoff: new Date() },
      {
        params,
        ...CETATE,
        declared: { areaM2: 84, rooms: 3, floor: null, constructionYear: null },
      },
    );

    expect(report).toMatchObject({
      status: 'context',
      sale: {
        precision: 'city_average',
        rooms: [3, 3],
        average_eur_m2: 1750,
        change_12m_pct: 9,
        estimate_eur: 147000,
        source: { source: SOURCE, period, url: 'https://example.test/sample-sale-index' },
      },
      rent: { precision: 'city_average', basis: 'same_rooms', average_eur: 560 },
      yield: { gross_pct: 4.6, city_gross_pct: null },
      histogram: null,
    });
  });

  it('ignores the averages imported after the snapshot', async () => {
    const report = await assessInvestmentAtAddress(
      sql,
      { cityId, cutoff: new Date('2020-01-01T00:00:00Z') },
      {
        params,
        ...CETATE,
        declared: { areaM2: 84, rooms: 3, floor: null, constructionYear: null },
      },
    );

    expect(report).toMatchObject({ status: 'no_data', reason: 'no_market_data' });
  });
});
