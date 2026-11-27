import { bucharestDay, bucharestInstant } from '@/lib/bucharest-time';
import { isoWeekday, shiftDateKey, weekStartKey } from '@/lib/date-keys';
import type { InspectorBlock, ScheduleView, WorkingRange } from './inspection.types';

export const GRID_START_HOUR = 8;
export const GRID_HOURS = 11;
export const HOUR_HEIGHT = 56;
const TRAVEL_MINUTES = 30;
const MINUTE_MS = 60_000;

type Interval = { starts_at: string; ends_at: string };

export type GridBlock = { key: string; top: number; height: number };

const WEEK_DAYS = 7;

export function dayStart(key: string): Date {
  return bucharestInstant(key);
}

export function weekStart(key: string): Date {
  return bucharestInstant(weekStartKey(key));
}

function viewDays(view: ScheduleView): number {
  return view === 'day' ? 1 : WEEK_DAYS;
}

export function scheduleRange(key: string, view: ScheduleView): { from: Date; to: Date } {
  const firstKey = view === 'day' ? key : weekStartKey(key);
  return {
    from: bucharestInstant(firstKey),
    to: bucharestInstant(shiftDateKey(firstKey, viewDays(view))),
  };
}

export function shiftScheduleDate(key: string, view: ScheduleView, direction: 1 | -1): string {
  return shiftDateKey(key, viewDays(view) * direction);
}

function minutesIntoGrid(date: Date, day: Date): number {
  return (date.getTime() - day.getTime()) / MINUTE_MS - GRID_START_HOUR * 60;
}

function clampToGrid(minutes: number): number {
  return Math.min(Math.max(minutes, 0), GRID_HOURS * 60);
}

export function gridPosition(interval: Interval, day: Date): { top: number; height: number } {
  const start = clampToGrid(minutesIntoGrid(new Date(interval.starts_at), day));
  const end = clampToGrid(minutesIntoGrid(new Date(interval.ends_at), day));
  return { top: (start / 60) * HOUR_HEIGHT, height: (Math.max(end - start, 0) / 60) * HOUR_HEIGHT };
}

function timeOnDay(day: Date, time: string): Date {
  return bucharestInstant(bucharestDay(day), time.slice(0, 5));
}

function workingIntervals(
  inspectorId: string,
  day: Date,
  ranges: readonly WorkingRange[],
): Interval[] {
  const weekday = isoWeekday(bucharestDay(day));
  return ranges
    .filter((range) => range.inspector_id === inspectorId && range.weekday === weekday)
    .map((range) => ({
      starts_at: timeOnDay(day, range.starts_at).toISOString(),
      ends_at: timeOnDay(day, range.ends_at).toISOString(),
    }));
}

export function offBlocks(
  inspectorId: string,
  day: Date,
  ranges: readonly WorkingRange[],
  blocks: readonly InspectorBlock[],
): GridBlock[] {
  const gridStart = timeOnDay(day, `${String(GRID_START_HOUR)}:00`);
  const gridEnd = new Date(gridStart.getTime() + GRID_HOURS * 60 * MINUTE_MS);
  const working = workingIntervals(inspectorId, day, ranges).sort((first, second) =>
    first.starts_at.localeCompare(second.starts_at),
  );
  const gaps: Interval[] = [];
  let cursor = gridStart.toISOString();
  for (const range of working) {
    if (range.starts_at > cursor) {
      gaps.push({ starts_at: cursor, ends_at: range.starts_at });
    }
    if (range.ends_at > cursor) {
      cursor = range.ends_at;
    }
  }
  if (cursor < gridEnd.toISOString()) {
    gaps.push({ starts_at: cursor, ends_at: gridEnd.toISOString() });
  }
  const exceptions = blocks.filter((block) => block.inspector_id === inspectorId);
  return [...gaps, ...exceptions]
    .map((interval, index) => ({ key: String(index), ...gridPosition(interval, day) }))
    .filter((block) => block.height > 0);
}

function overlaps(first: Interval, second: Interval, paddingMinutes = 0): boolean {
  const padding = paddingMinutes * MINUTE_MS;
  return (
    new Date(first.starts_at).getTime() < new Date(second.ends_at).getTime() + padding &&
    new Date(second.starts_at).getTime() < new Date(first.ends_at).getTime() + padding
  );
}

export type Clash = 'busy' | 'unavailable' | null;

export function assignmentClash({
  inspection,
  inspectorId,
  assigned,
  ranges,
  blocks,
}: {
  inspection: Interval & { id: string };
  inspectorId: string;
  assigned: readonly (Interval & { id: string; inspector_id: string | null })[];
  ranges: readonly WorkingRange[];
  blocks: readonly InspectorBlock[];
}): Clash {
  const day = dayStart(bucharestDay(new Date(inspection.starts_at)));
  const isInsideHours = workingIntervals(inspectorId, day, ranges).some(
    (range) =>
      new Date(range.starts_at).getTime() <= new Date(inspection.starts_at).getTime() &&
      new Date(range.ends_at).getTime() >= new Date(inspection.ends_at).getTime(),
  );
  const isBlocked = blocks.some(
    (block) => block.inspector_id === inspectorId && overlaps(block, inspection),
  );
  if (!isInsideHours || isBlocked) {
    return 'unavailable';
  }
  const isBusy = assigned.some(
    (other) =>
      other.id !== inspection.id &&
      other.inspector_id === inspectorId &&
      overlaps(other, inspection, TRAVEL_MINUTES),
  );
  return isBusy ? 'busy' : null;
}
