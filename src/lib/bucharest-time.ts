const BUCHAREST_TIME_ZONE = 'Europe/Bucharest';

const START_LEAD_MS = 3_600_000;

export function bucharestDay(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: BUCHAREST_TIME_ZONE });
}

export function startWindowOpensAt(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - START_LEAD_MS);
}

export function canStartAt(startsAt: string, now: Date): boolean {
  return (
    bucharestDay(new Date(startsAt)) === bucharestDay(now) &&
    now.getTime() >= startWindowOpensAt(startsAt).getTime()
  );
}
