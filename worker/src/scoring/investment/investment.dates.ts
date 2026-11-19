const DAY_MS = 86_400_000;

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

function monthParts(period: string): [number, number] {
  return [Number(period.slice(0, 4)), Number(period.slice(5, 7))];
}

export function shiftMonths(period: string, months: number): string {
  const [year, month] = monthParts(period);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function monthEnd(period: string): string {
  const [year, month] = monthParts(period);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
