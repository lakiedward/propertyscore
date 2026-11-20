import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/inspections.json';
import { signedInAs } from '@/test/factories/auth';
import { buildMyInspection } from '@/test/factories/my-inspection';
import { myInspectionsResponse, slotsResponse } from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const UPCOMING = buildMyInspection({ address_text: 'Str. Paris 3, ap. 9' });
const DONE = buildMyInspection({
  address_text: 'Calea Aradului 52',
  status: 'completed',
  starts_at: '2026-10-01T08:00:00.000Z',
  ends_at: '2026-10-01T10:00:00.000Z',
  inspector_name: 'Mihai Dobre',
});

function freeSlotIn(days: number) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 9, 30).toISOString();
}

describe('AppointmentsPage', { timeout: 20_000 }, () => {
  it('lists the upcoming inspections before the past ones', async () => {
    server.use(myInspectionsResponse([DONE, UPCOMING]));
    await renderAppRoute('/account/appointments', { auth: signedInAs('user') });

    const rows = await screen.findAllByRole('button', { name: /Inspecție fizică/ });
    expect(rows[0]).toHaveTextContent('Str. Paris 3, ap. 9');
    expect(rows[0]).toHaveTextContent(ro.appointments.inspectorPending);
    expect(rows[1]).toHaveTextContent(ro.appointments.inspector.replace('{{name}}', 'Mihai Dobre'));
  });

  it('shows the empty state with a way to book', async () => {
    await renderAppRoute('/account/appointments', { auth: signedInAs('user') });

    expect(await screen.findByText(ro.appointments.empty.title)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: new RegExp(ro.appointments.empty.book) }),
    ).toHaveAttribute('href', '/inspection');
  });

  it('cancels an upcoming inspection after confirming', async () => {
    let payload: unknown;
    server.use(
      myInspectionsResponse([UPCOMING]),
      http.post(supabaseUrl('/rest/v1/rpc/cancel_inspection'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute(`/account/appointments?sheet=${UPCOMING.id}`, {
      auth: signedInAs('user'),
    });

    const drawer = await screen.findByRole('dialog');
    await user.click(within(drawer).getByRole('button', { name: ro.appointments.cancel.open }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: ro.appointments.cancel.confirm }));

    await waitFor(() => {
      expect(payload).toEqual({ p_inspection_id: UPCOMING.id });
    });
  });

  it('moves an inspection to another free hour', async () => {
    let payload: unknown;
    server.use(
      myInspectionsResponse([UPCOMING]),
      slotsResponse([{ starts_at: freeSlotIn(2), working: 1, free: 1 }]),
      http.post(supabaseUrl('/rest/v1/rpc/reschedule_inspection'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute(
      `/account/appointments?sheet=${UPCOMING.id}&mode=reschedule`,
      { auth: signedInAs('user') },
    );

    const drawer = await screen.findByRole('dialog');
    await user.click(await within(drawer).findByRole('button', { name: /Prima oră liberă/ }));
    await user.click(
      within(drawer).getByRole('button', { name: ro.appointments.reschedule.confirm }),
    );

    await waitFor(() => {
      expect(payload).toEqual({ p_inspection_id: UPCOMING.id, p_starts_at: freeSlotIn(2) });
    });
  });

  it('offers no changes for an inspection that already took place', async () => {
    server.use(myInspectionsResponse([DONE]));
    await renderAppRoute(`/account/appointments?sheet=${DONE.id}`, { auth: signedInAs('user') });

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText(ro.appointments.locked)).toBeInTheDocument();
    expect(
      within(drawer).queryByRole('button', { name: ro.appointments.cancel.open }),
    ).not.toBeInTheDocument();
  });
});
