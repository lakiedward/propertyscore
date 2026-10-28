import { toCurrency, toTrustKind } from './listing.utils';

describe('listing utils', () => {
  it('keeps the currency of the record', () => {
    expect(toCurrency('EUR')).toBe('EUR');
    expect(toCurrency('RON')).toBe('RON');
  });

  it('maps the verification to the trust badge kind', () => {
    expect(toTrustKind('physical')).toBe('physical');
    expect(toTrustKind('smartcheck')).toBe('online');
    expect(toTrustKind('none')).toBe('none');
  });
});
