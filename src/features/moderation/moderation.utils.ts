export type DayBucket = 'today' | 'yesterday' | 'date';

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

const DAY_MS = 86_400_000;

export function dayBucket(value: Date | string, now: Date = new Date()): DayBucket {
  const date = value instanceof Date ? value : new Date(value);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) {
    return 'today';
  }
  if (days === 1) {
    return 'yesterday';
  }
  return 'date';
}

export function pricePerSquareMeter(price: number, areaM2: number): number | null {
  return areaM2 > 0 ? Math.round(price / areaM2) : null;
}

const MOSAIC_PHOTO_COUNT = 4;

export function hiddenPhotoCount(total: number): number {
  return Math.max(0, total - MOSAIC_PHOTO_COUNT);
}

export function decisionMessage(messages: readonly string[]): string {
  return messages.join(' ');
}
