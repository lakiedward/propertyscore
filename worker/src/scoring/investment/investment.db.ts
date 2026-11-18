import type { Sql } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { CityAverage } from './investment.city-averages.ts';
import type { CitySaleMonth, CityStatistic } from './investment.city-statistics.ts';
import {
  EMPTY_CITY_SUMMARY,
  type CityMarketSummary,
  type MarketListing,
  type MarketSourcePeriod,
} from './investment.formula.ts';
import type { AreaStatisticRow, CoveredCity } from './area-statistics.ts';
import type { CityAverageRow } from './city-averages-import.ts';
import type { MarketListingRow } from './market-import.ts';
import { parseInvestmentParams, type InvestmentParams } from './investment.params.ts';

type Transaction = 'sale' | 'rent';

type MarketImportContent = 'listings' | 'city_averages' | 'area_statistics';

export async function beginMarketImport(
  sql: Sql,
  input: {
    source: string;
    period: string;
    sha256: string;
    eurRonRate: number | null;
    content: MarketImportContent;
  },
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
      await transaction`delete from private.market_city_averages where import_id = ${existing.id}`;
      await transaction`delete from private.market_area_statistics where import_id = ${existing.id}`;
      await transaction`
        update private.market_imports
        set period = ${input.period}, eur_ron_rate = ${input.eurRonRate}, content = ${input.content},
          accepted_count = 0, rejected = '{}'
        where id = ${existing.id}
      `;
      return existing.id;
    }
    const [created] = await transaction<{ id: string }[]>`
      insert into private.market_imports (source, period, file_sha256, eur_ron_rate, content)
      values (${input.source}, ${input.period}, ${input.sha256}, ${input.eurRonRate}, ${input.content})
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

export async function insertCityAverages(
  sql: Sql,
  importId: string,
  rows: readonly CityAverageRow[],
): Promise<number> {
  const [result] = await sql<{ inserted: number }[]>`
    select private.insert_market_city_averages(${importId}, ${sql.json(rows)}::jsonb) as inserted
  `;
  return result?.inserted ?? 0;
}

export async function insertAreaStatistics(
  sql: Sql,
  importId: string,
  rows: readonly AreaStatisticRow[],
): Promise<number> {
  const [result] = await sql<{ inserted: number }[]>`
    select private.insert_market_area_statistics(${importId}, ${sql.json(rows)}::jsonb) as inserted
  `;
  return result?.inserted ?? 0;
}

export async function hasCompletedMarketImport(
  sql: Sql,
  source: string,
  period: string,
): Promise<boolean> {
  const [row] = await sql<{ is_imported: boolean }[]>`
    select exists (
      select 1
      from private.market_imports
      where source = ${source} and period = ${period}::date and completed_at is not null
    ) as is_imported
  `;
  return row?.is_imported ?? false;
}

export async function claimStatisticsRun(
  sql: Sql,
  source: string,
  runMonth: string,
  isRetry: boolean,
): Promise<boolean> {
  const claimed = await sql`
    insert into private.market_statistics_runs (source, run_month)
    values (${source}, ${runMonth}::date)
    on conflict (source, run_month) do update
      set started_at = now(), finished_at = null, outcome = null, import_id = null
      where ${isRetry}::boolean
    returning source
  `;
  return claimed.length > 0;
}

export async function finishStatisticsRun(
  sql: Sql,
  source: string,
  runMonth: string,
  outcome: 'imported' | 'unchanged' | 'failed',
  importId: string | null,
): Promise<void> {
  await sql`
    update private.market_statistics_runs
    set outcome = ${outcome}, import_id = ${importId}, finished_at = now()
    where source = ${source} and run_month = ${runMonth}::date
  `;
}

export async function listCoveredCities(
  sql: Sql,
  citySlugs: readonly string[],
): Promise<CoveredCity[]> {
  return sql<CoveredCity[]>`
    select slug, name
    from public.cities
    where has_online_coverage
      and (${citySlugs.length === 0} or slug = any(${[...citySlugs]}::text[]))
    order by position
  `;
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

export type MarketContext = { cityId: string; cutoff: Date; statisticsCutoff?: Date };

export async function readMarketContext(
  sql: Sql,
  snapshotId: string,
  citySlug: string,
  reportId: string | undefined,
): Promise<MarketContext | undefined> {
  const [row] = await sql<
    { city_id: string; finished_at: Date | null; report_created_at: Date | null }[]
  >`
    select c.id as city_id, s.finished_at,
      (select r.created_at from public.online_reports r where r.id = ${reportId ?? null}::uuid)
        as report_created_at
    from public.score_snapshots s
    cross join public.cities c
    where s.id = ${snapshotId} and c.slug = ${citySlug}
  `;
  if (!row?.finished_at) return undefined;
  return {
    cityId: row.city_id,
    cutoff: row.finished_at,
    statisticsCutoff: row.report_created_at ?? row.finished_at,
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
      floor: number | null;
      construction_year: number | null;
      price_eur: string;
      first_seen_on: string;
      last_seen_on: string;
    }[]
  >`
    select listing_id, source, longitude, latitude, distance_m, area_m2, rooms, floor,
      construction_year, price_eur, first_seen_on::text as first_seen_on,
      last_seen_on::text as last_seen_on
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
    floor: row.floor,
    constructionYear: row.construction_year,
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
    select i.source, max(i.period)::text as period, 'listings' as scope, null as url
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

