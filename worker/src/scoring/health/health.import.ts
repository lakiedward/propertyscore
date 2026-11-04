import { createReadStream } from 'node:fs';
import { extname } from 'node:path';

import { WorkerError } from '../../lib/errors.ts';
import { parseCsvRecords, readCsvObjects } from '../../sources/csv.ts';
import { readXlsxRows } from '../../sources/xlsx.ts';
import type { CnasProviderKind, Point } from './health.sources.ts';

export const CNAS_LIST_COLUMNS = [
  'fisier',
  'tip',
  'data_listei',
  'url_pagina',
  'url_fisier',
  'observatii',
] as const;

export const EMERGENCY_COLUMNS = [
  'oras',
  'nume',
  'nivel',
  'pediatric',
  'adresa',
  'lat',
  'lon',
  'sursa_act',
  'sursa_url',
] as const;

const CNAS_FILE_KINDS: Record<string, CnasProviderKind> = {
  farmacii: 'pharmacy',
  'medici-familie': 'family_doctor',
  ambulatoriu: 'specialist_outpatient',
  spitale: 'hospital',
  dentist: 'dentist',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type CnasListEntry = {
  file: string;
  kind: CnasProviderKind;
  listDate: string;
  sourceRef: string;
};

type CnasProviderRow = { name: string; address: string | null };

export type EmergencyRow = {
  citySlug: string;
  name: string;
  level: 'upu' | 'cpu';
  isPediatric: boolean;
  address: string | null;
  location: Point | null;
  sourceRef: string;
};

export type TableColumns = {
  headerIndex: number;
  name: number;
  address: number | null;
  number: number | null;
  locality: number | null;
};

type LocalityFilter = 'column' | 'address' | 'none';

export type ProviderExtraction = {
  rows: CnasProviderRow[];
  skippedOutsideCity: number;
  skippedDuplicate: number;
  localityFilter: LocalityFilter;
};

const PLACE_ALIASES: Record<string, string> = { tg: 'targu', tirgu: 'targu', mun: '', loc: '' };

const PLACE_NOISE = new Set([
  'municipiul',
  'municipiu',
  'orasul',
  'oras',
  'localitatea',
  'jud',
  '',
]);

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizePlace(text: string): string {
  return normalizeText(text)
    .split(' ')
    .map((token) => PLACE_ALIASES[token] ?? token)
    .filter((token) => !PLACE_NOISE.has(token))
    .join(' ');
}

function containsPhrase(haystack: string, phrase: string): boolean {
  return ` ${haystack} `.includes(` ${phrase} `);
}

const NAME_HEADERS = [
  'denumire furnizor',
  'denumirea furnizorului',
  'denumire farmacie',
  'denumire cabinet',
  'denumire unitate',
  'denumire',
  'denumirea',
  'furnizor',
  'unitate sanitara',
  'nume',
];

const ADDRESS_HEADERS = [
  'adresa punct de lucru',
  'adresa punctului de lucru',
  'adresa punct lucru',
  'adresa',
  'punct de lucru',
  'sediu',
  'strada',
];

const NUMBER_HEADERS = ['nr', 'numar'];

const LOCALITY_HEADERS = ['localitate', 'localitatea', 'oras', 'municipiu'];

const CONTACT_WORDS = ['telefon', 'tel', 'email', 'mail', 'fax', 'web'];

function headerIndex(cells: readonly string[], phrases: readonly string[]): number | null {
  for (const phrase of phrases) {
    const index = cells.findIndex(
      (cell) =>
        containsPhrase(cell, phrase) && !CONTACT_WORDS.some((word) => containsPhrase(cell, word)),
    );
    if (index !== -1) return index;
  }
  return null;
}

export function findTableColumns(rows: readonly (readonly string[])[]): TableColumns | null {
  for (const [index, row] of rows.slice(0, 40).entries()) {
    const cells = row.map(normalizeText);
    const name = headerIndex(cells, NAME_HEADERS);
    if (name === null) continue;
    const others = cells.map((cell, position) => (position === name ? '' : cell));
    const address = headerIndex(others, ADDRESS_HEADERS);
    const locality = headerIndex(others, LOCALITY_HEADERS);
    if (address === null && locality === null) continue;
    const number =
      address !== null && containsPhrase(cells[address] ?? '', 'strada')
        ? cells.findIndex((cell) => NUMBER_HEADERS.includes(cell))
        : -1;
    return {
      headerIndex: index,
      name,
      address,
      number: number === -1 ? null : number,
      locality: locality === address ? null : locality,
    };
  }
  return null;
}

function cell(row: readonly string[], index: number | null): string {
  if (index === null) return '';
  return (row[index] ?? '').replace(/\s+/g, ' ').trim();
}

function rowAddress(row: readonly string[], columns: TableColumns): string | null {
  const street = cell(row, columns.address);
  const number = cell(row, columns.number);
  const address = number === '' ? street : `${street} nr. ${number}`;
  return address === '' ? null : address.slice(0, 500);
}

export function extractCnasProviders(
  rows: readonly (readonly string[])[],
  columns: TableColumns,
  cityName: string,
  seen = new Set<string>(),
): ProviderExtraction {
  const city = normalizePlace(cityName);
  const body = rows
    .slice(columns.headerIndex + 1)
    .map((row) => ({
      name: cell(row, columns.name).slice(0, 300),
      address: rowAddress(row, columns),
      locality: normalizePlace(cell(row, columns.locality)),
    }))
    .filter((row) => row.name !== '' && !/^\d+$/.test(row.name));

  const mentionsCity = (address: string | null) =>
    address !== null && containsPhrase(normalizePlace(address), city);
  let localityFilter: LocalityFilter = 'none';
  if (columns.locality !== null) localityFilter = 'column';
  else if (body.some((row) => mentionsCity(row.address))) localityFilter = 'address';

  const result: ProviderExtraction = {
    rows: [],
    skippedOutsideCity: 0,
    skippedDuplicate: 0,
    localityFilter,
  };
  for (const row of body) {
    const isInCity =
      localityFilter === 'column'
        ? row.locality === city
        : localityFilter === 'address'
          ? mentionsCity(row.address)
          : true;
    if (!isInCity) {
      result.skippedOutsideCity += 1;
      continue;
    }
    const key = `${normalizeText(row.name)}|${normalizeText(row.address ?? '')}`;
    if (seen.has(key)) {
      result.skippedDuplicate += 1;
      continue;
    }
    seen.add(key);
    result.rows.push({ name: row.name, address: row.address });
  }
  return result;
}

export function cnasListEntries(
  rows: readonly Record<(typeof CNAS_LIST_COLUMNS)[number], string>[],
): {
  entries: CnasListEntry[];
  skipped: number;
} {
  const entries: CnasListEntry[] = [];
  let skipped = 0;
  for (const row of rows) {
    const kind = CNAS_FILE_KINDS[row.tip];
    if (row.fisier === '' || kind === undefined || !ISO_DATE.test(row.data_listei)) {
      skipped += 1;
      continue;
    }
    const sourceRef = (row.url_fisier === '' ? row.fisier : row.url_fisier).slice(0, 500);
    entries.push({ file: row.fisier, kind, listDate: row.data_listei, sourceRef });
  }
  return { entries, skipped };
}

export type CnasListGroup = {
  kind: CnasProviderKind;
  listDate: string;
  files: string[];
  sourceRef: string;
};

export function groupCnasLists(entries: readonly CnasListEntry[]): CnasListGroup[] {
  const groups = new Map<string, CnasListGroup & { refs: string[] }>();
  for (const entry of entries) {
    const key = `${entry.kind}|${entry.listDate}`;
    const group = groups.get(key) ?? {
      kind: entry.kind,
      listDate: entry.listDate,
      files: [],
      refs: [],
      sourceRef: '',
    };
    group.files.push(entry.file);
    group.refs.push(entry.sourceRef);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ refs, ...group }) => ({
    ...group,
    sourceRef: refs.join(' | ').slice(0, 500),
  }));
}

