import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/inspections.json';
import roStaff from '@/i18n/locales/ro/staff.json';
import { buildAdminInspection } from '@/test/factories/admin-inspection';
import { signedInAs } from '@/test/factories/auth';
import { adminInspectionsResponse, MIHAI_ID } from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const QUEUED = buildAdminInspection();

const ALL_DAY_HOURS = http.get(supabaseUrl('/rest/v1/inspector_weekly_hours'), () =>
  HttpResponse.json(
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      id: `e5000000-0000-4000-8000-00000000000${String(weekday)}`,
      inspector_id: MIHAI_ID,
      weekday,
      starts_at: '08:00:00',
      ends_at: '20:00:00',
    })),
  ),
);

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

    expect(
      await screen.findByRole('heading', { name: ro.schedule.queue.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ro.schedule.queue.count_one.replace('{{count}}', '1')),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Calea Circumvalațiunii 41').length).toBeGreaterThan(0);
    expect(
      await screen.findByLabelText(ro.schedule.day.column.replace('{{name}}', 'Mihai Dobre')),
    ).toBeInTheDocument();
  });

  it('assigns an inspector from the drawer', async () => {
    let payload: unknown;
    server.use(
      adminInspectionsResponse([QUEUED]),
      ALL_DAY_HOURS,
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

  it('offers in the drawer only the inspectors free at the booking time', async () => {
    server.use(
      adminInspectionsResponse([QUEUED]),
      http.get(supabaseUrl('/rest/v1/inspector_weekly_hours'), () => HttpResponse.json([])),
    );
    const { user } = await renderAppRoute(
      `/admin/appointments?date=${dateOf(QUEUED)}&sheet=${QUEUED.id}`,
      { auth: signedInAs('admin') },
    );

    const drawer = await screen.findByRole('dialog');
    await user.click(within(drawer).getByRole('combobox', { name: ro.schedule.drawer.inspector }));

    expect(await screen.findByText(ro.schedule.drawer.noFree)).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Mihai Dobre/ })).not.toBeInTheDocument();
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
    await user.click(within(drawer).getByRole('button', { name: ro.schedule.drawer.cancel }));
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

  it('opens the booking day from the queue and assigns with one click', async () => {
    let payload: unknown;
    server.use(
      adminInspectionsResponse([QUEUED]),
      ALL_DAY_HOURS,
      http.post(supabaseUrl('/rest/v1/rpc/assign_inspector'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute('/admin/appointments', { auth: signedInAs('admin') });

    const card = await screen.findByRole('button', { name: /Calea Circumvalațiunii 41/ });
    await user.click(card);

    expect(card).toHaveAttribute('aria-pressed', 'true');
    await user.click(
      await screen.findByRole('button', {
        name: new RegExp(ro.schedule.assignTo.replace('{{name}}', 'Mihai Dobre')),
      }),
    );

    await waitFor(() => {
      expect(payload).toEqual({ p_inspection_id: QUEUED.id, p_inspector_id: MIHAI_ID });
    });
  });

  it('shows why an inspector who does not work then cannot take the booking', async () => {
    server.use(adminInspectionsResponse([QUEUED]));
    const { user } = await renderAppRoute('/admin/appointments', { auth: signedInAs('admin') });

    await user.click(await screen.findByRole('button', { name: /Calea Circumvalațiunii 41/ }));

    const column = await screen.findByLabelText(
      ro.schedule.day.column.replace('{{name}}', 'Mihai Dobre'),
    );
    expect(await within(column).findByText(ro.schedule.ghost.unavailable)).toBeInTheDocument();
    expect(
      within(column).queryByRole('button', {
        name: new RegExp(ro.schedule.assignTo.replace('{{name}}', 'Mihai Dobre')),
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the chosen inspector in the availability dropdown and names them', async () => {
    await renderAppRoute('/admin/appointments?tab=availability', { auth: signedInAs('admin') });

    expect(
      await screen.findByRole('combobox', { name: ro.schedule.availability.inspector }),
    ).toHaveTextContent('Mihai Dobre');
    const panel = screen.getByRole('region', { name: roStaff.availability.weekly.title });
    expect(within(panel).getByText('Mihai Dobre', { selector: 'strong' })).toBeInTheDocument();
  });

  it('narrows the inspectors to the chosen city', async () => {
    const { user } = await renderAppRoute('/admin/appointments?tab=availability', {
      auth: signedInAs('admin'),
    });

    const city = await screen.findByRole('combobox', { name: ro.schedule.availability.city });
    expect(city).toHaveTextContent(ro.schedule.availability.allCities);
    await user.click(city);
    await user.type(
      screen.getByRole('combobox', { name: ro.schedule.availability.citySearch }),
      'timisoara',
    );
    await user.click(screen.getByRole('option', { name: 'Timișoara' }));

    expect(
      await screen.findByRole('combobox', { name: ro.schedule.availability.city }),
    ).toHaveTextContent('Timișoara');
    expect(
      screen.getByRole('combobox', { name: ro.schedule.availability.inspector }),
    ).toHaveTextContent('Mihai Dobre');
  });

  it('filters the queue by city on its own', async () => {
    const elsewhere = buildAdminInspection({
      address_text: 'Bd. Unirii 18',
      city_id: 'c4000000-0000-4000-8000-000000000002',
      city_name: 'București',
    });
    server.use(adminInspectionsResponse([QUEUED, elsewhere]));
    const { user } = await renderAppRoute('/admin/appointments', { auth: signedInAs('admin') });

    const queue = await screen.findByRole('region', { name: ro.schedule.queue.heading });
    expect(
      within(queue).getByText(ro.schedule.queue.count_few.replace('{{count}}', '2')),
    ).toBeInTheDocument();
    await user.click(within(queue).getByRole('combobox', { name: ro.schedule.queue.city }));
    await user.click(await screen.findByRole('option', { name: 'București' }));

    expect(
      await within(queue).findByText(ro.schedule.queue.count_one.replace('{{count}}', '1')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bd. Unirii 18/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Calea Circumvalațiunii 41/ }),
    ).not.toBeInTheDocument();
  });

  it('drops the chosen booking when a calendar filter changes', async () => {
    server.use(adminInspectionsResponse([QUEUED]), ALL_DAY_HOURS);
    const { user } = await renderAppRoute('/admin/appointments', { auth: signedInAs('admin') });

    const card = await screen.findByRole('button', { name: /Calea Circumvalațiunii 41/ });
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('combobox', { name: ro.schedule.toolbar.inspector }));
    await user.click(await screen.findByRole('option', { name: /Mihai Dobre/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Calea Circumvalațiunii 41/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
  });

  it('hides the queue and brings it back', async () => {
    server.use(adminInspectionsResponse([QUEUED]));
    const { user } = await renderAppRoute('/admin/appointments', { auth: signedInAs('admin') });

    await user.click(await screen.findByRole('button', { name: ro.schedule.queue.hide }));

    expect(
      screen.queryByRole('region', { name: ro.schedule.queue.heading }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: ro.schedule.queue.show_one.replace('{{count}}', '1'),
      }),
    );

    expect(
      await screen.findByRole('region', { name: ro.schedule.queue.heading }),
    ).toBeInTheDocument();
  });
});
