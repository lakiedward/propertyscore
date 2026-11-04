import { redactShareToken, redactShareTokensIn, safeRedirectPath } from './url';

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

describe('redactShareToken', () => {
  const token = 'a'.repeat(48);

  it.each([
    [
      `https://app.test/check/result/r1?share=${token}`,
      'https://app.test/check/result/r1?share=[redacted]',
    ],
    [
      `/check/result/r1?tab=green&share=${token}#map`,
      '/check/result/r1?tab=green&share=[redacted]#map',
    ],
    [`share=${token}`, 'share=[redacted]'],
    [
      `/login?redirect=%2Fcheck%2Fresult%2Fr1%3Fshare%3D${token}`,
      '/login?redirect=%2Fcheck%2Fresult%2Fr1%3Fshare%3D[redacted]',
    ],
  ])('removes the token from %s', (value, expected) => {
    expect(redactShareToken(value)).toBe(expected);
  });

  it('keeps other parameters that end in share', () => {
    expect(redactShareToken('/x?reshare=1&tab=share')).toBe('/x?reshare=1&tab=share');
  });
});

describe('redactShareTokensIn', () => {
  it('redacts every nested string and keeps the same object', () => {
    const token = 'b'.repeat(48);
    const event = {
      request: {
        url: `https://app.test/r?share=${token}`,
        headers: { Referer: `/r?share=${token}` },
      },
      breadcrumbs: [{ category: 'navigation', data: { from: '/', to: `/r?share=${token}` } }],
      level: 'error',
    };

    const result = redactShareTokensIn(event);

    expect(result).toBe(event);
    expect(JSON.stringify(event)).not.toContain(token);
    expect(event.level).toBe('error');
  });
});