function parseCoordinate(value: string, min: number, max: number): number | null {
  if (value === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function emergencyRow(
  row: Record<(typeof EMERGENCY_COLUMNS)[number], string>,
): EmergencyRow | null {
  const level = row.nivel.toLowerCase();
  const name = row.nume.replace(/\s+/g, ' ').trim();
  if (row.oras === '' || name === '' || (level !== 'upu' && level !== 'cpu')) return null;
  const lat = parseCoordinate(row.lat, 43, 49);
  const lng = parseCoordinate(row.lon, 20, 30);
  const sourceRef = [row.sursa_act, row.sursa_url].filter((part) => part !== '').join(' · ');
  if (sourceRef === '') return null;
  return {
    citySlug: row.oras,
    name: name.slice(0, 300),
    level,
    isPediatric: normalizeText(row.pediatric) === 'da',
    address: row.adresa === '' ? null : row.adresa.slice(0, 500),
    location: lat === null || lng === null ? null : { lng, lat },
    sourceRef: sourceRef.slice(0, 500),
  };
}

export async function readCsvFile<Column extends string>(
  path: string,
  columns: readonly Column[],
): Promise<Record<Column, string>[]> {
  const rows: Record<Column, string>[] = [];
  for await (const row of readCsvObjects(createReadStream(path, 'utf8'), columns, path)) {
    rows.push(row);
  }
  return rows;
}

export async function readTableFile(path: string): Promise<string[][]> {
  const extension = extname(path).toLowerCase();
  if (extension === '.xlsx') return readXlsxRows(path);
  if (extension === '.csv') {
    const rows: string[][] = [];
    for await (const record of parseCsvRecords(createReadStream(path, 'utf8'))) rows.push(record);
    return rows;
  }
  throw new WorkerError(
    'unsupported_source_format',
    `${extension || 'no extension'} files are not read yet`,
  );
}
