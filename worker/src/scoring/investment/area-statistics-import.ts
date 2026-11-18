import { createHash } from 'node:crypto';

import type { Sql } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { createPoliteClient, type PoliteClient } from '../../sources/polite-client.ts';
import {
  APARTAMENTE_ORG_CONSENTED_CITIES,
  APARTAMENTE_ORG_INDEX_PATHS,
  APARTAMENTE_ORG_ORIGIN,
  APARTAMENTE_ORG_PAGE_PATHS,
  indexCsvPath,
  parseIndexCsv,
  parseStatisticsPage,
  statisticsPagePath,
  type StatisticsPageTarget,
} from './apartamente-org.ts';
import {
  areaStatisticKey,
  checkAreaStatistic,
  type AreaStatisticRow,
  type CoveredCity,
} from './area-statistics.ts';
import {
  IMOSPOT_INDEX_PATHS,
  IMOSPOT_ORIGIN,
  imospotIndexCsvPath,
  parseImospotIndexCsv,
} from './imospot.ts';
import { shiftMonths } from './investment.dates.ts';
import {
  beginMarketImport,
  completeMarketImport,
  discardMarketImport,
  hasCompletedMarketImport,
  insertAreaStatistics,
  listCoveredCities,
} from './investment.db.ts';
import type { InvestmentParams } from './investment.params.ts';

export const MARKET_STATISTICS_SOURCES = [
  'apartamente_org',
  'apartamente_org_index',
  'imospot_index',
] as const;

export type MarketStatisticsSource = (typeof MARKET_STATISTICS_SOURCES)[number];

const PRODUCT_TOKEN = 'PropertyScore';
const MIN_REQUEST_INTERVAL_MS = 2500;
const TRANSACTIONS = ['sale', 'rent'] as const;

export function marketSourceUserAgent(contact: string): string {
  return `${PRODUCT_TOKEN}/1.0 (+${contact})`;
}

type Rejections = Record<string, number>;

type Collected = { period: string; rows: AreaStatisticRow[] };

type CollectContext = {
  client: PoliteClient;
  cities: readonly CoveredCity[];
  period: string;
  isImported: (period: string) => Promise<boolean>;
  reject: (code: string, count?: number) => void;
};

export type AreaStatisticsImportOptions = {
  sql: Sql;
  sources: readonly MarketStatisticsSource[];
  citySlugs: readonly string[];
  contact: string;
  period: string;
  params: InvestmentParams;
  logger: Logger;
  fetch?: typeof fetch;
  minIntervalMs?: number;
};

export type AreaStatisticsImportResult = {
  source: MarketStatisticsSource;
  period: string;
  importId: string | null;
  accepted: number;
  requests: number;
  rejected: Rejections;
};

async function collectStatisticsPages(context: CollectContext): Promise<Collected | null> {
  if (await context.isImported(context.period)) return null;
  const rows: AreaStatisticRow[] = [];
  const cities = context.cities.filter((city) =>
    APARTAMENTE_ORG_CONSENTED_CITIES.includes(city.slug),
  );
  for (const city of cities) {
    for (const transaction of TRANSACTIONS) {
      const cityTarget: StatisticsPageTarget = { city: city.slug, transaction, zone: null };
      const cityResponse = await context.client.get(statisticsPagePath(cityTarget));
      if (cityResponse.status !== 'ok') {
        context.reject('city_without_data');
        continue;
      }
      const cityPage = parseStatisticsPage(cityResponse.body, cityTarget);
      if (!cityPage) {
        throw new WorkerError(
          'source_layout_changed',
          `The statistics page of ${city.slug} (${transaction}) has no dataset`,
        );
      }
      rows.push(...cityPage.rows);
      for (const zone of cityPage.zones) {
        const zoneTarget: StatisticsPageTarget = { city: city.slug, transaction, zone };
        const zoneResponse = await context.client.get(statisticsPagePath(zoneTarget));
        if (zoneResponse.status !== 'ok') {
          context.reject('zone_without_data');
          continue;
        }
        const zonePage = parseStatisticsPage(zoneResponse.body, zoneTarget);
        if (zonePage) rows.push(...zonePage.rows);
        else context.reject('zone_without_data');
      }
    }
  }
  return { period: context.period, rows };
}

async function collectIndexEdition(
  context: CollectContext,
  pathOf: (period: string) => string,
  parse: (
    text: string,
    period: string,
    cities: readonly CoveredCity[],
  ) => Promise<{ rows: AreaStatisticRow[]; skipped: number }>,
): Promise<Collected | null> {
  for (const period of [context.period, shiftMonths(context.period, -1)]) {
    if (await context.isImported(period)) return null;
    const response = await context.client.get(pathOf(period));
    if (response.status !== 'ok') continue;
    const parsed = await parse(response.body, period, context.cities);
    if (parsed.skipped > 0) context.reject('invalid_row', parsed.skipped);
    return { period, rows: parsed.rows };
  }
  throw new WorkerError('source_edition_missing', 'No index edition for this month or the last');
}

