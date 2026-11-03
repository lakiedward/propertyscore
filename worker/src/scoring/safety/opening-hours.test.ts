import { describe, expect, it } from 'vitest';

import { daysOpenAt } from './opening-hours.ts';

const ELEVEN_PM = 23 * 60;

describe('daysOpenAt', () => {
  it('counts every day for 24/7', () => {
    expect(daysOpenAt('24/7', ELEVEN_PM)).toBe(7);
  });

  it('counts the days whose spans cover the minute', () => {
    expect(daysOpenAt('Mo-Su 07:00-23:30', ELEVEN_PM)).toBe(7);
    expect(daysOpenAt('Mo-Fr 08:00-20:00; Sa 09:00-14:00; Su off', ELEVEN_PM)).toBe(0);
    expect(daysOpenAt('Mo-Th 10:00-22:00; Fr,Sa 10:00-02:00', ELEVEN_PM)).toBe(2);
  });

  it('treats a span that crosses midnight as open late in the evening', () => {
    expect(daysOpenAt('18:00-04:00', ELEVEN_PM)).toBe(7);
    expect(daysOpenAt('Mo-Su 00:00-24:00', ELEVEN_PM)).toBe(7);
  });

  it('lets a later rule override the days it names and ignores holiday-only rules', () => {
    expect(daysOpenAt('Mo-Su 08:00-24:00; Su off; PH off', ELEVEN_PM)).toBe(6);
    expect(daysOpenAt('Mo-Su,PH 08:00-23:59', ELEVEN_PM)).toBe(7);
  });

  it('returns null for what it cannot read', () => {
    expect(daysOpenAt('sunrise-sunset', ELEVEN_PM)).toBeNull();
    expect(daysOpenAt('Jan-Mar Mo-Fr 08:00-16:00', ELEVEN_PM)).toBeNull();
    expect(daysOpenAt('Mo-Fr 25:00-26:00', ELEVEN_PM)).toBeNull();
    expect(daysOpenAt('PH off', ELEVEN_PM)).toBeNull();
  });
});
