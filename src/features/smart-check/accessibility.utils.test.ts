import { describe, expect, it } from 'vitest';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import {
  destinationRows,
  matchingRows,
  nearestStopsSummary,
  readableInk,
  reachScale,
  reachShares,
} from './accessibility.utils';
import { accessibilitySectionSchema } from './sections/accessibility.schemas';

const section = accessibilitySectionSchema.parse(FREIDORF_REPORT_RESULT.accessibility);

describe('destinationRows', () => {
  const rows = destinationRows(section);

  it('lists every reachable destination, quickest first', () => {
    expect(rows).toHaveLength(section.destinations.length);
    expect(rows.map((row) => row.minutes)).toEqual(
      [...rows.map((row) => row.minutes)].sort((a, b) => a - b),
    );
  });

  it('keeps a walk-only trip as a single leg', () => {
    const walked = rows.find((row) => row.isWalkOnly);
    expect(walked?.legs).toEqual([{ kind: 'walk', minutes: walked?.minutes }]);
  });

  it('gives two malls different colours', () => {
    const malls = rows.filter((row) => row.kind === 'mall');
    expect(new Set(malls.map((row) => row.swatch.token)).size).toBe(malls.length);
  });

  it('names the boarding stop that serves the line', () => {
    const riden = rows.find((row) => row.line !== null && row.boardingStop !== null);
    const stop = section.stops.find((item) => item.name === riden?.boardingStop);
    expect(stop?.routes).toContain(riden?.line?.ref);
  });

  it('shows a road route even when the same destination is not reachable without a car', () => {
    const withCar = {
      ...section,
      destinations: section.destinations.map((destination, index) =>
        index === 0
          ? {
              ...destination,
              minutes: null,
              car_route: { seconds: 480, meters: 3500, polyline6: '_njgvA_idng@o}@ozD_|Bo}@' },
            }
          : destination,
      ),
    };

    expect(destinationRows(withCar, 'places', 'car')).toMatchObject([
      {
        id: section.destinations[0]?.id,
        minutes: 8,
        carDistanceM: 3500,
        line: null,
        boardingStop: null,
        legs: [],
        path: [
          {
            mode: 'car',
            coordinates: [
              [21.22, 45.75],
              [21.223, 45.751],
              [21.224, 45.753],
            ],
          },
        ],
        end: [21.224, 45.753],
      },
    ]);
    expect(destinationRows(withCar)).toHaveLength(section.destinations.length - 1);
    expect(destinationRows(section, 'places', 'car')).toEqual([]);
  });
});

describe('nearestStopsSummary', () => {
  it('counts stops and distinct lines around the address', () => {
    expect(nearestStopsSummary(section)).toEqual({
      stops: section.stops.length,
      lines: new Set(section.stops.flatMap((stop) => stop.routes)).size,
      walkMinutes: Math.max(...section.stops.map((stop) => stop.walk_min)),
    });
  });
});

describe('reachShares', () => {
  it('reads the three bands from the snapshot', () => {
    expect(reachShares(section).map((share) => share.minutes)).toEqual([15, 30, 45]);
  });
});

describe('reachScale', () => {
  it.each([
    [80, 'all'],
    [70, 'twoThirds'],
    [50, 'half'],
    [36, 'third'],
    [6, 'centre'],
  ] as const)('describes %i%% of the city', (share, scale) => {
    expect(reachScale(share)).toBe(scale);
  });
});

describe('readableInk', () => {
  it('uses dark ink on a light line colour and white on a dark one', () => {
    expect(readableInk('#F6C93E')).toBe('#2a2100');
    expect(readableInk('#0148A2')).toBe('#ffffff');
    expect(readableInk(null)).toBe('#ffffff');
  });
});

describe('destination groups', () => {
  const highSchools = destinationRows(section, 'highSchools');
  const faculties = destinationRows(section, 'faculties');

  it('lists the high schools and faculties of the report, quickest first', () => {
    expect(highSchools.length).toBeGreaterThan(0);
    expect(faculties.length).toBeGreaterThan(0);
    expect(highSchools.map((row) => row.minutes)).toEqual(
      [...highSchools.map((row) => row.minutes)].sort((a, b) => a - b),
    );
  });

  it('measures a walk-only trip along its path', () => {
    const walked = highSchools.find((row) => row.isWalkOnly);
    expect(walked?.walkDistanceM).toBeGreaterThan(0);
  });

  it('finds a row without diacritics, by name or university', () => {
    const tagged = faculties.find((row) => row.tag !== null);
    expect(matchingRows(faculties, 'mecanica', 'ro').map((row) => row.label.ro)).toEqual([
      'Mecanică',
    ]);
    expect(matchingRows(faculties, tagged?.tag ?? '', 'ro')).toContain(tagged);
    expect(matchingRows(highSchools, 'nimic de gasit', 'ro')).toEqual([]);
  });
});
