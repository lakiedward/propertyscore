import { homePathFor, postSignInPath } from './auth.utils';

describe('homePathFor', () => {
  it('sends admins to the admin panel', () => {
    expect(homePathFor(['admin'])).toBe('/admin');
  });

  it('sends everyone else to the user panel', () => {
    expect(homePathFor([])).toBe('/account');
  });
});

describe('postSignInPath', () => {
  it('keeps a safe redirect inside the site', () => {
    expect(postSignInPath(['admin'], '/check/result/abc?tab=green')).toBe(
      '/check/result/abc?tab=green',
    );
  });

  it('falls back to the role home without a redirect', () => {
    expect(postSignInPath(['admin'], undefined)).toBe('/admin');
    expect(postSignInPath([], undefined)).toBe('/account');
  });

  it('ignores a redirect to another site', () => {
    expect(postSignInPath([], 'https://evil.example/steal')).toBe('/account');
    expect(postSignInPath(['admin'], '//evil.example')).toBe('/admin');
  });
});
