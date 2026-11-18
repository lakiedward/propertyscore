import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { ConfirmDialog } from './confirm-dialog';

const TITLE = 'Ștergi anunțul?';
const DESCRIPTION = 'Anunțul dispare definitiv.';

describe('ConfirmDialog', () => {
  it('shows the given texts and confirms', async () => {
    const onConfirm = vi.fn();
    const { user } = await renderWithProviders(
      <ConfirmDialog
        isOpen
        onOpenChange={vi.fn()}
        title={TITLE}
        description={DESCRIPTION}
        confirmLabel="Șterge"
        tone="destructive"
        onConfirm={onConfirm}
      />,
    );

    const dialog = screen.getByRole('alertdialog', { name: TITLE });
    expect(within(dialog).getByText(DESCRIPTION)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Șterge' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('closes with the shared cancel label', async () => {
    const onOpenChange = vi.fn();
    const { user } = await renderWithProviders(
      <ConfirmDialog
        isOpen
        onOpenChange={onOpenChange}
        title={TITLE}
        description={DESCRIPTION}
        confirmLabel="Șterge"
        onConfirm={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: roCommon.actions.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps itself open and shows the pending label while the action runs', async () => {
    const onOpenChange = vi.fn();
    const { user } = await renderWithProviders(
      <ConfirmDialog
        isOpen
        onOpenChange={onOpenChange}
        title={TITLE}
        description={DESCRIPTION}
        confirmLabel="Șterge"
        pendingLabel="Se șterge…"
        isPending
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Se șterge…' })).toBeDisabled();
    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('submits the form it points to', async () => {
    const onSubmit = vi.fn();
    const { user } = await renderWithProviders(
      <ConfirmDialog
        isOpen
        onOpenChange={vi.fn()}
        title={TITLE}
        description={DESCRIPTION}
        confirmLabel="Șterge"
        formId="confirm-form"
      >
        <form
          id="confirm-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        />
      </ConfirmDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Șterge' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
