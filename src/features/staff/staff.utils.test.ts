import { addDaysTo, exceptionBounds, SCHEDULE_TIMES, weeklyRangesByDay } from './staff.utils';

describe('staff.utils', () => {
  it('offers half-hour times from 06:00 to 22:00', () => {
    expect(SCHEDULE_TIMES[0]).toBe('06:00');
    expect(SCHEDULE_TIMES[1]).toBe('06:30');
    expect(SCHEDULE_TIMES.at(-1)).toBe('22:00');
    expect(SCHEDULE_TIMES).toHaveLength(33);
  });

  it('groups the weekly hours by day with short times', () => {
    const byDay = weeklyRangesByDay([
      { weekday: 3, starts_at: '08:00:00', ends_at: '12:00:00' },
      { weekday: 3, starts_at: '14:00:00', ends_at: '18:00:00' },
      { weekday: 6, starts_at: '09:00:00', ends_at: '13:00:00' },
    ]);

    expect(byDay.get(3)).toEqual([
      { startsAt: '08:00', endsAt: '12:00' },
      { startsAt: '14:00', endsAt: '18:00' },
    ]);
    expect(byDay.get(1)).toBeUndefined();
  });

  it('adds days across a month and a year end', () => {
    expect(addDaysTo('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysTo('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('turns a whole-day exception into midnight to midnight after the last day', () => {
    expect(
      exceptionBounds({
        fromDate: '2026-11-03',
        toDate: '2026-11-07',
        isAllDay: true,
        startTime: '08:00',
        endTime: '12:00',
      }),
    ).toEqual({ startsAt: new Date(2026, 10, 3), endsAt: new Date(2026, 10, 8) });
    expect(
      exceptionBounds({
        fromDate: '2026-11-03',
        toDate: '2026-11-03',
        isAllDay: false,
        startTime: '08:00',
        endTime: '11:00',
      }),
    ).toEqual({ startsAt: new Date(2026, 10, 3, 8), endsAt: new Date(2026, 10, 3, 11) });
  });
});
