import { safeRedirectPath } from './url';

describe('safeRedirectPath', () => {
  it('keeps a same-origin path with its search', () => {
    expect(safeRedirectPath('/properties?page=2')).toBe('/properties?page=2');
  });

  it.each([undefined, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'properties'])(
    'falls back to the account page for %s',
    (value) => {
      expect(safeRedirectPath(value)).toBe('/account');
    },
  );
});
