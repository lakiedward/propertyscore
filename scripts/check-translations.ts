import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES_DIR = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /{{\s*([\w.]+)\s*}}/g;
const CEDILLA = /[şţŞŢ]/;

type Entries = Map<string, string>;

function flatten(value: unknown, prefix: string, entries: Entries): Entries {
  if (typeof value === 'string') {
    entries.set(prefix, value);
    return entries;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, entries);
    }
  }
  return entries;
}

function placeholders(text: string): string {
  return [...text.matchAll(PLACEHOLDER)]
    .map((match) => match[1])
    .sort()
    .join(',');
}

function groupByBaseKey(entries: Entries): Map<string, Map<string, string>> {
  const groups = new Map<string, Map<string, string>>();
  for (const [key, text] of entries) {
    const suffix = PLURAL_SUFFIX.exec(key)?.[1] ?? '';
    const base = suffix ? key.slice(0, -suffix.length - 1) : key;
    const group = groups.get(base) ?? new Map<string, string>();
    group.set(suffix, text);
    groups.set(base, group);
  }
  return groups;
}

const locales = readdirSync(LOCALES_DIR).sort();
const [sourceLocale] = locales.includes('ro') ? ['ro'] : locales;
const problems: string[] = [];

if (!sourceLocale) {
  console.error(`No locales found in ${LOCALES_DIR}`);
  process.exit(1);
}

const namespaces = new Set(locales.flatMap((locale) => readdirSync(join(LOCALES_DIR, locale))));

for (const namespace of namespaces) {
  const groupsByLocale = new Map<string, Map<string, Map<string, string>>>();
  for (const locale of locales) {
    const path = join(LOCALES_DIR, locale, namespace);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      problems.push(`${locale}/${namespace}: missing or not valid JSON`);
      continue;
    }
    const entries = flatten(parsed, '', new Map());
    for (const [key, text] of entries) {
      if (text.trim() === '') problems.push(`${locale}/${namespace}: "${key}" is empty`);
      if (locale === 'ro' && CEDILLA.test(text)) {
        problems.push(`${locale}/${namespace}: "${key}" uses ş/ţ with a cedilla; use ș/ț`);
      }
    }
    groupsByLocale.set(locale, groupByBaseKey(entries));
  }

  const allBaseKeys = new Set([...groupsByLocale.values()].flatMap((groups) => [...groups.keys()]));
  for (const baseKey of allBaseKeys) {
    const isPlural = [...groupsByLocale.values()].some((groups) =>
      [...(groups.get(baseKey)?.keys() ?? [])].some((suffix) => suffix !== ''),
    );
    const referencePlaceholders = new Set<string>();

    for (const [locale, groups] of groupsByLocale) {
      const forms = groups.get(baseKey);
      if (!forms) {
        problems.push(`${locale}/${namespace}: "${baseKey}" is missing`);
        continue;
      }
      if (isPlural) {
        const required = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
        for (const category of required) {
          if (!forms.has(category)) {
            problems.push(`${locale}/${namespace}: "${baseKey}_${category}" is missing`);
          }
        }
      }
      for (const text of forms.values()) {
        referencePlaceholders.add(placeholders(text));
      }
    }

    const distinct = [...referencePlaceholders].filter((value) => value !== '' || !isPlural);
    if (new Set(distinct).size > 1) {
      problems.push(`${namespace}: "${baseKey}" uses different placeholders across languages`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Translation check failed (${String(problems.length)} problems):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Translations OK: ${locales.join(', ')} × ${String(namespaces.size)} namespaces`);
