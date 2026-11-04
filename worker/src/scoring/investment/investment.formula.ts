import type { InvestmentParams } from './investment.params.ts';

export type MarketListing = {
  id: string;
  source: string;
  longitude: number;
  latitude: number;
  distanceM: number;
  areaM2: number;
  rooms: number | null;
  priceEur: number;
  firstSeenOn: string;
  lastSeenOn: string;
};

export type CityMarketSummary = {
  count: number;
  p05EurM2: number | null;
  p25EurM2: number | null;
  p50EurM2: number | null;
  p75EurM2: number | null;
  p95EurM2: number | null;
  p50Eur: number | null;
  p50DaysListed: number | null;
  goneCount: number;
};

export const EMPTY_CITY_SUMMARY: CityMarketSummary = {
  count: 0,
  p05EurM2: null,
  p25EurM2: null,
  p50EurM2: null,
  p75EurM2: null,
  p95EurM2: null,
  p50Eur: null,
  p50DaysListed: null,
  goneCount: 0,
};

export type MarketSourcePeriod = { source: string; period: string };

export type InvestmentInputs = {
  params: InvestmentParams;
  referenceDate: string | null;
  declared: { areaM2: number | null; rooms: number | null };
  sale: readonly MarketListing[];
  salePreviousYear: readonly MarketListing[];
  rent: readonly MarketListing[];
  city: { sale: CityMarketSummary; rent: CityMarketSummary };
  sources: readonly MarketSourcePeriod[];
};

type Status = 'context' | 'no_data';
type NoDataReason = 'no_market_data' | 'insufficient_data';
type Precision = 'radius' | 'city';
type RentBasis = 'same_rooms' | 'per_m2' | 'all';

type SaleBlock = {
  precision: Precision;
  radius_m: number | null;
  count: number;
  rooms_filter: [number, number] | null;
  median_eur_m2: number;
  p25_eur_m2: number;
  p75_eur_m2: number;
  change_12m_pct: number | null;
  estimate_eur: number | null;
  estimate_low_eur: number | null;
  estimate_high_eur: number | null;
  days_listed: number | null;
};

type RentBlock = {
  precision: Precision;
  radius_m: number | null;
  count: number;
  basis: RentBasis;
  median_eur: number | null;
  median_eur_m2: number;
};

type HistogramBin = { from: number | null; to: number | null; count: number; in_estimate: boolean };

export type InvestmentReport = {
  status: Status;
  reason: NoDataReason | null;
  reference_date: string | null;
  window_days: number;
  declared: { area_m2: number | null; rooms: number | null };
  sale: SaleBlock | null;
  rent: RentBlock | null;
  yield: { gross_pct: number | null; city_gross_pct: number | null };
  city: {
    sale_count: number;
    rent_count: number;
    median_sale_eur_m2: number | null;
    median_rent_eur_m2: number | null;
    days_listed: number | null;
  };
  histogram: { bin_eur_m2: number; bins: HistogramBin[] } | null;
  sources: MarketSourcePeriod[];
};

const EARTH_RADIUS_M = 6_371_008.8;
const DAY_MS = 86_400_000;

export function quantile(sortedValues: readonly number[], probability: number): number | null {
  const count = sortedValues.length;
  if (count === 0) return null;
  const position = (count - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sortedValues[lower] ?? 0;
  const high = sortedValues[upper] ?? low;
  return low + (high - low) * (position - lower);
}

function median(values: readonly number[]): number | null {
  return quantile(
    [...values].sort((a, b) => a - b),
    0.5,
  );
}

function eurPerM2(listing: Pick<MarketListing, 'priceEur' | 'areaM2'>): number {
  return listing.priceEur / listing.areaM2;
}

function distanceBetweenM(a: MarketListing, b: MarketListing): number {
  const toRadians = Math.PI / 180;
  const deltaLatitude = (b.latitude - a.latitude) * toRadians;
  const deltaLongitude = (b.longitude - a.longitude) * toRadians;
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(a.latitude * toRadians) *
      Math.cos(b.latitude * toRadians) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));
}

function isWithinRatio(a: number, b: number, ratio: number): boolean {
  return Math.abs(a - b) <= ratio * Math.max(a, b);
}

