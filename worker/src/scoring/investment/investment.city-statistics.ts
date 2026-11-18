import { monthEnd, monthStart, shiftDate, shiftMonths } from './investment.dates.ts';

export type CityStatistic = {
  source: string;
  period: string;
  zoneSlug: string | null;
  zoneName: string | null;
  isNearbyLocality: boolean;
  transaction: 'sale' | 'rent';
  propertyType: 'apartment' | 'house';
  roomsMin: number | null;
  observedOn: string | null;
  listingCount: number | null;
  apartmentCount: number | null;
  medianEur: number | null;
  medianEurM2: number | null;
  p25EurM2: number | null;
  p75EurM2: number | null;
  medianAreaM2: number | null;
  sourceUrl: string;
};

export type CitySaleMonth = {
  source: string;
  period: string;
  medianEurM2: number;
  sourceUrl: string;
};

type StatisticSource = {
  source: string;
  period: string;
  observed_on: string | null;
  url: string;
};

type PriceKind = 'asking';

export type CityStatisticsSaleBlock = {
  precision: 'city_statistics';
  property_type: 'apartment';
  price_kind: PriceKind;
  count: number | null;
  median_eur_m2: number;
  p25_eur_m2: number | null;
  p75_eur_m2: number | null;
  typical: { area_m2: number; price_eur: number } | null;
  estimate_eur: number | null;
  estimate_low_eur: number | null;
  estimate_high_eur: number | null;
  source: StatisticSource;
};

export type CityStatisticsRentBlock = {
  precision: 'city_statistics';
  property_type: 'apartment';
  price_kind: PriceKind;
  count: number | null;
  basis: 'per_m2' | 'all';
  median_eur: number | null;
  median_eur_m2: number | null;
  estimate_eur: number | null;
  source: StatisticSource;
};

export type NearbyLocality = {
  slug: string;
  name: string;
  count: number | null;
  median_eur_m2: number;
  p25_eur_m2: number | null;
  p75_eur_m2: number | null;
  source: StatisticSource;
};

export type SaleHistory = {
  source: string;
  url: string;
  months: { period: string; median_eur_m2: number }[];
};

export type CityStatisticsMarket = {
  referenceDate: string;
  sale: CityStatisticsSaleBlock;
  rent: CityStatisticsRentBlock | null;
  grossYieldPct: number | null;
  nearby: NearbyLocality[];
  history: SaleHistory | null;
  sources: StatisticSource[];
};

type CityStatisticsQuery = {
  statistics: readonly CityStatistic[];
  history: readonly CitySaleMonth[];
  sourceOrder: readonly string[];
  cutoffDate: string;
  areaM2: number | null;
};

const PROPERTY_TYPE = 'apartment';
const SALE_ESTIMATE_STEP_EUR = 1000;
const RENT_ESTIMATE_STEP_EUR = 5;
const MAX_NEARBY_LOCALITIES = 3;
const MIN_HISTORY_MONTHS = 2;
const MAX_HISTORY_MONTHS = 12;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function roundDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sourceOf(statistic: CityStatistic): StatisticSource {
  return {
    source: statistic.source,
    period: statistic.period,
    observed_on: statistic.observedOn,
    url: statistic.sourceUrl,
  };
}

function countOf(statistic: CityStatistic): number | null {
  return statistic.listingCount ?? statistic.apartmentCount;
}

function hasInterval(statistic: CityStatistic): boolean {
  return statistic.p25EurM2 !== null && statistic.p75EurM2 !== null;
}

function sourceRank(source: string, sourceOrder: readonly string[]): number {
  const index = sourceOrder.indexOf(source);
  return index < 0 ? sourceOrder.length : index;
}

function byPreference<Row extends { source: string }>(
  sourceOrder: readonly string[],
  isComplete: (row: Row) => boolean,
): (a: Row, b: Row) => number {
  return (a, b) =>
    Number(isComplete(b)) - Number(isComplete(a)) ||
    sourceRank(a.source, sourceOrder) - sourceRank(b.source, sourceOrder) ||
    a.source.localeCompare(b.source);
}

function wholeMarket(
  query: CityStatisticsQuery,
  transaction: CityStatistic['transaction'],
): CityStatistic[] {
  return query.statistics.filter(
    (statistic) =>
      statistic.transaction === transaction &&
      statistic.propertyType === PROPERTY_TYPE &&
      statistic.roomsMin === null,
  );
}

function saleBlock(query: CityStatisticsQuery, row: CityStatistic, medianEurM2: number) {
  const { areaM2 } = query;
  const estimate = (eurM2: number | null): number | null =>
    areaM2 === null || eurM2 === null ? null : roundTo(eurM2 * areaM2, SALE_ESTIMATE_STEP_EUR);
  const block: CityStatisticsSaleBlock = {
    precision: 'city_statistics',
    property_type: PROPERTY_TYPE,
    price_kind: 'asking',
    count: countOf(row),
    median_eur_m2: Math.round(medianEurM2),
    p25_eur_m2: hasInterval(row) ? Math.round(row.p25EurM2 ?? 0) : null,
    p75_eur_m2: hasInterval(row) ? Math.round(row.p75EurM2 ?? 0) : null,
    typical:
      row.medianAreaM2 === null || row.medianEur === null
        ? null
        : { area_m2: Math.round(row.medianAreaM2), price_eur: Math.round(row.medianEur) },
    estimate_eur: estimate(medianEurM2),
    estimate_low_eur: hasInterval(row) ? estimate(row.p25EurM2) : null,
    estimate_high_eur: hasInterval(row) ? estimate(row.p75EurM2) : null,
    source: sourceOf(row),
  };
  return block;
}

