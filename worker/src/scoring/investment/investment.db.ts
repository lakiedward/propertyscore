import type { Sql } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import {
  EMPTY_CITY_SUMMARY,
  type CityMarketSummary,
  type MarketListing,
  type MarketSourcePeriod,
} from './investment.formula.ts';
import type { MarketListingRow } from './market-import.ts';
import { parseInvestmentParams, type InvestmentParams } from './investment.params.ts';

type Transaction = 'sale' | 'rent';

export async function beginMarketImport(
  sql: Sql,
  input: { source: string; period: string; sha256: string; eurRonRate: number | null },
): Promise<string> {
  return sql.begin(async (transaction) => {
    const [existing] = await transaction<{ id: string; completed_at: Date | null }[]>`
      select id, completed_at
      from private.market_imports
      where source = ${input.source} and file_sha256 = ${input.sha256}
      for update
    `;
    if (existing?.completed_at) {
      throw new WorkerError('market_import_exists', 'This file was already imported');
    }
    if (existing) {
      await transaction`delete from private.market_listings where import_id = ${existing.id}`;
      await transaction`
        update private.market_imports
        set period = ${input.period}, eur_ron_rate = ${input.eurRonRate}, accepted_count = 0, rejected = '{}'
        where id = ${existing.id}
      `;
      return existing.id;
    }
    const [created] = await transaction<{ id: string }[]>`
      insert into private.market_imports (source, period, file_sha256, eur_ron_rate)
      values (${input.source}, ${input.period}, ${input.sha256}, ${input.eurRonRate})
      returning id
    `;
    if (!created)
      throw new WorkerError('market_import_not_created', 'The import row was not created');
    return created.id;
  });
}

export async function insertMarketListings(
  sql: Sql,
  importId: string,
  cityBufferM: number,
  rows: readonly MarketListingRow[],
): Promise<number> {
  const [result] = await sql<{ inserted: number }[]>`
    select private.insert_market_listings(${importId}, ${cityBufferM}, ${sql.json(rows)}::jsonb) as inserted
  `;
  return result?.inserted ?? 0;
}

export async function discardMarketImport(sql: Sql, importId: string): Promise<void> {
  await sql`delete from private.market_imports where id = ${importId} and completed_at is null`;
}

export async function completeMarketImport(
  sql: Sql,
  importId: string,
  accepted: number,
  rejected: Record<string, number>,
): Promise<void> {
  await sql`
    update private.market_imports
    set accepted_count = ${accepted}, rejected = ${sql.json(rejected)}::jsonb, completed_at = now()
    where id = ${importId}
  `;
}

export type MarketContext = { cityId: string; cutoff: Date };

export async function readMarketContext(
  sql: Sql,
  snapshotId: string,
  citySlug: string,
): Promise<MarketContext | undefined> {
  const [row] = await sql<{ city_id: string; finished_at: Date | null }[]>`
    select c.id as city_id, s.finished_at
    from public.score_snapshots s
    cross join public.cities c
    where s.id = ${snapshotId} and c.slug = ${citySlug}
  `;
  if (!row?.finished_at) return undefined;
  return { cityId: row.city_id, cutoff: row.finished_at };
}

export async function readDeclaredDetails(
  sql: Sql,
  reportId: string | undefined,
): Promise<{ areaM2: number | null; rooms: number | null }> {
  if (reportId === undefined) return { areaM2: null, rooms: null };
  const [row] = await sql<{ area_m2: string | null; rooms: number | null }[]>`
    select declared_area_m2 as area_m2, declared_rooms as rooms
    from public.online_reports
    where id = ${reportId}
  `;
  return {
    areaM2: row?.area_m2 === null || row?.area_m2 === undefined ? null : Number(row.area_m2),
    rooms: row?.rooms ?? null,
  };
}

export async function marketReferenceDate(
  sql: Sql,
  context: MarketContext,
): Promise<string | null> {
  const [row] = await sql<{ reference_date: string | null }[]>`
    select private.market_reference_date(${context.cityId}, ${context.cutoff})::text as reference_date
  `;
  return row?.reference_date ?? null;
}

