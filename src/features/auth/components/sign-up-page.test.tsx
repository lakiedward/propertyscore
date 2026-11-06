import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import { buildUnconfirmedSignUp, signedInAs } from '@/test/factories/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

function otherEmailAction(): string {
  return roAuth.otherEmail.replace(/^.*<action>(.*)<\/action>.*$/, '$1');
}

const signedIn = signedInAs();

describe('SignUpPage', { timeout: 20_000 }, () => {
  it('links back to sign-in with the words inside the link', async () => {
    await renderAppRoute('/sign-up');

    expect(await screen.findByRole('link', { name: 'Intră în cont.' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

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
        HttpResponse.json(buildUnconfirmedSignUp('nou@example.test')),
      ),
    );
    const { user } = await renderAppRoute('/sign-up');

    await user.type(await screen.findByLabelText(roAuth.fields.name.label), 'Ana Pop');
    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'nou@example.test');
    await user.type(screen.getByLabelText(roAuth.fields.phone.label), '0722 123 456');
    await user.type(screen.getByLabelText(roAuth.fields.password.label), 'Parola-Lunga-1');
    await user.click(screen.getByRole('checkbox', { name: roAuth.fields.terms.label }));
    await user.click(screen.getByRole('button', { name: roAuth.signUp.submit }));

    const heading = await screen.findByRole('heading', { name: roAuth.confirmEmail.title });
    expect(heading).toHaveFocus();
    expect(screen.getByText('nou@example.test')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: otherEmailAction() }));

    expect(await screen.findByRole('button', { name: roAuth.signUp.submit })).toBeInTheDocument();
  });
});
