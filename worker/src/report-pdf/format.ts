const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const LOCALE = 'ro-RO';
const WALK_METRES_PER_MINUTE = 80;

export function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatEuro(value: number): string {
  return `${formatNumber(Math.round(value))} €`;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${formatNumber(Math.round(metres / 10) * 10)} m`;
  return `${formatNumber(metres / 1000, 1)} km`;
}

export function walkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / WALK_METRES_PER_MINUTE));
}

export function formatMinutes(minutes: number): string {
  return `${formatNumber(Math.max(1, Math.round(minutes)))} min`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(date);
}

export function formatMonth(period: string): string {
  const date = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function shortMonth(period: string): string {
  const date = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
}

export function formatSourceDate(value: string): string {
  const range = /^(\d{4}-\d{2})\/(\d{4}-\d{2})$/.exec(value);
  if (range?.[1] && range[2]) return `${formatMonth(range[1])} – ${formatMonth(range[2])}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
  if (/^\d{4}-\d{2}$/.test(value)) return formatMonth(value);
  return value;
}

export function plural(count: number, one: string, few: string, other: string): string {
  const lastTwo = Math.abs(count) % 100;
  if (count === 1) return `${formatNumber(count)} ${one}`;
  if (count === 0 || (lastTwo >= 1 && lastTwo <= 19)) return `${formatNumber(count)} ${few}`;
  return `${formatNumber(count)} ${other}`;
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase(LOCALE) + text.slice(1);
}
