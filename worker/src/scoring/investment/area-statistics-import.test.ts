import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { importAreaStatistics, marketSourceUserAgent } from './area-statistics-import.ts';
import {
  IMOSPOT_CSV,
  INDEX_CSV,
  SALE_CITY_PAGE,
  SMALL_ZONE_PAGE,
} from './area-statistics.fixtures.ts';
import { checkAreaStatistic, placeKey, type AreaStatisticRow } from './area-statistics.ts';
import { readActiveInvestmentParams } from './investment.db.ts';
import type { InvestmentParams } from './investment.params.ts';

const databaseUrl = process.env.DATABASE_URL;
const silentLogger = createLogger('error', () => undefined);
const PERIOD = '2031-03-01';
const PREVIOUS_PERIOD = '2031-02-01';
const CONTACT = 'https://propertyscore.example.test/contact';

const PLAUSIBLE = {
  area_m2: [12, 400] as [number, number],
  rooms: [1, 10] as [number, number],
  sale_eur_m2: [300, 8000] as [number, number],
  rent_eur_m2: [2, 40] as [number, number],
};

const ROW: AreaStatisticRow = {
  city: 'timisoara',
  zone_slug: 'cetate',
  zone_name: 'Cetate',
  transaction: 'sale',
  property_type: 'apartment',
  rooms_min: null,
  rooms_max: null,
  observed_on: '2026-11-18',
  listing_count: 286,
  apartment_count: 209,
  median_eur: 98000,
  p25_eur: 72000,
  p75_eur: 145000,
  median_eur_m2: 1833.33,
  p25_eur_m2: null,
  p75_eur_m2: null,
  source_url: 'https://apartamente.org/apartamente-de-vanzare/timisoara/cetate',
};

describe('checkAreaStatistic', () => {
  it('accepts a zone statistic and a rent without a price per square metre', () => {
    expect(checkAreaStatistic(ROW, PLAUSIBLE)).toBeNull();
    expect(
      checkAreaStatistic(
        {
          ...ROW,
          transaction: 'rent',
          median_eur: 450,
          p25_eur: 380,
          p75_eur: 550,
          median_eur_m2: null,
        },
        PLAUSIBLE,
      ),
    ).toBeNull();
  });

  it.each([
    [{ median_eur: null, median_eur_m2: null }, 'no_figures'],
    [{ median_eur_m2: 98000 }, 'implausible_price'],
    [{ median_eur: 1200 }, 'implausible_price'],
    [{ p25_eur: 150000 }, 'invalid_interval'],
    [{ p75_eur: null }, 'invalid_interval'],
    [{ zone_name: null }, 'invalid_zone'],
    [{ zone_slug: 'z'.repeat(81) }, 'invalid_zone'],
  ] as const)('rejects %o as %s', (change, code) => {
    expect(checkAreaStatistic({ ...ROW, ...change }, PLAUSIBLE)).toBe(code);
  });
});

describe('placeKey', () => {
  it('matches a place written with either kind of diacritics', () => {
    expect(placeKey('Timişoara')).toBe(placeKey('Timișoara'));
    expect(placeKey('Târgu Mureș')).toBe('targu-mures');
    expect(placeKey('Lipovei / Calea Sever Bocu')).toBe('lipovei-calea-sever-bocu');
  });
});

describe('marketSourceUserAgent', () => {
  it('names PropertyScore and its contact address, never a browser', () => {
    const userAgent = marketSourceUserAgent(CONTACT);
    expect(userAgent).toBe(`PropertyScore/1.0 (+${CONTACT})`);
    expect(userAgent).not.toMatch(/mozilla|chrome|safari/i);
  });
});

