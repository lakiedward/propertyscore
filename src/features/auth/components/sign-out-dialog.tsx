import { LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useSignOut } from '../api/auth.queries';

type SignOutDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function SignOutDialog({ isOpen, onOpenChange }: SignOutDialogProps) {
  const { t } = useTranslation('auth');
  const signOut = useSignOut();

  const handleConfirm = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('signOut.title')}
      description={t('signOut.text')}
      confirmLabel={t('signOut.confirm')}
      pendingLabel={t('signOut.pending')}
      tone="destructive"
      confirmIcon={LogOutIcon}
      isPending={signOut.isPending}
      onConfirm={handleConfirm}
    />
  );
}
