import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { buildSession } from '@/test/factories/auth';
import { authErrorResponse, authSettingsResponse } from '@/test/msw/handlers/auth';
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

function interceptBrowserRedirect() {
  const assign = vi.fn<(url: string | URL) => void>();
  const { href, origin, protocol, host, hostname, port, pathname, search, hash, ancestorOrigins } =
    window.location;
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    href,
    origin,
    protocol,
    host,
    hostname,
    port,
    pathname,
    search,
    hash,
    ancestorOrigins,
    assign,
    replace: vi.fn(),
    reload: vi.fn(),
    toString: () => href,
  });
  return assign;
}

async function startGoogleSignIn(redirect: string) {
  server.use(
    http.get(supabaseUrl('/auth/v1/settings'), () => authSettingsResponse({ google: true })),
  );
  const view = await renderWithProviders(<LoginForm redirect={redirect} />);
  const assign = interceptBrowserRedirect();

  await view.user.click(screen.getByRole('button', { name: roAuth.social.google }));

  await waitFor(() => {
    expect(assign).toHaveBeenCalledOnce();
  });
  const authorizeUrl = new URL(String(assign.mock.calls[0]?.[0]));
  return { authorizeUrl, redirectTo: new URL(authorizeUrl.searchParams.get('redirect_to') ?? '') };
}

describe('LoginForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the field messages when submitted empty', async () => {
    const { user } = await renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: roAuth.login.submit }));

    expect(await screen.findByText(roAuth.fields.email.error)).toBeInTheDocument();
    expect(screen.getByText(roAuth.fields.password.required)).toBeInTheDocument();
    expect(screen.getByLabelText(roAuth.fields.email.label)).toHaveAccessibleDescription(
      roAuth.fields.email.error,
    );
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

  it('disables the button while signing in', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), async () => {
        await delay('infinite');
      }),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole('button', { name: roAuth.login.pending })).toBeDisabled();
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

  it('shows the generic error for an unexpected failure', async () => {
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), () => authErrorResponse('unexpected_failure', 500)),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.login.failedTitle)).toBeInTheDocument();
    expect(screen.getByText(roCommon.errors.unknown)).toBeInTheDocument();
  });

  it('warns when the email is not confirmed yet and sends the link again', async () => {
    const resends: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/auth/v1/token'), () => authErrorResponse('email_not_confirmed')),
      http.post(supabaseUrl('/auth/v1/resend'), async ({ request }) => {
        resends.push(await request.json());
        return HttpResponse.json({});
      }),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.login.unconfirmedTitle)).toBeInTheDocument();
    expect(
      screen.getByText(roAuth.login.unconfirmedText.replace('{{email}}', 'ana.ro@example.test')),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: roAuth.resend.action }));

    expect(await screen.findByText(roAuth.resend.sent)).toBeInTheDocument();
    expect(resends).toEqual([
      expect.objectContaining({ type: 'signup', email: 'ana.ro@example.test' }),
    ]);
    expect(
      screen.getByRole('button', { name: roAuth.resend.wait.replace('{{count}}', '60') }),
    ).toBeDisabled();
  });

  it('explains that a social provider is not turned on yet', async () => {
    const { user } = await renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: roAuth.social.google }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      roAuth.social.unavailable.replace('{{provider}}', roAuth.social.providers.google),
    );
  });

  it('starts Google sign-in and comes back to the callback with the redirect', async () => {
    const { authorizeUrl, redirectTo } = await startGoogleSignIn('/publish');

    expect(authorizeUrl.origin + authorizeUrl.pathname).toBe(supabaseUrl('/auth/v1/authorize'));
    expect(authorizeUrl.searchParams.get('provider')).toBe('google');
    expect(redirectTo.origin).toBe(window.location.origin);
    expect(redirectTo.pathname).toBe('/auth/callback');
    expect(redirectTo.searchParams.get('redirect')).toBe('/publish');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('drops an unsafe redirect from the Google callback', async () => {
    const { authorizeUrl, redirectTo } = await startGoogleSignIn('//evil.example');

    expect(authorizeUrl.searchParams.get('provider')).toBe('google');
    expect(redirectTo.pathname).toBe('/auth/callback');
    expect(redirectTo.searchParams.has('redirect')).toBe(false);
  });

  it('says when a social sign-in cannot start', async () => {
    server.use(
      http.get(supabaseUrl('/auth/v1/settings'), () =>
        authErrorResponse('unexpected_failure', 500),
      ),
    );
    const { user } = await renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: roAuth.social.google }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      roAuth.social.failed.replace('{{provider}}', roAuth.social.providers.google),
    );
  });

  it('offers only Google, and a way to reset the password', async () => {
    await renderWithProviders(<LoginForm />);

    expect(screen.getByRole('button', { name: roAuth.social.google })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apple/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: roAuth.login.forgotPassword })).toHaveAttribute(
      'href',
      '/password-reset',
    );
  });

  it('shows and hides the password', async () => {
    const { user } = await renderWithProviders(<LoginForm />);
    const password = screen.getByLabelText(roAuth.fields.password.label);

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: roAuth.fields.password.show }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: roAuth.fields.password.hide })).not.toHaveAttribute(
      'aria-pressed',
    );
  });
});
