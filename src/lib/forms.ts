import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { messageKey } from '@/i18n/validation';
import { isAppError, type AppError } from '@/lib/errors';

type ServerErrorForm<TValues extends FieldValues> = Pick<
  UseFormReturn<TValues>,
  'getValues' | 'setError'
>;

function isFormField<TValues extends FieldValues>(
  values: TValues,
  field: string,
): field is Path<TValues> {
  return Object.hasOwn(values, field);
}

function serverErrorMessage(error: AppError): string {
  return error.reason
    ? messageKey(`common:errors.reasons.${error.reason}`)
    : messageKey(`common:errors.${error.code}`);
}

export function applyServerErrors<TValues extends FieldValues>(
  form: ServerErrorForm<TValues>,
  error: unknown,
): boolean {
  if (!isAppError(error) || !error.field || !isFormField(form.getValues(), error.field)) {
    return false;
  }
  form.setError(
    error.field,
    { type: 'server', message: serverErrorMessage(error) },
    {
      shouldFocus: true,
    },
  );
  return true;
}
