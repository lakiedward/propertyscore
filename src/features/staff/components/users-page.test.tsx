import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/staff.json';
import { signedInAs } from '@/test/factories/auth';
import { buildStaffUser } from '@/test/factories/staff-user';
import { usersResponse } from '@/test/msw/handlers/staff';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const CLIENT = buildStaffUser({ full_name: 'Ion Țurcanu' });
const INSPECTOR = buildStaffUser({
  full_name: 'Mihai Dobre',
  roles: ['user', 'inspector'],
  inspector_city_id: 'c4000000-0000-4000-8000-000000000001',
  inspector_city_name: 'Timișoara',
});

function rowOf(name: string) {
  return screen.getByRole('row', { name: new RegExp(name) });
}

describe('UsersPage', { timeout: 20_000 }, () => {
  it('lists the users with their roles and the inspector city', async () => {
    server.use(usersResponse([CLIENT, INSPECTOR]));
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    expect(await screen.findByText(CLIENT.full_name ?? '')).toBeInTheDocument();
    expect(
      within(rowOf(INSPECTOR.full_name ?? '')).getByText(
        ro.users.inspectorCity.replace('{{city}}', 'Timișoara'),
      ),
    ).toBeInTheDocument();
    expect(
      within(rowOf(CLIENT.full_name ?? '')).getByText(ro.users.state.active),
    ).toBeInTheDocument();
  });

  it('asks for the inspectors only when their chip is chosen', async () => {
    let role: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/admin_list_users'), async ({ request }) => {
        const body = (await request.json()) as { p_role?: string };
        role = body.p_role;
        return HttpResponse.json([]);
      }),
    );
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', { name: new RegExp(ro.users.roles.inspector) }),
    );

    await waitFor(() => {
      expect(role).toBe('inspector');
    });
  });

  it('makes a user an inspector in the chosen city', async () => {
    let payload: unknown;
    server.use(
      usersResponse([CLIENT]),
      http.post(supabaseUrl('/rest/v1/rpc/set_inspector'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.users.actions.menu.replace('{{name}}', CLIENT.full_name ?? ''),
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: ro.users.actions.makeInspector }));
    const dialog = await screen.findByRole('alertdialog', { name: ro.users.inspectorDialog.title });
    await user.click(within(dialog).getByRole('combobox', { name: ro.users.inspectorDialog.city }));
    await user.click(await screen.findByRole('option', { name: 'Timișoara' }));
    await user.click(within(dialog).getByRole('button', { name: ro.users.inspectorDialog.save }));

    await waitFor(() => {
      expect(payload).toEqual({
        p_user_id: CLIENT.user_id,
        p_city_id: 'c4000000-0000-4000-8000-000000000001',
      });
    });
  });

  it('asks for a city before saving', async () => {
    server.use(usersResponse([CLIENT]));
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.users.actions.menu.replace('{{name}}', CLIENT.full_name ?? ''),
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: ro.users.actions.makeInspector }));
    const dialog = await screen.findByRole('alertdialog', { name: ro.users.inspectorDialog.title });
    await user.click(within(dialog).getByRole('button', { name: ro.users.inspectorDialog.save }));

    expect(
      await within(dialog).findByRole('combobox', { name: ro.users.inspectorDialog.city }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the empty state when nobody matches', async () => {
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    expect(await screen.findByText(ro.users.empty.title)).toBeInTheDocument();
  });

  it('blocks a user with a reason', async () => {
    let payload: unknown;
    server.use(
      usersResponse([CLIENT]),
      http.post(supabaseUrl('/rest/v1/rpc/block_user'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.users.actions.menu.replace('{{name}}', CLIENT.full_name ?? ''),
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: ro.users.actions.block }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: ro.users.blockDialog.confirm }));
    expect(payload).toBeUndefined();
    await user.type(within(dialog).getByLabelText(ro.users.blockDialog.reason), 'Anunțuri false');
    await user.click(within(dialog).getByRole('button', { name: ro.users.blockDialog.confirm }));

    await waitFor(() => {
      expect(payload).toEqual({ p_user_id: CLIENT.user_id, p_reason: 'Anunțuri false' });
    });
  });

  it('offers to unblock a blocked user and shows the reason', async () => {
    const blocked = buildStaffUser({
      full_name: 'Dan Ilie',
      is_blocked: true,
      block_reason: 'Spam',
    });
    server.use(usersResponse([blocked]));
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    expect(await screen.findByText('Spam')).toBeInTheDocument();
    expect(within(rowOf('Dan Ilie')).getByText(ro.users.state.blocked)).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: ro.users.actions.menu.replace('{{name}}', 'Dan Ilie') }),
    );
    expect(
      await screen.findByRole('menuitem', { name: ro.users.actions.unblock }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: ro.users.actions.block }),
    ).not.toBeInTheDocument();
  });

  it('never offers to block an admin', async () => {
    const admin = buildStaffUser({ full_name: 'Radu Marin', roles: ['admin'] });
    server.use(usersResponse([admin]));
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.users.actions.menu.replace('{{name}}', 'Radu Marin'),
      }),
    );

    expect(
      await screen.findByRole('menuitem', { name: ro.users.actions.makeInspector }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: ro.users.actions.block }),
    ).not.toBeInTheDocument();
  });
});
