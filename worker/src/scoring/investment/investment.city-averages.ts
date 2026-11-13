import { monthEnd, shiftDate, shiftMonths } from './investment.dates.ts';

export type CityAverage = {
  source: string;
  period: string;
  transaction: 'sale' | 'rent';
  propertyType: 'apartment' | 'house';
  roomsMin: number | null;
  roomsMax: number | null;
  eurM2: number | null;
  eurMonth: number | null;
  sourceUrl: string | null;
};

type RoomsBand = [number, number | null];

type CityAverageSource = { source: string; period: string; url: string | null };

export type CityAverageSaleBlock = {
  precision: 'city_average';
  property_type: 'apartment';
  rooms: RoomsBand | null;
  average_eur_m2: number;
  change_12m_pct: number | null;
  estimate_eur: number | null;
  source: CityAverageSource;
};

export type CityAverageRentBlock = {
  precision: 'city_average';
  property_type: 'apartment';
  rooms: RoomsBand | null;
  basis: 'same_rooms' | 'per_m2' | 'all';
  average_eur: number | null;
  average_eur_m2: number | null;
  source: CityAverageSource;
};

export type CityAverageMarket = {
  referenceDate: string;
  sale: CityAverageSaleBlock;
  rent: CityAverageRentBlock | null;
  grossYieldPct: number | null;
  cityGrossYieldPct: number | null;
  sources: CityAverageSource[];
};

type CityAverageQuery = {
  averages: readonly CityAverage[];
  cutoffDate: string;
  windowDays: number;
  areaM2: number | null;
  rooms: number | null;
};

const PROPERTY_TYPE = 'apartment';

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roomsBand(average: CityAverage): RoomsBand | null {
  return average.roomsMin === null ? null : [average.roomsMin, average.roomsMax];
}

function isSameBand(a: CityAverage, b: CityAverage): boolean {
  return a.roomsMin === b.roomsMin && a.roomsMax === b.roomsMax;
}

function coversRooms(average: CityAverage, rooms: number): boolean {
  return (
    average.roomsMin !== null &&
    rooms >= average.roomsMin &&
    (average.roomsMax === null || rooms <= average.roomsMax)
  );
}

function bandWidth(average: CityAverage): number {
  return (average.roomsMax ?? Number.MAX_SAFE_INTEGER) - (average.roomsMin ?? 0);
}

function sourceOf(average: CityAverage): CityAverageSource {
  return { source: average.source, period: average.period, url: average.sourceUrl };
}

type LatestRows = { matched: CityAverage | null; all: CityAverage | null };

function latestRows(
  query: CityAverageQuery,
  transaction: CityAverage['transaction'],
  hasValue: (average: CityAverage) => boolean,
): LatestRows | null {
  const freshFrom = shiftDate(query.cutoffDate, -query.windowDays);
  const fresh = query.averages.filter(
    (average) =>
      average.transaction === transaction &&
      average.propertyType === PROPERTY_TYPE &&
      hasValue(average) &&
      monthEnd(average.period) >= freshFrom,
  );
  const [latest] = [...fresh].sort(
    (a, b) => b.period.localeCompare(a.period) || a.source.localeCompare(b.source),
  );
  if (!latest) return null;
  const rows = fresh.filter(
    (average) => average.source === latest.source && average.period === latest.period,
  );
  const { rooms } = query;
  const [matched] =
    rooms === null
      ? []
      : rows
          .filter((average) => coversRooms(average, rooms))
          .sort((a, b) => bandWidth(a) - bandWidth(b));
  return {
    matched: matched ?? null,
    all: rows.find((average) => average.roomsMin === null) ?? null,
  };
}

function changeOverYear(
  query: CityAverageQuery,
  current: CityAverage,
  eurM2: number,
): number | null {
  const yearBefore = shiftMonths(current.period, -12);
  const previous = query.averages.find(
    (average) =>
      average.source === current.source &&
      average.transaction === current.transaction &&
      average.propertyType === current.propertyType &&
      average.period === yearBefore &&
      isSameBand(average, current),
  );
  if (!previous?.eurM2) return null;
  return Math.round((eurM2 / previous.eurM2 - 1) * 100);
}

function saleBlock(query: CityAverageQuery): CityAverageSaleBlock | null {
  const latest = latestRows(query, 'sale', (average) => average.eurM2 !== null);
  const row = latest?.matched ?? latest?.all;
  if (!row?.eurM2) return null;
  return {
    precision: 'city_average',
    property_type: PROPERTY_TYPE,
    rooms: roomsBand(row),
    average_eur_m2: roundTo(row.eurM2, 10),
    change_12m_pct: changeOverYear(query, row, row.eurM2),
    estimate_eur: query.areaM2 === null ? null : roundTo(row.eurM2 * query.areaM2, 1000),
    source: sourceOf(row),
  };
}

function rentBlock(
  row: CityAverage,
  basis: CityAverageRentBlock['basis'],
  monthlyEur: number | null,
): CityAverageRentBlock {
  return {
    precision: 'city_average',
    property_type: PROPERTY_TYPE,
    rooms: roomsBand(row),
    basis,
    average_eur: monthlyEur === null ? null : roundTo(monthlyEur, 10),
    average_eur_m2: row.eurM2 === null ? null : roundOneDecimal(row.eurM2),
    source: sourceOf(row),
  };
}

function selectRent(query: CityAverageQuery): CityAverageRentBlock | null {
  const latest = latestRows(query, 'rent', () => true);
  if (!latest) return null;
  const { matched, all } = latest;
  if (matched?.eurMonth) return rentBlock(matched, 'same_rooms', matched.eurMonth);
  const perM2Row = [matched, all].find((average) => average?.eurM2) ?? null;
  if (perM2Row?.eurM2 && query.areaM2 !== null) {
    return rentBlock(perM2Row, 'per_m2', perM2Row.eurM2 * query.areaM2);
  }
  if (all?.eurMonth) return rentBlock(all, 'all', all.eurMonth);
  return perM2Row ? rentBlock(perM2Row, 'per_m2', null) : null;
}

function grossYield(sale: CityAverageSaleBlock, rent: CityAverageRentBlock | null): number | null {
  if (!rent) return null;
  if (sale.estimate_eur && rent.average_eur && rent.basis !== 'all') {
    return roundOneDecimal(((12 * rent.average_eur) / sale.estimate_eur) * 100);
  }
  if (rent.average_eur_m2 === null) return null;
  return roundOneDecimal(((12 * rent.average_eur_m2) / sale.average_eur_m2) * 100);
}

function cityGrossYield(query: CityAverageQuery): number | null {
  const sale = latestRows(query, 'sale', (average) => average.eurM2 !== null)?.all;
  const rent = latestRows(query, 'rent', (average) => average.eurM2 !== null)?.all;
  if (!sale?.eurM2 || !rent?.eurM2) return null;
  return roundOneDecimal(((12 * rent.eurM2) / sale.eurM2) * 100);
}

function distinctSources(sources: readonly CityAverageSource[]): CityAverageSource[] {
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

export function assessCityAverages(query: CityAverageQuery): CityAverageMarket | null {
  const sale = saleBlock(query);
  if (!sale) return null;
  const rent = selectRent(query);
  return {
    referenceDate: monthEnd(sale.source.period),
    sale,
    rent,
    grossYieldPct: grossYield(sale, rent),
    cityGrossYieldPct: cityGrossYield(query),
    sources: distinctSources(rent ? [sale.source, rent.source] : [sale.source]),
  };
}
