import { redactShareToken, redactShareTokensIn, safeRedirectPath } from './url';

describe('safeRedirectPath', () => {
  it('keeps a same-origin path with its search', () => {
    expect(safeRedirectPath('/properties?page=2')).toBe('/properties?page=2');
  });

  it.each([undefined, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'properties'])(
    'falls back to the home page for %s',
    (value) => {
      expect(safeRedirectPath(value)).toBe('/');
    },
  );
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