export async function listComparables(
  sql: Sql,
  context: MarketContext,
  query: {
    transaction: Transaction;
    from: string;
    to: string;
    longitude: number;
    latitude: number;
    radiusM: number;
  },
): Promise<MarketListing[]> {
  const rows = await sql<
    {
      listing_id: string;
      source: string;
      longitude: number;
      latitude: number;
      distance_m: number;
      area_m2: string;
      rooms: number | null;
      price_eur: string;
      first_seen_on: string;
      last_seen_on: string;
    }[]
  >`
    select listing_id, source, longitude, latitude, distance_m, area_m2, rooms, price_eur,
      first_seen_on::text as first_seen_on, last_seen_on::text as last_seen_on
    from private.market_comparables(
      ${context.cityId}, ${context.cutoff}, ${query.transaction}::private.market_transaction,
      ${query.from}::date, ${query.to}::date, ${query.longitude}, ${query.latitude}, ${query.radiusM}
    )
  `;
  return rows.map((row) => ({
    id: row.listing_id,
    source: row.source,
    longitude: row.longitude,
    latitude: row.latitude,
    distanceM: row.distance_m,
    areaM2: Number(row.area_m2),
    rooms: row.rooms,
    priceEur: Number(row.price_eur),
    firstSeenOn: row.first_seen_on,
    lastSeenOn: row.last_seen_on,
  }));
}

export async function readCityMarketSummary(
  sql: Sql,
  context: MarketContext,
  window: { from: string; to: string; goneBefore: string },
): Promise<Record<Transaction, CityMarketSummary>> {
  const rows = await sql<
    {
      transaction: Transaction;
      listing_count: number;
      p05_eur_m2: number | null;
      p25_eur_m2: number | null;
      p50_eur_m2: number | null;
      p75_eur_m2: number | null;
      p95_eur_m2: number | null;
      p50_eur: number | null;
      gone_count: number;
      p50_days_listed: number | null;
    }[]
  >`
    select *
    from private.market_city_summary(
      ${context.cityId}, ${context.cutoff}, ${window.from}::date, ${window.to}::date,
      ${window.goneBefore}::date
    )
  `;
  const summaries: Record<Transaction, CityMarketSummary> = {
    sale: EMPTY_CITY_SUMMARY,
    rent: EMPTY_CITY_SUMMARY,
  };
  for (const row of rows) {
    summaries[row.transaction] = {
      count: row.listing_count,
      p05EurM2: row.p05_eur_m2,
      p25EurM2: row.p25_eur_m2,
      p50EurM2: row.p50_eur_m2,
      p75EurM2: row.p75_eur_m2,
      p95EurM2: row.p95_eur_m2,
      p50Eur: row.p50_eur,
      p50DaysListed: row.p50_days_listed,
      goneCount: row.gone_count,
    };
  }
  return summaries;
}

export async function listMarketSources(
  sql: Sql,
  context: MarketContext,
  window: { from: string; to: string },
): Promise<MarketSourcePeriod[]> {
  return sql<MarketSourcePeriod[]>`
    select i.source, max(i.period)::text as period
    from private.market_imports i
    where i.completed_at is not null
      and i.completed_at <= ${context.cutoff}
      and exists (
        select 1
        from private.market_listings l
        where l.import_id = i.id
          and l.city_id = ${context.cityId}
          and l.last_seen_on between ${window.from}::date and ${window.to}::date
      )
    group by i.source
    order by i.source
  `;
}

export async function readActiveInvestmentParams(sql: Sql): Promise<InvestmentParams> {
  const [row] = await sql<{ params: unknown }[]>`
    select params -> 'investment' as params
    from public.scoring_versions
    where kind = 'online' and is_active
  `;
  if (!row?.params) {
    throw new WorkerError('no_investment_params', 'The active formula has no params.investment');
  }
  return parseInvestmentParams(row.params);
}
