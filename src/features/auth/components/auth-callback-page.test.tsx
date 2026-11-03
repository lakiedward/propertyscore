import { screen, waitFor } from '@testing-library/react';
import roAuth from '@/i18n/locales/ro/auth.json';
import { signedInAs } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

describe('AuthCallbackPage', { timeout: 20_000 }, () => {
  it('sends a signed-in admin to the admin panel', async () => {
    const { router } = await renderAppRoute('/auth/callback', { auth: signedInAs('admin') });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin');
    });
  });

  it('keeps the page the visitor asked for before signing in', async () => {
    const { router } = await renderAppRoute('/auth/callback?redirect=%2Fpassword-reset%2Fnew', {
      auth: signedInAs(),
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/password-reset/new');
    });
  });

  it('explains an expired link', async () => {
    await renderAppRoute('/auth/callback?error_code=otp_expired');

    expect(await screen.findByText(roAuth.callback.expired)).toBeInTheDocument();
  });

  it('explains a sign-in that did not finish', async () => {
    await renderAppRoute('/auth/callback');

    expect(await screen.findByText(roAuth.callback.failed)).toBeInTheDocument();
  });
});
