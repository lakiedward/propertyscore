import { screen, waitFor } from '@testing-library/react';
import roAuth from '@/i18n/locales/ro/auth.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

describe('AuthCallbackPage', { timeout: 20_000 }, () => {
  it('sends a signed-in admin to the admin panel', async () => {
    const { router } = await renderAppRoute('/auth/callback', { auth: signedInAs('admin') });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin');
    });
  });

  it('keeps the page the visitor asked for before signing in', async () => {
    const { router } = await renderAppRoute('/auth/callback?redirect=%2Fpublish', {
      auth: signedInAs(),
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/publish');
    });
  });

  it('explains an expired link', async () => {
    await renderAppRoute('/auth/callback?error_code=otp_expired');

    expect(await screen.findByText(roAuth.callback.expired)).toBeInTheDocument();
  });

  it('explains a cancelled Google sign-in and links back to the asked page', async () => {
    await renderAppRoute('/auth/callback?error=access_denied&redirect=%2Fpublish', {
      auth: signedOut,
    });

    expect(await screen.findByText(roAuth.callback.cancelled)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: roAuth.callback.backToLogin })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fpublish',
    );
  });

  it('explains a sign-in that did not finish', async () => {
    await renderAppRoute('/auth/callback');

    expect(await screen.findByText(roAuth.callback.failed)).toBeInTheDocument();
  });
});
