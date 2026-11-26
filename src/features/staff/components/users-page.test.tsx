import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roListings from '@/i18n/locales/ro/listings.json';
import roMyListings from '@/i18n/locales/ro/myListings.json';
import ro from '@/i18n/locales/ro/staff.json';
import { signedInAs } from '@/test/factories/auth';
import { buildListing } from '@/test/factories/listing';
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

  it('offers no actions on an admin', async () => {
    const admin = buildStaffUser({ full_name: 'Radu Marin', roles: ['admin'] });
    server.use(usersResponse([admin]));
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    expect(await screen.findByText('Radu Marin')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: ro.users.actions.menu.replace('{{name}}', 'Radu Marin'),
      }),
    ).not.toBeInTheDocument();
  });

  it("opens a row on the user's listings, linking the published ones to their page", async () => {
    const published = buildListing({ title: 'Apartament în Fabric', status: 'approved' });
    const inReview = buildListing({ title: 'Casă în Dumbrăvița', status: 'pending_approval' });
    let ownerFilter: string | null = null;
    server.use(
      usersResponse([CLIENT]),
      http.get(supabaseUrl('/rest/v1/listings'), ({ request }) => {
        ownerFilter = new URL(request.url).searchParams.get('owner_id');
        return HttpResponse.json([published, inReview]);
      }),
    );
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });
    const toggle = await screen.findByRole('button', {
      name: ro.users.listings.show.replace('{{name}}', CLIENT.full_name ?? ''),
    });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    const panel = await screen.findByRole('region', {
      name: ro.users.listings.title.replace('{{name}}', CLIENT.full_name ?? ''),
    });
    expect(
      await within(panel).findByRole('link', { name: 'Apartament în Fabric' }),
    ).toHaveAttribute('href', `/listings/${published.id}`);
    expect(within(panel).getByText('Casă în Dumbrăvița')).toBeInTheDocument();
    expect(
      within(panel).queryByRole('link', { name: 'Casă în Dumbrăvița' }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByText(roMyListings.status.pending_approval)).toBeInTheDocument();
    expect(ownerFilter).toBe(`eq.${CLIENT.user_id}`);
    expect(
      screen.getByRole('button', {
        name: ro.users.listings.hide.replace('{{name}}', CLIENT.full_name ?? ''),
      }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('says when the user has no listings', async () => {
    server.use(
      usersResponse([CLIENT]),
      http.get(supabaseUrl('/rest/v1/listings'), () => HttpResponse.json([])),
    );
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.users.listings.show.replace('{{name}}', CLIENT.full_name ?? ''),
      }),
    );

    expect(await screen.findByText(roListings.owner.empty.title)).toBeInTheDocument();
  });

  it('makes a user an admin after confirming', async () => {
    let payload: unknown;
    server.use(
      usersResponse([CLIENT]),
      http.post(supabaseUrl('/rest/v1/rpc/make_admin'), async ({ request }) => {
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
    await user.click(await screen.findByRole('menuitem', { name: ro.users.actions.makeAdmin }));
    const dialog = await screen.findByRole('alertdialog', {
      name: ro.users.adminDialog.title.replace('{{name}}', CLIENT.full_name ?? ''),
    });
    expect(payload).toBeUndefined();
    await user.click(within(dialog).getByRole('button', { name: ro.users.adminDialog.confirm }));

    await waitFor(() => {
      expect(payload).toEqual({ p_user_id: CLIENT.user_id });
    });
  });

  it('does not offer the admin role to an inspector', async () => {
    server.use(usersResponse([INSPECTOR]));
    const { user } = await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    await user.click(
      await screen.findByRole('button', {
        name: ro.users.actions.menu.replace('{{name}}', INSPECTOR.full_name ?? ''),
      }),
    );

    expect(
      await screen.findByRole('menuitem', { name: ro.users.actions.changeCity }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: ro.users.actions.makeAdmin }),
    ).not.toBeInTheDocument();
  });

  it('shows no list while the users load and an error when they cannot', async () => {
    let fail: (() => void) | undefined;
    server.use(
      http.post(
        supabaseUrl('/rest/v1/rpc/admin_list_users'),
        () =>
          new Promise<Response>((resolve) => {
            fail = () => {
              resolve(HttpResponse.json({ message: 'boom' }, { status: 500 }));
            };
          }),
      ),
    );
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    expect(await screen.findByRole('heading', { name: ro.users.card.title })).toBeInTheDocument();
    expect(screen.queryByText(ro.users.empty.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fail).toBeDefined();
    });
    fail?.();

    expect(await screen.findByText(ro.users.error)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('counts the shown accounts against the total', async () => {
    server.use(usersResponse([CLIENT], 40));
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    expect(
      await screen.findByText(
        ro.users.card.shown_other.replace('{{shown}}', '1').replace('{{count}}', '40'),
      ),
    ).toBeInTheDocument();
  });
});
