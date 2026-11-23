import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const ACCOUNT = {
  user_id: 'c0000000-0000-4000-8000-000000000001',
  email: 'tester.ro@example.test',
  full_name: 'Test Ro',
  granted_at: '2026-11-23T10:00:00.000Z',
};

function listResponse(rows: readonly unknown[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/list_smartcheck_unlimited_accounts'), () =>
    HttpResponse.json(rows),
  );
}

describe('UnlimitedAccessPage', { timeout: 20_000 }, () => {
  it('lists the accounts that have the tick', async () => {
    server.use(listResponse([ACCOUNT]));
    await renderAppRoute('/admin/smart-check', { auth: signedInAs('admin') });

    expect(
      await screen.findByRole('heading', { level: 1, name: roCommon.panel.admin.nav.smartCheck }),
    ).toBeInTheDocument();
    expect(await screen.findByText(ACCOUNT.email)).toBeInTheDocument();
  });

  it('shows the empty state when nobody has the tick', async () => {
    server.use(listResponse([]));
    await renderAppRoute('/admin/smart-check', { auth: signedInAs('admin') });

    expect(await screen.findByText(ro.admin.unlimited.list.empty)).toBeInTheDocument();
  });

  it('ticks an account by its email', async () => {
    const bodies: unknown[] = [];
    server.use(
      listResponse([]),
      http.post(supabaseUrl('/rest/v1/rpc/set_smartcheck_unlimited'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(ACCOUNT.user_id);
      }),
    );
    const { user } = await renderAppRoute('/admin/smart-check', { auth: signedInAs('admin') });

    await user.type(
      await screen.findByLabelText(ro.admin.unlimited.grant.label),
      `  ${ACCOUNT.email} `,
    );
    await user.click(screen.getByRole('button', { name: ro.admin.unlimited.grant.submit }));

    await waitFor(() => {
      expect(bodies).toEqual([{ p_email: ACCOUNT.email, p_is_unlimited: true }]);
    });
  });

  it('shows an unknown email on the field', async () => {
    server.use(
      listResponse([]),
      http.post(supabaseUrl('/rest/v1/rpc/set_smartcheck_unlimited'), () =>
        postgrestErrorResponse('P0001', 'account_not_found', 400),
      ),
    );
    const { user } = await renderAppRoute('/admin/smart-check', { auth: signedInAs('admin') });

    await user.type(
      await screen.findByLabelText(ro.admin.unlimited.grant.label),
      'nimeni.ro@example.test',
    );
    await user.click(screen.getByRole('button', { name: ro.admin.unlimited.grant.submit }));

    expect(await screen.findByText(roCommon.errors.reasons.account_not_found)).toBeInTheDocument();
  });

  it('removes the tick from an account', async () => {
    const bodies: unknown[] = [];
    server.use(
      listResponse([ACCOUNT]),
      http.post(supabaseUrl('/rest/v1/rpc/set_smartcheck_unlimited'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(ACCOUNT.user_id);
      }),
    );
    const { user } = await renderAppRoute('/admin/smart-check', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.admin.unlimited.list.removeFor.replace('{{email}}', ACCOUNT.email),
      }),
    );

    await waitFor(() => {
      expect(bodies).toEqual([{ p_email: ACCOUNT.email, p_is_unlimited: false }]);
    });
  });

  it('hides the page from a user who is not an admin', async () => {
    await renderAppRoute('/admin/smart-check', { auth: signedInAs() });

    expect(screen.queryByText(ro.admin.unlimited.grant.title)).not.toBeInTheDocument();
  });
});
