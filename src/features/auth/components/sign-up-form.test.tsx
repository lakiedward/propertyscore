import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import enAuth from '@/i18n/locales/en/auth.json';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildUser } from '@/test/factories/auth';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { SignUpForm } from './sign-up-form';

async function fillAndSubmit(
  user: Awaited<ReturnType<typeof renderWithProviders>>['user'],
  labels = roAuth,
) {
  await user.type(screen.getByLabelText(labels.fields.name.label), 'Ana Pop');
  await user.type(screen.getByLabelText(labels.fields.email.label), 'nou@example.test');
  await user.type(screen.getByLabelText(labels.fields.password.label), 'Parola-Lunga-1');
  await user.click(screen.getByRole('checkbox', { name: labels.fields.terms.label }));
  await user.click(screen.getByRole('button', { name: labels.signUp.submit }));
}

describe('SignUpForm', () => {
  it('shows every field message and keeps the terms required', async () => {
    const onEmailSent = vi.fn();
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={onEmailSent} />);

    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'scurt');
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    expect(await screen.findByText(roAuth.fields.name.error)).toBeInTheDocument();
    expect(screen.getByText(roAuth.fields.email.error)).toBeInTheDocument();
    expect(screen.getByText(roAuth.fields.password.tooShort)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: roAuth.fields.terms.label })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('sends the name and the current language with the sign-up', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(buildUser({ email: 'nou@example.test' }));
      }),
    );
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />, {
      locale: 'en',
    });

    await fillAndSubmit(user, enAuth);

    await waitFor(() => {
      expect(requests).toEqual([
        expect.objectContaining({ data: { locale: 'en', full_name: 'Ana Pop' } }),
      ]);
    });
  });

  it('reports the address when the email still has to be confirmed', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), () =>
        HttpResponse.json(buildUser({ email: 'nou@example.test' })),
      ),
    );
    const onEmailSent = vi.fn();
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={onEmailSent} />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(onEmailSent).toHaveBeenCalledWith('nou@example.test');
    });
  });

  it('explains when the email is taken', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), () =>
        authErrorResponse('user_already_exists', 422),
      ),
    );
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.signUp.failedTitle)).toBeInTheDocument();
    expect(screen.getByText(roCommon.errors.reasons.user_already_exists)).toBeInTheDocument();
  });

  it('explains a password that is too long', async () => {
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'a'.repeat(73));
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    expect(
      await screen.findByText(roCommon.validation.maxLength_other.replace('{{count}}', '72')),
    ).toBeInTheDocument();
  });
});
