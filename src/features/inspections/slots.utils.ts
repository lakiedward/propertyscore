import { bucharestDay, bucharestTime } from '@/lib/bucharest-time';
import { monthStartKey, monthWeeks, shiftDateKey } from '@/lib/date-keys';
import type { SlotCount } from './inspection.types';

const BOOKING_DAYS_AHEAD = 90;

const VISIT_MS = 2 * 3_600_000;

export type DayState = 'outside' | 'past' | 'closed' | 'full' | 'open';

export type DayAvailability = {
  working: number;
  free: number;
  starts: SlotCount[];
};

export type PartOfDay = 'morning' | 'midday' | 'afternoon';

export function bookingWindow(now: Date): { first: string; last: string } {
  const first = shiftDateKey(bucharestDay(now), 1);
  return { first, last: shiftDateKey(first, BOOKING_DAYS_AHEAD - 1) };
}

export function monthDays(monthKey: string): (string | null)[][] {
  const month = monthKey.slice(0, 7);
  return monthWeeks(monthKey).map((week) =>
    week.map((key) => (key.startsWith(month) ? key : null)),
  );
}

export function availabilityByDay(slots: readonly SlotCount[]): Map<string, DayAvailability> {
  const byDay = new Map<string, DayAvailability>();
  for (const slot of slots) {
    const key = bucharestDay(new Date(slot.starts_at));
    const day = byDay.get(key) ?? { working: 0, free: 0, starts: [] };
    day.working += slot.working > 0 ? 1 : 0;
    day.free += slot.free > 0 ? 1 : 0;
    day.starts.push(slot);
    byDay.set(key, day);
  }
  return byDay;
}

export function dayState(
  key: string,
  availability: DayAvailability | undefined,
  now: Date,
): DayState {
  const { first, last } = bookingWindow(now);
  if (key < monthStartKey(first) || key > last) {
    return 'outside';
  }
  if (key < first) {
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
  const { hours: hour } = bucharestTime(startsAt);
  if (hour < 11) {
    return 'morning';
  }
  return hour < 14 ? 'midday' : 'afternoon';
}

export function visitEnd(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() + VISIT_MS);
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
