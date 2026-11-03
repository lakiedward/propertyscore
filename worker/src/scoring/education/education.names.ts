const PHRASES: readonly [RegExp, string][] = [
  [/\bscoala gimnaziala\b/g, 'sg'],
  [/\bscoala primara\b/g, 'sp'],
  [/\bgradinita cu program prelungit\b/g, 'gpp'],
  [/\bgradinita cu program normal\b/g, 'gpn'],
  [/\bgradinita cu program saptamanal\b/g, 'gps'],
  [/\bgradinita\b/g, 'gr'],
  [/\bliceul teoretic\b/g, 'lt'],
  [/\bliceul tehnologic\b/g, 'ltehn'],
  [/\bcolegiul national\b/g, 'cn'],
  [/\bcolegiul tehnic\b/g, 'ct'],
  [/\bliceul\b/g, 'l'],
  [/\bnumarul\b/g, 'nr'],
];

const IGNORED_TOKENS = new Set(['nr', 'de', 'si', 'cu', 'din', 'la', 'pt', 'pentru']);

const UNIT_TYPE_TOKENS = new Set([
  'sg',
  'sp',
  'gpp',
  'gpn',
  'gps',
  'gr',
  'pp',
  'pn',
  'cresa',
  'scoala',
  'generala',
  'gimnaziala',
  'primara',
  'clasele',
  'i',
  'iv',
  'viii',
  'program',
  'prelungit',
  'normal',
  'l',
  'lt',
  'ltehn',
  'cn',
  'ct',
  'liceul',
  'colegiul',
  'national',
  'tehnic',
  'tehnologic',
  'teoretic',
]);

export function normalizeName(name: string): string {
  let text = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  for (const [pattern, replacement] of PHRASES) text = text.replace(pattern, replacement);
  return text.replace(/\s+/g, ' ').trim();
}

function distinctiveTokens(name: string, ignoredWords: ReadonlySet<string>): string[] {
  return normalizeName(name)
    .split(' ')
    .filter(
      (token) =>
        token !== '' &&
        !IGNORED_TOKENS.has(token) &&
        !UNIT_TYPE_TOKENS.has(token) &&
        !ignoredWords.has(token),
    );
}

function numbers(list: readonly string[]): string {
  return list
    .filter((token) => /^\d+$/.test(token))
    .map((token) => String(Number(token)))
    .sort()
    .join(',');
}

function words(list: readonly string[]): Set<string> {
  return new Set(list.filter((token) => !/^\d+$/.test(token)));
}

function dice(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  const shared = [...left].filter((token) => right.has(token)).length;
  return (2 * shared) / (left.size + right.size);
}

export function placeWords(text: string): Set<string> {
  return new Set(
    normalizeName(text)
      .split(' ')
      .filter((token) => token !== ''),
  );
}

export function nameSimilarity(
  a: string,
  b: string,
  ignoredWords: ReadonlySet<string> = new Set(),
): number {
  const left = distinctiveTokens(a, ignoredWords);
  const right = distinctiveTokens(b, ignoredWords);
  const leftNumbers = numbers(left);
  const rightNumbers = numbers(right);
  const leftWords = words(left);
  const rightWords = words(right);
  if (leftNumbers !== '' && rightNumbers !== '') {
    if (leftNumbers !== rightNumbers) return 0;
    if (leftWords.size === 0 || rightWords.size === 0) return 1;
    return dice(leftWords, rightWords);
  }
  return dice(leftWords, rightWords);
}
