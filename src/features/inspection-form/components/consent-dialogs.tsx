import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';

export type ConsentDialog = { kind: 'discard' } | { kind: 'remove'; index: number };

type ConsentDialogsProps = {
  dialog: ConsentDialog | null;
  version: string;
  isDiscarding: boolean;
  isRemoving: boolean;
  onDialogChange: (dialog: ConsentDialog | null) => void;
  onDiscard: () => void;
  onRemove: (index: number) => void;
};

export function ConsentDialogs({
  dialog,
  version,
  isDiscarding,
  isRemoving,
  onDialogChange,
  onDiscard,
  onRemove,
}: ConsentDialogsProps) {
  const { t } = useTranslation('inspectionForm');
  const removeIndex = dialog?.kind === 'remove' ? dialog.index : null;

  return (
    <>
      <ConfirmDialog
        isOpen={dialog?.kind === 'discard'}
        onOpenChange={(isOpen) => {
          onDialogChange(isOpen ? { kind: 'discard' } : null);
        }}
        tone="destructive"
        title={t('consent.discardTitle', { version })}
        description={t('consent.discardDescription')}
        confirmLabel={t('consent.discard')}
        pendingLabel={t('consent.discarding')}
        isPending={isDiscarding}
        onConfirm={onDiscard}
      />
      <ConfirmDialog
        isOpen={removeIndex !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            onDialogChange(null);
          }
        }}
        tone="destructive"
        title={t('consent.removeTitle', { number: (removeIndex ?? 0) + 1 })}
        description={t('consent.removeDescription')}
        confirmLabel={t('consent.removeConfirm')}
        pendingLabel={t('consent.removing')}
        isPending={isRemoving}
        onConfirm={() => {
          if (removeIndex !== null) {
            onRemove(removeIndex);
          }
        }}
      />
    </>
  );
}
