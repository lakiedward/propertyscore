import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import { buildSession, buildUser } from '@/test/factories/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const signedIn = { session: buildSession(), user: buildSession().user };

describe('SignUpPage', { timeout: 20_000 }, () => {
  it('sends a signed-in visitor to the page named in redirect', async () => {
    const { router } = await renderAppRoute('/sign-up?redirect=%2Fpublish', { auth: signedIn });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/publish');
    });
  });

  it('ignores a redirect to another site', async () => {
    const { router } = await renderAppRoute('/sign-up?redirect=%2F%2Fevil.example', {
      auth: signedIn,
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account');
    });
  });

  it('asks to check the email, then lets the visitor use another address', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/signup'), () =>
        HttpResponse.json(buildUser({ email: 'nou@example.test' })),
      ),
    );
    const { user } = await renderAppRoute('/sign-up');

    await user.type(await screen.findByLabelText(roAuth.fields.name.label), 'Ana Pop');
    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'nou@example.test');
    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'Parola-Lunga-1');
    await user.click(screen.getByRole('checkbox', { name: roAuth.fields.terms.label }));
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    const heading = await screen.findByRole('heading', { name: roAuth.signUp.sent.title });
    expect(heading).toHaveFocus();
    expect(screen.getByText('nou@example.test')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: roAuth.signUp.sent.otherEmail }));

    expect(await screen.findByRole('button', { name: roAuth.signUp.submit })).toBeInTheDocument();
  });
});
