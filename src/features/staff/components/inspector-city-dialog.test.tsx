import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/staff.json';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { InspectorCityDialog } from './inspector-city-dialog';

const USER_ID = 'a0000000-0000-4000-8000-000000000003';
const TIMISOARA_ID = 'c4000000-0000-4000-8000-000000000001';

async function renderDialog(cityId: string | null) {
  const view = await renderWithProviders(
    <InspectorCityDialog
      userId={USER_ID}
      name="Ion Țurcanu"
      cityId={cityId}
      isOpen
      onOpenChange={vi.fn()}
    />,
  );
  const dialog = await screen.findByRole('alertdialog');
  return { ...view, dialog };
}

describe('InspectorCityDialog', () => {
  it('marks the city as missing when saved without one', async () => {
    const { user, dialog } = await renderDialog(null);

    await user.click(within(dialog).getByRole('button', { name: ro.users.inspectorDialog.save }));

    expect(
      await within(dialog).findByRole('combobox', { name: ro.users.inspectorDialog.city }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('says when the cities cannot load instead of an empty list', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/cities'), () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    const { dialog } = await renderDialog(null);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      ro.users.inspectorDialog.citiesError,
    );
    expect(
      within(dialog).queryByRole('combobox', { name: ro.users.inspectorDialog.city }),
    ).not.toBeInTheDocument();
  });

  it('disables the button while the city is saved', async () => {
    server.use(
      http.post(
        supabaseUrl('/rest/v1/rpc/set_inspector'),
        () => new Promise<Response>(() => undefined),
      ),
    );
    const { user, dialog } = await renderDialog(TIMISOARA_ID);

    await user.click(within(dialog).getByRole('button', { name: ro.users.inspectorDialog.save }));

    expect(
      await within(dialog).findByRole('button', { name: ro.users.inspectorDialog.saving }),
    ).toBeDisabled();
  });
});
