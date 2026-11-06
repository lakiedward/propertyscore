import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { toast } from 'sonner';
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

function pluralText(template: string, count: number): string {
  return template.replace('{{count}}', String(count));
}

function recordLogouts() {
  const urls: string[] = [];
  server.use(
    http.post(supabaseUrl('/auth/v1/logout'), ({ request }) => {
      urls.push(request.url);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return urls;
}

async function submitChange(user: TestUser, password: string, confirmPassword = password) {
  await user.type(screen.getByLabelText(roAuth.settings.password.current), 'Parola-Test-2026');
  await fillNewPassword(user, password, confirmPassword);
  await user.click(screen.getByRole('button', { name: roAuth.settings.password.submit }));
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
    vi.restoreAllMocks();
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

  it('signs out the other sessions once after the change', async () => {
    recordPasswordUpdates();
    const logouts = recordLogouts();
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await submitChange(user, 'Parola-Noua-2026');

    await waitFor(() => {
      expect(screen.getByLabelText(roAuth.settings.password.new)).toHaveValue('');
    });
    expect(logouts).toHaveLength(1);
    expect(new URL(logouts[0] ?? '').searchParams.get('scope')).toBe('others');
  });

  it('keeps the change when signing out the other sessions fails', async () => {
    recordPasswordUpdates();
    server.use(
      http.post(
        supabaseUrl('/auth/v1/logout'),
        () => authErrorResponse('unexpected_failure', 500),
        { once: true },
      ),
    );
    const success = vi.spyOn(toast, 'success');
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await submitChange(user, 'Parola-Noua-2026');

    await waitFor(() => {
      expect(success).toHaveBeenCalledWith(roAuth.settings.password.saved);
    });
    expect(screen.getByLabelText(roAuth.settings.password.new)).toHaveValue('');
    expect(screen.queryByText(roAuth.settings.password.failedTitle)).not.toBeInTheDocument();
  });

  it.each([
    ['too short', 'abc1', pluralText(roAuth.fields.password.tooShort_few, 8)],
    ['without a letter', '12345678', roAuth.fields.password.needsLetterAndDigit],
    ['with only diacritics as letters', 'ășțîâăîș1', roAuth.fields.password.needsLetterAndDigit],
  ])('refuses a new password %s', async (_case, password, message) => {
    const requests = recordPasswordUpdates();
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await submitChange(user, password);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('asks for the same new password twice', async () => {
    const requests = recordPasswordUpdates();
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await submitChange(user, 'Parola-Noua-2026', 'Parola-Alta-2026');

    expect(await screen.findByText(roAuth.newPassword.mismatch)).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('disables the button while the password is being saved', async () => {
    server.use(
      http.put(supabaseUrl('/auth/v1/user'), async () => {
        await delay('infinite');
        return HttpResponse.json(buildUser());
      }),
    );
    const { user } = await renderWithProviders(<ChangePasswordSection hasPassword />, {
      auth: signedInAs(),
    });

    await submitChange(user, 'Parola-Noua-2026');

    expect(
      await screen.findByRole('button', { name: roAuth.settings.password.pending }),
    ).toBeDisabled();
  });
});
