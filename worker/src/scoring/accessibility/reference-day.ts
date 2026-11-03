const DAY_MS = 86_400_000;

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianToGregorianDays = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  return addDays(utcDate(year, month, day), julianToGregorianDays);
}

export function romanianPublicHolidays(year: number): Set<string> {
  const easter = orthodoxEaster(year);
  const fixed: [number, number][] = [
    [1, 1],
    [1, 2],
    [1, 6],
    [1, 7],
    [1, 24],
    [5, 1],
    [6, 1],
    [8, 15],
    [11, 30],
    [12, 1],
    [12, 25],
    [12, 26],
  ];
  return new Set([
    ...fixed.map(([month, day]) => isoDate(utcDate(year, month, day))),
    ...[-2, 0, 1, 49, 50].map((offset) => isoDate(addDays(easter, offset))),
  ]);
}

function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function pickReferenceDate(
  period: string,
  weekdays: readonly number[],
  hasService: (date: string) => boolean,
): string | null {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return null;
  const holidays = romanianPublicHolidays(year);
  for (let day = utcDate(year, month, 1); day.getUTCMonth() === month - 1; day = addDays(day, 1)) {
    const date = isoDate(day);
    if (weekdays.includes(isoWeekday(day)) && !holidays.has(date) && hasService(date)) {
      return date;
    }
  }
  return null;
}
