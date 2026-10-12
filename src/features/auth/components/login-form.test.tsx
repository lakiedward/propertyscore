import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildSession } from '@/test/factories/auth';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('shows field errors when submitted empty', async () => {
    const { user } = await renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: roAuth.login.submit }));

    expect(await screen.findByText(roCommon.validation.email)).toBeInTheDocument();
    expect(screen.getByText(roCommon.validation.required)).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'ana.ro@example.test');
    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'Parola-Test-2026');
    await user.click(screen.getByRole('button', { name: roAuth.login.submit }));

    await waitFor(() => {
      expect(requests).toEqual([
        expect.objectContaining({ email: 'ana.ro@example.test', password: 'Parola-Test-2026' }),
      ]);
    });
    expect(screen.queryByText(roCommon.errors.reasons.invalid_credentials)).not.toBeInTheDocument();
  });

  it('shows a translated message for wrong credentials', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), () => authErrorResponse('invalid_credentials')),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'ana.ro@example.test');
    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'wrong-password');
    await user.click(screen.getByRole('button', { name: roAuth.login.submit }));

    expect(
      await screen.findByText(roCommon.errors.reasons.invalid_credentials),
    ).toBeInTheDocument();
  });
});
