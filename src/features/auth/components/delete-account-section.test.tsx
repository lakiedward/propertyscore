import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs } from '@/test/factories/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { signInWithPassword, signOut } from '../api/auth.api';
import { DeleteAccountSection } from './delete-account-section';

const EMAIL = 'ana.ro@example.test';

function functionError(message: string) {
  return HttpResponse.json({ code: 'P0001', message, details: null, hint: null }, { status: 400 });
}

function answerDelete(response: () => Response) {
  const requests: unknown[] = [];
  server.use(
    http.post(supabaseUrl('/rest/v1/rpc/delete_own_account'), async ({ request }) => {
      requests.push(await request.json());
      return response();
    }),
  );
  return requests;
}

describe('DeleteAccountSection', { timeout: 20_000 }, () => {
  beforeEach(async () => {
    await signInWithPassword({ email: EMAIL, password: 'Parola-Test-2026' });
  });

  afterEach(async () => {
    await signOut();
  });

  it('deletes the account with the password and goes home', async () => {
    const requests = answerDelete(() => new HttpResponse(null, { status: 204 }));
    const { user, router } = await renderWithProviders(
      <DeleteAccountSection email={EMAIL} hasPassword />,
      { path: '/account/settings', auth: signedInAs() },
    );

    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.open }));
    await user.type(screen.getByLabelText(roAuth.settings.delete.password), 'Parola-Test-2026');
    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.submit }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(requests).toEqual([{ confirmation: 'Parola-Test-2026' }]);
  });

  it('asks for the password before deleting', async () => {
    const requests = answerDelete(() => new HttpResponse(null, { status: 204 }));
    const { user } = await renderWithProviders(<DeleteAccountSection email={EMAIL} hasPassword />, {
      auth: signedInAs(),
    });

    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.open }));
    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.submit }));

    expect(await screen.findByText(roAuth.settings.delete.passwordRequired)).toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('shows a wrong password next to its field', async () => {
    answerDelete(() => functionError('invalid_password'));
    const { user } = await renderWithProviders(<DeleteAccountSection email={EMAIL} hasPassword />, {
      auth: signedInAs(),
    });

    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.open }));
    await user.type(screen.getByLabelText(roAuth.settings.delete.password), 'Parola-Gresita-1');
    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.submit }));

    expect(await screen.findByText(roCommon.errors.reasons.invalid_password)).toBeInTheDocument();
  });

  it('asks an account without a password for its email', async () => {
    const requests = answerDelete(() => new HttpResponse(null, { status: 204 }));
    const { user } = await renderWithProviders(
      <DeleteAccountSection email={EMAIL} hasPassword={false} />,
      { path: '/account/settings', auth: signedInAs() },
    );

    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.open }));
    await user.type(screen.getByLabelText(roAuth.settings.delete.email), EMAIL);
    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.submit }));

    await waitFor(() => {
      expect(requests).toEqual([{ confirmation: EMAIL }]);
    });
  });

  it('explains why the last admin cannot delete their account', async () => {
    answerDelete(() => functionError('last_admin'));
    const { user } = await renderWithProviders(<DeleteAccountSection email={EMAIL} hasPassword />, {
      auth: signedInAs('admin'),
    });

    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.open }));
    await user.type(screen.getByLabelText(roAuth.settings.delete.password), 'Parola-Test-2026');
    await user.click(screen.getByRole('button', { name: roAuth.settings.delete.submit }));

    expect(await screen.findByText(roCommon.errors.reasons.last_admin)).toBeInTheDocument();
  });
});
