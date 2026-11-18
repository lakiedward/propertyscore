import type { JsonObject, Sql } from '../../db/sql.ts';
import { sectionParams } from '../../report/cell-category.ts';
import { readDeclaredDetails } from '../../report/declared.ts';
import type { ReportSection } from '../../report/report-section.ts';
import {
  listCityAverages,
  listCitySaleHistory,
  listCityStatistics,
  listComparables,
  listMarketSources,
  marketReferenceDate,
  readCityMarketSummary,
  readMarketContext,
  type MarketContext,
} from './investment.db.ts';
import { MARKET_STATISTICS_SOURCES } from './area-statistics-import.ts';
import { cityAverageHistoryStart } from './investment.city-averages.ts';
import { cityStatisticsStart, saleHistoryStart } from './investment.city-statistics.ts';
import { shiftDate } from './investment.dates.ts';
import {
  buildInvestmentReport,
  EMPTY_CITY_SUMMARY,
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
  const cutoffDate = context.cutoff.toISOString().slice(0, 10);
  const statisticsCutoffDate = (context.statisticsCutoff ?? context.cutoff)
    .toISOString()
    .slice(0, 10);
  const [referenceDate, cityAverages, cityStatistics, citySaleHistory] = await Promise.all([
    marketReferenceDate(sql, context),
    listCityAverages(sql, context, cityAverageHistoryStart(cutoffDate, params.window_days)),
    listCityStatistics(sql, context, cityStatisticsStart(statisticsCutoffDate, params.window_days)),
    listCitySaleHistory(sql, context, saleHistoryStart(statisticsCutoffDate)),
  ]);
  const cityFigures = {
    cutoffDate,
    cityAverages,
    cityStatistics,
    citySaleHistory,
    statisticsCutoffDate,
    statisticSourceOrder: MARKET_STATISTICS_SOURCES,
  };
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
      ...cityFigures,
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
    ...cityFigures,
  });
}

export const investmentReportSection: ReportSection = {
  key: 'investment',
  build: async ({ sql, reportId, snapshotId, citySlug, latitude, longitude, params }) => {
    const raw = sectionParams(params, 'investment');
    if (raw === undefined) return null;
    const context = await readMarketContext(sql, snapshotId, citySlug, reportId);
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
