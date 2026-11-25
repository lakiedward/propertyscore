import { z } from 'zod';

const sourceUrl = z
  .string()
  .nullable()
  .transform((value) => (value?.startsWith('https://') && URL.canParse(value) ? value : null));

const marketSource = z.object({
  source: z.string(),
  period: z.string(),
  url: sourceUrl,
  observed_on: z.string().nullable().optional(),
  label: z.string().optional(),
});

const countKind = z.enum(['listings', 'apartments']);
const sampleSource = marketSource.or(
  marketSource
    .omit({ source: true })
    .extend({ code: z.string() })
    .transform(({ code, ...source }) => ({
      ...source,
      source: code,
    })),
);
const sample = {
  count: z.number().nullable().optional(),
  count_kind: countKind.optional(),
  source: sampleSource.optional(),
};
const interval = {
  median_eur_m2: z.number(),
  p25_eur_m2: z.number().nullable().optional(),
  p75_eur_m2: z.number().nullable().optional(),
};
const yieldBasis = z.object({
  sale_eur_m2: z.number().positive(),
  rent_eur_m2: z.number().positive(),
  sale_source: marketSource,
  rent_source: marketSource,
});

export const investmentSectionSchema = z.object({
  status: z.literal('context'),
  reference_date: z.string().nullable(),
  declared: z.object({ area_m2: z.number().nullable() }),
  sale: z
    .looseObject({
      ...sample,
      ...interval,
      precision: z.string(),
      radius_m: z.number().positive().nullable().optional(),
      typical: z.object({ area_m2: z.number(), price_eur: z.number() }).nullable().optional(),
      estimate_eur: z.number().nullable().optional(),
      estimate_low_eur: z.number().nullable().optional(),
      estimate_high_eur: z.number().nullable().optional(),
    })
    .nullable(),
  rent: z
    .looseObject({
      ...sample,
      median_eur: z.number().nullable().optional(),
      median_eur_m2: z.number().nullable().optional(),
      estimate_eur: z.number().nullable().optional(),
      is_example: z.boolean().optional(),
    })
    .nullable(),
  yield: z.object({
    gross_pct: z.number().nullable(),
    is_example: z.boolean().optional(),
    basis: yieldBasis.optional(),
  }),
  nearby: z.array(z.object({ ...sample, ...interval, name: z.string() })).default([]),
  history: z
    .object({
      source: z.string().optional(),
      url: sourceUrl.optional(),
      months: z.array(z.object({ period: z.string(), median_eur_m2: z.number() })),
    })
    .nullable()
    .default(null),
  sources: z.array(marketSource).default([]),
});

export type InvestmentSection = z.infer<typeof investmentSectionSchema>;
export type InvestmentYieldBasis = z.infer<typeof yieldBasis>;
export type MarketCountKind = z.infer<typeof countKind>;
type Sale = NonNullable<InvestmentSection['sale']>;
type Source = z.infer<typeof marketSource>;
type Sample = { count?: number | null; count_kind?: MarketCountKind; source?: Source };
const SALE_STEP_EUR = 1000;
const RENT_STEP_EUR = 5;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function isCityWide(precision: string): boolean {
  return precision === 'city_statistics' || precision === 'city_average' || precision === 'city';
}

export function sampleKind(value: Sample): MarketCountKind {
  return (
    value.count_kind ??
    (value.source?.source === 'apartamente_org_index' ? 'apartments' : 'listings')
  );
}

export function estimateForArea(investment: InvestmentSection, sale: Sale, area: number) {
  const declared = investment.declared.area_m2 === area;
  const scale = (value: number | null | undefined) =>
    value == null ? null : roundTo(value * area, SALE_STEP_EUR);
  return {
    price:
      (declared ? sale.estimate_eur : null) ?? roundTo(sale.median_eur_m2 * area, SALE_STEP_EUR),
    low: (declared ? sale.estimate_low_eur : null) ?? scale(sale.p25_eur_m2),
    high: (declared ? sale.estimate_high_eur : null) ?? scale(sale.p75_eur_m2),
  };
}

export function rentForArea(investment: InvestmentSection, area: number): number | null {
  const { rent } = investment;
  if (!rent) return null;
  const declared = investment.declared.area_m2;
  if (declared === area && rent.estimate_eur != null) return rent.estimate_eur;
  if (rent.median_eur_m2 != null) return roundTo(rent.median_eur_m2 * area, RENT_STEP_EUR);
  if (rent.estimate_eur != null && declared !== null && declared > 0) {
    return roundTo((rent.estimate_eur / declared) * area, RENT_STEP_EUR);
  }
  return null;
}

type Month = NonNullable<InvestmentSection['history']>['months'][number];

function monthNumber(period: string): number {
  return Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7));
}

export function historyRange(months: readonly Month[]) {
  const ordered = [...months].sort((a, b) => a.period.localeCompare(b.period));
  const first = ordered[0];
  const last = ordered.at(-1);
  if (!first || !last || ordered.length < 2 || first.median_eur_m2 <= 0) return null;
  const perM2 = last.median_eur_m2 - first.median_eur_m2;
  return {
    ordered,
    first,
    last,
    perM2,
    percent: (100 * perM2) / first.median_eur_m2,
    monthsSpan: monthNumber(last.period) - monthNumber(first.period),
  };
}

type Attribution = {
  role: 'sale' | 'rent' | 'history' | 'yield_sale' | 'yield_rent';
  count: number | null;
  countKind: MarketCountKind;
  place?: string;
};
type SourceEntry = { source: Source; details: Attribution[] };

export function investmentSources(investment: InvestmentSection): SourceEntry[] {
  const entries = new Map<string, SourceEntry>();
  function add(source: Source, attribution?: Attribution) {
    const key = JSON.stringify([source.source, source.period, source.url]);
    const entry = entries.get(key) ?? { source, details: [] };
    if (attribution) entry.details.push(attribution);
    entries.set(key, entry);
  }
  function addSample(role: 'sale' | 'rent', value: Sample | null, place?: string) {
    if (value?.source) {
      add(value.source, { role, count: value.count ?? null, countKind: sampleKind(value), place });
    }
  }
  for (const source of investment.sources) add(source);
  addSample('sale', investment.sale);
  addSample('rent', investment.rent);
  for (const locality of investment.nearby) addSample('sale', locality, locality.name);

  const basis = investment.yield.basis;
  if (basis) {
    add(basis.sale_source, { role: 'yield_sale', count: null, countKind: 'listings' });
    add(basis.rent_source, { role: 'yield_rent', count: null, countKind: 'listings' });
  }
  const history = investment.history;
  const range = history && historyRange(history.months);
  if (history?.source && range) {
    const source = [...entries.values()].find(
      (entry) =>
        entry.source.source === history.source &&
        entry.source.url === history.url &&
        entry.source.period.slice(0, 7) === range.last.period.slice(0, 7),
    )?.source ?? { source: history.source, period: range.last.period, url: history.url ?? null };
    add(source, { role: 'history', count: null, countKind: 'listings' });
  }
  return [...entries.values()];
}
