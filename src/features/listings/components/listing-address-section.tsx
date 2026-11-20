import { useId } from 'react';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PinField } from '@/components/map/pin-field';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValidationMessage } from '@/i18n/validation';
import type { listCities } from '../api/my-listings.api';
import type { ListingFormValues } from '../listing-form.schemas';
import { ListingTextField } from './listing-text-field';

type ListingAddressSectionProps = {
  control: Control<ListingFormValues>;
  cities: Awaited<ReturnType<typeof listCities>>;
};

export function ListingAddressSection({ control, cities }: ListingAddressSectionProps) {
  const { t } = useTranslation('myListings');
  const validationMessage = useValidationMessage();
  const cityId = useId();
  const pinLabelId = useId();
  const pinHintId = useId();
  const cityName = useWatch({ control, name: 'city' });
  const cityCenter = cities.find((city) => city.name === cityName)?.center;

  return (
    <FieldGroup className="gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="city"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={cityId} className="text-label">
                {t('form.city.label')}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  ref={field.ref}
                  id={cityId}
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                  className="w-full"
                >
                  <SelectValue placeholder={t('form.city.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
        <ListingTextField
          control={control}
          name="street_label"
          label={t('wizard.address.street')}
          placeholder={t('form.street.placeholder')}
        />
      </div>
      <Controller
        name="pin"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel id={pinLabelId} className="text-label">
              {t('wizard.address.pin')}
            </FieldLabel>
            <FieldDescription id={pinHintId}>{t('form.pin.hint')}</FieldDescription>
            <PinField
              mapLabel={t('form.pin.mapLabel')}
              errorText={t('form.pin.mapError')}
              labelledBy={pinLabelId}
              value={field.value}
              cityCenter={cityCenter}
              isDisabled={false}
              isInvalid={fieldState.invalid}
              describedBy={pinHintId}
              onChange={field.onChange}
            />
            <FieldError>{fieldState.invalid ? t('form.pin.missing') : undefined}</FieldError>
          </Field>
        )}
      />
    </FieldGroup>
  );
}