function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function sourceResponse(url: URL): Response {
  if (url.pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\n');
  switch (`${url.hostname}${url.pathname}`) {
    case 'apartamente.org/apartamente-de-vanzare/timisoara':
      return new Response(SALE_CITY_PAGE);
    case 'apartamente.org/apartamente-de-vanzare/timisoara/cetate':
      return new Response(null, {
        status: 302,
        headers: { location: '/apartamente-de-vanzare/timisoara' },
      });
    case 'apartamente.org/apartamente-de-vanzare/timisoara/dambovita':
      return new Response(SMALL_ZONE_PAGE);
    case 'apartamente.org/raport-piata/2031-02.csv':
      return new Response(INDEX_CSV);
    case 'www.imospot.ro/indicele-imospot/2031-03.csv':
      return new Response(IMOSPOT_CSV.replaceAll('2026-11,', '2031-03,'));
    default:
      return new Response('', { status: 404 });
  }
}

describe.skipIf(!databaseUrl)('market statistics import', () => {
  let sql: Sql;
  let params: InvestmentParams;
  let cityId = '';
  const requested: { url: string; userAgent: string | null }[] = [];
  const stubFetch: typeof fetch = (input, init) => {
    const url = requestUrl(input);
    requested.push({ url, userAgent: new Headers(init?.headers).get('user-agent') });
    return Promise.resolve(sourceResponse(new URL(url)));
  };

  async function removeTestImports(): Promise<void> {
    await sql`
      delete from private.market_imports
      where period in (${PERIOD}::date, ${PREVIOUS_PERIOD}::date)
    `;
  }

  function runImport() {
    return importAreaStatistics({
      sql,
      sources: ['apartamente_org', 'apartamente_org_index', 'imospot_index'],
      citySlugs: ['timisoara'],
      contact: CONTACT,
      period: PERIOD,
      params,
      logger: silentLogger,
      fetch: stubFetch,
      minIntervalMs: 0,
    });
  }

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    params = await readActiveInvestmentParams(sql);
    const [city] = await sql<
      { id: string }[]
    >`select id from public.cities where slug = 'timisoara'`;
    cityId = city?.id ?? '';
    await removeTestImports();
  });

  afterAll(async () => {
    await removeTestImports();
    await sql.end({ timeout: 5 });
  });

  it('reads the city, its zones and both indexes, and counts the zones without data', async () => {
    const results = await runImport();

    expect(results).toMatchObject([
      {
        source: 'apartamente_org',
        period: PERIOD,
        accepted: 4,
        requests: 6,
        rejected: { zone_without_data: 2, city_without_data: 1 },
      },
      { source: 'apartamente_org_index', period: PREVIOUS_PERIOD, accepted: 2, requests: 2 },
      { source: 'imospot_index', period: PERIOD, accepted: 1, requests: 2 },
    ]);
    expect(
      requested.every((request) => request.userAgent === `PropertyScore/1.0 (+${CONTACT})`),
    ).toBe(true);
    expect(requested.some((request) => request.url.includes('/anunt/'))).toBe(false);
    expect(requested.some((request) => request.url.includes('/giroc'))).toBe(false);
  });

  it('gives a report the statistics of every source with their page and date', async () => {
    const rows = await sql<
      {
        source: string;
        period: string;
        zone_slug: string | null;
        transaction: string;
        rooms_min: number | null;
        median_eur_m2: string | null;
        observed_on: string | null;
        source_url: string;
      }[]
    >`
      select source, period::text as period, zone_slug, transaction::text as transaction, rooms_min,
        median_eur_m2, observed_on::text as observed_on, source_url
      from private.market_area_statistics_at(${cityId}, now(), ${PREVIOUS_PERIOD}::date)
      order by source, transaction, zone_slug nulls first, rooms_min nulls first
    `;

    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({
      source: 'apartamente_org',
      period: PERIOD,
      zone_slug: null,
      transaction: 'sale',
      rooms_min: null,
      median_eur_m2: '1984.13',
      observed_on: '2026-11-18',
      source_url: 'https://apartamente.org/apartamente-de-vanzare/timisoara',
    });
    expect(rows[3]).toMatchObject({ zone_slug: 'dambovita', median_eur_m2: '1759.00' });
    expect(rows[6]).toMatchObject({
      source: 'imospot_index',
      observed_on: null,
      source_url: 'https://www.imospot.ro/indicele-imospot',
    });
  });

  it('does not read a source again in the month it was imported', async () => {
    requested.length = 0;
    const results = await runImport();

    expect(results.map((result) => result.importId)).toEqual([null, null, null]);
    expect(requested.some((request) => request.url.includes('/apartamente-de-'))).toBe(false);
    expect(requested.some((request) => request.url.includes('imospot'))).toBe(false);
  });
});
