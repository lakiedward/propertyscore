import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

import { readCsvObjects } from '../../sources/csv.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import type { Sql } from '../../db/sql.ts';
import {
  beginMarketImport,
  completeMarketImport,
  discardMarketImport,
  insertMarketListings,
} from './investment.db.ts';
import type { InvestmentParams } from './investment.params.ts';

export const MARKET_CSV_COLUMNS = [
  'source_listing_id',
  'transaction',
  'property_type',
  'latitude',
  'longitude',
  'area_m2',
  'rooms',
  'price',
  'currency',
  'first_seen_on',
  'last_seen_on',
  'construction_year',
  'floor',
] as const;

type MarketCsvRow = Record<(typeof MARKET_CSV_COLUMNS)[number], string>;

export type MarketListingRow = {
  source_listing_id: string;
  transaction: 'sale' | 'rent';
  property_type: 'apartment' | 'house';
  longitude: number;
  latitude: number;
  area_m2: number;
  rooms: number | null;
  price: number;
  currency: 'RON' | 'EUR';
  price_eur: number;
  first_seen_on: string;
  last_seen_on: string;
  construction_year: number | null;
  floor: number | null;
};

type RejectionCode =
  | 'invalid_row'
  | 'implausible_area'
  | 'implausible_rooms'
  | 'implausible_price'
  | 'duplicate_id'
  | 'outside_coverage';

type NormalizedRow = { row: MarketListingRow } | { rejected: RejectionCode };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TRANSACTIONS = new Set(['sale', 'rent']);
const PROPERTY_TYPES = new Set(['apartment', 'house']);
const CURRENCIES = new Set(['RON', 'EUR']);

function parseNumber(value: string): number | null {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
  const parsed = parseNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

function isInside(value: number, [low, high]: readonly [number, number]): boolean {
  return value >= low && value <= high;
}

export function normalizeMarketRow(
  raw: MarketCsvRow,
  plausible: InvestmentParams['plausible'],
  eurRonRate: number | null,
): NormalizedRow {
  const latitude = parseNumber(raw.latitude);
  const longitude = parseNumber(raw.longitude);
  const area = parseNumber(raw.area_m2);
  const price = parseNumber(raw.price);
  const transaction = raw.transaction.toLowerCase();
  const propertyType = raw.property_type.toLowerCase();
  const currency = raw.currency.toUpperCase();
  const rooms = raw.rooms === '' ? null : parseInteger(raw.rooms);
  const constructionYear =
    raw.construction_year === '' ? null : parseInteger(raw.construction_year);
  const floor = raw.floor === '' ? null : parseInteger(raw.floor);

  if (
    raw.source_listing_id === '' ||
    raw.source_listing_id.length > 200 ||
    !TRANSACTIONS.has(transaction) ||
    !PROPERTY_TYPES.has(propertyType) ||
    !CURRENCIES.has(currency) ||
    latitude === null ||
    longitude === null ||
    !isInside(latitude, [-90, 90]) ||
    !isInside(longitude, [-180, 180]) ||
    area === null ||
    price === null ||
    price <= 0 ||
    !isIsoDate(raw.first_seen_on) ||
    !isIsoDate(raw.last_seen_on) ||
    raw.last_seen_on < raw.first_seen_on ||
    (raw.rooms !== '' && rooms === null) ||
    (constructionYear !== null && !isInside(constructionYear, [1800, 2100])) ||
    (raw.construction_year !== '' && constructionYear === null) ||
    (floor !== null && !isInside(floor, [-2, 60])) ||
    (raw.floor !== '' && floor === null)
  ) {
    return { rejected: 'invalid_row' };
  }
  if (!isInside(area, plausible.area_m2)) return { rejected: 'implausible_area' };
  if (rooms !== null && !isInside(rooms, plausible.rooms)) return { rejected: 'implausible_rooms' };

  if (currency === 'RON' && eurRonRate === null) {
    throw new WorkerError('market_rate_required', 'RON prices need --eur-ron <rate>');
  }
  const priceEur = currency === 'RON' ? price / (eurRonRate ?? 1) : price;
  const priceRange = transaction === 'sale' ? plausible.sale_eur_m2 : plausible.rent_eur_m2;
  if (!isInside(priceEur / area, priceRange)) return { rejected: 'implausible_price' };

  return {
    row: {
      source_listing_id: raw.source_listing_id,
      transaction: transaction === 'sale' ? 'sale' : 'rent',
      property_type: propertyType === 'apartment' ? 'apartment' : 'house',
      longitude,
      latitude,
      area_m2: Math.round(area * 10) / 10,
      rooms,
      price: Math.round(price * 100) / 100,
      currency: currency === 'RON' ? 'RON' : 'EUR',
      price_eur: Math.round(priceEur * 100) / 100,
      first_seen_on: raw.first_seen_on,
      last_seen_on: raw.last_seen_on,
      construction_year: constructionYear,
      floor,
    },
  };
}

export async function fileSha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export type MarketImportOptions = {
  sql: Sql;
  source: string;
  period: string;
  filePath: string;
  eurRonRate: number | null;
  params: InvestmentParams;
  logger: Logger;
};

export type MarketImportResult = {
  importId: string;
  accepted: number;
  rejected: Partial<Record<RejectionCode, number>>;
};

const BATCH_SIZE = 1000;

export async function importMarketListings(
  options: MarketImportOptions,
): Promise<MarketImportResult> {
  const { sql, params } = options;
  const sha256 = await fileSha256(options.filePath);
  const importId = await beginMarketImport(sql, {
    source: options.source,
    period: options.period,
    sha256,
    eurRonRate: options.eurRonRate,
    content: 'listings',
  });

  const rejected: Partial<Record<RejectionCode, number>> = {};
  const reject = (code: RejectionCode, count = 1): void => {
    rejected[code] = (rejected[code] ?? 0) + count;
  };
  const seenIds = new Set<string>();
  let accepted = 0;
  let batch: MarketListingRow[] = [];

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const inserted = await insertMarketListings(sql, importId, params.city_buffer_m, batch);
    accepted += inserted;
    if (inserted < batch.length) reject('outside_coverage', batch.length - inserted);
    batch = [];
  };

  try {
    const rows = readCsvObjects(
      createReadStream(options.filePath, { encoding: 'utf8' }),
      MARKET_CSV_COLUMNS,
      `market listings ${options.source}`,
    );
    for await (const raw of rows) {
      const normalized = normalizeMarketRow(raw, params.plausible, options.eurRonRate);
      if ('rejected' in normalized) {
        reject(normalized.rejected);
        continue;
      }
      if (seenIds.has(normalized.row.source_listing_id)) {
        reject('duplicate_id');
        continue;
      }
      seenIds.add(normalized.row.source_listing_id);
      batch.push(normalized.row);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();
  } catch (error) {
    await discardMarketImport(sql, importId);
    throw error;
  }

  await completeMarketImport(sql, importId, accepted, rejected);
  options.logger.info('market listings imported', {
    import_id: importId,
    source: options.source,
    period: options.period,
    accepted,
    rejected: Object.values(rejected).reduce((sum, count) => sum + count, 0),
  });
  return { importId, accepted, rejected };
}
