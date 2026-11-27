import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useId } from 'react';
import { Controller, useFieldArray, useForm, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValidationMessage } from '@/i18n/validation';
import { useSetWeeklyHours } from '../api/staff.queries';
import { WEEKLY_RANGES_MAX, weeklyHoursSchema, type WeeklyHoursValues } from '../staff.schemas';
import type { TimeRange } from '../staff.types';
import { SCHEDULE_TIMES } from '../staff.utils';

const DEFAULT_RANGE: TimeRange = { startsAt: '08:00', endsAt: '17:00' };

type WeeklyHoursDialogProps = {
  inspectorId: string;
  weekday: number;
  dayName: string;
  ranges: readonly TimeRange[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function WeeklyHoursDialog({
  inspectorId,
  weekday,
  dayName,
  ranges,
  isOpen,
  onOpenChange,
}: WeeklyHoursDialogProps) {
  const { t } = useTranslation('staff');
  const validationMessage = useValidationMessage();
  const formId = useId();
  const setWeeklyHours = useSetWeeklyHours();
  const form = useForm<WeeklyHoursValues>({
    resolver: zodResolver(weeklyHoursSchema),
    values: { ranges: ranges.length > 0 ? [...ranges] : [DEFAULT_RANGE] },
  });
  const fields = useFieldArray({ control: form.control, name: 'ranges' });

  const handleSubmit = form.handleSubmit((values) => {
    setWeeklyHours.mutate(
      { inspectorId, weekday, ranges: values.ranges },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('availability.weekly.dialog.title', { day: dayName })}
      description={t('availability.weekly.dialog.description')}
      confirmLabel={t('availability.weekly.dialog.save')}
      pendingLabel={t('availability.weekly.dialog.saving')}
      isPending={setWeeklyHours.isPending}
      formId={formId}
    >
      <form
        id={formId}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-3"
      >
        {fields.fields.map((range, index) => (
          <div
            key={range.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
          >
            <TimeSelect
              control={form.control}
              index={index}
              part="startsAt"
              label={t('availability.weekly.dialog.from', { index: index + 1 })}
              validationMessage={validationMessage}
            />
            <TimeSelect
              control={form.control}
              index={index}
              part="endsAt"
              label={t('availability.weekly.dialog.to', { index: index + 1 })}
              validationMessage={validationMessage}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6.5"
              aria-label={t('availability.weekly.dialog.remove', { index: index + 1 })}
              onClick={() => {
                fields.remove(index);
              }}
            >
              <Trash2Icon aria-hidden />
            </Button>
          </div>
        ))}
        {fields.fields.length === 0 ? (
          <p className="text-small text-muted-foreground">
            {t('availability.weekly.dialog.dayOff')}
          </p>
        ) : null}
        {fields.fields.length < WEEKLY_RANGES_MAX ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="touch-target w-fit"
            onClick={() => {
              fields.append(DEFAULT_RANGE);
            }}
          >
            <PlusIcon aria-hidden />
            {t('availability.weekly.dialog.add')}
          </Button>
        ) : null}
      </form>
    </ConfirmDialog>
  );
}

type TimeSelectProps = {
  control: Control<WeeklyHoursValues>;
  index: number;
  part: 'startsAt' | 'endsAt';
  label: string;
  validationMessage: ReturnType<typeof useValidationMessage>;
};

function TimeSelect({ control, index, part, label, validationMessage }: TimeSelectProps) {
  const fieldId = useId();

  return (
    <Controller
      name={`ranges.${index}.${part}`}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={fieldId} aria-invalid={fieldState.invalid} className="tabular-nums">
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
  );
}