export async function listCityAverages(
  sql: Sql,
  context: MarketContext,
  fromPeriod: string,
): Promise<CityAverage[]> {
  const rows = await sql<
    {
      source: string;
      period: string;
      transaction: CityAverage['transaction'];
      property_type: CityAverage['propertyType'];
      rooms_min: number | null;
      rooms_max: number | null;
      eur_m2: string | null;
      eur_month: string | null;
      source_url: string | null;
    }[]
  >`
    select source, period::text as period, transaction, property_type, rooms_min, rooms_max,
      eur_m2, eur_month, source_url
    from private.market_city_averages_at(${context.cityId}, ${context.cutoff}, ${fromPeriod}::date)
  `;
  return rows.map((row) => ({
    source: row.source,
    period: row.period,
    transaction: row.transaction,
    propertyType: row.property_type,
    roomsMin: row.rooms_min,
    roomsMax: row.rooms_max,
    eurM2: row.eur_m2 === null ? null : Number(row.eur_m2),
    eurMonth: row.eur_month === null ? null : Number(row.eur_month),
    sourceUrl: row.source_url,
  }));
}

function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export async function listCityStatistics(
  sql: Sql,
  context: MarketContext,
  fromPeriod: string,
): Promise<CityStatistic[]> {
  const rows = await sql<
    {
      source: string;
      period: string;
      zone_slug: string | null;
      zone_name: string | null;
      is_nearby_locality: boolean;
      transaction: CityStatistic['transaction'];
      property_type: CityStatistic['propertyType'];
      rooms_min: number | null;
      observed_on: string | null;
      listing_count: number | null;
      apartment_count: number | null;
      median_eur: string | null;
      median_eur_m2: string | null;
      p25_eur_m2: string | null;
      p75_eur_m2: string | null;
      median_area_m2: string | null;
      source_url: string;
    }[]
  >`
    select source, period::text as period, zone_slug, zone_name, is_nearby_locality, transaction,
      property_type, rooms_min, observed_on::text as observed_on, listing_count, apartment_count,
      median_eur, median_eur_m2, p25_eur_m2, p75_eur_m2, median_area_m2, source_url
    from private.market_area_statistics_at(
      ${context.cityId}, ${context.statisticsCutoff ?? context.cutoff}, ${fromPeriod}::date
    )
    where zone_slug is null or is_nearby_locality
  `;
  return rows.map((row) => ({
    source: row.source,
    period: row.period,
    zoneSlug: row.zone_slug,
    zoneName: row.zone_name,
    isNearbyLocality: row.is_nearby_locality,
    transaction: row.transaction,
    propertyType: row.property_type,
    roomsMin: row.rooms_min,
    observedOn: row.observed_on,
    listingCount: row.listing_count,
    apartmentCount: row.apartment_count,
    medianEur: numberOrNull(row.median_eur),
    medianEurM2: numberOrNull(row.median_eur_m2),
    p25EurM2: numberOrNull(row.p25_eur_m2),
    p75EurM2: numberOrNull(row.p75_eur_m2),
    medianAreaM2: numberOrNull(row.median_area_m2),
    sourceUrl: row.source_url,
  }));
}

export async function listCitySaleHistory(
  sql: Sql,
  context: MarketContext,
  fromPeriod: string,
): Promise<CitySaleMonth[]> {
  const rows = await sql<
    { source: string; period: string; median_eur_m2: string; source_url: string }[]
  >`
    select source, period::text as period, median_eur_m2, source_url
    from private.market_city_sale_history(
      ${context.cityId}, ${context.statisticsCutoff ?? context.cutoff}, ${fromPeriod}::date
    )
  `;
  return rows.map((row) => ({
    source: row.source,
    period: row.period,
    medianEurM2: Number(row.median_eur_m2),
    sourceUrl: row.source_url,
  }));
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
