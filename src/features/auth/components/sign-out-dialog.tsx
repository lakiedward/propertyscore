import { LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('signOut.title')}</DialogTitle>
          <DialogDescription>{t('signOut.text')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('signOut.cancel')}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={signOut.isPending}
            onClick={handleConfirm}
          >
            <LogOutIcon aria-hidden />
            {signOut.isPending ? t('signOut.pending') : t('signOut.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
