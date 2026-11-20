import { buildAgendaInspection } from '@/test/factories/agenda-inspection';
import {
  agendaDayBounds,
  canChangeAppointment,
  sortAppointments,
  agendaRange,
  directionsUrl,
  inspectionsOn,
  knownAccessTags,
  nextInspection,
  phoneHref,
} from './inspection.utils';

const NOW = new Date(2026, 10, 24, 8, 0);

function at(day: number, hour: number, minute = 0) {
  return new Date(2026, 10, day, hour, minute).toISOString();
}

describe('inspection.utils', () => {
  it('covers seven days from the start of today', () => {
    expect(agendaRange(NOW)).toEqual({
      from: new Date(2026, 10, 24).toISOString(),
      to: new Date(2026, 11, 1).toISOString(),
    });
  });

  it('bounds today, tomorrow and the week', () => {
    expect(agendaDayBounds('tomorrow', NOW)).toEqual({
      from: new Date(2026, 10, 25),
      to: new Date(2026, 10, 26),
    });
    expect(agendaDayBounds('week', NOW).to).toEqual(new Date(2026, 11, 1));
  });

  it('keeps the inspections that start in the chosen day', () => {
    const today = buildAgendaInspection({ starts_at: at(24, 9, 30), ends_at: at(24, 11, 30) });
    const tomorrow = buildAgendaInspection({ starts_at: at(25, 8), ends_at: at(25, 10) });

    expect(inspectionsOn([today, tomorrow], 'today', NOW)).toEqual([today]);
    expect(inspectionsOn([today, tomorrow], 'tomorrow', NOW)).toEqual([tomorrow]);
    expect(inspectionsOn([today, tomorrow], 'week', NOW)).toEqual([today, tomorrow]);
  });

  it('finds the next assigned inspection that has not ended', () => {
    const finished = buildAgendaInspection({ starts_at: at(24, 5), ends_at: at(24, 7) });
    const submitted = buildAgendaInspection({
      status: 'completed',
      starts_at: at(24, 9, 30),
      ends_at: at(24, 11, 30),
    });
    const next = buildAgendaInspection({ starts_at: at(24, 14), ends_at: at(24, 16) });

    expect(nextInspection([finished, submitted, next], NOW)).toBe(next);
    expect(nextInspection([next], NOW, new Date(2026, 10, 25))).toBeUndefined();
  });

  it('links directions to the pin, or to the address without one', () => {
    expect(directionsUrl(buildAgendaInspection({ latitude: 45.75, longitude: 21.22 }))).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=45.75%2C21.22',
    );
    expect(
      directionsUrl(
        buildAgendaInspection({ latitude: null, longitude: null, address_text: 'Str. Paris 3' }),
      ),
    ).toContain('destination=Str.+Paris+3%2C+Timi%C8%99oara');
  });

  it('builds a phone link and keeps only the known access tags', () => {
    expect(phoneHref('+40 722 000 001')).toBe('tel:+40722000001');
    expect(knownAccessTags(['pet', 'unknown', 'intercom'])).toEqual(['intercom', 'pet']);
  });
});

describe('appointment helpers', () => {
  const now = new Date(2026, 10, 20, 12, 0);
  const row = (status: string, day: number) => ({
    status,
    starts_at: new Date(2026, 10, day, 9, 30).toISOString(),
  });

  it('puts upcoming bookings first, soonest first, then the rest newest first', () => {
    const sorted = sortAppointments(
      [row('completed', 10), row('scheduled', 25), row('cancelled', 28), row('scheduled', 22)],
      now,
    );
    expect(sorted.map((item) => new Date(item.starts_at).getDate())).toEqual([22, 25, 28, 10]);
  });

  it('allows changes only to future bookings that are not done or cancelled', () => {
    expect(canChangeAppointment(row('inspector_assigned', 22), now)).toBe(true);
    expect(canChangeAppointment(row('scheduled', 19), now)).toBe(false);
    expect(canChangeAppointment(row('cancelled', 22), now)).toBe(false);
  });
});
