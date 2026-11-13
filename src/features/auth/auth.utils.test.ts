import { buildAccessToken } from '@/test/factories/auth';
import {
  emailLinkTarget,
  homePathFor,
  isExpiredLinkCode,
  isPhoneNumber,
  isRecentLinkSignIn,
  postSignInPath,
  rolesFromAccessToken,
  settingsPathFor,
  signInMethodFromAccessToken,
  toE164Phone,
} from './auth.utils';

describe('auth.utils', () => {
  describe('rolesFromAccessToken', () => {
    it('reads the user role from the token', () => {
      expect(rolesFromAccessToken(buildAccessToken())).toEqual(['user']);
    });

    it('reads the admin role from the token', () => {
      expect(rolesFromAccessToken(buildAccessToken({ user_roles: ['admin'] }))).toEqual(['admin']);
    });

    it('drops roles the app does not know', () => {
      expect(rolesFromAccessToken(buildAccessToken({ user_roles: ['inspector', 'user'] }))).toEqual(
        ['user'],
      );
    });

    it('returns no roles for a garbage token', () => {
      expect(rolesFromAccessToken('not-a-token')).toEqual([]);
      expect(rolesFromAccessToken('header.%%%.signature')).toEqual([]);
    });

    it('returns no roles without a token', () => {
      expect(rolesFromAccessToken(undefined)).toEqual([]);
    });
  });

  describe('signInMethodFromAccessToken', () => {
    it('picks the latest sign-in method', () => {
      const token = buildAccessToken({
        amr: [
          { method: 'password', timestamp: 1_000 },
          { method: 'otp', timestamp: 3_000 },
          { method: 'oauth', timestamp: 2_000 },
        ],
      });

      expect(signInMethodFromAccessToken(token)).toEqual({ method: 'otp', signedInAt: 3_000 });
    });

    it('returns nothing when the token has no sign-in methods', () => {
      expect(signInMethodFromAccessToken(buildAccessToken({ amr: [] }))).toBe(undefined);
      expect(signInMethodFromAccessToken(undefined)).toBe(undefined);
    });
  });

  describe('isRecentLinkSignIn', () => {
    it('accepts an email link sign-in from the last 15 minutes', () => {
      expect(isRecentLinkSignIn({ method: 'otp', signedInAt: 1_000 }, 1_500)).toBe(true);
      expect(isRecentLinkSignIn({ method: 'otp', signedInAt: 1_000 }, 1_900)).toBe(true);
    });

    it('rejects an older email link sign-in', () => {
      expect(isRecentLinkSignIn({ method: 'otp', signedInAt: 1_000 }, 1_901)).toBe(false);
    });

    it('rejects a password sign-in', () => {
      expect(isRecentLinkSignIn({ method: 'password', signedInAt: 1_000 }, 1_100)).toBe(false);
    });

    it('rejects a missing sign-in method', () => {
      expect(isRecentLinkSignIn(undefined, 1_100)).toBe(false);
    });
  });

  describe('homePathFor', () => {
    it('sends admins to the admin panel', () => {
      expect(homePathFor(['admin'])).toBe('/admin');
    });

    it('sends everyone else to the user panel', () => {
      expect(homePathFor([])).toBe('/account');
    });
  });

  describe('settingsPathFor', () => {
    it('opens the settings inside the admin panel for admins', () => {
      expect(settingsPathFor(['admin'])).toBe('/admin/settings');
    });

    it('opens the settings inside the user panel for everyone else', () => {
      expect(settingsPathFor(['user'])).toBe('/account/settings');
      expect(settingsPathFor([])).toBe('/account/settings');
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
      expect(postSignInPath(['user'], '/.//evil.com')).toBe('/account');
    });

    it('keeps the admin panel for admins only', () => {
      expect(postSignInPath(['user'], '/admin/users')).toBe('/account');
      expect(postSignInPath(['admin'], '/admin/users')).toBe('/admin/users');
    });
  });

  describe('emailLinkTarget', () => {
    it('opens the new password screen for a recovery link', () => {
      expect(emailLinkTarget('recovery', undefined, ['user'])).toBe('/password-reset/new');
    });

    it('opens the settings for an email change link', () => {
      expect(emailLinkTarget('email_change', undefined, ['user'])).toBe('/account/settings');
      expect(emailLinkTarget('email_change', undefined, ['admin'])).toBe('/admin/settings');
    });

    it('follows the redirect carried by a confirmation link', () => {
      expect(
        emailLinkTarget('signup', 'http://127.0.0.1:5173/?redirect=%2Fpublish', ['user']),
      ).toBe('/publish');
    });

    it('falls back to the role home for a malformed next address', () => {
      expect(emailLinkTarget('signup', 'not a url', ['user'])).toBe('/account');
    });

    it('sends an admin without a redirect to the admin panel', () => {
      expect(emailLinkTarget('signup', 'http://127.0.0.1:5173/', ['admin'])).toBe('/admin');
    });
  });

  describe('isExpiredLinkCode', () => {
    it.each(['otp_expired', 'flow_state_expired', 'flow_state_not_found'])(
      'treats %s as an expired link',
      (code) => {
        expect(isExpiredLinkCode(code)).toBe(true);
      },
    );

    it('does not treat other codes as an expired link', () => {
      expect(isExpiredLinkCode('access_denied')).toBe(false);
      expect(isExpiredLinkCode(undefined)).toBe(false);
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
});
