import { bucharestDay } from '@/lib/bucharest-time';
import type { HomeFormValues } from './booking.schemas';
import type { HomeChoice } from './booking.store';
import type {
  AccessTag,
  AgendaDay,
  AgendaInspection,
  AgendaRange,
  BookableProperty,
} from './inspection.types';
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

export function homeChoiceOf(property: BookableProperty): HomeChoice {
  return property.property_id
    ? { kind: 'property', propertyId: property.property_id, listingId: property.listing_id }
    : { kind: 'listing', listingId: property.listing_id ?? '' };
}

export function isSameChoice(choice: HomeChoice | null, property: BookableProperty): boolean {
  return choice !== null && JSON.stringify(choice) === JSON.stringify(homeChoiceOf(property));
}

function optionalNumber(value: number | null): string {
  return value === null ? '' : String(value);
}

export function homePrefillOf(property: BookableProperty): HomeFormValues {
  return {
    addressText: property.address_text,
    cityId: property.city_id,
    pin:
      property.latitude !== null && property.longitude !== null
        ? { lng: property.longitude, lat: property.latitude }
        : null,
    propertyType: property.property_type,
    areaM2: optionalNumber(property.area_m2),
    yearBuilt: optionalNumber(property.year_built),
    floor: optionalNumber(property.floor),
    buildingFloors: optionalNumber(property.building_floors),
  };
}

export function sortAppointments<Row extends { starts_at: string; status: string }>(
  rows: readonly Row[],
  now: Date,
): Row[] {
  const isUpcoming = (row: Row) =>
    row.status !== 'cancelled' && new Date(row.starts_at).getTime() >= now.getTime();
  const upcoming = rows
    .filter(isUpcoming)
    .sort((first, second) => first.starts_at.localeCompare(second.starts_at));
  const past = rows
    .filter((row) => !isUpcoming(row))
    .sort((first, second) => second.starts_at.localeCompare(first.starts_at));
  return [...upcoming, ...past];
}

export function canChangeAppointment(row: { status: string; starts_at: string }, now: Date) {
  return (
    (row.status === 'scheduled' || row.status === 'inspector_assigned') &&
    new Date(row.starts_at).getTime() > now.getTime()
  );
}

export function currentInspectionOf(
  agenda: readonly AgendaInspection[],
  now: Date,
): AgendaInspection | undefined {
  const today = bucharestDay(now);
  return (
    agenda.find((item) => item.status === 'in_progress') ??
    agenda.find(
      (item) =>
        item.status === 'inspector_assigned' && bucharestDay(new Date(item.starts_at)) === today,
    )
  );
}
