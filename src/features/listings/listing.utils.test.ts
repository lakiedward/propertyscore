import { parseEwkbPoint, toCurrency, toTrustKind } from './listing.utils';

describe('listing utils', () => {
  it('keeps the currency of the record', () => {
    expect(toCurrency('EUR')).toBe('EUR');
    expect(toCurrency('RON')).toBe('RON');
    expect(toCurrency('USD')).toBe('RON');
  });

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

  it('refuses text that is not a point', () => {
    expect(parseEwkbPoint('zz')).toBeNull();
    expect(parseEwkbPoint('0102000020E6100000')).toBeNull();
  });
});
