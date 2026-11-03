import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildUser, signedInAs } from '@/test/factories/auth';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { signInWithPassword, signOut } from '../api/auth.api';
import { NewPasswordPage } from './new-password-page';

async function fillPasswords(
  user: Awaited<ReturnType<typeof renderWithProviders>>['user'],
  password: string,
  confirmPassword = password,
) {
  await user.type(screen.getByLabelText(roAuth.newPassword.password), password);
  await user.type(screen.getByLabelText(roAuth.newPassword.confirm), confirmPassword);
  await user.click(screen.getByRole('button', { name: roAuth.newPassword.submit }));
}

describe('NewPasswordPage', { timeout: 20_000 }, () => {
  beforeEach(async () => {
    await signInWithPassword({ email: 'ana.ro@example.test', password: 'Parola-Test-2026' });
  });

  afterEach(async () => {
    await signOut();
  });

  it('explains an expired link when there is no recovery session', async () => {
    await renderWithProviders(<NewPasswordPage />);

    expect(screen.getByText(roAuth.newPassword.expired.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: roAuth.newPassword.expired.action })).toHaveAttribute(
      'href',
      '/password-reset',
    );
  });

  it('asks for the same password twice', async () => {
    const { user } = await renderWithProviders(<NewPasswordPage />, { auth: signedInAs() });

    await fillPasswords(user, 'Parola-Noua-2026', 'Parola-Alta-2026');

    expect(await screen.findByText(roAuth.newPassword.mismatch)).toBeInTheDocument();
  });

  it('saves the new password and opens the user panel', async () => {
    const requests: unknown[] = [];
    server.use(
      http.put(supabaseUrl('/auth/v1/user'), async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(buildUser());
      }),
    );
    const { user, router } = await renderWithProviders(<NewPasswordPage />, {
      auth: signedInAs(),
    });

    await fillPasswords(user, 'Parola-Noua-2026');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account');
    });
    expect(requests).toEqual([expect.objectContaining({ password: 'Parola-Noua-2026' })]);
  });

  it('shows the reason next to the field when the password is the old one', async () => {
    server.use(
      http.put(supabaseUrl('/auth/v1/user'), () => authErrorResponse('same_password', 422)),
    );
    const { user } = await renderWithProviders(<NewPasswordPage />, { auth: signedInAs() });

    await fillPasswords(user, 'Parola-Test-2026');

    expect(await screen.findByText(roCommon.errors.reasons.same_password)).toBeInTheDocument();
  });
});
