import { buildAccessToken } from '@/test/factories/auth';
import {
  emailLinkTarget,
  homePathFor,
  isExpiredLinkCode,
  isRecentLinkSignIn,
  otherPanelRedirect,
  postSignInPath,
  rolesFromAccessToken,
  settingsPathFor,
  signInMethodFromAccessToken,
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
      expect(rolesFromAccessToken(buildAccessToken({ user_roles: ['partner', 'user'] }))).toEqual([
        'user',
      ]);
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

    it('sends inspectors to their agenda, unless they are also admins', () => {
      expect(homePathFor(['user', 'inspector'])).toBe('/field');
      expect(homePathFor(['admin', 'inspector'])).toBe('/admin');
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

    it('opens the settings inside the inspector area for inspectors', () => {
      expect(settingsPathFor(['inspector'])).toBe('/field/settings');
    });
  });

  describe('otherPanelRedirect', () => {
    it('lets each role into its own panel', () => {
      expect(otherPanelRedirect(['user'], '/account/listings')).toBeNull();
      expect(otherPanelRedirect(['admin'], '/admin/users')).toBeNull();
      expect(otherPanelRedirect(['inspector'], '/field/availability')).toBeNull();
    });

    it('sends a role out of another panel to its own home', () => {
      expect(otherPanelRedirect(['inspector'], '/account/listings')).toBe('/field');
      expect(otherPanelRedirect(['user'], '/field')).toBe('/account');
      expect(otherPanelRedirect(['admin'], '/account')).toBe('/admin');
      expect(otherPanelRedirect(['inspector'], '/admin/users')).toBe('/field');
    });

    it('keeps a settings page a settings page', () => {
      expect(otherPanelRedirect(['inspector'], '/account/settings')).toBe('/field/settings');
      expect(otherPanelRedirect(['admin'], '/account/settings/')).toBe('/admin/settings');
      expect(otherPanelRedirect(['user'], '/field/settings')).toBe('/account/settings');
    });

    it('leaves pages outside the panels alone', () => {
      expect(otherPanelRedirect(['inspector'], '/listings')).toBeNull();
      expect(otherPanelRedirect(['user'], '/administration')).toBeNull();
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

    it('keeps every panel for its own role', () => {
      expect(postSignInPath(['inspector'], '/account/listings')).toBe('/field');
      expect(postSignInPath(['user'], '/field/availability')).toBe('/account');
      expect(postSignInPath(['inspector'], '/field/availability')).toBe('/field/availability');
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
});
