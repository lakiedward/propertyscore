import { formatDate } from '@/i18n/format';
import { bucharestInstant } from '@/lib/bucharest-time';
import { shiftDateKey } from '@/lib/date-keys';
import type { StaffUser, TimeRange } from './staff.types';

type CsvLabels = {
  name: string;
  email: string;
  phone: string;
  roles: string;
  created: string;
  status: string;
  active: string;
  blocked: string;
};

function csvCell(value: string): string {
  return /[",\n;]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function usersToCsv(users: readonly StaffUser[], labels: CsvLabels): string {
  const header = [
    labels.name,
    labels.email,
    labels.phone,
    labels.roles,
    labels.created,
    labels.status,
  ];
  const rows = users.map((user) => [
    user.full_name ?? '',
    user.email,
    user.phone ?? '',
    user.roles.join(' '),
    formatDate(user.created_at),
    user.is_blocked ? labels.blocked : labels.active,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(content: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

const SCHEDULE_START_MINUTES = 6 * 60;
const SCHEDULE_END_MINUTES = 22 * 60;
const SCHEDULE_STEP_MINUTES = 30;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export const SCHEDULE_TIMES: readonly string[] = Array.from(
  { length: (SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES) / SCHEDULE_STEP_MINUTES + 1 },
  (_, index) => minutesToTime(SCHEDULE_START_MINUTES + index * SCHEDULE_STEP_MINUTES),
);

function toTimeLabel(time: string): string {
  return time.slice(0, 5);
}

export function weeklyRangesByDay(
  rows: readonly { weekday: number; starts_at: string; ends_at: string }[],
): Map<number, TimeRange[]> {
  const byDay = new Map<number, TimeRange[]>();
  for (const row of rows) {
    const ranges = byDay.get(row.weekday) ?? [];
    ranges.push({ startsAt: toTimeLabel(row.starts_at), endsAt: toTimeLabel(row.ends_at) });
    byDay.set(row.weekday, ranges);
  }
  return byDay;
}

export function exceptionBounds(values: {
  fromDate: string;
  toDate: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
}): { startsAt: Date; endsAt: Date } {
  if (values.isAllDay) {
    return {
      startsAt: bucharestInstant(values.fromDate),
      endsAt: bucharestInstant(shiftDateKey(values.toDate, 1)),
    };
  }
  return {
    startsAt: bucharestInstant(values.fromDate, values.startTime),
    endsAt: bucharestInstant(values.toDate, values.endTime),
  };
}
