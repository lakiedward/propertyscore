import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs } from '@/test/factories/auth';
import { buildProfile } from '@/test/factories/profile';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const PASSWORD = roAuth.settings.password;
const DELETE = roAuth.settings.delete;
const PHONE = roAuth.settings.phone;

function answerHasPassword(response: () => Response | Promise<Response>) {
  server.use(http.post(supabaseUrl('/rest/v1/rpc/account_has_password'), response));
}

function answerWithoutPhone() {
  let savedPhone: string | null = null;
  server.use(
    http.get(supabaseUrl('/rest/v1/profiles'), () =>
      HttpResponse.json(buildProfile({ phone: savedPhone })),
    ),
    http.patch(supabaseUrl('/rest/v1/profiles'), async ({ request }) => {
      const body: unknown = await request.json();
      savedPhone =
        typeof body === 'object' &&
        body !== null &&
        'phone' in body &&
        typeof body.phone === 'string'
          ? body.phone
          : null;
      return HttpResponse.json(buildProfile({ phone: savedPhone }));
    }),
  );
}

function serverError() {
  return HttpResponse.json(
    { code: 'XX000', message: 'database error', details: null, hint: null },
    { status: 500 },
  );
}

async function openDeleteDialog(user: Awaited<ReturnType<typeof renderAppRoute>>['user']) {
  await user.click(await screen.findByRole('button', { name: DELETE.open }));
  return screen.findByRole('alertdialog', { name: DELETE.dialogTitle });
}

async function openSettingsFromTheSidebar() {
  const view = await renderAppRoute('/account', { auth: signedInAs() });
  const [sidebar] = await screen.findAllByRole('navigation', {
    name: roCommon.panel.account.navLabel,
  });
  if (!sidebar) {
    throw new Error('The account sidebar is missing');
  }
  await view.user.click(
    within(sidebar).getByRole('link', { name: roCommon.panel.account.nav.settings }),
  );
  return view;
}

describe('AccountSettingsPage', { timeout: 20_000 }, () => {
  it('asks for the current password when the account has one', async () => {
    answerHasPassword(() => HttpResponse.json(true));
    const { user } = await renderAppRoute('/account/settings', { auth: signedInAs() });

    expect(
      await screen.findByRole('heading', { level: 2, name: PASSWORD.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(PASSWORD.current)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: PASSWORD.setTitle })).not.toBeInTheDocument();

    const dialog = await openDeleteDialog(user);
    expect(within(dialog).getByLabelText(DELETE.password)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(DELETE.email)).not.toBeInTheDocument();
  });

  it('offers to set a password when the account has none', async () => {
    answerHasPassword(() => HttpResponse.json(false));
    const { user } = await renderAppRoute('/account/settings', { auth: signedInAs() });

    expect(
      await screen.findByRole('heading', { level: 2, name: PASSWORD.setTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(PASSWORD.current)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: PASSWORD.setSubmit })).toBeInTheDocument();

    const dialog = await openDeleteDialog(user);
    expect(within(dialog).getByLabelText(DELETE.email)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(DELETE.password)).not.toBeInTheDocument();
  });

  it('shows the route error with a retry when the check fails', async () => {
    answerHasPassword(serverError);
    const { user } = await openSettingsFromTheSidebar();

    expect(
      await screen.findByRole('heading', { level: 1, name: roCommon.pages.error.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(roCommon.errors.unknown)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: PASSWORD.title })).not.toBeInTheDocument();

    answerHasPassword(() => HttpResponse.json(true));
    await user.click(screen.getByRole('button', { name: roCommon.actions.retry }));

    expect(
      await screen.findByRole('heading', { level: 2, name: PASSWORD.title }),
    ).toBeInTheDocument();
  });

  it('shows the loading page while the check is pending', async () => {
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    answerHasPassword(async () => {
      await released;
      return HttpResponse.json(true);
    });
    await openSettingsFromTheSidebar();

    const pending = await screen.findByRole('status', {}, { timeout: 5_000 });
    expect(within(pending).getByText(roCommon.pages.loading)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: PASSWORD.title })).not.toBeInTheDocument();

    release();

    expect(
      await screen.findByRole('heading', { level: 2, name: PASSWORD.title }),
    ).toBeInTheDocument();
    expect(screen.queryByText(roCommon.pages.loading)).not.toBeInTheDocument();
  });

  it('sends an account without a phone to the settings until the phone is saved', async () => {
    answerHasPassword(() => HttpResponse.json(false));
    answerWithoutPhone();
    const { user, router } = await renderAppRoute('/account/reports', { auth: signedInAs() });

    expect(await screen.findByText(PHONE.missingTitle)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/settings');

    await user.type(
      screen.getByRole('textbox', { name: roAuth.fields.phone.label }),
      '0722 123 456',
    );
    await user.click(screen.getByRole('button', { name: PHONE.submit }));

    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe('/account/reports');
    });
  });

  it('rejects an invalid phone number', async () => {
    answerHasPassword(() => HttpResponse.json(false));
    answerWithoutPhone();
    const { user } = await renderAppRoute('/account', { auth: signedInAs() });

    await user.type(await screen.findByRole('textbox', { name: roAuth.fields.phone.label }), '123');
    await user.click(screen.getByRole('button', { name: PHONE.submit }));

    expect(await screen.findByText(roAuth.fields.phone.error)).toBeInTheDocument();
    expect(screen.getByText(PHONE.missingTitle)).toBeInTheDocument();
  });
});
