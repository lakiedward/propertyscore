import type { JsonObject, Sql } from '../../db/sql.ts';
import { sectionParams } from '../../report/cell-category.ts';
import { readDeclaredDetails } from '../../report/declared.ts';
import type { ReportSection } from '../../report/report-section.ts';
import {
  listComparables,
  listMarketSources,
  marketReferenceDate,
  readCityMarketSummary,
  readMarketContext,
  type MarketContext,
} from './investment.db.ts';
import {
  buildInvestmentReport,
  EMPTY_CITY_SUMMARY,
  shiftDate,
  type DeclaredHome,
  type InvestmentReport,
} from './investment.formula.ts';
import { parseInvestmentParams, type InvestmentParams } from './investment.params.ts';

const DAYS_IN_YEAR = 365;

export async function assessInvestmentAtAddress(
  sql: Sql,
  context: MarketContext,
  input: {
    params: InvestmentParams;
    longitude: number;
    latitude: number;
    declared: DeclaredHome;
  },
): Promise<InvestmentReport> {
  const { params } = input;
  const referenceDate = await marketReferenceDate(sql, context);
  const window = referenceDate
    ? { from: shiftDate(referenceDate, -params.window_days), to: referenceDate }
    : null;
  if (!referenceDate || !window) {
    return buildInvestmentReport({
      params,
      referenceDate: null,
      declared: input.declared,
      sale: [],
      salePreviousYear: [],
      rent: [],
      city: { sale: EMPTY_CITY_SUMMARY, rent: EMPTY_CITY_SUMMARY },
      sources: [],
    });
  }

  const radiusM = params.radii_m.at(-1) ?? 0;
  const near = { longitude: input.longitude, latitude: input.latitude, radiusM };
  const previousYear = {
    from: shiftDate(window.from, -DAYS_IN_YEAR),
    to: shiftDate(window.to, -DAYS_IN_YEAR),
  };
  const [sale, salePreviousYear, rent, city, sources] = await Promise.all([
    listComparables(sql, context, { ...near, ...window, transaction: 'sale' }),
    listComparables(sql, context, { ...near, ...previousYear, transaction: 'sale' }),
    listComparables(sql, context, { ...near, ...window, transaction: 'rent' }),
    readCityMarketSummary(sql, context, {
      ...window,
      goneBefore: shiftDate(referenceDate, -params.gone_after_days),
    }),
    listMarketSources(sql, context, window),
  ]);
  return buildInvestmentReport({
    params,
    referenceDate,
    declared: input.declared,
    sale,
    salePreviousYear,
    rent,
    city,
    sources,
  });
}

export const investmentReportSection: ReportSection = {
  key: 'investment',
  build: async ({ sql, reportId, snapshotId, citySlug, latitude, longitude, params }) => {
    const raw = sectionParams(params, 'investment');
    if (raw === undefined) return null;
    const context = await readMarketContext(sql, snapshotId, citySlug);
    if (!context) return null;
    const report = await assessInvestmentAtAddress(sql, context, {
      params: parseInvestmentParams(raw),
      longitude,
      latitude,
      declared: await readDeclaredDetails(sql, reportId),
    });
    const section: JsonObject = { schema_version: 1, ...report };
    return section;
  },
};
