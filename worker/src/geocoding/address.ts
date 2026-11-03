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
  const segment = streetSegment(text);
  const detailAt = segment.findIndex((token) => DETAIL_WORDS.has(token));
  const tokens = detailAt === -1 ? segment : segment.slice(0, detailAt);
  const markerAt = tokens.findIndex((token) => NUMBER_MARKERS.has(token));
  if (markerAt !== -1) {
    const next = tokens[markerAt + 1];
    return withStreet(
      tokens.slice(0, markerAt),
      next !== undefined && /^\d/.test(next) ? next : null,
      ignoredWords,
    );
  }
  const numberAt = tokens.findLastIndex(
    (token, index) =>
      isHouseNumber(token) &&
      tokens.slice(0, index).some((word) => /[a-z]/.test(word) && !STREET_TYPES.has(word)),
  );
  if (numberAt === -1) return withStreet(tokens, null, ignoredWords);
  const number = tokens[numberAt] ?? '';
  const suffix = tokens[numberAt + 1];
  return withStreet(
    tokens.slice(0, numberAt),
    suffix !== undefined && /^[a-z]$/.test(suffix) ? `${number}${suffix}` : number,
    ignoredWords,
  );
}

function withStreet(
  street: readonly string[],
  houseNumber: string | null,
  ignoredWords: ReadonlySet<string>,
): ParsedAddress | null {
  const key = streetKey(street.join(' '));
  if (key === '' || key.split(' ').every((word) => ignoredWords.has(word))) return null;
  return { streetKey: key, houseNumber };
}

export function placeWordSet(name: string): Set<string> {
  return new Set(words(name));
}
