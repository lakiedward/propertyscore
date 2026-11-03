import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import enAuth from '@/i18n/locales/en/auth.json';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildSession, buildUser } from '@/test/factories/auth';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { SignUpForm } from './sign-up-form';

type FormLabels = {
  fields: {
    name: { label: string };
    email: { label: string };
    password: { label: string };
    terms: { label: string };
  };
  signUp: { submit: string };
};

const SIGN_UP_URL = supabaseUrl('/auth/v1/signup');

async function fillAndSubmit(
  user: Awaited<ReturnType<typeof renderWithProviders>>['user'],
  labels: FormLabels = roAuth,
) {
  await user.type(screen.getByLabelText(labels.fields.name.label), 'Ana Pop');
  await user.type(screen.getByLabelText(labels.fields.email.label), 'nou@example.test');
  await user.type(screen.getByLabelText(labels.fields.password.label), 'Parola-Lunga-1');
  await user.click(screen.getByRole('checkbox', { name: labels.fields.terms.label }));
  await user.click(screen.getByRole('button', { name: labels.signUp.submit }));
}

function pluralText(template: string, count: number): string {
  return template.replace('{{count}}', String(count));
}

describe('SignUpForm', () => {
  it('shows every field message, the terms one included', async () => {
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'scurt');
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    expect(await screen.findByText(roAuth.fields.name.error)).toBeInTheDocument();
    expect(screen.getByText(roAuth.fields.email.error)).toBeInTheDocument();
    expect(
      screen.getByText(pluralText(roAuth.fields.password.tooShort_few, 8)),
    ).toBeInTheDocument();
    const terms = screen.getByRole('checkbox', { name: roAuth.fields.terms.label });
    expect(terms).toHaveAttribute('aria-invalid', 'true');
    expect(terms).toHaveAccessibleDescription(roAuth.fields.terms.error);
  });

  it('sends the name, the language and a confirmation link through the sign-in callback', async () => {
    const requests: { body: unknown; redirectTo: string | null }[] = [];
    server.use(
      http.post(SIGN_UP_URL, async ({ request }) => {
        requests.push({
          body: await request.json(),
          redirectTo: new URL(request.url).searchParams.get('redirect_to'),
        });
        return HttpResponse.json(buildUser({ email: 'nou@example.test' }));
      }),
    );
    const { user } = await renderWithProviders(
      <SignUpForm redirect="/publish" onEmailSent={vi.fn()} />,
      { locale: 'en' },
    );

    await fillAndSubmit(user, enAuth);

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]?.body).toEqual(
      expect.objectContaining({ data: { locale: 'en', full_name: 'Ana Pop' } }),
    );
    const redirectTo = new URL(requests[0]?.redirectTo ?? '');
    expect(redirectTo.pathname).toBe('/auth/callback');
    expect(redirectTo.searchParams.get('redirect')).toBe('/publish');
  });

  it('reports the address when the email still has to be confirmed', async () => {
    server.use(http.post(SIGN_UP_URL, () => HttpResponse.json(buildUser())));
    const onEmailSent = vi.fn();
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={onEmailSent} />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(onEmailSent).toHaveBeenCalledWith('nou@example.test');
    });
  });

  it('does not ask to check the email when the account is signed in right away', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(SIGN_UP_URL, () => {
        requests.push('signup');
        return HttpResponse.json(buildSession());
      }),
    );
    const onEmailSent = vi.fn();
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={onEmailSent} />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(await screen.findByRole('button', { name: roAuth.signUp.submit })).toBeEnabled();
    expect(onEmailSent).not.toHaveBeenCalled();
  });

  it('disables the button while the account is created', async () => {
    server.use(
      http.post(SIGN_UP_URL, async () => {
        await delay('infinite');
      }),
    );
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await fillAndSubmit(user);

    expect(await screen.findByRole('button', { name: roAuth.signUp.pending })).toBeDisabled();
  });

  it('puts a taken email on the email field', async () => {
    server.use(http.post(SIGN_UP_URL, () => authErrorResponse('user_already_exists', 422)));
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(screen.getByLabelText(roAuth.fields.email.label)).toHaveAccessibleDescription(
        roCommon.errors.reasons.user_already_exists,
      );
    });
    expect(screen.queryByText(roAuth.signUp.failedTitle)).not.toBeInTheDocument();
  });

  it('puts a weak password on the password field', async () => {
    server.use(http.post(SIGN_UP_URL, () => authErrorResponse('weak_password', 422)));
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roCommon.errors.reasons.weak_password)).toBeInTheDocument();
    expect(screen.getByLabelText(roAuth.fields.password.label)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('explains a network failure', async () => {
    server.use(http.post(SIGN_UP_URL, () => HttpResponse.error()));
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.signUp.failedTitle)).toBeInTheDocument();
    expect(screen.getByText(roCommon.errors.network)).toBeInTheDocument();
  });

  it('falls back to the generic text for an unexpected failure', async () => {
    server.use(http.post(SIGN_UP_URL, () => authErrorResponse('unexpected_failure', 500)));
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.signUp.failedTitle)).toBeInTheDocument();
    expect(screen.getByText(roAuth.signUp.failedText)).toBeInTheDocument();
  });

  it('explains that a social provider is not turned on yet', async () => {
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: roAuth.social.facebook }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      roAuth.social.unavailable.replace('{{provider}}', roAuth.social.providers.facebook),
    );
  });

  it('explains a password that is too long', async () => {
    const { user } = await renderWithProviders(<SignUpForm onEmailSent={vi.fn()} />);

    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'a'.repeat(73));
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    expect(
      await screen.findByText(pluralText(roCommon.validation.maxLength_other, 72)),
    ).toBeInTheDocument();
  });
});
