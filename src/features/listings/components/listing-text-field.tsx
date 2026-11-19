import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useValidationMessage } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import type { ListingFormValues } from '../listing-form.schemas';

type ListingTextFieldName =
  | 'title'
  | 'street_label'
  | 'rooms'
  | 'area_m2'
  | 'price'
  | 'floor'
  | 'building_floors'
  | 'year_built'
  | 'land_area_m2'
  | 'balconies'
  | 'parking_spaces';

type ListingTextFieldProps = {
  control: Control<ListingFormValues>;
  name: ListingTextFieldName;
  label: string;
  placeholder?: string;
  hint?: string | undefined;
  suffix?: string;
  inputMode?: 'numeric' | 'decimal';
  maxLength?: number;
};

export function ListingTextField({
  control,
  name,
  label,
  placeholder,
  hint,
  suffix,
  inputMode,
  maxLength,
}: ListingTextFieldProps) {
  const validationMessage = useValidationMessage();
  const id = useId();
  const hintId = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className="text-label">
            {label}
          </FieldLabel>
          <div className="relative">
            <Input
              {...field}
              id={id}
              placeholder={placeholder}
              inputMode={inputMode}
              maxLength={maxLength}
              aria-invalid={fieldState.invalid}
              aria-describedby={hint ? hintId : undefined}
              className={cn(
                'h-control rounded-md border-border bg-card px-(--control-padding-x) text-(length:--control-font-size) md:text-(length:--control-font-size)',
                suffix && 'pr-12',
              )}
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
