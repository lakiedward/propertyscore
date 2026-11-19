import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import { buildSession, signedInAs } from '@/test/factories/auth';
import { authErrorResponse } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const VERIFY_URL = supabaseUrl('/auth/v1/verify');

function confirmPath(type: string, next?: string): string {
  const params = new URLSearchParams({ token_hash: 'hash-123', type });
  if (next) params.set('next', next);
  return `/auth/confirm?${params.toString()}`;
}

describe('AuthConfirmPage', { timeout: 20_000 }, () => {
  it('verifies the link with its token hash', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(VERIFY_URL, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(buildSession());
      }),
    );

    await renderAppRoute(confirmPath('signup'));

    expect(await screen.findByText(roAuth.confirm.pending)).toBeInTheDocument();
    expect(requests).toEqual([expect.objectContaining({ token_hash: 'hash-123', type: 'email' })]);
  });

  it('opens the page asked for before signing up', async () => {
    server.use(http.post(VERIFY_URL, () => HttpResponse.json(buildSession())));

    const { router } = await renderAppRoute(
      confirmPath('signup', 'http://localhost:3000/?redirect=%2Fpublish'),
      { auth: signedInAs() },
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/publish');
    });
  });

  it('lands an admin on the admin panel without a redirect', async () => {
    server.use(http.post(VERIFY_URL, () => HttpResponse.json(buildSession())));

    const { router } = await renderAppRoute(confirmPath('signup', 'http://localhost:3000'), {
      auth: signedInAs('admin'),
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin');
    });
  });

  it('opens the new password form after a recovery link', async () => {
    server.use(http.post(VERIFY_URL, () => HttpResponse.json(buildSession())));

    const { router } = await renderAppRoute(confirmPath('recovery'), { auth: signedInAs() });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/password-reset/new');
    });
  });

  it('explains an expired link and points to sign-in', async () => {
    server.use(http.post(VERIFY_URL, () => authErrorResponse('otp_expired', 403)));

    await renderAppRoute(confirmPath('signup'));

    expect(await screen.findByText(roAuth.confirm.expiredTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: roAuth.confirm.signIn })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('points an expired recovery link to a new reset request', async () => {
    server.use(http.post(VERIFY_URL, () => authErrorResponse('otp_expired', 403)));

    await renderAppRoute(confirmPath('recovery'));

    expect(await screen.findByRole('link', { name: roAuth.confirm.newResetLink })).toHaveAttribute(
      'href',
      '/password-reset',
    );
  });

  it('treats a link without a token as not valid', async () => {
    await renderAppRoute('/auth/confirm?type=signup');

    expect(await screen.findByText(roAuth.confirm.invalidTitle)).toBeInTheDocument();
  });
});
