import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/staff.json';
import { signedInAs, TEST_USER_ID } from '@/test/factories/auth';
import { weeklyHoursResponse } from '@/test/msw/handlers/staff';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const MONDAY = { id: 'w1', weekday: 1, starts_at: '08:00:00', ends_at: '17:00:00' };

describe('AvailabilityEditor', { timeout: 20_000 }, () => {
  it('shows the weekly hours and the free days', async () => {
    server.use(weeklyHoursResponse([MONDAY]));
    await renderAppRoute('/field/availability', { auth: signedInAs('user', 'inspector') });

    expect(await screen.findByText('08:00–17:00')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'luni' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'marți' })).not.toBeChecked();
    expect(screen.getAllByText(ro.availability.weekly.off)).toHaveLength(6);
  });

  it('opens a day with the default hours when it is switched on', async () => {
    let payload: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/set_inspector_weekly_hours'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute('/field/availability', {
      auth: signedInAs('user', 'inspector'),
    });

    await user.click(await screen.findByRole('switch', { name: 'marți' }));

    await waitFor(() => {
      expect(payload).toEqual({
        p_inspector_id: TEST_USER_ID,
        p_weekday: 2,
        p_ranges: [{ starts_at: '08:00', ends_at: '17:00' }],
      });
    });
  });

  it('adds a whole-day exception', async () => {
    let payload: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/inspector_exceptions'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user } = await renderAppRoute('/field/availability', {
      auth: signedInAs('user', 'inspector'),
    });

    await user.click(await screen.findByRole('button', { name: ro.availability.exceptions.add }));
    const dialog = await screen.findByRole('alertdialog', {
      name: ro.availability.exceptions.dialog.title,
    });
    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.exceptions.dialog.save }),
    );

    await waitFor(() => {
      expect(payload).toMatchObject({ inspector_id: TEST_USER_ID, kind: 'day_off', note: null });
    });
  });

  it('refuses a weekly range that ends before it starts', async () => {
    server.use(weeklyHoursResponse([MONDAY]));
    const { user } = await renderAppRoute('/field/availability', {
      auth: signedInAs('user', 'inspector'),
    });

    await user.click(
      await screen.findByRole('button', {
        name: ro.availability.weekly.edit.replace('{{day}}', 'luni'),
      }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('combobox', {
        name: ro.availability.weekly.dialog.to.replace('{{index}}', '1'),
      }),
    );
    await user.click(await screen.findByRole('option', { name: '07:00' }));
    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.weekly.dialog.save }),
    );

    expect(
      await within(dialog).findByRole('combobox', {
        name: ro.availability.weekly.dialog.to.replace('{{index}}', '1'),
      }),
    ).toHaveAttribute('aria-invalid', 'true');
  });
});
