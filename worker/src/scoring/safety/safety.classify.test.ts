import { describe, expect, it } from 'vitest';

import { classifySafetyFeature, isStreet, nightStateOf } from './safety.classify.ts';

const rule = { minute: 23 * 60, minOpenNights: 5 };

describe('classifySafetyFeature', () => {
  it('reads lamps and lit streets as lighting', () => {
    expect(classifySafetyFeature({ highway: 'street_lamp' }, 'Point', rule)).toEqual([
      { type: 'lighting', nightState: 'unknown' },
    ]);
    expect(
      classifySafetyFeature({ highway: 'residential', lit: 'yes' }, 'LineString', rule),
    ).toEqual([{ type: 'lighting', nightState: 'unknown' }]);
    expect(
      classifySafetyFeature({ highway: 'residential', lit: 'no' }, 'LineString', rule),
    ).toEqual([]);
  });

  it('treats unlit or tunnelled footpaths and main railway lines as isolated passages', () => {
    expect(classifySafetyFeature({ highway: 'footway', lit: 'no' }, 'LineString', rule)).toEqual([
      { type: 'isolated_passage', nightState: 'unknown' },
    ]);
    expect(
      classifySafetyFeature({ highway: 'footway', tunnel: 'yes', lit: 'yes' }, 'LineString', rule),
    ).toEqual([{ type: 'isolated_passage', nightState: 'unknown' }]);
    expect(classifySafetyFeature({ railway: 'rail' }, 'LineString', rule)).toEqual([
      { type: 'isolated_passage', nightState: 'unknown' },
    ]);
    expect(
      classifySafetyFeature({ railway: 'rail', service: 'siding' }, 'LineString', rule),
    ).toEqual([]);
  });

  it('splits shops by their opening hours at night', () => {
    expect(
      classifySafetyFeature({ shop: 'convenience', opening_hours: '24/7' }, 'Point', rule),
    ).toEqual([{ type: 'nonstop', nightState: 'open' }]);
    expect(
      classifySafetyFeature(
        { shop: 'supermarket', opening_hours: 'Mo-Su 07:00-23:30' },
        'Point',
        rule,
      ),
    ).toEqual([{ type: 'shop', nightState: 'open' }]);
    expect(
      classifySafetyFeature({ shop: 'bakery', opening_hours: 'Mo-Fr 07:00-19:00' }, 'Point', rule),
    ).toEqual([{ type: 'shop', nightState: 'closed' }]);
    expect(classifySafetyFeature({ shop: 'florist' }, 'Point', rule)).toEqual([
      { type: 'shop', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ shop: 'vacant' }, 'Point', rule)).toEqual([]);
  });

  it('counts a 24/7 pharmacy or fuel station as non-stop only when it never closes', () => {
    expect(
      classifySafetyFeature({ amenity: 'pharmacy', opening_hours: '24/7' }, 'Point', rule),
    ).toEqual([{ type: 'nonstop', nightState: 'open' }]);
    expect(
      classifySafetyFeature({ amenity: 'fuel', opening_hours: 'Mo-Su 06:00-22:00' }, 'Point', rule),
    ).toEqual([]);
  });

  it('reads services, bars, parks, stations and stops', () => {
    expect(classifySafetyFeature({ amenity: 'police' }, 'Point', rule)).toEqual([
      { type: 'police', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ amenity: 'fire_station' }, 'Polygon', rule)).toEqual([
      { type: 'fire_station', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ office: 'diplomatic' }, 'Point', rule)).toEqual([
      { type: 'diplomatic', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ amenity: 'pub' }, 'Point', rule)).toEqual([
      { type: 'bar', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ leisure: 'park', lit: 'yes' }, 'MultiPolygon', rule)).toEqual([
      { type: 'park_lit', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ leisure: 'park' }, 'MultiPolygon', rule)).toEqual([
      { type: 'park', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ railway: 'station', train: 'yes' }, 'Point', rule)).toEqual([
      { type: 'train_station', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ railway: 'station', station: 'subway' }, 'Point', rule)).toEqual(
      [],
    );
    expect(classifySafetyFeature({ railway: 'halt' }, 'Point', rule)).toEqual([
      { type: 'train_halt', nightState: 'unknown' },
    ]);
    expect(classifySafetyFeature({ highway: 'bus_stop' }, 'Point', rule)).toEqual([
      { type: 'transit_stop', nightState: 'unknown' },
    ]);
    expect(
      classifySafetyFeature({ public_transport: 'platform', tram: 'yes' }, 'Point', rule),
    ).toEqual([{ type: 'transit_stop', nightState: 'unknown' }]);
  });

  it('gives one element every type it belongs to, once', () => {
    expect(
      classifySafetyFeature(
        { building: 'retail', shop: 'mall', opening_hours: '24/7' },
        'Polygon',
        rule,
      ),
    ).toEqual([
      { type: 'nonstop', nightState: 'open' },
      { type: 'mixed_use', nightState: 'unknown' },
    ]);
  });
});

describe('nightStateOf', () => {
  it('needs the place open on enough nights', () => {
    expect(nightStateOf({ opening_hours: 'Fr,Sa 18:00-02:00' }, rule)).toBe('closed');
    expect(nightStateOf({ opening_hours: 'Mo-Fr 18:00-02:00' }, rule)).toBe('open');
    expect(nightStateOf({ opening_hours: 'by appointment' }, rule)).toBe('unknown');
    expect(nightStateOf({}, rule)).toBe('unknown');
  });
});

describe('isStreet', () => {
  it('counts road classes, not paths', () => {
    expect(isStreet({ highway: 'residential' }, 'LineString')).toBe(true);
    expect(isStreet({ highway: 'footway' }, 'LineString')).toBe(false);
    expect(isStreet({ highway: 'residential' }, 'Point')).toBe(false);
  });
});
