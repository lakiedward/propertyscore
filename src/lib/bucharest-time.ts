const BUCHAREST_TIME_ZONE = 'Europe/Bucharest';

const START_LEAD_MS = 3_600_000;

const WALL_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUCHAREST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

type WallClock = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function wallClock(value: Date): WallClock {
  const parts = Object.fromEntries(
    WALL_CLOCK.formatToParts(value).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hours: parts.hour ?? 0,
    minutes: parts.minute ?? 0,
    seconds: parts.second ?? 0,
  };
}

function offsetAt(instant: number): number {
  const clock = wallClock(new Date(instant));
  const asUtc = Date.UTC(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hours,
    clock.minutes,
    clock.seconds,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

export function bucharestDay(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: BUCHAREST_TIME_ZONE });
}

export function bucharestTime(value: Date): { hours: number; minutes: number } {
  const { hours, minutes } = wallClock(value);
  return { hours, minutes };
}

export function bucharestInstant(dateKey: string, time = '00:00'): Date {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hours, minutes);
  const guess = wall - offsetAt(wall);
  return new Date(wall - offsetAt(guess));
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