export function dedupeListings(
  listings: readonly MarketListing[],
  rule: InvestmentParams['duplicate'],
): MarketListing[] {
  const ordered = [...listings].sort(
    (a, b) => a.firstSeenOn.localeCompare(b.firstSeenOn) || a.id.localeCompare(b.id),
  );
  const kept: MarketListing[] = [];
  for (const listing of ordered) {
    const isDuplicate = kept.some(
      (other) =>
        other.rooms === listing.rooms &&
        isWithinRatio(other.areaM2, listing.areaM2, rule.area_ratio) &&
        isWithinRatio(other.priceEur, listing.priceEur, rule.price_ratio) &&
        distanceBetweenM(other, listing) <= rule.distance_m,
    );
    if (!isDuplicate) kept.push(listing);
  }
  return kept.sort((a, b) => a.distanceM - b.distanceM || a.id.localeCompare(b.id));
}

export function withoutOutliers(
  listings: readonly MarketListing[],
  factor: number,
): MarketListing[] {
  if (listings.length < 4) return [...listings];
  const values = listings.map(eurPerM2).sort((a, b) => a - b);
  const q1 = quantile(values, 0.25) ?? 0;
  const q3 = quantile(values, 0.75) ?? 0;
  const spread = q3 - q1;
  const low = q1 - factor * spread;
  const high = q3 + factor * spread;
  return listings.filter((listing) => {
    const value = eurPerM2(listing);
    return value >= low && value <= high;
  });
}

function cleanComparables(
  listings: readonly MarketListing[],
  params: InvestmentParams,
): MarketListing[] {
  return withoutOutliers(dedupeListings(listings, params.duplicate), params.outlier_iqr_factor);
}

function pickRadius(
  listings: readonly MarketListing[],
  radii: readonly number[],
  minCount: number,
): { radiusM: number; listings: MarketListing[] } | null {
  for (const radiusM of radii) {
    const inside = listings.filter((listing) => listing.distanceM <= radiusM);
    if (inside.length >= minCount) return { radiusM, listings: inside };
  }
  return null;
}

function roomsWindow(rooms: number | null): [number, number] | null {
  return rooms === null ? null : [Math.max(1, rooms - 1), rooms + 1];
}

