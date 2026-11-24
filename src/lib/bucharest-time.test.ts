import { bucharestDay, canStartAt, startWindowOpensAt } from './bucharest-time';

describe('bucharest time', () => {
  it('reads the calendar day in Romania, not in the browser', () => {
    expect(bucharestDay(new Date('2026-11-24T22:30:00.000Z'))).toBe('2026-11-25');
  });

  it('opens the start window one hour before the visit, on its day only', () => {
    const startsAt = '2026-11-24T10:00:00.000Z';
    expect(startWindowOpensAt(startsAt).toISOString()).toBe('2026-11-24T09:00:00.000Z');
    expect(canStartAt(startsAt, new Date('2026-11-24T08:30:00.000Z'))).toBe(false);
    expect(canStartAt(startsAt, new Date('2026-11-24T09:10:00.000Z'))).toBe(true);
    expect(canStartAt(startsAt, new Date('2026-11-25T09:10:00.000Z'))).toBe(false);
  });
});
