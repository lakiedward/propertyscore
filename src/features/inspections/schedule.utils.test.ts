import {
  assignmentClash,
  gridPosition,
  HOUR_HEIGHT,
  offBlocks,
  scheduleRange,
  shiftScheduleDate,
  weekStart,
} from './schedule.utils';

const DAY = new Date(2026, 10, 25);
const MIHAI = 'mihai';
const RANGES = [
  { inspector_id: MIHAI, weekday: 3, starts_at: '08:00:00', ends_at: '12:00:00' },
  { inspector_id: MIHAI, weekday: 3, starts_at: '14:00:00', ends_at: '18:00:00' },
];

function at(hour: number, minute = 0) {
  return new Date(2026, 10, 25, hour, minute).toISOString();
}

describe('schedule.utils', () => {
  it('starts weeks on Monday and moves by a day or a week', () => {
    expect(weekStart('2026-11-25')).toEqual(new Date(2026, 10, 23));
    expect(scheduleRange('2026-11-25', 'week').to).toEqual(new Date(2026, 10, 30));
    expect(shiftScheduleDate('2026-11-30', 'day', 1)).toBe('2026-12-01');
    expect(shiftScheduleDate('2026-11-25', 'week', -1)).toBe('2026-11-18');
  });

  it('places a visit on the grid from 08:00', () => {
    expect(gridPosition({ starts_at: at(9, 30), ends_at: at(11, 30) }, DAY)).toEqual({
      top: 1.5 * HOUR_HEIGHT,
      height: 2 * HOUR_HEIGHT,
    });
  });

  it('shades the hours outside the working ranges and the exceptions', () => {
    const blocks = offBlocks(MIHAI, DAY, RANGES, [
      { inspector_id: MIHAI, starts_at: at(8), ends_at: at(10) },
    ]);
    expect(blocks.map(({ top, height }) => [top / HOUR_HEIGHT, height / HOUR_HEIGHT])).toEqual([
      [4, 2],
      [10, 1],
      [0, 2],
    ]);
  });

  it('finds a clash with working hours, exceptions and other visits plus travel', () => {
    const visit = { id: 'a', starts_at: at(14), ends_at: at(16) };
    const base = { inspectorId: MIHAI, ranges: RANGES, blocks: [], assigned: [] };

    expect(assignmentClash({ ...base, inspection: visit })).toBeNull();
    expect(
      assignmentClash({ ...base, inspection: { id: 'b', starts_at: at(11), ends_at: at(13) } }),
    ).toBe('unavailable');
    expect(
      assignmentClash({
        ...base,
        inspection: visit,
        assigned: [{ id: 'c', inspector_id: MIHAI, starts_at: at(16, 15), ends_at: at(18) }],
      }),
    ).toBe('busy');
    expect(
      assignmentClash({
        ...base,
        inspection: visit,
        blocks: [{ inspector_id: MIHAI, starts_at: at(15), ends_at: at(16) }],
      }),
    ).toBe('unavailable');
  });
});
