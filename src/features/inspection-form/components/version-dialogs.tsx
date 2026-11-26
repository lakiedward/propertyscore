import { RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import type { VersionRequest } from '../hooks/use-version-history';

type VersionDialogsProps = {
  request: VersionRequest | null;
  nextLabel: string;
  hasDraft: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function VersionDialogs({
  request,
  nextLabel,
  hasDraft,
  isPending,
  onClose,
  onConfirm,
}: VersionDialogsProps) {
  const { t } = useTranslation('inspectionForm');
  const version = request?.item.label ?? '';
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <>
      <ConfirmDialog
        isOpen={request?.kind === 'restore'}
        onOpenChange={handleOpenChange}
        title={t('versions.restoreTitle', { version })}
        description={t(hasDraft ? 'versions.restoreReplaceText' : 'versions.restoreText', {
          version,
          next: nextLabel,
        })}
        confirmLabel={t('versions.restoreConfirm', { next: nextLabel })}
        pendingLabel={t('versions.restoring')}
        confirmIcon={RotateCcwIcon}
        isPending={isPending}
        onConfirm={onConfirm}
      />
      <ConfirmDialog
        isOpen={request?.kind === 'delete'}
        onOpenChange={handleOpenChange}
        tone="destructive"
        title={t('versions.deleteTitle', { version })}
        description={t('versions.deleteText')}
        confirmLabel={t('versions.deleteConfirm')}
        pendingLabel={t('versions.deleting')}
        confirmIcon={Trash2Icon}
        isPending={isPending}
        onConfirm={onConfirm}
      />
    </>
  );
}
