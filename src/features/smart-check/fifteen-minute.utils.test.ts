import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import { fifteenMinuteSectionSchema } from './sections/fifteen-minute.schemas';
import {
  checklistRows,
  choiceTiles,
  compareToTypical,
  fewerThanTypical,
  roundedRatio,
  walkingTimeMethod,
  walkMetersPerMinute,
} from './fifteen-minute.utils';

const section = fifteenMinuteSectionSchema.parse(FREIDORF_REPORT_RESULT.fifteen_minute);

describe('fifteen-minute.utils', () => {
  it('distinguishes a known estimate from an unrecognized or missing method', () => {
    expect(walkingTimeMethod('pedestrian_routing')).toBe('routed');
    expect(walkingTimeMethod('straight_line')).toBe('estimated');
    expect(walkingTimeMethod('unknown')).toBeNull();
    expect(walkingTimeMethod(undefined)).toBeNull();
  });

  it('reports only a speed carried by the report', () => {
    expect(walkMetersPerMinute(section)).toBe(75);
    expect(walkMetersPerMinute({ ...section, walk_speed_kmh: null })).toBeNull();
  });

  it('has no comparison without a typical value', () => {
    expect(compareToTypical(4, null)).toBeNull();
    expect(compareToTypical(4, undefined)).toBeNull();
  });

  it('calls a group rare when a typical neighbourhood has none', () => {
    expect(compareToTypical(3, 0)).toEqual({ kind: 'rare' });
  });

  it('compares with the typical neighbourhood', () => {
    expect(compareToTypical(9, 6)).toEqual({ kind: 'many', ratio: 1.5 });
    expect(compareToTypical(2, 3)).toEqual({ kind: 'fewer' });
    expect(compareToTypical(7, 6)).toEqual({ kind: 'same' });
  });

  it('rounds to half steps below ten and to whole numbers from ten', () => {
    expect(roundedRatio(2.26)).toBe(2.5);
    expect(roundedRatio(12.4)).toBe(12);
  });

  it('lists the nearest places first and marks what is beyond 15 minutes', () => {
    const rows = checklistRows(section);
    expect(rows).toHaveLength(section.total);
    expect(rows[0]?.minutes).toBe(1);
    expect(rows.filter((row) => row.isReached)).toHaveLength(section.covered);
    expect(rows.at(-1)?.isReached).toBe(false);
  });

  it('shows the groups with places, most first', () => {
    const tiles = choiceTiles(section);
    expect(tiles[0]).toMatchObject({ key: 'shops', count: 7, comparison: { kind: 'same' } });
    expect(tiles.map((tile) => tile.count)).toEqual(
      [...tiles.map((tile) => tile.count)].sort((a, b) => b - a),
    );
  });

  it('notes the groups left out that have fewer than a typical neighbourhood', () => {
    expect(fewerThanTypical(section).map((group) => group.key)).toEqual(['services', 'pharmacies']);
  });
});
