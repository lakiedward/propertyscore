import { zodResolver } from '@hookform/resolvers/zod';
import { BanIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { FilterChip } from '@/components/property/filter-chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage } from '@/i18n/error-message';
import { useValidationMessage } from '@/i18n/validation';
import { applyServerErrors } from '@/lib/forms';
import { decisionFormSchema, type DecisionFormValues } from '../moderation.schemas';
import { DECISION_REASONS, type FormDecision } from '../moderation.reasons';
import type { DecisionReason } from '../moderation.types';
import { decisionMessage } from '../moderation.utils';

type DecisionFormProps = {
  decision: FormDecision;
  listingTitle: string;
  isPending: boolean;
  onSubmit: (values: DecisionFormValues) => Promise<void>;
  onCancel: () => void;
};

export function DecisionForm({
  decision,
  listingTitle,
  isPending,
  onSubmit,
  onCancel,
}: DecisionFormProps) {
  const { t } = useTranslation('moderation');
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const messageId = useId();
  const [formError, setFormError] = useState<unknown>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: { reasons: [], message: '' },
  });
  const reasons: readonly DecisionReason[] = DECISION_REASONS[decision];
  const isBlock = decision === 'blocked';

  const autoMessage = (selected: readonly DecisionReason[]) =>
    decisionMessage(
      reasons
        .filter((reason) => selected.includes(reason))
        .map((reason) => t(`reasons.${reason}.message`)),
    );

  const toggleReason = (reason: DecisionReason, isSelected: boolean) => {
    const current = form.getValues('reasons');
    const next = isSelected ? [...current, reason] : current.filter((item) => item !== reason);
    const message = form.getValues('message');
    const isUntouched = message.trim() === '' || message === autoMessage(current);
    form.setValue('reasons', next, { shouldValidate: form.formState.isSubmitted });
    if (isUntouched) {
      form.setValue('message', autoMessage(next), { shouldValidate: form.formState.isSubmitted });
    }
  };

  const submitValues = async (values: DecisionFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setIsConfirmOpen(false);
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (isBlock) {
      setIsConfirmOpen(true);
      return;
    }
    await submitValues(values);
  });

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="flex flex-col gap-2.5"
    >
      <p className="text-small leading-copy text-muted-foreground">
        {t(`decision.form.${decision}.hint`)}
      </p>
      <Controller
        name="reasons"
        control={form.control}
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={fieldState.invalid} className="gap-2">
            <FieldLegend className="sr-only">{t('decision.form.reasons')}</FieldLegend>
            <ul className="flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <li key={reason}>
                  <FilterChip
                    variant="reason"
                    label={t(`reasons.${reason}.label`)}
                    isSelected={field.value.includes(reason)}
                    onSelectedChange={(isSelected) => {
                      toggleReason(reason, isSelected);
                    }}
                  />
                </li>
              ))}
            </ul>
            <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
          </FieldSet>
        )}
      />
      <Controller
        name="message"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor={messageId} className="text-label">
              {t('decision.form.message')}
            </FieldLabel>
            <Textarea
              {...field}
              id={messageId}
              aria-invalid={fieldState.invalid}
              maxLength={2000}
            />
            <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
          </Field>
        )}
      />
      {formError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(formError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex gap-2.5">
        <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={isPending}>
          {t('decision.form.cancel')}
        </Button>
        <Button
          type="submit"
          size="md"
          variant={isBlock ? 'destructive' : 'default'}
          className="flex-1"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? t('decision.form.pending') : t(`decision.form.${decision}.submit`)}
        </Button>
      </div>
      {isBlock ? (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title={t('decision.confirmBlock.title')}
          description={t('decision.confirmBlock.description', { title: listingTitle })}
          confirmLabel={t('decision.confirmBlock.confirm')}
          pendingLabel={t('decision.confirmBlock.pending')}
          tone="destructive"
          confirmIcon={BanIcon}
          isPending={isPending}
          onConfirm={() => {
            void submitValues(form.getValues());
          }}
        />
      ) : null}
    </form>
  );
}
