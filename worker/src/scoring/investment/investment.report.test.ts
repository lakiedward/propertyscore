import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { readActiveInvestmentParams } from './investment.db.ts';
import type { InvestmentParams } from './investment.params.ts';
import { assessInvestmentAtAddress } from './investment.report.ts';
import { importMarketListings, MARKET_CSV_COLUMNS } from './market-import.ts';

const databaseUrl = process.env.DATABASE_URL;
const silentLogger = createLogger('error', () => undefined);
const SOURCE = 'vitest_market';
const CETATE = { latitude: 45.7546, longitude: 21.2303 };

function csvLine(values: Record<(typeof MARKET_CSV_COLUMNS)[number], string>): string {
  return MARKET_CSV_COLUMNS.map((column) => values[column]).join(',');
}

function listingsCsv(): string {
  const lines = [MARKET_CSV_COLUMNS.join(',')];
  for (let index = 0; index < 24; index += 1) {
    const area = 60 + index;
    lines.push(
      csvLine({
        source_listing_id: `S-${String(index)}`,
        transaction: 'sale',
        property_type: 'apartment',
        latitude: String(CETATE.latitude + (index % 6) * 0.0008),
        longitude: String(CETATE.longitude + Math.floor(index / 6) * 0.0011),
        area_m2: String(area),
        rooms: '3',
        price: String((2000 + index * 20) * area),
        currency: 'EUR',
        first_seen_on: '2026-07-01',
        last_seen_on: '2026-09-28',
        construction_year: '1978',
        floor: '2',
      }),
    );
  }
  for (let index = 0; index < 12; index += 1) {
    lines.push(
      csvLine({
        source_listing_id: `R-${String(index)}`,
        transaction: 'rent',
        property_type: 'apartment',
        latitude: String(CETATE.latitude - (index % 4) * 0.0008),
        longitude: String(CETATE.longitude - Math.floor(index / 4) * 0.0011),
        area_m2: '80',
        rooms: '3',
        price: String((580 + index * 10) * 5),
        currency: 'RON',
        first_seen_on: '2026-08-01',
        last_seen_on: '2026-09-28',
        construction_year: '',
        floor: '',
      }),
    );
  }
  lines.push(
    csvLine({
      source_listing_id: 'S-0',
      transaction: 'sale',
      property_type: 'apartment',
      latitude: String(CETATE.latitude),
      longitude: String(CETATE.longitude),
      area_m2: '60',
      rooms: '3',
      price: '120000',
      currency: 'EUR',
      first_seen_on: '2026-07-01',
      last_seen_on: '2026-09-28',
      construction_year: '',
      floor: '',
    }),
    csvLine({
      source_listing_id: 'FAR',
      transaction: 'sale',
      property_type: 'apartment',
      latitude: '46.0',
      longitude: '25.0',
      area_m2: '60',
      rooms: '3',
      price: '120000',
      currency: 'EUR',
      first_seen_on: '2026-07-01',
      last_seen_on: '2026-09-28',
      construction_year: '',
      floor: '',
    }),
    csvLine({
      source_listing_id: 'TINY',
      transaction: 'sale',
      property_type: 'apartment',
      latitude: String(CETATE.latitude),
      longitude: String(CETATE.longitude),
      area_m2: '5',
      rooms: '1',
      price: '20000',
      currency: 'EUR',
      first_seen_on: '2026-07-01',
      last_seen_on: '2026-09-28',
      construction_year: '',
      floor: '',
    }),
  );
  return `${lines.join('\n')}\n`;
}

describe.skipIf(!databaseUrl)('market listings import and the Investment assessment', () => {
  let sql: Sql;
  let directory = '';
  let filePath = '';
  let params: InvestmentParams;
  let cityId = '';

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    params = await readActiveInvestmentParams(sql);
    const [city] = await sql<
      { id: string }[]
    >`select id from public.cities where slug = 'timisoara'`;
    cityId = city?.id ?? '';
    directory = await mkdtemp(join(tmpdir(), 'market-'));
    filePath = join(directory, 'listings.csv');
    await writeFile(filePath, listingsCsv());
  });

  afterAll(async () => {
    await sql`delete from private.market_imports where source = ${SOURCE}`;
    await rm(directory, { recursive: true, force: true });
    await sql.end({ timeout: 5 });
  });

  it('imports the listings once and counts what it rejected', async () => {
    const result = await importMarketListings({
      sql,
      source: SOURCE,
      period: '2026-09-01',
      filePath,
      eurRonRate: 5,
      params,
      logger: silentLogger,
    });

    expect(result.accepted).toBe(36);
    expect(result.rejected).toEqual({ duplicate_id: 1, implausible_area: 1, outside_coverage: 1 });
    await expect(
      importMarketListings({
        sql,
        source: SOURCE,
        period: '2026-09-01',
        filePath,
        eurRonRate: 5,
        params,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'market_import_exists' });
  });

  it('leaves no open import behind when a file needs an exchange rate it was not given', async () => {
    const ronPath = join(directory, 'ron.csv');
    await writeFile(ronPath, listingsCsv().replaceAll(',EUR,', ',RON,'));

    await expect(
      importMarketListings({
        sql,
        source: SOURCE,
        period: '2026-09-01',
        filePath: ronPath,
        eurRonRate: null,
        params,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'market_rate_required' });
    const [open] = await sql<{ count: number }[]>`
      select count(*)::integer as count
      from private.market_imports
      where source = ${SOURCE} and completed_at is null
    `;
    expect(open?.count).toBe(0);
  });

  it('gives the asking price, the estimate, the rent and the yield around the address', async () => {
    const report = await assessInvestmentAtAddress(
      sql,
      { cityId, cutoff: new Date() },
      { params, ...CETATE, declared: { areaM2: 84, rooms: 3 } },
    );

    expect(report).toMatchObject({
      status: 'context',
      reference_date: '2026-09-28',
      sale: {
        precision: 'radius',
        radius_m: 800,
        count: 24,
        median_eur_m2: 2230,
        rooms_filter: [2, 4],
      },
      rent: { precision: 'radius', basis: 'same_rooms', count: 12, median_eur: 640 },
      sources: [{ source: SOURCE, period: '2026-09-01' }],
    });
    expect(report.sale?.estimate_eur).toBe(187000);
    expect(report.yield.gross_pct).toBe(4.1);
    expect(report.histogram?.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(24);
  });

  it('ignores the imports completed after the snapshot', async () => {
    const report = await assessInvestmentAtAddress(
      sql,
      { cityId, cutoff: new Date('2020-01-01T00:00:00Z') },
      { params, ...CETATE, declared: { areaM2: 84, rooms: 3 } },
    );

    expect(report).toMatchObject({ status: 'no_data', reason: 'no_market_data' });
  });
});
