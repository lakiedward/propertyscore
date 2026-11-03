import { describe, expect, it } from 'vitest';

import {
  isoDate,
  orthodoxEaster,
  pickReferenceDate,
  romanianPublicHolidays,
} from './reference-day.ts';

describe('orthodoxEaster', () => {
  it('matches the published Orthodox Easter dates', () => {
    expect(isoDate(orthodoxEaster(2024))).toBe('2024-05-05');
    expect(isoDate(orthodoxEaster(2025))).toBe('2025-04-20');
    expect(isoDate(orthodoxEaster(2026))).toBe('2026-04-12');
    expect(isoDate(orthodoxEaster(2027))).toBe('2027-05-02');
  });
});

describe('romanianPublicHolidays', () => {
  it('includes the fixed holidays, Good Friday, Easter Monday and Whit Monday', () => {
    const holidays = romanianPublicHolidays(2026);
    expect(holidays.has('2026-12-01')).toBe(true);
    expect(holidays.has('2026-04-10')).toBe(true);
    expect(holidays.has('2026-04-13')).toBe(true);
    expect(holidays.has('2026-06-01')).toBe(true);
    expect(holidays.has('2026-05-31')).toBe(true);
    expect(holidays.has('2026-11-03')).toBe(false);
  });
});

describe('pickReferenceDate', () => {
  it('takes the first Tuesday or Wednesday of the month that has service', () => {
    expect(pickReferenceDate('2026-11-01', [2, 3], () => true)).toBe('2026-11-03');
  });

  it('skips public holidays', () => {
    expect(pickReferenceDate('2026-12-01', [2], () => true)).toBe('2026-12-08');
  });

  it('skips days the feed does not run and gives up when none qualifies', () => {
    expect(pickReferenceDate('2026-11-01', [2, 3], (date) => date >= '2026-11-10')).toBe(
      '2026-11-10',
    );
    expect(pickReferenceDate('2026-11-01', [2, 3], () => false)).toBeNull();
  });
});
