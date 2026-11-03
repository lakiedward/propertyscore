const STREET_TYPES = new Set([
  'str',
  'strada',
  'stradela',
  'bd',
  'bdul',
  'b',
  'dul',
  'blvd',
  'bulevard',
  'bulevardul',
  'calea',
  'cal',
  'aleea',
  'al',
  'piata',
  'pta',
  'p',
  'ta',
  'piateta',
  'splaiul',
  'spl',
  'soseaua',
  'sos',
  'intrarea',
  'intr',
  'int',
  'drumul',
  'pasajul',
  'fundatura',
  'fundac',
  'ulita',
  'prelungirea',
  'prel',
  'cartierul',
  'cart',
  'pasaj',
  'pietonala',
]);

const TITLE_WORDS: Record<string, string> = {
  gen: 'general',
  gral: 'general',
  dr: 'doctor',
  prof: 'profesor',
  sf: 'sfantul',
  cpt: 'capitan',
  lt: 'locotenent',
  mr: 'maior',
  col: 'colonel',
  av: 'aviator',
  ing: 'inginer',
  mitr: 'mitropolit',
  ep: 'episcop',
  pr: 'preot',
  serg: 'sergent',
  mares: 'maresal',
  amr: 'amiral',
  arh: 'arhitect',
};

const DETAIL_WORDS = new Set([
  'bl',
  'bloc',
  'sc',
  'scara',
  'et',
  'etaj',
  'ap',
  'apt',
  'apartament',
  'cam',
  'camera',
  'parter',
  'demisol',
  'jud',
  'judet',
  'judetul',
  'sector',
  'sectorul',
  'cod',
  'tel',
  'mun',
  'municipiul',
  'loc',
  'localitatea',
  'oras',
  'orasul',
  'com',
  'comuna',
  'sat',
  'cp',
]);

const NUMBER_MARKERS = new Set(['nr', 'numar', 'numarul', 'no']);

export type ParsedAddress = { streetKey: string; houseNumber: string | null };

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function words(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');
}

export function streetKey(name: string): string {
  return words(name)
    .filter((word) => !STREET_TYPES.has(word))
    .map((word) => TITLE_WORDS[word] ?? word)
    .join(' ');
}

export function houseNumberKeys(value: string): string[] {
  const keys = new Set<string>();
  for (const part of fold(value).split(/[;,/]/)) {
    const compact = part.replace(/\s+/g, '');
    if (!/^\d/.test(compact)) continue;
    keys.add(compact);
    const range = /^(\d+)[a-z]?-(\d+)[a-z]?$/.exec(compact);
    if (range) {
      keys.add(range[1] ?? compact);
      keys.add(range[2] ?? compact);
    }
  }
  return [...keys];
}

export function houseNumberValue(value: string): number | null {
  const match = /^(\d+)/.exec(value);
  return match ? Number(match[1]) : null;
}

function isHouseNumber(word: string): boolean {
  return /^\d{1,4}[a-z]?$/.test(word);
}

function streetSegment(text: string): string[] {
  const segments = text.split(',');
  const withNumber = segments.find((segment) => {
    const tokens = words(segment);
    return tokens.some((token) => /[a-z]{2}/.test(token)) && tokens.some(isHouseNumber);
  });
  return words(withNumber ?? segments[0] ?? '');
}

export function parseAddress(
  text: string,
  ignoredWords: ReadonlySet<string> = new Set(),
): ParsedAddress | null {
  const tokens = streetSegment(text);
  const street: string[] = [];
  let houseNumber: string | null = null;
  const hasMarker = tokens.some((token) => NUMBER_MARKERS.has(token));
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';
    if (DETAIL_WORDS.has(token)) break;
    if (NUMBER_MARKERS.has(token)) {
      const next = tokens[index + 1];
      if (next !== undefined && /^\d/.test(next)) houseNumber = next;
      break;
    }
    if (!hasMarker && isHouseNumber(token) && street.some((word) => /[a-z]/.test(word))) {
      const suffix = tokens[index + 1];
      houseNumber = suffix !== undefined && /^[a-z]$/.test(suffix) ? `${token}${suffix}` : token;
      break;
    }
    street.push(token);
  }
  const key = streetKey(street.join(' '));
  if (key === '' || key.split(' ').every((word) => ignoredWords.has(word))) return null;
  return { streetKey: key, houseNumber };
}

export function placeWordSet(name: string): Set<string> {
  return new Set(words(name));
}
