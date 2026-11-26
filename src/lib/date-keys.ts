const DAYS_IN_WEEK = 7;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function keyParts(key: string): [number, number, number] {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return [year, month, day];
}

function utcKey(date: Date): string {
  return `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function utcDate(key: string, days = 0): Date {
  const [year, month, day] = keyParts(key);
  return new Date(Date.UTC(year, month - 1, day + days));
}

export function toDateKey(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = keyParts(key);
  return new Date(year, month - 1, day);
}

export function shiftDateKey(key: string, days: number): string {
  return utcKey(utcDate(key, days));
}

export function isoWeekday(key: string): number {
  return ((utcDate(key).getUTCDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK) + 1;
}

export function weekStartKey(key: string): string {
  return shiftDateKey(key, 1 - isoWeekday(key));
}

export function monthStartKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function shiftMonthKey(monthKey: string, months: number): string {
  const [year, month] = keyParts(monthKey);
  return utcKey(new Date(Date.UTC(year, month - 1 + months, 1)));
}

export function monthWeeks(monthKey: string): string[][] {
  const first = monthStartKey(monthKey);
  const start = weekStartKey(first);
  const leading = isoWeekday(first) - 1;
  const daysInMonth = Number(shiftDateKey(shiftMonthKey(first, 1), -1).slice(8));
  const weekCount = Math.ceil((leading + daysInMonth) / DAYS_IN_WEEK);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: DAYS_IN_WEEK }, (_, day) =>
      shiftDateKey(start, week * DAYS_IN_WEEK + day),
    ),
  );
}
