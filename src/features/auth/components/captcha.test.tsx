import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import { buildSession } from '@/test/factories/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';

const TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_SCRIPT_PREFIX = 'https://challenges.cloudflare.com/turnstile/';

type RenderOptions = { callback: (token: string) => void };

function installTurnstile() {
  const render = vi.fn<(container: HTMLElement, options: RenderOptions) => string>(
    () => 'widget-1',
  );
  const remove = vi.fn<(widgetId: string) => void>();
  Reflect.set(window, 'turnstile', { render, remove });
  return { render };
}

function recordTokenRequests() {
  const requests: unknown[] = [];
  server.use(
    http.post(supabaseUrl('/auth/v1/token'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(buildSession());
    }),
  );
  return requests;
}

async function renderLoginFormWithCaptcha() {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', TEST_SITE_KEY);
  vi.resetModules();
  const { renderWithProviders } = await import('@/test/render');
  const { LoginForm } = await import('./login-form');
  const turnstile = installTurnstile();
  const append = vi.spyOn(document.head, 'append');
  const view = await renderWithProviders(<LoginForm />);

  const scripts = await waitFor(() => {
    const appended = append.mock.calls
      .flat()
      .filter(
        (node): node is HTMLScriptElement =>
          node instanceof HTMLScriptElement && node.src.startsWith(TURNSTILE_SCRIPT_PREFIX),
      );
    expect(appended).toHaveLength(1);
    return appended;
  });
  scripts.forEach((script) => {
    script.dispatchEvent(new Event('load'));
    script.remove();
  });
  await waitFor(() => {
    expect(turnstile.render).toHaveBeenCalledOnce();
  });

  return { ...view, turnstile };
}

async function fillAndSubmit(user: Awaited<ReturnType<typeof renderLoginFormWithCaptcha>>['user']) {
  await user.type(screen.getByLabelText(roAuth.fields.email.label), 'ana.ro@example.test');
  await user.type(screen.getByLabelText(roAuth.fields.password.label), 'Parola-Test-2026');
  await user.click(screen.getByRole('button', { name: roAuth.login.submit }));
}

describe('Captcha', { timeout: 20_000 }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    Reflect.deleteProperty(window, 'turnstile');
  });

  it('renders the Turnstile widget with the site key', async () => {
    const { turnstile } = await renderLoginFormWithCaptcha();

    expect(turnstile.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ sitekey: TEST_SITE_KEY, language: 'ro' }),
    );
  });

  it('asks for the check and sends nothing when there is no token', async () => {
    const requests = recordTokenRequests();
    const { user } = await renderLoginFormWithCaptcha();

    await fillAndSubmit(user);

    expect(await screen.findByText(roAuth.captcha.required)).toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('sends the token with the sign-in request', async () => {
    const requests = recordTokenRequests();
    const { user, turnstile } = await renderLoginFormWithCaptcha();
    const options = turnstile.render.mock.calls[0]?.[1];

    act(() => {
      options?.callback('token-1');
    });
    await fillAndSubmit(user);

    await waitFor(() => {
      expect(requests).toEqual([
        expect.objectContaining({
          email: 'ana.ro@example.test',
          gotrue_meta_security: { captcha_token: 'token-1' },
        }),
      ]);
    });
    expect(screen.queryByText(roAuth.captcha.required)).not.toBeInTheDocument();
  });
});
