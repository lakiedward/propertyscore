import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/staff.json';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { ExceptionDialog } from './exception-dialog';

const INSPECTOR_ID = 'a0000000-0000-4000-8000-000000000005';

async function renderDialog(defaultDate: string) {
  const view = await renderWithProviders(
    <ExceptionDialog
      inspectorId={INSPECTOR_ID}
      defaultDate={defaultDate}
      isOpen
      onOpenChange={vi.fn()}
    />,
  );
  const dialog = await screen.findByRole('alertdialog');
  return { ...view, dialog };
}

describe('ExceptionDialog', { timeout: 20_000 }, () => {
  it('asks for the dates before saving', async () => {
    const { user, dialog } = await renderDialog('');

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.exceptions.dialog.save }),
    );

    expect(
      (await within(dialog).findAllByText(roCommon.validation.required)).length,
    ).toBeGreaterThan(0);
  });

  it('saves a whole-day exception from midnight to midnight in Romania', async () => {
    let payload: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/inspector_exceptions'), async ({ request }) => {
        payload = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user, dialog } = await renderDialog('2026-12-03');

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.exceptions.dialog.save }),
    );

    await waitFor(() => {
      expect(payload).toMatchObject({
        inspector_id: INSPECTOR_ID,
        kind: 'day_off',
        starts_at: '2026-12-02T22:00:00.000Z',
        ends_at: '2026-12-03T22:00:00.000Z',
      });
    });
  });

  it('disables the button while the exception is saved', async () => {
    server.use(
      http.post(
        supabaseUrl('/rest/v1/inspector_exceptions'),
        () => new Promise<Response>(() => undefined),
      ),
    );
    const { user, dialog } = await renderDialog('2026-12-03');

    await user.click(
      within(dialog).getByRole('button', { name: ro.availability.exceptions.dialog.save }),
    );

    expect(
      await within(dialog).findByRole('button', { name: ro.availability.exceptions.dialog.saving }),
    ).toBeDisabled();
  });
});
