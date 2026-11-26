import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/staff.json';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { WeeklyHoursDialog } from './weekly-hours-dialog';

const INSPECTOR_ID = 'a0000000-0000-4000-8000-000000000005';

async function renderDialog(ranges: readonly { startsAt: string; endsAt: string }[]) {
  const view = await renderWithProviders(
    <WeeklyHoursDialog
      inspectorId={INSPECTOR_ID}
      weekday={3}
      dayName="miercuri"
      ranges={ranges}
      isOpen
      onOpenChange={vi.fn()}
    />,
  );
  const dialog = await screen.findByRole('alertdialog');
  return { ...view, dialog };
}

describe('WeeklyHoursDialog', () => {
  it('refuses a range that ends before it starts', async () => {
    const { user, dialog } = await renderDialog([{ startsAt: '12:00', endsAt: '10:00' }]);

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.weekly.dialog.save }),
    );

    expect(await within(dialog).findByText(roCommon.validation.endAfterStart)).toBeInTheDocument();
  });

  it('refuses ranges that overlap', async () => {
    const { user, dialog } = await renderDialog([
      { startsAt: '08:00', endsAt: '12:00' },
      { startsAt: '11:00', endsAt: '14:00' },
    ]);

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.weekly.dialog.save }),
    );

    expect(
      (await within(dialog).findAllByText(roCommon.validation.rangesOverlap)).length,
    ).toBeGreaterThan(0);
  });

  it('saves the ranges of the day', async () => {
    let payload: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/set_inspector_weekly_hours'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, dialog } = await renderDialog([{ startsAt: '08:00', endsAt: '12:00' }]);

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.weekly.dialog.save }),
    );

    await waitFor(() => {
      expect(payload).toMatchObject({ p_inspector_id: INSPECTOR_ID, p_weekday: 3 });
    });
  });

  it('disables the button while the hours are saved', async () => {
    server.use(
      http.post(
        supabaseUrl('/rest/v1/rpc/set_inspector_weekly_hours'),
        () => new Promise<Response>(() => undefined),
      ),
    );
    const { user, dialog } = await renderDialog([{ startsAt: '08:00', endsAt: '12:00' }]);

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.weekly.dialog.save }),
    );

    expect(
      await within(dialog).findByRole('button', { name: ro.availability.weekly.dialog.saving }),
    ).toBeDisabled();
  });
});
