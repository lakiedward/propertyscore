import { homePathFor, isPhoneNumber, postSignInPath, toE164Phone } from './auth.utils';

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

describe('toE164Phone', () => {
  it('turns a Romanian national number into E.164', () => {
    expect(toE164Phone('0722 123 456')).toBe('+40722123456');
    expect(toE164Phone('(021) 315.15.15')).toBe('+40213151515');
  });

  it('keeps an international number and replaces a leading 00 with +', () => {
    expect(toE164Phone('+40 722-123-456')).toBe('+40722123456');
    expect(toE164Phone('0044 20 7946 0958')).toBe('+442079460958');
  });
});

describe('isPhoneNumber', () => {
  it('accepts Romanian and international numbers', () => {
    expect(isPhoneNumber('0722 123 456')).toBe(true);
    expect(isPhoneNumber('+40 722 123 456')).toBe(true);
    expect(isPhoneNumber('+44 20 7946 0958')).toBe(true);
  });

  it('rejects short, long and non-numeric input', () => {
    expect(isPhoneNumber('0722 123')).toBe(false);
    expect(isPhoneNumber('+40 722 123 4567')).toBe(false);
    expect(isPhoneNumber('+123')).toBe(false);
    expect(isPhoneNumber('telefon')).toBe(false);
  });
});
