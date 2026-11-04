import { createReadStream } from 'node:fs';
import { extname } from 'node:path';

import { WorkerError } from '../../lib/errors.ts';
import { parseCsvRecords, readCsvObjects } from '../../sources/csv.ts';
import { readHtmlTableRows } from '../../sources/html.ts';
import { layoutTableRows, PDF_BLANK_SHARES, readPdfText } from '../../sources/pdf.ts';
import { readXlsRows } from '../../sources/xls.ts';
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

const CAPITAL = 'bucuresti';

const COUNTY_MENTION = /\bjud(etul|et)? [a-z]+\b/g;

const SECTOR = /^(bucuresti )?sector(ul)? [1-6]$/;

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
  'unitatea sanitara',
  'unitatea spitaliceasca',
  'unitate spitaliceasca',
  'cdenfurn',
  'societatea',
  'societate',
  'nume',
];

const ADDRESS_HEADERS = [
  'adresa punct de lucru',
  'adresa punctului de lucru',
  'adresa punct lucru',
  'adresa',
  'punct de lucru',
  'strada',
  'str',
  'sediul',
  'sediu',
  'urban',
];

const STREET_HEADERS = ['strada', 'str'];

const NOT_LOCALITY_WORDS = ['str', 'completa'];

const STREET_WORDS = ['punct', 'strada', 'str', 'sediu', 'sediul', 'completa'];

function isLocalityOnly(cell: string): boolean {
  return (
    LOCALITY_HEADERS.some((word) => containsPhrase(cell, word)) &&
    !STREET_WORDS.some((word) => containsPhrase(cell, word))
  );
}

function isNumberHeader(cell: string): boolean {
  return NUMBER_HEADERS.some((word) => cell === word || cell.endsWith(` ${word}`));
}

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
    const address = headerIndex(
      others.map((cell) => (isLocalityOnly(cell) ? '' : cell)),
      ADDRESS_HEADERS,
    );
    const localityCandidates = others.map((cell, position) =>
      position === address || NOT_LOCALITY_WORDS.some((word) => containsPhrase(cell, word))
        ? ''
        : cell,
    );
    const locality = headerIndex(localityCandidates, LOCALITY_HEADERS);
    if (address === null && locality === null) continue;
    const addressHeader = address === null ? '' : (cells[address] ?? '');
    const number = STREET_HEADERS.some((word) => containsPhrase(addressHeader, word))
      ? cells.findIndex((cell, position) => position !== address && isNumberHeader(cell))
      : -1;
    return {
      headerIndex: index,
      name,
      address,
      number: number === -1 ? null : number,
      locality,
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

function isSectionHeader(row: readonly string[]): boolean {
  return !row.some((value) => /\d/.test(value));
}

export function extractCnasProviders(
  rows: readonly (readonly string[])[],
  columns: TableColumns,
  cityName: string,
  seen = new Set<string>(),
): ProviderExtraction {
  const city = normalizePlace(cityName);
  const filterOf = (section: TableColumns): LocalityFilter => {
    if (section.locality !== null) return 'column';
    return city === CAPITAL ? 'none' : 'address';
  };
  let section = columns;
  let previousName = '';
  const body: { name: string; address: string | null; locality: string; filter: LocalityFilter }[] =
    [];
  for (const row of rows.slice(columns.headerIndex + 1)) {
    const header = isSectionHeader(row) ? findTableColumns([row]) : null;
    if (header !== null) {
      section = header;
      previousName = '';
      continue;
    }
    const address = rowAddress(row, section);
    const ownName = cell(row, section.name).slice(0, 300);
    const name = ownName === '' && address !== null ? previousName : ownName;
    if (ownName !== '') previousName = ownName;
    if (name === '' || /^\d+$/.test(name)) continue;
    body.push({
      name,
      address,
      locality: normalizePlace(cell(row, section.locality)),
      filter: filterOf(section),
    });
  }

  const mentionsCity = (address: string | null) =>
    address !== null &&
    containsPhrase(normalizePlace(normalizeText(address).replace(COUNTY_MENTION, ' ')), city);
  const isCityLocality = (locality: string, address: string | null) =>
    locality === ''
      ? mentionsCity(address)
      : containsPhrase(locality, city) || (city === CAPITAL && SECTOR.test(locality));
  const localityFilter = filterOf(columns);

  const result: ProviderExtraction = {
    rows: [],
    skippedOutsideCity: 0,
    skippedDuplicate: 0,
    localityFilter,
  };
  for (const row of body) {
    const isInCity =
      row.filter === 'column'
        ? isCityLocality(row.locality, row.address)
        : row.filter === 'address'
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

export type PlacedEmergencyRow = EmergencyRow & { location: Point };

export async function placeEmergencyRows(
  rows: readonly EmergencyRow[],
  geocode: (address: string) => Promise<Point | null>,
): Promise<{ placed: PlacedEmergencyRow[]; unplaced: string[] }> {
  const placed: PlacedEmergencyRow[] = [];
  const unplaced: string[] = [];
  for (const row of rows) {
    const location = row.location ?? (row.address === null ? null : await geocode(row.address));
    if (location === null) unplaced.push(row.name);
    else placed.push({ ...row, location });
  }
  return { placed, unplaced };
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

const MAX_XLSX_SHEETS = 5;

type ProviderTable = { rows: string[][]; columns: TableColumns };

function filledProviderRows({ rows, columns }: ProviderTable): number {
  const { address } = columns;
  if (address === null) return 0;
  return rows
    .slice(columns.headerIndex + 1)
    .filter((row) => (row[columns.name] ?? '').trim() !== '' && (row[address] ?? '').trim() !== '')
    .length;
}

function withoutRowNumbers({ rows, columns }: ProviderTable): ProviderTable {
  return {
    columns,
    rows: rows.map((row, index) =>
      index <= columns.headerIndex
        ? row
        : row.map((cell, column) =>
            column === columns.name ? cell.replace(/^\d{1,5}\s+/, '') : cell,
          ),
    ),
  };
}

async function readPdfProviderTable(path: string): Promise<ProviderTable | null> {
  const text = await readPdfText(path);
  let best: ProviderTable | null = null;
  for (const share of PDF_BLANK_SHARES) {
    const rows = layoutTableRows(text, share);
    const columns = findTableColumns(rows);
    if (columns === null) continue;
    const table = { rows, columns };
    if (best === null || filledProviderRows(table) > filledProviderRows(best)) best = table;
  }
  return best === null ? null : withoutRowNumbers(best);
}

export async function readProviderTable(path: string): Promise<ProviderTable | null> {
  const extension = extname(path).toLowerCase();
  if (extension === '.pdf') return readPdfProviderTable(path);
  const sheets = extension === '.xlsx' ? MAX_XLSX_SHEETS : 1;
  for (let sheet = 1; sheet <= sheets; sheet += 1) {
    let rows: string[][];
    try {
      rows = await readTableFile(path, sheet);
    } catch (error) {
      if (sheet > 1) return null;
      throw error;
    }
    const columns = findTableColumns(rows);
    if (columns !== null) return { rows, columns };
  }
  return null;
}

async function readTableFile(path: string, sheet = 1): Promise<string[][]> {
  const extension = extname(path).toLowerCase();
  if (extension === '.xlsx') return readXlsxRows(path, sheet);
  if (extension === '.xls') return readXlsRows(path);
  if (extension === '.html' || extension === '.htm') return readHtmlTableRows(path);
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
