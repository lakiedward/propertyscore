import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { formatNumber, parseLocaleNumber } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import { useUpdateFormPoints } from '../api/inspection-form.queries';
import { pointsSchema, type PointsValues } from '../inspection-form.schemas';
import type { FormVersion } from '../inspection-form.types';

const POINT_FIELDS = ['good', 'acceptable', 'problem'] as const;

type AnswerPointsCardProps = {
  version: FormVersion;
  isEditable: boolean;
};

export function AnswerPointsCard({ version, isEditable }: AnswerPointsCardProps) {
  const { t } = useTranslation('inspectionForm');
  const validationMessage = useValidationMessage();
  const baseId = useId();
  const updatePoints = useUpdateFormPoints();
  const form = useForm<PointsValues>({
    resolver: zodResolver(pointsSchema),
    values: {
      good: version.points_good,
      acceptable: version.points_acceptable,
      problem: version.points_problem,
    },
    resetOptions: { keepDirtyValues: true },
  });

  const save = form.handleSubmit((values) => {
    if (
      values.good === version.points_good &&
      values.acceptable === version.points_acceptable &&
      values.problem === version.points_problem
    ) {
      return;
    }
    updatePoints.mutate({
      versionId: version.id,
      points: {
        points_good: values.good,
        points_acceptable: values.acceptable,
        points_problem: values.problem,
      },
    });
  });

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="flex flex-col gap-3 rounded-lg border border-card bg-card p-4 shadow-card-soft"
    >
      <h2 id={`${baseId}-title`} className="text-body-sm font-bold">
        {t('form.points.title')}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {POINT_FIELDS.map((name) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <FieldLabel htmlFor={`${baseId}-${name}`} className="text-meta font-bold">
                  {t(`form.points.${name}`)}
                </FieldLabel>
                <Input
                  id={`${baseId}-${name}`}
                  inputMode="decimal"
                  disabled={!isEditable}
                  aria-invalid={fieldState.invalid}
                  defaultValue={Number.isNaN(field.value) ? '' : formatNumber(field.value)}
                  key={`${version.id}-${String(field.value)}`}
                  onBlur={(event) => {
                    const parsed = parseLocaleNumber(event.target.value);
                    field.onChange(parsed ?? Number.NaN);
                    field.onBlur();
                    void save();
                  }}
                  className="h-10 tabular-nums"
                />
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
        ))}
      </div>
      <p className="text-meta text-muted-foreground">{t('form.points.hint')}</p>
    </section>
  );
}