type SourceDefinition = {
  origin: string;
  collect: (context: CollectContext) => Promise<Collected | null>;
};

const SOURCE_DEFINITIONS: Record<MarketStatisticsSource, SourceDefinition> = {
  apartamente_org: { origin: APARTAMENTE_ORG_ORIGIN, collect: collectStatisticsPages },
  apartamente_org_index: {
    origin: APARTAMENTE_ORG_ORIGIN,
    collect: (context) => collectIndexEdition(context, indexCsvPath, parseIndexCsv),
  },
  imospot_index: {
    origin: IMOSPOT_ORIGIN,
    collect: (context) => collectIndexEdition(context, imospotIndexCsvPath, parseImospotIndexCsv),
  },
};

const AGREED_PATHS: Record<string, readonly RegExp[]> = {
  [APARTAMENTE_ORG_ORIGIN]: [...APARTAMENTE_ORG_PAGE_PATHS, ...APARTAMENTE_ORG_INDEX_PATHS],
  [IMOSPOT_ORIGIN]: IMOSPOT_INDEX_PATHS,
};

function keepPlausibleRows(
  rows: readonly AreaStatisticRow[],
  plausible: InvestmentParams['plausible'],
  reject: (code: string) => void,
): AreaStatisticRow[] {
  const kept = new Map<string, AreaStatisticRow>();
  for (const row of rows) {
    const rejection = checkAreaStatistic(row, plausible);
    if (rejection) {
      reject(rejection);
      continue;
    }
    const key = areaStatisticKey(row);
    if (kept.has(key)) {
      reject('duplicate_row');
      continue;
    }
    kept.set(key, row);
  }
  return [...kept.values()];
}

async function importSource(
  options: AreaStatisticsImportOptions,
  source: MarketStatisticsSource,
  cities: readonly CoveredCity[],
  clients: Map<string, PoliteClient>,
): Promise<AreaStatisticsImportResult> {
  const { sql } = options;
  const definition = SOURCE_DEFINITIONS[source];
  const client =
    clients.get(definition.origin) ??
    createPoliteClient({
      origin: definition.origin,
      userAgent: marketSourceUserAgent(options.contact),
      productToken: PRODUCT_TOKEN,
      allowedPaths: AGREED_PATHS[definition.origin] ?? [],
      minIntervalMs: options.minIntervalMs ?? MIN_REQUEST_INTERVAL_MS,
      fetch: options.fetch,
    });
  clients.set(definition.origin, client);
  const requestsBefore = client.requestCount();
  const rejected: Rejections = {};
  const reject = (code: string, count = 1): void => {
    rejected[code] = (rejected[code] ?? 0) + count;
  };

  const collected = await definition.collect({
    client,
    cities,
    period: options.period,
    isImported: (period) => hasCompletedMarketImport(sql, source, period),
    reject,
  });
  if (!collected) {
    options.logger.info('market statistics already imported this month', { source });
    return {
      source,
      period: options.period,
      importId: null,
      accepted: 0,
      requests: client.requestCount() - requestsBefore,
      rejected,
    };
  }
  const rows = keepPlausibleRows(collected.rows, options.params.plausible, reject);
  if (rows.length === 0) {
    throw new WorkerError('area_statistics_empty', `${source} gave no usable statistic`);
  }

  const importId = await beginMarketImport(sql, {
    source,
    period: collected.period,
    sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    eurRonRate: null,
    content: 'area_statistics',
  });
  let accepted = 0;
  try {
    accepted = await insertAreaStatistics(sql, importId, rows);
  } catch (error) {
    await discardMarketImport(sql, importId);
    throw error;
  }
  if (accepted < rows.length) reject('unknown_city', rows.length - accepted);
  await completeMarketImport(sql, importId, accepted, rejected);
  options.logger.info('market statistics imported', {
    import_id: importId,
    source,
    period: collected.period,
    accepted,
    requests: client.requestCount() - requestsBefore,
    rejected: Object.values(rejected).reduce((sum, count) => sum + count, 0),
  });
  return {
    source,
    period: collected.period,
    importId,
    accepted,
    requests: client.requestCount() - requestsBefore,
    rejected,
  };
}

export async function importAreaStatistics(
  options: AreaStatisticsImportOptions,
): Promise<AreaStatisticsImportResult[]> {
  const cities = await listCoveredCities(options.sql, options.citySlugs);
  if (cities.length === 0) {
    throw new WorkerError('no_covered_city', 'No covered city matches the request');
  }
  const clients = new Map<string, PoliteClient>();
  const results: AreaStatisticsImportResult[] = [];
  for (const source of options.sources) {
    results.push(await importSource(options, source, cities, clients));
  }
  return results;
}
