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
  await user.type(screen.getByLabelText(labels.fields.email.label), 'nou@example.test');
  await user.type(screen.getByLabelText(labels.fields.password.label), 'Parola-Lunga-1');
  await user.click(screen.getByRole('button', { name: labels.signUp.submit }));
}

describe('SignUpForm', () => {
  it('requires a password of at least 8 characters', async () => {
    const { user } = await renderWithProviders(<SignUpForm />);

    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'nou@example.test');
    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'scurt');
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    expect(
      await screen.findByText(roCommon.validation.minLength_few.replace('{{count}}', '8'), {
        selector: '[role="alert"]',
      }),
    ).toBeInTheDocument();
  });

  it('sends the current language with the sign-up', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(buildUser({ email: 'nou@example.test' }));
      }),
    );
    const { user } = await renderWithProviders(<SignUpForm />, { locale: 'en' });

    await fillAndSubmit(user, enAuth);

    await waitFor(() => {
      expect(requests).toEqual([expect.objectContaining({ data: { locale: 'en' } })]);
    });
  });

  it('asks the user to confirm their email when no session is returned', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), () =>
        HttpResponse.json(buildUser({ email: 'nou@example.test' })),
      ),
    );
    const { user } = await renderWithProviders(<SignUpForm />);

    await fillAndSubmit(user);

    expect(
      await screen.findByText(roAuth.signUp.checkEmail.replace('{{email}}', 'nou@example.test')),
    ).toBeInTheDocument();
  });

  it('shows a translated message when the email is taken', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), () =>
        authErrorResponse('user_already_exists', 422),
      ),
    );
    const { user } = await renderWithProviders(<SignUpForm />);

    await fillAndSubmit(user);

    expect(
      await screen.findByText(roCommon.errors.reasons.user_already_exists),
    ).toBeInTheDocument();
  });
});
