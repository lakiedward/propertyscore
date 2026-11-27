import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/staff.json';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { BlockUserDialog } from './block-user-dialog';

const USER_ID = 'a0000000-0000-4000-8000-000000000003';
const NAME = 'Ion Țurcanu';

async function renderDialog() {
  const view = await renderWithProviders(
    <BlockUserDialog userId={USER_ID} name={NAME} isOpen onOpenChange={vi.fn()} />,
  );
  const dialog = await screen.findByRole('alertdialog');
  return { ...view, dialog };
}

describe('BlockUserDialog', () => {
  it('asks for a reason before blocking', async () => {
    const { user, dialog } = await renderDialog();

    await user.click(within(dialog).getByRole('button', { name: ro.users.blockDialog.confirm }));

    expect(await within(dialog).findByText(roCommon.validation.required)).toBeInTheDocument();
  });

  it('shows the refusal from the server in the dialog', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/block_user'), () =>
        postgrestErrorResponse('P0001', 'cannot_block_admin', 400),
      ),
    );
    const { user, dialog } = await renderDialog();

    await user.type(within(dialog).getByLabelText(ro.users.blockDialog.reason), 'Spam');
    await user.click(within(dialog).getByRole('button', { name: ro.users.blockDialog.confirm }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      roCommon.errors.reasons.cannot_block_admin,
    );
  });

  it('disables the button while the block is sent', async () => {
    server.use(
      http.post(
        supabaseUrl('/rest/v1/rpc/block_user'),
        () => new Promise<Response>(() => undefined),
      ),
    );
    const { user, dialog } = await renderDialog();

    await user.type(within(dialog).getByLabelText(ro.users.blockDialog.reason), 'Spam');
    await user.click(within(dialog).getByRole('button', { name: ro.users.blockDialog.confirm }));

    expect(
      await within(dialog).findByRole('button', { name: ro.users.blockDialog.pending }),
    ).toBeDisabled();
  });
});