function inRooms(listing: MarketListing, window: [number, number]): boolean {
  return listing.rooms !== null && listing.rooms >= window[0] && listing.rooms <= window[1];
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysListed(
  listings: readonly MarketListing[],
  referenceDate: string,
  params: InvestmentParams,
): number | null {
  const goneBefore = shiftDate(referenceDate, -params.gone_after_days);
  const gone = listings.filter((listing) => listing.lastSeenOn < goneBefore);
  if (gone.length < params.days_listed_min_count) return null;
  const value = median(gone.map((listing) => daysBetween(listing.firstSeenOn, listing.lastSeenOn)));
  return value === null ? null : Math.round(value);
}

type SaleSelection = {
  precision: Precision;
  radiusM: number | null;
  listings: MarketListing[];
  roomsFilter: [number, number] | null;
  p25: number;
  p50: number;
  p75: number;
};

function selectSale(inputs: InvestmentInputs): SaleSelection | null {
  const { params } = inputs;
  const picked = pickRadius(
    cleanComparables(inputs.sale, params),
    params.radii_m,
    params.sale_min_count,
  );
  if (picked) {
    const window = roomsWindow(inputs.declared.rooms);
    const sameRooms = window ? picked.listings.filter((listing) => inRooms(listing, window)) : [];
    const useRooms = window !== null && sameRooms.length >= params.rooms_filter_min_count;
    const listings = useRooms ? sameRooms : picked.listings;
    const values = listings.map(eurPerM2).sort((a, b) => a - b);
    return {
      precision: 'radius',
      radiusM: picked.radiusM,
      listings,
      roomsFilter: useRooms ? window : null,
      p25: quantile(values, 0.25) ?? 0,
      p50: quantile(values, 0.5) ?? 0,
      p75: quantile(values, 0.75) ?? 0,
    };
  }
  const city = inputs.city.sale;
  if (
    city.count < params.city_min_count ||
    city.p25EurM2 === null ||
    city.p50EurM2 === null ||
    city.p75EurM2 === null
  ) {
    return null;
  }
  return {
    precision: 'city',
    radiusM: null,
    listings: [],
    roomsFilter: null,
    p25: city.p25EurM2,
    p50: city.p50EurM2,
    p75: city.p75EurM2,
  };
}

function changeOverYear(inputs: InvestmentInputs, selection: SaleSelection): number | null {
  if (selection.precision !== 'radius' || selection.radiusM === null) return null;
  const { params } = inputs;
  const radiusM = selection.radiusM;
  const window = selection.roomsFilter;
  const previous = cleanComparables(
    inputs.salePreviousYear.filter((listing) => listing.distanceM <= radiusM),
    params,
  ).filter((listing) => (window ? inRooms(listing, window) : true));
  if (selection.listings.length < params.change_min_count) return null;
  if (previous.length < params.change_min_count) return null;
  const before = median(previous.map(eurPerM2));
  if (before === null || before <= 0) return null;
  return Math.round((selection.p50 / before - 1) * 100);
}

function buildSaleBlock(
  inputs: InvestmentInputs,
  selection: SaleSelection,
  referenceDate: string,
): SaleBlock {
  const area = inputs.declared.areaM2;
  const estimate = (value: number): number | null =>
    area === null ? null : roundTo(value * area, 1000);
  return {
    precision: selection.precision,
    radius_m: selection.radiusM,
    count: selection.precision === 'radius' ? selection.listings.length : inputs.city.sale.count,
    rooms_filter: selection.roomsFilter,
    median_eur_m2: roundTo(selection.p50, 10),
    p25_eur_m2: roundTo(selection.p25, 10),
    p75_eur_m2: roundTo(selection.p75, 10),
    change_12m_pct: changeOverYear(inputs, selection),
    estimate_eur: estimate(selection.p50),
    estimate_low_eur: estimate(selection.p25),
    estimate_high_eur: estimate(selection.p75),
    days_listed:
      selection.precision === 'radius'
        ? daysListed(selection.listings, referenceDate, inputs.params)
        : inputs.city.sale.p50DaysListed === null ||
            inputs.city.sale.goneCount < inputs.params.days_listed_min_count
          ? null
          : Math.round(inputs.city.sale.p50DaysListed),
  };
}

type RentSelection = { block: RentBlock; monthlyEur: number | null; eurM2: number };

function selectRent(inputs: InvestmentInputs): RentSelection | null {
  const { params, declared } = inputs;
  const picked = pickRadius(
    cleanComparables(inputs.rent, params),
    params.radii_m,
    params.rent_min_count,
  );
  if (picked) {
    const eurM2 = median(picked.listings.map(eurPerM2)) ?? 0;
    const sameRooms =
      declared.rooms === null
        ? []
        : picked.listings.filter((listing) => listing.rooms === declared.rooms);
    let basis: RentBasis;
    let monthlyEur: number | null;
    if (sameRooms.length >= params.rent_same_rooms_min_count) {
      basis = 'same_rooms';
      monthlyEur = median(sameRooms.map((listing) => listing.priceEur));
    } else if (declared.areaM2 !== null) {
      basis = 'per_m2';
      monthlyEur = eurM2 * declared.areaM2;
    } else {
      basis = 'all';
      monthlyEur = median(picked.listings.map((listing) => listing.priceEur));
    }
    return {
      monthlyEur,
      eurM2,
      block: {
        precision: 'radius',
        radius_m: picked.radiusM,
        count: basis === 'same_rooms' ? sameRooms.length : picked.listings.length,
        basis,
        median_eur: monthlyEur === null ? null : roundTo(monthlyEur, 10),
        median_eur_m2: roundOneDecimal(eurM2),
      },
    };
  }
  const city = inputs.city.rent;
  if (city.count < params.city_min_count || city.p50EurM2 === null) return null;
  const basis: RentBasis = declared.areaM2 === null ? 'all' : 'per_m2';
  const monthlyEur = declared.areaM2 === null ? city.p50Eur : city.p50EurM2 * declared.areaM2;
  return {
    monthlyEur,
    eurM2: city.p50EurM2,
    block: {
      precision: 'city',
      radius_m: null,
      count: city.count,
      basis,
      median_eur: monthlyEur === null ? null : roundTo(monthlyEur, 10),
      median_eur_m2: roundOneDecimal(city.p50EurM2),
    },
  };
}

function grossYield(
  sale: SaleBlock | null,
  saleEurM2: number | null,
  rent: RentSelection | null,
): number | null {
  if (!sale || !rent || saleEurM2 === null || saleEurM2 <= 0) return null;
  if (sale.estimate_eur !== null && rent.block.median_eur !== null && rent.block.basis !== 'all') {
    return roundOneDecimal(((12 * rent.block.median_eur) / sale.estimate_eur) * 100);
  }
  return roundOneDecimal(((12 * rent.eurM2) / saleEurM2) * 100);
}

function cityYield(inputs: InvestmentInputs): number | null {
  const { sale, rent } = inputs.city;
  const minCount = inputs.params.city_min_count;
  if (sale.count < minCount || rent.count < minCount) return null;
  if (sale.p50EurM2 === null || rent.p50EurM2 === null || sale.p50EurM2 <= 0) return null;
  return roundOneDecimal(((12 * rent.p50EurM2) / sale.p50EurM2) * 100);
}

export function histogramBins(
  values: readonly number[],
  cityLow: number,
  cityHigh: number,
  interval: [number, number],
  params: Pick<InvestmentParams, 'histogram_bin_eur_m2' | 'histogram_max_bins'>,
): { bin_eur_m2: number; bins: HistogramBin[] } {
  const baseBin = params.histogram_bin_eur_m2;
  const low = Math.floor(cityLow / baseBin) * baseBin;
  const high = Math.max(low + baseBin, Math.ceil(cityHigh / baseBin) * baseBin);
  const innerBins = params.histogram_max_bins - 2;
  const bin = Math.max(baseBin, Math.ceil((high - low) / innerBins / baseBin) * baseBin);
  const binCount = Math.ceil((high - low) / bin);
  const top = low + binCount * bin;
  const ranges: [number | null, number | null][] = [[null, low]];
  for (let index = 0; index < binCount; index += 1) {
    ranges.push([low + index * bin, low + (index + 1) * bin]);
  }
  ranges.push([top, null]);
  const bins = ranges.map(([from, to]) => ({
    from,
    to,
    count: values.filter((value) => (from === null || value >= from) && (to === null || value < to))
      .length,
    in_estimate: (from === null || interval[1] >= from) && (to === null || interval[0] < to),
  }));
  return { bin_eur_m2: bin, bins };
}

function emptyReport(inputs: InvestmentInputs, reason: NoDataReason): InvestmentReport {
  return {
    status: 'no_data',
    reason,
    reference_date: inputs.referenceDate,
    window_days: inputs.params.window_days,
    declared: { area_m2: inputs.declared.areaM2, rooms: inputs.declared.rooms },
    sale: null,
    rent: null,
    yield: { gross_pct: null, city_gross_pct: null },
    city: {
      sale_count: inputs.city.sale.count,
      rent_count: inputs.city.rent.count,
      median_sale_eur_m2: null,
      median_rent_eur_m2: null,
      days_listed: null,
    },
    histogram: null,
    sources: [...inputs.sources],
  };
}

export function buildInvestmentReport(inputs: InvestmentInputs): InvestmentReport {
  const referenceDate = inputs.referenceDate;
  if (referenceDate === null) return emptyReport(inputs, 'no_market_data');
  const selection = selectSale(inputs);
  if (!selection) return emptyReport(inputs, 'insufficient_data');

  const sale = buildSaleBlock(inputs, selection, referenceDate);
  const rent = selectRent(inputs);
  const citySale = inputs.city.sale;
  const cityRent = inputs.city.rent;
  const hasCityRange = citySale.p05EurM2 !== null && citySale.p95EurM2 !== null;
  const histogram =
    selection.precision === 'radius' && hasCityRange
      ? histogramBins(
          selection.listings.map(eurPerM2),
          citySale.p05EurM2 ?? 0,
          citySale.p95EurM2 ?? 0,
          [selection.p25, selection.p75],
          inputs.params,
        )
      : null;

  return {
    status: 'context',
    reason: null,
    reference_date: referenceDate,
    window_days: inputs.params.window_days,
    declared: { area_m2: inputs.declared.areaM2, rooms: inputs.declared.rooms },
    sale,
    rent: rent?.block ?? null,
    yield: { gross_pct: grossYield(sale, selection.p50, rent), city_gross_pct: cityYield(inputs) },
    city: {
      sale_count: citySale.count,
      rent_count: cityRent.count,
      median_sale_eur_m2: citySale.p50EurM2 === null ? null : roundTo(citySale.p50EurM2, 10),
      median_rent_eur_m2: cityRent.p50EurM2 === null ? null : roundOneDecimal(cityRent.p50EurM2),
      days_listed:
        citySale.p50DaysListed === null || citySale.goneCount < inputs.params.days_listed_min_count
          ? null
          : Math.round(citySale.p50DaysListed),
    },
    histogram,
    sources: [...inputs.sources],
  };
}
