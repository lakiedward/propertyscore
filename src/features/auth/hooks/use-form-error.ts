import { useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { applyServerErrors } from '@/lib/forms';

export function useFormError<TValues extends FieldValues>(
  form: Pick<UseFormReturn<TValues>, 'getValues' | 'setError'>,
) {
  const [formError, setFormError] = useState<unknown>();

  return {
    error: formError,
    clear: () => {
      setFormError(undefined);
    },
    handle: (error: unknown) => {
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
    },
  };
}
