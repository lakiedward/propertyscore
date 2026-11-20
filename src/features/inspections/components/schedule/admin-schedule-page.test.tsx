import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/inspections.json';
import { buildAdminInspection } from '@/test/factories/admin-inspection';
import { signedInAs } from '@/test/factories/auth';
import { adminInspectionsResponse, MIHAI_ID } from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const QUEUED = buildAdminInspection();

function dateOf(inspection: { starts_at: string }) {
  const date = new Date(inspection.starts_at);
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('AdminSchedulePage', { timeout: 20_000 }, () => {
  it('lists the unassigned bookings and the inspector columns', async () => {
    server.use(adminInspectionsResponse([QUEUED]));
    await renderAppRoute(`/admin/appointments?date=${dateOf(QUEUED)}`, {
      auth: signedInAs('admin'),
    });

    expect(await screen.findByRole('heading', { name: /Neasignate · 1/ })).toBeInTheDocument();
    expect(screen.getAllByText('Calea Circumvalațiunii 41').length).toBeGreaterThan(0);
    expect(
      await screen.findByLabelText(ro.schedule.day.column.replace('{{name}}', 'Mihai Dobre')),
    ).toBeInTheDocument();
  });

  it('assigns an inspector from the drawer', async () => {
    let payload: unknown;
    server.use(
      adminInspectionsResponse([QUEUED]),
      http.post(supabaseUrl('/rest/v1/rpc/assign_inspector'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute(
      `/admin/appointments?date=${dateOf(QUEUED)}&sheet=${QUEUED.id}`,
      { auth: signedInAs('admin') },
    );

    const drawer = await screen.findByRole('dialog');
    await user.click(within(drawer).getByRole('combobox', { name: ro.schedule.drawer.inspector }));
    await user.click(await screen.findByRole('option', { name: /Mihai Dobre/ }));
    await user.click(within(drawer).getByRole('button', { name: ro.schedule.drawer.assign }));

    await waitFor(() => {
      expect(payload).toEqual({ p_inspection_id: QUEUED.id, p_inspector_id: MIHAI_ID });
    });
  });

  it('needs a reason to cancel a booking', async () => {
    let payload: unknown;
    server.use(
      adminInspectionsResponse([QUEUED]),
      http.post(supabaseUrl('/rest/v1/rpc/cancel_inspection'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute(
      `/admin/appointments?date=${dateOf(QUEUED)}&sheet=${QUEUED.id}`,
      { auth: signedInAs('admin') },
    );

    const drawer = await screen.findByRole('dialog');
    await user.click(within(drawer).getByRole('button', { name: ro.appointments.cancel.open }));
    await user.click(within(drawer).getByRole('button', { name: ro.appointments.cancel.confirm }));
    expect(payload).toBeUndefined();
    await user.type(
      within(drawer).getByLabelText(ro.schedule.cancel.reason),
      'Proprietarul a vândut locuința.',
    );
    await user.click(within(drawer).getByRole('button', { name: ro.appointments.cancel.confirm }));

    await waitFor(() => {
      expect(payload).toEqual({
        p_inspection_id: QUEUED.id,
        p_reason: 'Proprietarul a vândut locuința.',
      });
    });
  });
});
