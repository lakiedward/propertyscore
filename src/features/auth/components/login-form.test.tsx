import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import { buildSession } from '@/test/factories/auth';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { LoginForm } from './login-form';

async function fillAndSubmit(
  user: Awaited<ReturnType<typeof renderWithProviders>>['user'],
  password = 'Parola-Test-2026',
) {
  await user.type(screen.getByLabelText(roAuth.fields.email.label), 'ana.ro@example.test');
  await user.type(screen.getByLabelText(roAuth.fields.password.label), password);
  await user.click(screen.getByRole('button', { name: roAuth.login.submit }));
}

describe('LoginForm', () => {
  it('shows the field messages when submitted empty', async () => {
    const { user } = await renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: roAuth.login.submit }));

    expect(await screen.findByText(roAuth.fields.email.error)).toBeInTheDocument();
    expect(screen.getByText(roAuth.fields.password.required)).toBeInTheDocument();
  });

  it('signs in with the typed credentials', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(buildSession());
      }),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(requests).toEqual([
        expect.objectContaining({ email: 'ana.ro@example.test', password: 'Parola-Test-2026' }),
      ]);
    });
    expect(screen.queryByText(roAuth.login.failedTitle)).not.toBeInTheDocument();
  });

  it('explains wrong credentials', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), () => authErrorResponse('invalid_credentials')),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await fillAndSubmit(user, 'wrong-password');

    expect(await screen.findByText(roAuth.login.failedTitle)).toBeInTheDocument();
    expect(screen.getByText(roAuth.login.failedText)).toBeInTheDocument();
  });

  it('warns when the email is not confirmed yet', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), () => authErrorResponse('email_not_confirmed')),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.login.unconfirmedTitle)).toBeInTheDocument();
    expect(
      screen.getByText(roAuth.login.unconfirmedText.replace('{{email}}', 'ana.ro@example.test')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: roAuth.login.resendConfirmation }),
    ).toBeInTheDocument();
  });

  it('explains that social sign-in is not available yet', async () => {
    const { user } = await renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: roAuth.social.google }));

    expect(
      screen.getByText(
        roAuth.social.errorTitle.replace('{{provider}}', roAuth.social.providers.google),
      ),
    ).toBeInTheDocument();
  });

  it('shows and hides the password', async () => {
    const { user } = await renderWithProviders(<LoginForm />);
    const password = screen.getByLabelText(roAuth.fields.password.label);

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: roAuth.fields.password.show }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: roAuth.fields.password.hide })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
