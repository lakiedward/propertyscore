import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';
import { readCsvObjects } from '../../sources/csv.ts';
import { htmlTableRows, htmlText } from '../../sources/html.ts';
import {
  parsePositiveNumber,
  parseRomanianNumber,
  parseRoomsBand,
  placeKey,
  type AreaStatisticRow,
  type CoveredCity,
} from './area-statistics.ts';

export const APARTAMENTE_ORG_ORIGIN = 'https://apartamente.org';

export const APARTAMENTE_ORG_CONSENTED_CITIES: readonly string[] = [
  'timisoara',
  'bucuresti',
  'cluj-napoca',
  'iasi',
  'constanta',
  'craiova',
  'sibiu',
  'oradea',
  'targu-mures',
];

const RESERVED_ZONE_SLUG = '\\d+-camere|sub-pretul-zonei';

export const APARTAMENTE_ORG_PAGE_PATHS: readonly RegExp[] = [
  new RegExp(
    `^/apartamente-de-(vanzare|inchiriat)/(${APARTAMENTE_ORG_CONSENTED_CITIES.join('|')})` +
      `(/(?!(${RESERVED_ZONE_SLUG})$)[a-z0-9]+(-[a-z0-9]+)*)?$`,
  ),
];

export const APARTAMENTE_ORG_INDEX_PATHS: readonly RegExp[] = [
  /^\/raport-piata\/\d{4}-\d{2}\.csv$/,
];

type Transaction = 'sale' | 'rent';

const TRANSACTION_PATHS: Record<Transaction, string> = {
  sale: 'apartamente-de-vanzare',
  rent: 'apartamente-de-inchiriat',
};

const RESERVED_ZONE_SLUGS = new RegExp(`^(${RESERVED_ZONE_SLUG})$`);

const BUCHAREST_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bucharest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type StatisticsPageZone = { slug: string; name: string };

export type StatisticsPageTarget = {
  city: string;
  transaction: Transaction;
  zone: StatisticsPageZone | null;
};

export function statisticsPagePath(target: StatisticsPageTarget): string {
  const cityPath = `/${TRANSACTION_PATHS[target.transaction]}/${target.city}`;
  return target.zone ? `${cityPath}/${target.zone.slug}` : cityPath;
}

const datasetSchema = z.object({
  '@type': z.literal('Dataset'),
  url: z.string(),
  dateModified: z.iso.datetime(),
  variableMeasured: z.array(z.object({ name: z.string(), value: z.number() })),
});

type Dataset = z.infer<typeof datasetSchema>;

function readDataset(html: string): Dataset | null {
  const scripts = html.matchAll(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    let value: unknown;
    try {
      value = JSON.parse(script[1] ?? '');
    } catch {
      continue;
    }
    const parsed = datasetSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  }
  return null;
}

function measured(dataset: Dataset, name: string): number | null {
  const value = dataset.variableMeasured.find((variable) => variable.name === name)?.value;
  return value !== undefined && value > 0 ? value : null;
}

function readTypicalInterval(html: string): { low: number; high: number } | null {
  const match = /<b>([^<]+)<\/b>\s*<span>\s*intervalul obișnuit/i.exec(html);
  if (!match) return null;
  const [low, high] = htmlText(match[1] ?? '')
    .split(/[–—]/)
    .map(parseRomanianNumber);
  if (low == null || high == null || low <= 0 || high <= 0) return null;
  return { low, high };
}

const ROOMS_TABLE_HEADER = [
  'Camere',
  'Anunțuri',
  'Preț median',
  '€/mp p25',
  '€/mp median',
  '€/mp p75',
];

function positive(text: string | undefined): number | null {
  const value = parseRomanianNumber(text ?? '');
  return value !== null && value > 0 ? value : null;
}

function readRoomsRows(html: string, base: AreaStatisticRow): AreaStatisticRow[] {
  const table = htmlTableRows(html);
  const headerIndex = table.findIndex(
    (row) =>
      row.length === ROOMS_TABLE_HEADER.length &&
      row.every((cell, index) => cell === ROOMS_TABLE_HEADER[index]),
  );
  if (headerIndex < 0) return [];
  const rows: AreaStatisticRow[] = [];
  for (const cells of table.slice(headerIndex + 1)) {
    const rooms =
      cells.length === ROOMS_TABLE_HEADER.length ? parseRoomsBand(cells[0] ?? '') : null;
    if (!rooms) break;
    const p25 = positive(cells[3]);
    const p75 = positive(cells[5]);
    const hasInterval = p25 !== null && p75 !== null;
    rows.push({
      ...base,
      rooms_min: rooms.min,
      rooms_max: rooms.max,
      listing_count: parseRomanianNumber(cells[1] ?? ''),
      apartment_count: null,
      median_eur: positive(cells[2]),
      p25_eur: null,
      p75_eur: null,
      median_eur_m2: positive(cells[4]),
      p25_eur_m2: hasInterval ? p25 : null,
      p75_eur_m2: hasInterval ? p75 : null,
    });
  }
  return rows;
}

