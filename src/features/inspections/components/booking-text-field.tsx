import { useId } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useValidationMessage } from '@/i18n/validation';
import { cn } from '@/lib/utils';

type BookingTextFieldProps<Values extends FieldValues> = {
  control: Control<Values>;
  name: FieldPath<Values>;
  label: string;
  isLabelHidden?: boolean;
  placeholder?: string;
  hint?: string;
  suffix?: string;
  type?: 'text' | 'tel';
  inputMode?: 'numeric' | 'decimal' | 'tel';
  autoComplete?: string;
  maxLength?: number;
};

export function BookingTextField<Values extends FieldValues>({
  control,
  name,
  label,
  isLabelHidden = false,
  placeholder,
  hint,
  suffix,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
}: BookingTextFieldProps<Values>) {
  const validationMessage = useValidationMessage();
  const id = useId();
  const hintId = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className={cn('text-label', isLabelHidden && 'sr-only')}>
            {label}
          </FieldLabel>
          <div className="relative">
            <Input
              {...field}
              value={typeof field.value === 'string' ? field.value : ''}
              id={id}
              type={type}
              placeholder={placeholder}
              inputMode={inputMode}
              autoComplete={autoComplete}
              maxLength={maxLength}
              aria-invalid={fieldState.invalid}
              aria-describedby={hint ? hintId : undefined}
              className={cn(suffix && 'pr-12')}
            />
            {suffix ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-small font-bold text-muted-foreground"
              >
                {suffix}
              </span>
            ) : null}
          </div>
          {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
          <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
        </Field>
      )}
    />
  );
}
