import {
  fromDateKey,
  isoWeekday,
  monthStartKey,
  monthWeeks,
  shiftDateKey,
  shiftMonthKey,
  toDateKey,
  weekStartKey,
} from './date-keys';

describe('date-keys', () => {
  it('writes and reads a local calendar day', () => {
    expect(toDateKey(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
    expect(fromDateKey('2026-11-05')).toEqual(new Date(2026, 10, 5));
  });

  it('moves by days and months across a month and a year end', () => {
    expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateKey('2026-12-03', -7)).toBe('2026-11-26');
    expect(shiftDateKey('2026-03-28', 2)).toBe('2026-03-30');
    expect(shiftMonthKey('2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftMonthKey('2026-01-01', -1)).toBe('2025-12-01');
    expect(monthStartKey('2026-11-23')).toBe('2026-11-01');
  });

  it('numbers weekdays from Monday and finds the Monday of a week', () => {
    expect(isoWeekday('2026-11-23')).toBe(1);
    expect(isoWeekday('2026-11-29')).toBe(7);
    expect(weekStartKey('2026-11-25')).toBe('2026-11-23');
    expect(weekStartKey('2026-11-23')).toBe('2026-11-23');
    expect(weekStartKey('2027-01-03')).toBe('2026-12-28');
  });

  it('lays a month out in whole weeks starting on Monday', () => {
    const weeks = monthWeeks('2026-11-01');

    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toBe('2026-10-26');
    expect(weeks[0]?.[6]).toBe('2026-11-01');
    expect(weeks.at(-1)?.[0]).toBe('2026-11-30');
    expect(monthWeeks('2027-02-01')).toHaveLength(4);
  });
});
