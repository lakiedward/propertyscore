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
import { ChangePasswordSection } from './change-password-section';

type TestUser = Awaited<ReturnType<typeof renderWithProviders>>['user'];

async function fillNewPassword(user: TestUser, password: string, confirmPassword = password) {
  await user.type(screen.getByLabelText(roAuth.settings.password.new), password);
  await user.type(screen.getByLabelText(roAuth.settings.password.confirm), confirmPassword);
}

function recordPasswordUpdates() {
  const requests: unknown[] = [];
  server.use(
    http.put(supabaseUrl('/auth/v1/user'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(buildUser());
    }),
  );
  return requests;
}

describe('ChangePasswordSection', { timeout: 20_000 }, () => {
  beforeEach(async () => {
    await signInWithPassword({ email: 'ana.ro@example.test', password: 'Parola-Test-2026' });
  });

  afterEach(async () => {
    await signOut();
  });

  it('asks for the current password before changing it', async () => {
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await fillNewPassword(user, 'Parola-Noua-2026');
    await user.click(screen.getByRole('button', { name: roAuth.settings.password.submit }));

    expect(await screen.findByText(roAuth.settings.password.currentRequired)).toBeInTheDocument();
  });

  it('sends the current and the new password and clears the form', async () => {
    const requests = recordPasswordUpdates();
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await user.type(screen.getByLabelText(roAuth.settings.password.current), 'Parola-Test-2026');
    await fillNewPassword(user, 'Parola-Noua-2026');
    await user.click(screen.getByRole('button', { name: roAuth.settings.password.submit }));

    await waitFor(() => {
      expect(requests).toEqual([
        expect.objectContaining({
          password: 'Parola-Noua-2026',
          current_password: 'Parola-Test-2026',
        }),
      ]);
    });
    await waitFor(() => {
      expect(screen.getByLabelText(roAuth.settings.password.new)).toHaveValue('');
    });
  });

  it('shows a wrong current password next to its field', async () => {
    server.use(
      http.put(supabaseUrl('/auth/v1/user'), () =>
        authErrorResponse('current_password_invalid', 400),
      ),
    );
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await user.type(screen.getByLabelText(roAuth.settings.password.current), 'Parola-Gresita-1');
    await fillNewPassword(user, 'Parola-Noua-2026');
    await user.click(screen.getByRole('button', { name: roAuth.settings.password.submit }));

    expect(
      await screen.findByText(roCommon.errors.reasons.current_password_invalid),
    ).toBeInTheDocument();
  });

  it('lets an account without a password set one', async () => {
    const requests = recordPasswordUpdates();
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword={false} />, {
      auth: signedInAs(),
    });

    expect(screen.getByRole('heading', { name: roAuth.settings.password.setTitle })).toBeVisible();
    expect(screen.queryByLabelText(roAuth.settings.password.current)).not.toBeInTheDocument();

    await fillNewPassword(user, 'Parola-Noua-2026');
    await user.click(screen.getByRole('button', { name: roAuth.settings.password.setSubmit }));

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).not.toHaveProperty('current_password');
  });
});
