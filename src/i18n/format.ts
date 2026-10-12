import { currentLocale, type Locale } from './i18n';

export type Currency = 'RON' | 'EUR';

const FORMAT_LOCALES: Readonly<Record<Locale, string>> = {
  ro: 'ro-RO',
  en: 'en-GB',
};

const RELATIVE_UNITS: readonly { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
];

function formatLocale(): string {
  return FORMAT_LOCALES[currentLocale()];
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(formatLocale(), options).format(toDate(value));
}

export function formatDateTime(value: Date | string): string {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const diffSeconds = (toDate(value).getTime() - now.getTime()) / 1000;
  const formatter = new Intl.RelativeTimeFormat(formatLocale(), { numeric: 'auto' });
  const match = RELATIVE_UNITS.find(({ seconds }) => Math.abs(diffSeconds) >= seconds);
  if (!match) {
    return formatter.format(Math.round(diffSeconds), 'second');
  }
  return formatter.format(Math.round(diffSeconds / match.seconds), match.unit);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(formatLocale(), options).format(value);
}

export function formatPercent(value: number, maximumFractionDigits = 0): string {
  return formatNumber(value, { style: 'percent', maximumFractionDigits });
}

export function formatCurrency(amount: number, currency: Currency): string {
  return formatNumber(amount, { style: 'currency', currency });
}

function separators(): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(formatLocale()).formatToParts(12_345.6);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
}

export function parseLocaleNumber(input: string): number | undefined {
  const { group, decimal } = separators();
  const normalized = input.trim().replace(/\s/g, '').split(group).join('').replace(decimal, '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return undefined;
  }
  return Number(normalized);
}
