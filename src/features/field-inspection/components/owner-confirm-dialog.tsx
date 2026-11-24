import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheckIcon } from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useValidationMessage } from '@/i18n/validation';
import { applyServerErrors } from '@/lib/forms';
import { useSubmitInspection } from '../api/field-inspection.queries';
import { ownerConfirmSchema, type OwnerConfirmValues } from '../field-inspection.schemas';

type OwnerConfirmDialogProps = {
  inspectionId: string;
  ownerName: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function OwnerConfirmDialog({
  inspectionId,
  ownerName,
  isOpen,
  onOpenChange,
}: OwnerConfirmDialogProps) {
  const { t } = useTranslation('fieldInspection');
  const validationMessage = useValidationMessage();
  const formId = useId();
  const nameId = useId();
  const submit = useSubmitInspection(inspectionId);
  const form = useForm<OwnerConfirmValues>({
    resolver: zodResolver(ownerConfirmSchema),
    values: { ownerName },
  });

  const handleSubmit = form.handleSubmit((values) => {
    submit.mutate(values.ownerName, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (error) => {
        applyServerErrors(form, error);
      },
    });
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('confirm.title')}
      description={t('confirm.text')}
      confirmLabel={t('confirm.confirm')}
      pendingLabel={t('confirm.confirming')}
      confirmIcon={CircleCheckIcon}
      isPending={submit.isPending}
      formId={formId}
    >
      <form id={formId} onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Controller
          name="ownerName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={nameId}>{t('confirm.ownerName')}</FieldLabel>
              <Input {...field} id={nameId} autoComplete="off" aria-invalid={fieldState.invalid} />
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </form>
    </ConfirmDialog>
  );
}
