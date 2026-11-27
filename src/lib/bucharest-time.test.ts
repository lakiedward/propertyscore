import {
  bucharestDay,
  bucharestInstant,
  bucharestTime,
  canStartAt,
  startWindowOpensAt,
} from './bucharest-time';

describe('bucharest time', () => {
  it('reads the calendar day in Romania, not in the browser', () => {
    expect(bucharestDay(new Date('2026-11-24T22:30:00.000Z'))).toBe('2026-11-25');
    expect(bucharestDay(new Date('2026-11-24T21:59:00.000Z'))).toBe('2026-11-24');
  });

  it('reads the wall-clock hour in Romania in winter and in summer', () => {
    expect(bucharestTime(new Date('2026-11-24T06:30:00.000Z'))).toEqual({ hours: 8, minutes: 30 });
    expect(bucharestTime(new Date('2026-07-01T06:30:00.000Z'))).toEqual({ hours: 9, minutes: 30 });
    expect(bucharestTime(new Date('2026-11-24T22:00:00.000Z'))).toEqual({ hours: 0, minutes: 0 });
  });

  it('turns a wall time in Romania into the instant, across daylight saving time', () => {
    expect(bucharestInstant('2026-11-24').toISOString()).toBe('2026-11-23T22:00:00.000Z');
    expect(bucharestInstant('2026-11-24', '08:00').toISOString()).toBe('2026-11-24T06:00:00.000Z');
    expect(bucharestInstant('2026-07-01', '08:00').toISOString()).toBe('2026-07-01T05:00:00.000Z');
    expect(bucharestInstant('2026-03-29', '12:00').toISOString()).toBe('2026-03-29T09:00:00.000Z');
    expect(bucharestInstant('2026-10-25', '12:00').toISOString()).toBe('2026-10-25T10:00:00.000Z');
  });

  it('round-trips a day key and a wall time', () => {
    const instant = bucharestInstant('2026-12-31', '17:30');
    expect(bucharestDay(instant)).toBe('2026-12-31');
    expect(bucharestTime(instant)).toEqual({ hours: 17, minutes: 30 });
  });

  it('opens the start window one hour before the visit, on its day only', () => {
    const startsAt = '2026-11-24T10:00:00.000Z';
    expect(startWindowOpensAt(startsAt).toISOString()).toBe('2026-11-24T09:00:00.000Z');
    expect(canStartAt(startsAt, new Date('2026-11-24T08:30:00.000Z'))).toBe(false);
    expect(canStartAt(startsAt, new Date('2026-11-24T09:10:00.000Z'))).toBe(true);
    expect(canStartAt(startsAt, new Date('2026-11-25T09:10:00.000Z'))).toBe(false);
  });
});