function rentPerM2(row: CityStatistic): number | null {
  if (row.medianEurM2 !== null) return row.medianEurM2;
  if (row.medianEur === null || row.medianAreaM2 === null) return null;
  return row.medianEur / row.medianAreaM2;
}

function selectRent(
  query: CityStatisticsQuery,
): { block: CityStatisticsRentBlock; eurM2: number | null } | null {
  const [row] = wholeMarket(query, 'rent')
    .filter((statistic) => statistic.zoneSlug === null)
    .sort(byPreference(query.sourceOrder, (statistic) => rentPerM2(statistic) !== null));
  if (!row) return null;
  const eurM2 = rentPerM2(row);
  const { areaM2 } = query;
  return {
    eurM2,
    block: {
      precision: 'city_statistics',
      property_type: PROPERTY_TYPE,
      price_kind: 'asking',
      count: countOf(row),
      basis: eurM2 === null ? 'all' : 'per_m2',
      median_eur: row.medianEur === null ? null : Math.round(row.medianEur),
      median_eur_m2: eurM2 === null ? null : roundDecimals(eurM2, 2),
      estimate_eur:
        eurM2 === null || areaM2 === null ? null : roundTo(eurM2 * areaM2, RENT_ESTIMATE_STEP_EUR),
      source: sourceOf(row),
    },
  };
}

function nearbyLocalities(query: CityStatisticsQuery, saleSource: string): NearbyLocality[] {
  const order = [saleSource, ...query.sourceOrder];
  const bySlug = new Map<string, CityStatistic>();
  const candidates = wholeMarket(query, 'sale')
    .filter((statistic) => statistic.isNearbyLocality && statistic.medianEurM2 !== null)
    .sort(byPreference(order, hasInterval));
  for (const statistic of candidates) {
    const slug = statistic.zoneSlug ?? '';
    if (!bySlug.has(slug)) bySlug.set(slug, statistic);
  }
  return [...bySlug.values()]
    .sort(
      (a, b) =>
        (countOf(b) ?? 0) - (countOf(a) ?? 0) || (a.zoneSlug ?? '').localeCompare(b.zoneSlug ?? ''),
    )
    .slice(0, MAX_NEARBY_LOCALITIES)
    .map((statistic) => ({
      slug: statistic.zoneSlug ?? '',
      name: statistic.zoneName ?? '',
      count: countOf(statistic),
      median_eur_m2: Math.round(statistic.medianEurM2 ?? 0),
      p25_eur_m2: hasInterval(statistic) ? Math.round(statistic.p25EurM2 ?? 0) : null,
      p75_eur_m2: hasInterval(statistic) ? Math.round(statistic.p75EurM2 ?? 0) : null,
      source: sourceOf(statistic),
    }));
}

function sourceHistory(query: CityStatisticsQuery, source: string): SaleHistory | null {
  const months = query.history
    .filter((month) => month.source === source)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-MAX_HISTORY_MONTHS);
  const latest = months.at(-1);
  if (!latest || months.length < MIN_HISTORY_MONTHS) return null;
  return {
    source: latest.source,
    url: latest.sourceUrl,
    months: months.map((month) => ({
      period: month.period,
      median_eur_m2: Math.round(month.medianEurM2),
    })),
  };
}

function saleHistory(query: CityStatisticsQuery, saleSource: string): SaleHistory | null {
  const sources = [saleSource, ...query.sourceOrder, ...query.history.map((month) => month.source)];
  for (const source of sources) {
    const history = sourceHistory(query, source);
    if (history) return history;
  }
  return null;
}

function distinctSources(sources: readonly StatisticSource[]): StatisticSource[] {
  return sources.filter(
    (source, index) =>
      sources.findIndex(
        (other) =>
          other.source === source.source &&
          other.period === source.period &&
          other.url === source.url,
      ) === index,
  );
}

export function cityStatisticsStart(cutoffDate: string, windowDays: number): string {
  return monthStart(shiftDate(cutoffDate, -windowDays));
}

export function saleHistoryStart(cutoffDate: string): string {
  return shiftMonths(monthStart(cutoffDate), -MAX_HISTORY_MONTHS);
}

export function assessCityStatistics(query: CityStatisticsQuery): CityStatisticsMarket | null {
  const [row] = wholeMarket(query, 'sale')
    .filter((statistic) => statistic.zoneSlug === null && statistic.medianEurM2 !== null)
    .sort(byPreference(query.sourceOrder, hasInterval));
  const medianEurM2 = row?.medianEurM2 ?? null;
  if (!row || medianEurM2 === null) return null;
  const sale = saleBlock(query, row, medianEurM2);
  const rent = selectRent(query);
  const nearby = nearbyLocalities(query, row.source);
  const described = row.observedOn ?? monthEnd(row.period);
  return {
    referenceDate: described < query.cutoffDate ? described : query.cutoffDate,
    sale,
    rent: rent?.block ?? null,
    grossYieldPct:
      rent?.eurM2 == null ? null : roundDecimals(((12 * rent.eurM2) / medianEurM2) * 100, 1),
    nearby,
    history: saleHistory(query, row.source),
    sources: distinctSources([
      sale.source,
      ...(rent ? [rent.block.source] : []),
      ...nearby.map((locality) => locality.source),
    ]),
  };
}
