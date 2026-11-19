import { createReadStream } from 'node:fs';

import type { Sql } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { readCsvObjects } from '../../sources/csv.ts';
import {
  beginMarketImport,
  completeMarketImport,
  discardMarketImport,
  insertCityAverages,
} from './investment.db.ts';
import type { InvestmentParams } from './investment.params.ts';
import { fileSha256 } from './market-import.ts';

export const CITY_AVERAGE_CSV_COLUMNS = [
  'city',
  'period',
  'transaction',
  'property_type',
  'rooms',
  'price_m2',
  'price_month',
  'currency',
  'source_url',
] as const;

type CityAverageCsvRow = Record<(typeof CITY_AVERAGE_CSV_COLUMNS)[number], string>;

export type CityAverageRow = {
  city: string;
  period: string;
  transaction: 'sale' | 'rent';
  property_type: 'apartment' | 'house';
  rooms_min: number | null;
  rooms_max: number | null;
  price_m2: number | null;
  price_month: number | null;
  currency: 'RON' | 'EUR';
  eur_m2: number | null;
  eur_month: number | null;
  source_url: string | null;
};

type RejectionCode = 'invalid_row' | 'implausible_price' | 'duplicate_row' | 'unknown_city';

type NormalizedRow = { row: CityAverageRow } | { rejected: RejectionCode };

const CITY_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const ROOMS = /^(\d{1,2})(\+?)$/;
const SOURCE_URL = /^https:\/\/\S+$/;
const SOURCE_URL_MAX_LENGTH = 500;

function parsePrice(value: string): number | null | undefined {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseRooms(
  value: string,
  plausible: readonly [number, number],
): { min: number | null; max: number | null } | null {
  if (value === '') return { min: null, max: null };
  const match = ROOMS.exec(value);
  if (!match) return null;
  const rooms = Number(match[1]);
  if (rooms < plausible[0] || rooms > plausible[1]) return null;
  return { min: rooms, max: match[2] === '+' ? null : rooms };
}

function isInside(value: number, [low, high]: readonly [number, number]): boolean {
  return value >= low && value <= high;
}

function toEur(
  price: number | null,
  currency: 'RON' | 'EUR',
  eurRonRate: number | null,
): number | null {
  if (price === null) return null;
  const eur = currency === 'RON' ? price / (eurRonRate ?? 1) : price;
  return Math.round(eur * 100) / 100;
}

export function normalizeCityAverageRow(
  raw: CityAverageCsvRow,
  plausible: InvestmentParams['plausible'],
  eurRonRate: number | null,
): NormalizedRow {
  const transaction = raw.transaction.toLowerCase();
  const propertyType = raw.property_type.toLowerCase();
  const currency = raw.currency.toUpperCase();
  const priceM2 = parsePrice(raw.price_m2);
  const priceMonth = parsePrice(raw.price_month);
  const rooms = parseRooms(raw.rooms, plausible.rooms);
  const sourceUrl = raw.source_url === '' ? null : raw.source_url;

  if (
    !CITY_SLUG.test(raw.city) ||
    !PERIOD.test(raw.period) ||
    (transaction !== 'sale' && transaction !== 'rent') ||
    (propertyType !== 'apartment' && propertyType !== 'house') ||
    (currency !== 'RON' && currency !== 'EUR') ||
    rooms === null ||
    priceM2 === undefined ||
    priceMonth === undefined ||
    (priceM2 === null && priceMonth === null) ||
    (transaction === 'sale' && (priceM2 === null || priceMonth !== null)) ||
    (sourceUrl !== null &&
      (!SOURCE_URL.test(sourceUrl) || sourceUrl.length > SOURCE_URL_MAX_LENGTH))
  ) {
    return { rejected: 'invalid_row' };
  }

  if (currency === 'RON' && eurRonRate === null) {
    throw new WorkerError('market_rate_required', 'RON prices need --eur-ron <rate>');
  }
  const eurM2 = toEur(priceM2, currency, eurRonRate);
  const eurMonth = toEur(priceMonth, currency, eurRonRate);
  const perM2Range = transaction === 'sale' ? plausible.sale_eur_m2 : plausible.rent_eur_m2;
  const monthRange: [number, number] = [
    plausible.rent_eur_m2[0] * plausible.area_m2[0],
    plausible.rent_eur_m2[1] * plausible.area_m2[1],
  ];
  if (
    (eurM2 !== null && !isInside(eurM2, perM2Range)) ||
    (eurMonth !== null && !isInside(eurMonth, monthRange))
  ) {
    return { rejected: 'implausible_price' };
  }

  return {
    row: {
      city: raw.city,
      period: `${raw.period}-01`,
      transaction,
      property_type: propertyType,
      rooms_min: rooms.min,
      rooms_max: rooms.max,
      price_m2: priceM2,
      price_month: priceMonth,
      currency,
      eur_m2: eurM2,
      eur_month: eurMonth,
      source_url: sourceUrl,
    },
  };
}

function rowKey(row: CityAverageRow): string {
  return [
    row.city,
    row.period,
    row.transaction,
    row.property_type,
    String(row.rooms_min),
    String(row.rooms_max),
  ].join('|');
}

export type CityAveragesImportOptions = {
  sql: Sql;
  source: string;
  filePath: string;
  eurRonRate: number | null;
  params: InvestmentParams;
  logger: Logger;
};

export type CityAveragesImportResult = {
  importId: string;
  period: string;
  accepted: number;
  rejected: Partial<Record<RejectionCode, number>>;
};

async function readCityAverageRows(
  options: CityAveragesImportOptions,
  reject: (code: RejectionCode) => void,
): Promise<CityAverageRow[]> {
  const rows = new Map<string, CityAverageRow>();
  const records = readCsvObjects(
    createReadStream(options.filePath, { encoding: 'utf8' }),
    CITY_AVERAGE_CSV_COLUMNS,
    `city averages ${options.source}`,
  );
  for await (const raw of records) {
    const normalized = normalizeCityAverageRow(raw, options.params.plausible, options.eurRonRate);
    if ('rejected' in normalized) {
      reject(normalized.rejected);
      continue;
    }
    const key = rowKey(normalized.row);
    if (rows.has(key)) {
      reject('duplicate_row');
      continue;
    }
    rows.set(key, normalized.row);
  }
  return [...rows.values()];
}

export async function importCityAverages(
  options: CityAveragesImportOptions,
): Promise<CityAveragesImportResult> {
  const { sql } = options;
  const rejected: Partial<Record<RejectionCode, number>> = {};
  const reject = (code: RejectionCode, count = 1): void => {
    rejected[code] = (rejected[code] ?? 0) + count;
  };
  const rows = await readCityAverageRows(options, reject);
  const period = rows
    .map((row) => row.period)
    .sort()
    .at(-1);
  if (period === undefined) {
    throw new WorkerError('city_averages_empty', 'The file has no valid city average');
  }

  const importId = await beginMarketImport(sql, {
    source: options.source,
    period,
    sha256: await fileSha256(options.filePath),
    eurRonRate: options.eurRonRate,
    content: 'city_averages',
  });
  let accepted = 0;
  try {
    accepted = await insertCityAverages(sql, importId, rows);
  } catch (error) {
    await discardMarketImport(sql, importId);
    throw error;
  }
  if (accepted < rows.length) reject('unknown_city', rows.length - accepted);

  await completeMarketImport(sql, importId, accepted, rejected);
  options.logger.info('city averages imported', {
    import_id: importId,
    source: options.source,
    period,
    accepted,
    rejected: Object.values(rejected).reduce((sum, count) => sum + count, 0),
  });
  return { importId, period, accepted, rejected };
}
