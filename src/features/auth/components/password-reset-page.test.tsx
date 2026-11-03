import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import { signedInAs } from '@/test/factories/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute, renderWithProviders } from '@/test/render';
import { PasswordResetPage } from './password-reset-page';

describe('PasswordResetPage', { timeout: 20_000 }, () => {
  it('sends the reset link to the typed email and confirms it', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/auth/v1/recover'), async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json({});
      }),
    );
    const { user } = await renderWithProviders(<PasswordResetPage />);

    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'ana.ro@example.test');
    await user.click(screen.getByRole('button', { name: roAuth.passwordReset.submit }));

    expect(
      await screen.findByRole('heading', { name: roAuth.passwordReset.sent.title }),
    ).toBeInTheDocument();
    expect(requests).toEqual([expect.objectContaining({ email: 'ana.ro@example.test' })]);
  });

  it('asks for a valid email before sending', async () => {
    const { user } = await renderWithProviders(<PasswordResetPage />);

    await user.click(screen.getByRole('button', { name: roAuth.passwordReset.submit }));

    expect(await screen.findByText(roAuth.fields.email.error)).toBeInTheDocument();
  });

  it('sends a signed-in admin to the admin panel', async () => {
    const { router } = await renderAppRoute('/password-reset', { auth: signedInAs('admin') });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin');
    });
  });
});
