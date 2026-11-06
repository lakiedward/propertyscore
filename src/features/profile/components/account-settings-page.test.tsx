import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs } from '@/test/factories/auth';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const PASSWORD = roAuth.settings.password;
const DELETE = roAuth.settings.delete;

function answerHasPassword(response: () => Response | Promise<Response>) {
  server.use(http.post(supabaseUrl('/rest/v1/rpc/account_has_password'), response));
}

function serverError() {
  return HttpResponse.json(
    { code: 'XX000', message: 'database error', details: null, hint: null },
    { status: 500 },
  );
}

async function openDeleteDialog(user: Awaited<ReturnType<typeof renderAppRoute>>['user']) {
  await user.click(await screen.findByRole('button', { name: DELETE.open }));
  return screen.findByRole('dialog', { name: DELETE.dialogTitle });
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
});
