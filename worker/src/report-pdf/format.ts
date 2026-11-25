import type { ReportLocale } from './report-data.ts';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const WALK_METRES_PER_MINUTE = 80;
const FORMAT_LOCALE = { ro: 'ro-RO', en: 'en-GB' } as const;

export type Copy = readonly [romanian: string, english: string];

export function localize(locale: ReportLocale, copy: Copy): string {
  return copy[locale === 'en' ? 1 : 0];
}

export function labelFor(
  locale: ReportLocale,
  labels: Readonly<Record<string, Copy>>,
  key: string,
  fallback = key,
): string {
  const label = Object.hasOwn(labels, key) ? labels[key] : undefined;
  return label === undefined ? fallback : localize(locale, label);
}

export function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

export function escKeepingRangesTogether(value: string): string {
  return esc(value).replace(/\d+[-–]\d+/g, (range) => `<span class="nowrap">${range}</span>`);
}

export function walkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / WALK_METRES_PER_MINUTE));
}

function createReportFormat(locale: ReportLocale) {
  const intlLocale = FORMAT_LOCALE[locale];
  const plurals = new Intl.PluralRules(intlLocale);
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  });
  const monthFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const shortMonthFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: 'short',
    timeZone: 'UTC',
  });
  const longDateFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  function t(romanian: string, english: string, ...values: readonly (string | number)[]): string {
    return localize(locale, [romanian, english]).replace(/\{(\d+)\}/g, (token, index: string) =>
      String(values[Number(index)] ?? token),
    );
  }

  function formatNumber(value: number, fractionDigits = 0): string {
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  function formatEuro(value: number): string {
    const rounded = formatNumber(Math.round(value));
    return t('{0} €', '€{0}', rounded);
  }

  function formatDistance(metres: number): string {
    if (metres < 1000) return `${formatNumber(Math.round(metres / 10) * 10)} m`;
    return `${formatNumber(metres / 1000, 1)} km`;
  }

  function formatMinutes(minutes: number): string {
    return `${formatNumber(Math.max(1, Math.round(minutes)))} min`;
  }

  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return Number.isNaN(date.getTime()) ? isoDate : dateFormatter.format(date);
  }

  function longDate(isoDate: string): string {
    const date = new Date(isoDate);
    return Number.isNaN(date.getTime()) ? isoDate : longDateFormatter.format(date);
  }

  function formatMonth(period: string): string {
    const date = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? period : monthFormatter.format(date);
  }

  function shortMonth(period: string): string {
    const date = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? period
      : shortMonthFormatter.format(date).replace('.', '');
  }

  function formatSourceDate(value: string): string {
    const range = /^(\d{4}-\d{2})\/(\d{4}-\d{2})$/.exec(value);
    if (range?.[1] && range[2]) return `${formatMonth(range[1])} – ${formatMonth(range[2])}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    if (/^\d{4}-\d{2}$/.test(value)) return formatMonth(value);
    return value;
  }

  function plural(count: number, one: Copy, few: string, other: Copy): string {
    const category = plurals.select(count);
    const word =
      category === 'one'
        ? localize(locale, one)
        : category === 'few'
          ? few
          : localize(locale, other);
    return `${formatNumber(count)} ${word}`;
  }

  function lowerFirst(text: string): string {
    return text.charAt(0).toLocaleLowerCase(intlLocale) + text.slice(1);
  }

  return {
    t,
    formatNumber,
    formatEuro,
    formatDistance,
    formatMinutes,
    formatDate,
    longDate,
    formatMonth,
    shortMonth,
    formatSourceDate,
    plural,
    lowerFirst,
  };
}

const FORMATS = { ro: createReportFormat('ro'), en: createReportFormat('en') };

export function reportFormat(locale: ReportLocale) {
  return FORMATS[locale];
}
