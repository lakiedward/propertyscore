import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type ConfirmDialogAction =
  { onConfirm: () => void; formId?: never } | { formId: string; onConfirm?: never };

type ConfirmDialogProps = ConfirmDialogAction & {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  confirmIcon?: LucideIcon;
  isPending?: boolean;
  trigger?: ReactNode;
  children?: ReactNode;
};

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  tone = 'default',
  confirmIcon: ConfirmIcon,
  isPending = false,
  trigger,
  children,
  onConfirm,
  formId,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  const handleOpenChange = (open: boolean) => {
    if (!open && isPending) {
      return;
    }
    onOpenChange(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={isPending}>
            {cancelLabel ?? t('actions.cancel')}
          </AlertDialogCancel>
          <Button
            type={formId ? 'submit' : 'button'}
            form={formId}
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            disabled={isPending}
            aria-busy={isPending}
            onClick={onConfirm}
          >
            {ConfirmIcon ? <ConfirmIcon aria-hidden /> : null}
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
