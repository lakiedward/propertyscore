import { zodResolver } from '@hookform/resolvers/zod';
import { BanIcon } from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage } from '@/i18n/error-message';
import { useValidationMessage } from '@/i18n/validation';
import { useBlockUser } from '../api/staff.queries';
import { BLOCK_REASON_MAX, blockUserSchema, type BlockUserValues } from '../staff.schemas';

const CONSEQUENCES = ['signIn', 'listings', 'bookings', 'visits'] as const;

type BlockUserDialogProps = {
  userId: string;
  name: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function BlockUserDialog({ userId, name, isOpen, onOpenChange }: BlockUserDialogProps) {
  const { t } = useTranslation('staff');
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const formId = useId();
  const reasonId = useId();
  const hintId = useId();
  const blockUser = useBlockUser();
  const form = useForm<BlockUserValues>({
    resolver: zodResolver(blockUserSchema),
    defaultValues: { reason: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    blockUser.mutate(
      { userId, reason: values.reason },
      {
        onSuccess: () => {
          toast.success(t('users.blockDialog.done', { name }));
          form.reset();
          onOpenChange(false);
        },
      },
    );
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      tone="destructive"
      title={t('users.blockDialog.title', { name })}
      description={t('users.blockDialog.description')}
      confirmLabel={t('users.blockDialog.confirm')}
      pendingLabel={t('users.blockDialog.pending')}
      confirmIcon={BanIcon}
      isPending={blockUser.isPending}
      formId={formId}
    >
      <form
        id={formId}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-3"
      >
        <ul className="flex list-disc flex-col gap-1 pl-5 text-small text-muted-foreground">
          {CONSEQUENCES.map((item) => (
            <li key={item}>{t(`users.blockDialog.consequences.${item}`)}</li>
          ))}
        </ul>
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={reasonId}>{t('users.blockDialog.reason')}</FieldLabel>
              <Textarea
                {...field}
                id={reasonId}
                maxLength={BLOCK_REASON_MAX}
                aria-invalid={fieldState.invalid}
                aria-describedby={hintId}
              />
              <FieldDescription id={hintId}>{t('users.blockDialog.reasonHint')}</FieldDescription>
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
        {blockUser.isError ? (
          <Alert tone="error">
            <AlertDescription>{errorMessage(blockUser.error)}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </ConfirmDialog>
  );
}