function readZones(html: string, target: StatisticsPageTarget): StatisticsPageZone[] {
  const section = /<h2\b[^>]*id="zone"[^>]*>[\s\S]*?(?=<h2\b|$)/i.exec(html)?.[0] ?? '';
  const cityPath = statisticsPagePath({ ...target, zone: null });
  const zones = new Map<string, StatisticsPageZone>();
  for (const link of section.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = link[1] ?? '';
    if (!href.startsWith(`${cityPath}/`)) continue;
    const slug = href.slice(cityPath.length + 1);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || RESERVED_ZONE_SLUGS.test(slug)) continue;
    const name = htmlText((link[2] ?? '').replace(/<span\b[\s\S]*?<\/span>/gi, ''));
    if (name !== '' && !zones.has(slug)) zones.set(slug, { slug, name });
  }
  return [...zones.values()];
}

export type StatisticsPage = { rows: AreaStatisticRow[]; zones: StatisticsPageZone[] };

export function parseStatisticsPage(
  html: string,
  target: StatisticsPageTarget,
): StatisticsPage | null {
  const url = `${APARTAMENTE_ORG_ORIGIN}${statisticsPagePath(target)}`;
  const dataset = readDataset(html);
  if (dataset?.url !== url) return null;
  const interval = readTypicalInterval(html);
  const whole: AreaStatisticRow = {
    city: target.city,
    zone_slug: target.zone?.slug ?? null,
    zone_name: target.zone?.name ?? null,
    is_nearby_locality: false,
    transaction: target.transaction,
    property_type: 'apartment',
    rooms_min: null,
    rooms_max: null,
    observed_on: BUCHAREST_DAY.format(new Date(dataset.dateModified)),
    listing_count: measured(dataset, 'anunțuri'),
    apartment_count: measured(dataset, 'apartamente distincte'),
    median_eur: measured(dataset, 'preț median'),
    p25_eur: interval?.low ?? null,
    p75_eur: interval?.high ?? null,
    median_eur_m2: measured(dataset, 'preț median pe metru pătrat'),
    p25_eur_m2: null,
    p75_eur_m2: null,
    median_area_m2: null,
    source_url: url,
  };
  return {
    rows: [whole, ...readRoomsRows(html, whole)],
    zones: target.zone ? [] : readZones(html, target),
  };
}

export function indexCsvPath(period: string): string {
  return `/raport-piata/${period.slice(0, 7)}.csv`;
}

const INDEX_CSV_COLUMNS = [
  'tabel',
  'tranzactie',
  'oras',
  'zona',
  'apartamente',
  'pret_median_eur',
  'eur_mp_median',
] as const;

const INDEX_TRANSACTIONS: Record<string, Transaction> = { vanzare: 'sale', inchiriere: 'rent' };

export type IndexCsvResult = { rows: AreaStatisticRow[]; skipped: number };

export async function parseIndexCsv(
  text: string,
  period: string,
  cities: readonly CoveredCity[],
): Promise<IndexCsvResult> {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const observedOn = lines
    .filter((line) => line.startsWith('#'))
    .map((line) => /anunțuri active la (\d{4}-\d{2}-\d{2})/.exec(line)?.[1])
    .find((date) => date !== undefined);
  const data = lines.filter((line) => !line.startsWith('#')).join('\n');
  const slugByName = new Map(cities.map((city) => [placeKey(city.name), city.slug]));
  const rows: AreaStatisticRow[] = [];
  let skipped = 0;
  for await (const raw of readCsvObjects([data], INDEX_CSV_COLUMNS, 'apartamente.org index')) {
    if (raw.tabel !== 'orase') continue;
    const city = slugByName.get(placeKey(raw.oras));
    const transaction = INDEX_TRANSACTIONS[placeKey(raw.tranzactie)];
    if (city === undefined) continue;
    if (transaction === undefined || raw.zona !== '') {
      skipped += 1;
      continue;
    }
    rows.push({
      city,
      zone_slug: null,
      zone_name: null,
      is_nearby_locality: false,
      transaction,
      property_type: 'apartment',
      rooms_min: null,
      rooms_max: null,
      observed_on: observedOn ?? null,
      listing_count: null,
      apartment_count: parsePositiveNumber(raw.apartamente),
      median_eur: parsePositiveNumber(raw.pret_median_eur),
      p25_eur: null,
      p75_eur: null,
      median_eur_m2: parsePositiveNumber(raw.eur_mp_median),
      p25_eur_m2: null,
      p75_eur_m2: null,
      median_area_m2: null,
      source_url: `${APARTAMENTE_ORG_ORIGIN}${indexCsvPath(period)}`,
    });
  }
  if (rows.length === 0 && skipped === 0) {
    throw new WorkerError('source_layout_changed', 'The index file has no row for a covered city');
  }
  return { rows, skipped };
}
