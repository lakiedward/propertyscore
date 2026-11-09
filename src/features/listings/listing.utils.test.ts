import {
  countPointsByRegion,
  isWithinBounds,
  moveId,
  parseEwkbPoint,
  toTrustKind,
} from './listing.utils';

describe('listing utils', () => {
  it('maps the verification to the trust badge kind', () => {
    expect(toTrustKind('physical')).toBe('physical');
    expect(toTrustKind('smartcheck')).toBe('online');
    expect(toTrustKind('none')).toBe('none');
  });

  it('reads the longitude and latitude of a PostGIS point', () => {
    const point = parseEwkbPoint('0101000020E610000052616C21C8393540AA2B9FE579E04640');
    expect(point?.[0]).toBeCloseTo(21.2257, 3);
    expect(point?.[1]).toBeCloseTo(45.7537, 3);
  });

  it('moves an id to a new place and keeps the others in order', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveId(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveId(['a', 'b', 'c'], 'b', 9)).toEqual(['a', 'c', 'b']);
    expect(moveId(['a', 'b'], 'z', 0)).toEqual(['a', 'b']);
  });

  it('refuses text that is not a point', () => {
    expect(parseEwkbPoint('zz')).toBeNull();
    expect(parseEwkbPoint('0102000020E6100000')).toBeNull();
  });

  it('counts the points that fall inside each region, leaving holes and outside points out', () => {
    const square = (west: number, south: number, size: number) =>
      [
        [west, south],
        [west + size, south],
        [west + size, south + size],
        [west, south + size],
        [west, south],
      ] as const;
    const regions = [
      { id: 'a', coordinates: [[square(0, 0, 10), square(4, 4, 2)]] },
      { id: 'b', coordinates: [[square(20, 0, 5)]] },
    ];
    const points = [
      { longitude: 1, latitude: 1 },
      { longitude: 5, latitude: 5 },
      { longitude: 21, latitude: 2 },
      { longitude: 22, latitude: 3 },
      { longitude: 40, latitude: 40 },
    ];

    expect(countPointsByRegion(points, regions)).toEqual({ a: 1, b: 2 });
  });

  it('tells whether a point lies inside a map area', () => {
    const bounds = { west: 21, south: 45, east: 22, north: 46 };

    expect(isWithinBounds({ longitude: 21.5, latitude: 45.5 }, bounds)).toBe(true);
    expect(isWithinBounds({ longitude: 26, latitude: 44.4 }, bounds)).toBe(false);
  });
});
