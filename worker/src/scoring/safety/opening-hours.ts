const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

const TIME_SPAN = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\+?$/;
const DAY_RANGE = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/;
const CLOSED = new Set(['off', 'closed']);

type DayOpenness = (boolean | null)[];

function dayIndex(day: string): number {
  return DAYS.findIndex((candidate) => candidate === day);
}

function parseDays(selector: string): number[] | null {
  const days: number[] = [];
  for (const part of selector.split(',')) {
    if (part === 'PH' || part === 'SH') continue;
    const match = DAY_RANGE.exec(part);
    if (!match?.[1]) return null;
    const from = dayIndex(match[1]);
    const to = match[2] ? dayIndex(match[2]) : from;
    for (let step = 0; step < 7; step += 1) {
      const day = (from + step) % 7;
      days.push(day);
      if (day === to) break;
    }
  }
  return days;
}

function minutes(hours: string, mins: string): number | null {
  const h = Number(hours);
  const m = Number(mins);
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}

function spansCover(spans: string, minute: number): boolean | null {
  let covered = false;
  for (const span of spans.split(',')) {
    const match = TIME_SPAN.exec(span.trim());
    if (!match?.[1] || !match[2] || !match[3] || !match[4]) return null;
    const start = minutes(match[1], match[2]);
    let end = minutes(match[3], match[4]);
    if (start === null || end === null) return null;
    if (end <= start) end += 24 * 60;
    if (start <= minute && minute < end) covered = true;
  }
  return covered;
}

function isHolidayOnly(selector: string): boolean {
  return selector.split(',').every((part) => part === 'PH' || part === 'SH');
}

export function daysOpenAt(openingHours: string, minute: number): number | null {
  const text = openingHours.trim();
  if (text === '24/7') return 7;
  const openness: DayOpenness = Array.from({ length: 7 }, () => null);
  for (const rawRule of text.split(';')) {
    const rule = rawRule.trim();
    if (rule === '') continue;
    const [first = '', ...rest] = rule.split(/\s+/);
    const hasSelector = /^(Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)/.test(first);
    const selector = hasSelector ? first : 'Mo-Su';
    const value = (hasSelector ? rest : [first, ...rest]).join(' ');
    if (isHolidayOnly(selector)) continue;
    const days = parseDays(selector);
    if (!days) return null;
    const isOpen = CLOSED.has(value) ? false : value === '24/7' ? true : spansCover(value, minute);
    if (isOpen === null) return null;
    for (const day of days) openness[day] = isOpen;
  }
  if (openness.every((day) => day === null)) return null;
  return openness.filter((day) => day === true).length;
}
