import {
  moveId,
  parseEwkbPoint,
  sameListingBounds,
  toListingBounds,
  toMapRegions,
  toTilePin,
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

  it('widens the map area to whole steps so a tiny pan keeps the same area', () => {
    const area = toListingBounds([
      [21.123456, 45.712341],
      [21.234567, 45.812349],
    ]);

    expect(area).toEqual({ west: 21.1234, south: 45.7123, east: 21.2346, north: 45.8124 });
    expect(sameListingBounds(area, { ...area })).toBe(true);
    expect(sameListingBounds(area, { ...area, east: 21.3 })).toBe(false);
    expect(sameListingBounds(area, undefined)).toBe(false);
  });

  it('turns a listing into a map pin', () => {
    expect(
      toTilePin({ id: 'a', longitude: 21.2, latitude: 45.7, price: 90000, currency: 'EUR' }),
    ).toEqual({ id: 'a', position: [21.2, 45.7], price: 90000, currency: 'EUR' });
  });

  it('shades each county by its share of the busiest county', () => {
    const regions = toMapRegions({
      shapes: {
        outline: [],
        regions: [
          { id: 'timis', name: 'Timiș', coordinates: [] },
          { id: 'cluj', name: 'Cluj', coordinates: [] },
          { id: 'iasi', name: 'Iași', coordinates: [] },
        ],
      },
      counties: [
        { county_id: 'timis', listing_count: 4 },
        { county_id: 'cluj', listing_count: 2 },
      ],
      selectedId: 'cluj',
      labelOf: (region, count) => `${region.name}: ${String(count)}`,
    });

    expect(regions.areas.map((area) => [area.id, area.weight, area.label])).toEqual([
      ['timis', 1, 'Timiș: 4'],
      ['cluj', 0.5, 'Cluj: 2'],
      ['iasi', 0, 'Iași: 0'],
    ]);
    expect(regions.selectedId).toBe('cluj');
  });
});
