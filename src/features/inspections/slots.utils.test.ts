import {
  availabilityByDay,
  bookingWindow,
  dayState,
  firstFreeSlot,
  inspectionIcs,
  monthWeeks,
  partOfDay,
  visitEnd,
} from './slots.utils';

const NOW = new Date(2026, 10, 20, 10, 0);

function slot(day: number, hour: number, minute: number, free: number, working = 1) {
  return { starts_at: new Date(2026, 10, day, hour, minute).toISOString(), free, working };
}

describe('slots.utils', () => {
  it('opens booking from tomorrow for 90 days', () => {
    const { first, last } = bookingWindow(NOW);
    expect(first).toEqual(new Date(2026, 10, 21));
    expect(last).toEqual(new Date(2027, 1, 18));
  });

  it('lays a month out in weeks starting on Monday', () => {
    const weeks = monthWeeks(new Date(2026, 10, 1));
    expect(weeks[0]?.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0]?.[6]).toEqual(new Date(2026, 10, 1));
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('counts free and working hours per day and finds the first free one', () => {
    const slots = [slot(21, 8, 0, 0), slot(21, 9, 30, 1), slot(22, 8, 0, 0, 0)];
    const byDay = availabilityByDay(slots);

    expect(byDay.get('2026-11-21')).toMatchObject({ working: 2, free: 1 });
    expect(firstFreeSlot(slots)).toBe(slots[1]);
    expect(dayState(new Date(2026, 10, 21), byDay.get('2026-11-21'), NOW)).toBe('open');
    expect(dayState(new Date(2026, 10, 22), byDay.get('2026-11-22'), NOW)).toBe('closed');
    expect(dayState(new Date(2026, 10, 20), undefined, NOW)).toBe('past');
  });

  it('marks a day where every working hour is taken as full', () => {
    const byDay = availabilityByDay([slot(23, 8, 0, 0), slot(23, 9, 30, 0)]);
    expect(dayState(new Date(2026, 10, 23), byDay.get('2026-11-23'), NOW)).toBe('full');
  });

  it('groups start times by part of the day and ends visits two hours later', () => {
    expect(partOfDay(new Date(2026, 10, 21, 9, 30))).toBe('morning');
    expect(partOfDay(new Date(2026, 10, 21, 12, 30))).toBe('midday');
    expect(partOfDay(new Date(2026, 10, 21, 14, 0))).toBe('afternoon');
    expect(visitEnd(new Date(2026, 10, 21, 9, 30).toISOString())).toEqual(
      new Date(2026, 10, 21, 11, 30),
    );
  });

  it('writes a calendar event with escaped text', () => {
    const ics = inspectionIcs({
      id: 'abc',
      title: 'Inspecție',
      location: 'Str. Școlii 12, Timișoara',
      startsAt: '2026-11-21T07:30:00.000Z',
      endsAt: '2026-11-21T09:30:00.000Z',
      now: new Date('2026-11-20T10:00:00.000Z'),
    });

    expect(ics).toContain('DTSTART:20261121T073000Z');
    expect(ics).toContain('LOCATION:Str. Școlii 12\\, Timișoara');
    expect(ics).toContain('UID:abc@propertyscore.ro');
  });
});
