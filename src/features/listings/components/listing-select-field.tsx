import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValidationMessage } from '@/i18n/validation';
import type { ListingFormValues } from '../listing-form.schemas';

const NOT_SPECIFIED = 'not-specified';

type SelectName =
  | 'floor'
  | 'building_type'
  | 'house_type'
  | 'interior_condition'
  | 'heating'
  | 'cooling'
  | 'furnishing'
  | 'pets'
  | 'pool'
  | 'yard';

type ListingSelectFieldProps = {
  control: Control<ListingFormValues>;
  name: SelectName;
  label: string;
  options: readonly { value: string; label: string }[];
  isRequired?: boolean;
};

export function ListingSelectField({
  control,
  name,
  label,
  options,
  isRequired = false,
}: ListingSelectFieldProps) {
  const { t } = useTranslation('myListings');
  const validationMessage = useValidationMessage();
  const id = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className="text-label">
            {label}
          </FieldLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value === NOT_SPECIFIED ? '' : value);
            }}
          >
            <SelectTrigger
              ref={field.ref}
              id={id}
              aria-invalid={fieldState.invalid}
              onBlur={field.onBlur}
              className="w-full"
            >
              <SelectValue placeholder={t('wizard.details.choose')} />
            </SelectTrigger>
            <SelectContent>
              {isRequired ? null : (
                <SelectItem value={NOT_SPECIFIED}>{t('wizard.details.notSpecified')}</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
