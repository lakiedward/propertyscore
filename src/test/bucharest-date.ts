import { bucharestDay, bucharestInstant } from '@/lib/bucharest-time';
import { shiftDateKey } from '@/lib/date-keys';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function bucharestDate(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const key = shiftDateKey(`${String(year)}-${pad(monthIndex + 1)}-01`, day - 1);
  return bucharestInstant(key, `${pad(hour)}:${pad(minute)}`);
}

export function bucharestDaysFromToday(days: number, hour: number, minute = 0): Date {
  return bucharestInstant(
    shiftDateKey(bucharestDay(new Date()), days),
    `${pad(hour)}:${pad(minute)}`,
  );
}
