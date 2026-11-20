import type { AccessTag, AgendaDay, AgendaInspection, AgendaRange } from './inspection.types';
import { ACCESS_TAGS } from './inspection.types';

const AGENDA_DAYS_AHEAD = 7;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function agendaRange(now: Date): AgendaRange {
  const today = startOfDay(now);
  return {
    from: today.toISOString(),
    to: addDays(today, AGENDA_DAYS_AHEAD).toISOString(),
  };
}

export function agendaDayBounds(day: AgendaDay, now: Date): { from: Date; to: Date } {
  const today = startOfDay(now);
  if (day === 'today') {
    return { from: today, to: addDays(today, 1) };
  }
  if (day === 'tomorrow') {
    return { from: addDays(today, 1), to: addDays(today, 2) };
  }
  return { from: today, to: addDays(today, AGENDA_DAYS_AHEAD) };
}

export function inspectionsOn(
  inspections: readonly AgendaInspection[],
  day: AgendaDay,
  now: Date,
): AgendaInspection[] {
  const { from, to } = agendaDayBounds(day, now);
  return inspections.filter((inspection) => {
    const startsAt = new Date(inspection.starts_at);
    return startsAt >= from && startsAt < to;
  });
}

export function nextInspection(
  inspections: readonly AgendaInspection[],
  now: Date,
  after?: Date,
): AgendaInspection | undefined {
  const threshold = after ?? now;
  return inspections.find(
    (inspection) =>
      inspection.status === 'inspector_assigned' && new Date(inspection.ends_at) > threshold,
  );
}

export function directionsUrl(inspection: AgendaInspection): string {
  const destination =
    inspection.latitude !== null && inspection.longitude !== null
      ? `${String(inspection.latitude)},${String(inspection.longitude)}`
      : `${inspection.address_text}, ${inspection.city_name}`;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', destination);
  return url.toString();
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

export function knownAccessTags(tags: readonly string[]): AccessTag[] {
  return ACCESS_TAGS.filter((tag) => tags.includes(tag));
}
