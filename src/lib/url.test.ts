import { safeRedirectPath } from './url';

describe('safeRedirectPath', () => {
  it.each([
    ['/properties?page=2', '/properties?page=2'],
    ['/account#security', '/account#security'],
    ['/properties?page=2&sort=price#list', '/properties?page=2&sort=price#list'],
  ])('keeps the same-origin path %s', (value, expected) => {
    expect(safeRedirectPath(value)).toBe(expected);
  });

  it.each([
    undefined,
    '',
    'properties',
    'https://evil.test',
    '//evil.test',
    '//evil',
    '/\\evil',
    '/\\evil.test',
    '/\t/evil.test',
    '/\n/evil.test',
    '/\r\n/evil.test',
    '%2F%2Fevil.test',
    '/%2F%2Fevil.test',
  ])('never leaves the origin for %j', (value) => {
    const result = safeRedirectPath(value);
    expect(new URL(result, window.location.origin).origin).toBe(window.location.origin);
    expect(result.startsWith('//')).toBe(false);
  });

  it.each([undefined, '', 'properties', 'https://evil.test', '//evil', '/\\evil', '/\t/evil.test'])(
    'falls back to the account page for %j',
    (value) => {
      expect(safeRedirectPath(value)).toBe('/account');
    },
  );

  it('uses the given fallback', () => {
    expect(safeRedirectPath('//evil.test', '/')).toBe('/');
  });
});
