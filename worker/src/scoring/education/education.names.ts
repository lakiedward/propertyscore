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

const IGNORED_TOKENS = new Set(['nr', 'de', 'si', 'cu', 'din', 'la']);

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

function tokens(normalized: string): string[] {
  return normalized.split(' ').filter((token) => token !== '' && !IGNORED_TOKENS.has(token));
}

function numbers(list: readonly string[]): string {
  return list
    .filter((token) => /^\d+$/.test(token))
    .map((token) => String(Number(token)))
    .sort()
    .join(',');
}

export function nameSimilarity(a: string, b: string): number {
  const left = tokens(normalizeName(a));
  const right = tokens(normalizeName(b));
  if (left.length === 0 || right.length === 0) return 0;
  if (numbers(left) !== numbers(right)) return 0;
  const rightSet = new Set(right);
  const shared = new Set(left.filter((token) => rightSet.has(token))).size;
  return (2 * shared) / (new Set(left).size + rightSet.size);
}
