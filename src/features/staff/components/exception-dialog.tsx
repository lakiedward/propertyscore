import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { DatePicker } from '@/components/forms/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useValidationMessage } from '@/i18n/validation';
import { Constants } from '@/lib/supabase/database.types';
import { useAddException } from '../api/staff.queries';
import {
  EXCEPTION_NOTE_MAX,
  exceptionFormSchema,
  type ExceptionFormValues,
} from '../staff.schemas';
import { exceptionBounds, SCHEDULE_TIMES } from '../staff.utils';

const EXCEPTION_KINDS = Constants.public.Enums.inspector_exception_kind;

const TIME_FIELDS = ['startTime', 'endTime'] as const;

type ExceptionDialogProps = {
  inspectorId: string;
  defaultDate: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ExceptionDialog({
  inspectorId,
  defaultDate,
  isOpen,
  onOpenChange,
}: ExceptionDialogProps) {
  const { t } = useTranslation('staff');
  const validationMessage = useValidationMessage();
  const formId = useId();
  const kindId = useId();
  const fromId = useId();
  const toId = useId();
  const allDayId = useId();
  const startId = useId();
  const endId = useId();
  const noteId = useId();
  const addException = useAddException();
  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(exceptionFormSchema),
    defaultValues: {
      kind: 'day_off',
      fromDate: defaultDate,
      toDate: defaultDate,
      isAllDay: true,
      startTime: '08:00',
      endTime: '12:00',
      note: '',
    },
  });
  const isAllDay = useWatch({ control: form.control, name: 'isAllDay' });
  const fromDate = useWatch({ control: form.control, name: 'fromDate' });

  const handleSubmit = form.handleSubmit((values) => {
    const { startsAt, endsAt } = exceptionBounds(values);
    addException.mutate(
      {
        inspectorId,
        kind: values.kind,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        note: values.note === '' ? null : values.note,
      },
      {
        onSuccess: () => {
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
      title={t('availability.exceptions.dialog.title')}
      description={t('availability.exceptions.dialog.description')}
      confirmLabel={t('availability.exceptions.dialog.save')}
      pendingLabel={t('availability.exceptions.dialog.saving')}
      isPending={addException.isPending}
      formId={formId}
    >
      <form id={formId} onSubmit={(event) => void handleSubmit(event)} noValidate>
        <FieldGroup className="gap-4">
          <Controller
            name="kind"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={kindId}>{t('availability.exceptions.dialog.kind')}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={kindId} aria-invalid={fieldState.invalid}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCEPTION_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`availability.exceptions.kind.${kind}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="fromDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={fromId}>
                    {t('availability.exceptions.dialog.from')}
                  </FieldLabel>
                  <DatePicker
                    id={fromId}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      if (form.getValues('toDate') < value) {
                        form.setValue('toDate', value, { shouldValidate: true });
                      }
                    }}
                    isInvalid={fieldState.invalid}
                  />
                  <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
                </Field>
              )}
            />
            <Controller
              name="toDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={toId}>{t('availability.exceptions.dialog.to')}</FieldLabel>
                  <DatePicker
                    id={toId}
                    value={field.value}
                    onChange={field.onChange}
                    min={fromDate}
                    isInvalid={fieldState.invalid}
                  />
                  <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
                </Field>
              )}
            />
          </div>
          <Controller
            name="isAllDay"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal" className="items-center justify-between">
                <FieldLabel htmlFor={allDayId}>
                  {t('availability.exceptions.dialog.allDay')}
                </FieldLabel>
                <Switch id={allDayId} checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
          {isAllDay ? null : (
            <div className="grid grid-cols-2 gap-3">
              {TIME_FIELDS.map((name) => (
                <Controller
                  key={name}
                  name={name}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={name === 'startTime' ? startId : endId}>
                        {t(`availability.exceptions.dialog.${name}`)}
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id={name === 'startTime' ? startId : endId}
                          aria-invalid={fieldState.invalid}
                          className="tabular-nums"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_TIMES.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
                    </Field>
                  )}
                />
              ))}
            </div>
          )}
          <Controller
            name="note"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={noteId}>{t('availability.exceptions.dialog.note')}</FieldLabel>
                <Textarea
                  {...field}
                  id={noteId}
                  rows={4}
                  maxLength={EXCEPTION_NOTE_MAX}
                  aria-invalid={fieldState.invalid}
                  className="min-h-28 resize-y"
                />
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>
      </form>
    </ConfirmDialog>
  );
}
