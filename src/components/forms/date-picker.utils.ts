const DAYS_IN_WEEK = 7;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDateKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function monthStartKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function shiftMonthKey(monthKey: string, months: number): string {
  const date = fromDateKey(monthKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

export function monthWeeks(monthKey: string): string[][] {
  const first = fromDateKey(monthKey);
  const leading = (first.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - leading);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((leading + daysInMonth) / DAYS_IN_WEEK);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: DAYS_IN_WEEK }, (_, day) =>
      toDateKey(
        new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + week * DAYS_IN_WEEK + day,
        ),
      ),
    ),
  );
}
