import { monthStartKey, monthWeeks, shiftDateKey, shiftMonthKey } from './date-picker.utils';

describe('date-picker.utils', () => {
  it('lays a month out in weeks starting on Monday', () => {
    const weeks = monthWeeks('2026-11-01');

    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toBe('2026-10-26');
    expect(weeks[0]?.[6]).toBe('2026-11-01');
    expect(weeks.at(-1)?.[0]).toBe('2026-11-30');
  });

  it('moves by days and months across a year end', () => {
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateKey('2026-12-03', -7)).toBe('2026-11-26');
    expect(shiftMonthKey('2026-12-01', 1)).toBe('2027-01-01');
    expect(monthStartKey('2026-11-23')).toBe('2026-11-01');
  });
});
