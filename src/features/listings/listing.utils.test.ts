import { moveId, parseEwkbPoint, toTrustKind } from './listing.utils';

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
});
