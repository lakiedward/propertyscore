import {
  biggestGain,
  componentShares,
  discAreaPerPercent,
  filterParks,
  parkFilterCounts,
  waffleCells,
  walkMinutes,
} from './green-section.utils';
import type { GreenComponent, GreenPark } from './online-report.types';

function park(overrides: Partial<GreenPark>): GreenPark {
  return {
    id: 'park',
    name: 'Parc',
    kind: 'park',
    area_ha: 1,
    amenities: [],
    walk_m: 400,
    center: [21.2, 45.7],
    ...overrides,
  };
}

const COMPONENTS: GreenComponent[] = [
  { key: 'c1', value: 0.184, points: 0.61, weight: 35 },
  { key: 'c2', value: 0.241, points: 0.8, weight: 15 },
  { key: 'c3', value: 720, points: 0.53, weight: 25 },
  { key: 'c4', value: 720, points: 1, weight: 15 },
  { key: 'c5', value: null, points: null, weight: 10 },
];

describe('green section utils', () => {
  it('turns distances and shares into walking minutes and waffle squares', () => {
    expect(walkMinutes(720)).toBe(9);
    expect(walkMinutes(10)).toBe(1);
    expect(waffleCells(0.184)).toBe(18);
    expect(waffleCells(1.2)).toBe(100);
    expect(discAreaPerPercent(500)).toBe(7854);
  });

  it('keeps only the parks that match every filter and counts each filter', () => {
    const parks = [
      park({ id: 'a', amenities: ['playground'], area_ha: 3 }),
      park({ id: 'b', amenities: ['playground', 'dog_park'] }),
      park({ id: 'c', area_ha: 8 }),
    ];

    expect(filterParks(parks, new Set(['playground']), 2).map((item) => item.id)).toEqual([
      'a',
      'b',
    ]);
    expect(filterParks(parks, new Set(['playground', 'large']), 2).map((item) => item.id)).toEqual([
      'a',
    ]);
    expect(parkFilterCounts(parks, 2)).toEqual({ playground: 2, dog_park: 1, large: 2 });
    expect(parkFilterCounts(parks, 5).large).toBe(1);
  });

  it('splits the score between the components that have data', () => {
    const shares = componentShares(COMPONENTS);
    const total = shares.reduce((sum, share) => sum + share.earned, 0);

    expect(Math.round(total)).toBe(68);
    expect(shares.find((share) => share.key === 'c5')).toMatchObject({ earned: 0, available: 0 });
    expect(Math.round(shares[0]?.available ?? 0)).toBe(39);
  });

  it('names the component that would add the most points', () => {
    expect(biggestGain(componentShares(COMPONENTS))).toEqual({ key: 'c1', points: 15 });
    expect(
      biggestGain(componentShares([{ key: 'c1', value: 0.4, points: 1, weight: 35 }])),
    ).toBeUndefined();
  });
});
