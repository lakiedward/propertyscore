import type { SlotCount } from './inspection.types';

const BOOKING_DAYS_AHEAD = 90;

const VISIT_HOURS = 2;

export type DayState = 'outside' | 'past' | 'closed' | 'full' | 'open';

export type DayAvailability = {
  working: number;
  free: number;
  starts: SlotCount[];
};

export type PartOfDay = 'morning' | 'midday' | 'afternoon';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateKey(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function bookingWindow(now: Date): { first: Date; last: Date } {
  const first = addDays(now, 1);
  return { first, last: addDays(first, BOOKING_DAYS_AHEAD - 1) };
}

export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function monthWeeks(month: Date): (Date | null)[][] {
  const leading = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
    ),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export function availabilityByDay(slots: readonly SlotCount[]): Map<string, DayAvailability> {
  const byDay = new Map<string, DayAvailability>();
  for (const slot of slots) {
    const key = dateKey(new Date(slot.starts_at));
    const day = byDay.get(key) ?? { working: 0, free: 0, starts: [] };
    day.working += slot.working > 0 ? 1 : 0;
    day.free += slot.free > 0 ? 1 : 0;
    day.starts.push(slot);
    byDay.set(key, day);
  }
  return byDay;
}

export function dayState(
  date: Date,
  availability: DayAvailability | undefined,
  now: Date,
): DayState {
  const { first, last } = bookingWindow(now);
  if (date < monthStart(first) || date > last) {
    return 'outside';
  }
  if (date < first) {
    return 'past';
  }
  if (!availability || availability.working === 0) {
    return 'closed';
  }
  return availability.free === 0 ? 'full' : 'open';
}

export function firstFreeSlot(slots: readonly SlotCount[]): SlotCount | undefined {
  return slots.find((slot) => slot.free > 0);
}

export function partOfDay(startsAt: Date): PartOfDay {
  const hour = startsAt.getHours();
  if (hour < 11) {
    return 'morning';
  }
  return hour < 14 ? 'midday' : 'afternoon';
}

export function visitEnd(startsAt: string): Date {
  const end = new Date(startsAt);
  end.setHours(end.getHours() + VISIT_HOURS);
  return end;
}

function icsTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/gu, '')
    .replace(/\.\d{3}/u, '');
}

function icsText(value: string): string {
  return value.replace(/[\\;,]/gu, (match) => `\\${match}`).replace(/\n/gu, '\\n');
}

export function inspectionIcs({
  id,
  title,
  location,
  startsAt,
  endsAt,
  now,
}: {
  id: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  now: Date;
}): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PropertyScore//Property Fizic//RO',
    'BEGIN:VEVENT',
    `UID:${id}@propertyscore.ro`,
    `DTSTAMP:${icsTime(now)}`,
    `DTSTART:${icsTime(new Date(startsAt))}`,
    `DTEND:${icsTime(new Date(endsAt))}`,
    `SUMMARY:${icsText(title)}`,
    `LOCATION:${icsText(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
