import { WorkerError } from '../../lib/errors.ts';
import type { EducationLevel, Ownership } from './education.osm.ts';

export type RegisterRow = {
  siiir_code: string;
  parent_siiir_code: string | null;
  city_slug: string;
  name: string;
  levels: EducationLevel[];
  ownership: Ownership;
  teaching_languages: string[] | null;
  address: string | null;
  lng: number | null;
  lat: number | null;
  is_excluded: boolean;
  source_date: string;
};

export type SiiirConversion = {
  rows: RegisterRow[];
  sourceDate: string;
  skipped: Record<string, number>;
};

export type SiiirUnitKind =
  | { kind: 'scored'; levels: EducationLevel[] }
  | { kind: 'excluded'; levels: EducationLevel[]; reason: string }
  | { kind: 'skipped'; reason: string };

const COLUMNS = {
  status: 'Statut unitate',
  parentCode: 'Cod SIIIR PJ',
  locality: 'Localitate unitate',
  siruta: 'Cod SIRUTA unitate',
  code: 'Cod SIIIR unitate',
  longName: 'Denumire lunga unitate',
  type: 'Tip unitate',
  ownership: 'Forma proprietate',
  street: 'Strada',
  number: 'Numar',
} as const;

type Column = keyof typeof COLUMNS;

const SCHOOL_UNIT = 'Unitate de învățământ';
const COMMUNITY_KINDERGARTEN = 'Serviciu de educație timpurie complementar (grădiniță comunitară)';

function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function classifySiiirUnit(type: string, longName: string): SiiirUnitKind {
  if (type === COMMUNITY_KINDERGARTEN) return { kind: 'scored', levels: ['kindergarten'] };
  if (type !== SCHOOL_UNIT) return { kind: 'skipped', reason: 'not_a_school' };
  const name = plain(longName);
  if (/\b(postliceal\w*|posticeal\w*|militara|politie|agentilor|agenti)\b/.test(name)) {
    return { kind: 'excluded', levels: ['upper_secondary'], reason: 'post_secondary' };
  }
  if (/\b(special\w*|incluziv\w*|pedagogie curativa)\b/.test(name)) {
    return {
      kind: 'excluded',
      levels: ['primary', 'lower_secondary'],
      reason: 'special_education',
    };
  }
  if (/\bcres\w*\b/.test(name)) return { kind: 'scored', levels: ['nursery'] };
  if (/\bgradin\w*\b/.test(name)) return { kind: 'scored', levels: ['kindergarten'] };
  if (/\b(liceul|colegiul|seminarul|scoala profesionala)\b/.test(name)) {
    return { kind: 'scored', levels: ['upper_secondary'] };
  }
  if (/\bscoala gimnaziala\b/.test(name)) {
    return { kind: 'scored', levels: ['primary', 'lower_secondary'] };
  }
  if (/\bscoala primara\b/.test(name)) return { kind: 'scored', levels: ['primary'] };
  return { kind: 'skipped', reason: 'unknown_level' };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function localityPatterns(locality: string): string[] {
  const name = locality.trim();
  const sector = /^BUCURE[SȘŞ]TI\s+SECTORUL\s+(\d)$/iu.exec(name);
  if (sector) return [`sectorul ${sector[1] ?? ''}`, `sector ${sector[1] ?? ''}`, 'bucuresti'];
  return [plain(name)];
}

function foldCharacters(text: string): string {
  return Array.from(text, (character) => {
    const base = character.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return base.length === 1 ? base : character;
  }).join('');
}

export function registerName(longName: string, locality: string): string {
  const suffixes = localityPatterns(locality).map((pattern) => {
    const words = pattern.split(' ').map(escapeRegExp).join('[^\\p{L}\\p{N}]+');
    return new RegExp(`[\\s,;.\\-–]*(?:mun\\.?\\s*)?${words}[\\s.,]*$`, 'iu');
  });
  let name = longName.replace(/\s+/g, ' ').trim();
  let previous = '';
  while (name !== previous) {
    previous = name;
    for (const suffix of suffixes) {
      const match = suffix.exec(foldCharacters(name));
      if (match && match.index > 0) name = name.slice(0, match.index).trim();
    }
  }
  return name;
}

function headerIndex(rows: readonly string[][]): number {
  const index = rows.findIndex(
    (row) => row.includes(COLUMNS.code) && row.includes(COLUMNS.longName),
  );
  if (index < 0) {
    throw new WorkerError('education_register_invalid', 'The SIIIR file has no header row');
  }
  return index;
}

function columnPositions(header: readonly string[]): Record<Column, number> {
  const missing: string[] = [];
  const positions = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, title]) => {
      const position = header.indexOf(title);
      if (position < 0) missing.push(title);
      return [key, position];
    }),
  ) as Record<Column, number>;
  if (missing.length > 0) {
    throw new WorkerError(
      'education_register_invalid',
      `The SIIIR file lacks the columns: ${missing.join(', ')}`,
    );
  }
  return positions;
}

export function generatedOn(rows: readonly string[][]): string {
  for (const row of rows.slice(0, 5)) {
    for (const cell of row) {
      const match = /Generat la data:\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(cell);
      if (match) return `${match[3] ?? ''}-${match[2] ?? ''}-${match[1] ?? ''}`;
    }
  }
  throw new WorkerError('education_register_invalid', 'The SIIIR file has no generation date');
}

function address(street: string, number: string, locality: string): string | null {
  const line = [street, number].filter((part) => part !== '').join(' ');
  const full = [line, locality].filter((part) => part !== '').join(', ');
  return full === '' ? null : full.slice(0, 500);
}

function citiesBySiruta(cities: Record<string, readonly number[]>): Map<string, string> {
  const bySiruta = new Map<string, string>();
  for (const [slug, codes] of Object.entries(cities)) {
    for (const code of codes) bySiruta.set(String(code), slug);
  }
  return bySiruta;
}

export function convertSiiirRows(
  rows: readonly string[][],
  cities: Record<string, readonly number[]>,
): SiiirConversion {
  const sourceDate = generatedOn(rows);
  const headerAt = headerIndex(rows);
  const position = columnPositions(rows[headerAt] ?? []);
  const bySiruta = citiesBySiruta(cities);
  const skipped: Record<string, number> = {};
  const skip = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };
  const converted: RegisterRow[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(headerAt + 1)) {
    const cell = (column: Column) => (row[position[column]] ?? '').trim();
    const citySlug = bySiruta.get(String(Number(cell('siruta'))));
    if (!citySlug) continue;
    const code = cell('code');
    const longName = cell('longName');
    if (code === '' || longName === '') {
      skip('incomplete_row');
      continue;
    }
    if (seen.has(code)) {
      skip('duplicate_code');
      continue;
    }
    const unit = classifySiiirUnit(cell('type'), longName);
    if (unit.kind === 'skipped') {
      skip(unit.reason);
      continue;
    }
    seen.add(code);
    const parentCode = cell('parentCode');
    converted.push({
      siiir_code: code,
      parent_siiir_code: cell('status') === 'AR' && parentCode !== '' ? parentCode : null,
      city_slug: citySlug,
      name: registerName(longName, cell('locality')).slice(0, 300),
      levels: unit.levels,
      ownership: /privat/i.test(cell('ownership')) ? 'private' : 'public',
      teaching_languages: null,
      address: address(cell('street'), cell('number'), cell('locality')),
      lng: null,
      lat: null,
      is_excluded: unit.kind === 'excluded',
      source_date: sourceDate,
    });
  }

  return { rows: converted, sourceDate, skipped };
}
