import { screen, waitFor } from '@testing-library/react';
import roAuth from '@/i18n/locales/ro/auth.json';
import { buildSession } from '@/test/factories/auth';
import { renderAppRoute, renderWithProviders } from '@/test/render';
import { PasswordResetPage } from './password-reset-page';

describe('PasswordResetPage', { timeout: 20_000 }, () => {
  it('says that password reset is not available yet and links back to sign-in', async () => {
    await renderWithProviders(<PasswordResetPage />);

    expect(screen.getByRole('status')).toHaveTextContent(roAuth.passwordReset.unavailable.title);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: roAuth.passwordReset.backToLogin })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('shows the same notice on the new-password address', async () => {
    await renderAppRoute('/password-reset/new');

    expect(await screen.findByText(roAuth.passwordReset.unavailable.title)).toBeInTheDocument();
  });

  it('sends a signed-in visitor to the account page', async () => {
    const session = buildSession();
    const { router } = await renderAppRoute('/password-reset', {
      auth: { session, user: session.user },
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account');
    });
  });
});
