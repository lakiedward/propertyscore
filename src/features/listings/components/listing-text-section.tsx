import { useId } from 'react';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { formatNumber } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import {
  LISTING_DESCRIPTION_MAX,
  LISTING_TITLE_MAX,
  type ListingFormValues,
} from '../listing-form.schemas';
import { ListingTextField } from './listing-text-field';

type ListingTextSectionProps = {
  control: Control<ListingFormValues>;
};

export function ListingTextSection({ control }: ListingTextSectionProps) {
  const { t } = useTranslation('myListings');
  const validationMessage = useValidationMessage();
  const descriptionId = useId();
  const descriptionHintId = useId();
  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });

  return (
    <FieldGroup className="gap-4">
      <ListingTextField
        control={control}
        name="title"
        label={t('form.title.label')}
        placeholder={t('form.title.placeholder')}
        maxLength={LISTING_TITLE_MAX}
        hint={t('wizard.text.titleHint', {
          count: formatNumber(title.length),
          max: formatNumber(LISTING_TITLE_MAX),
        })}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={descriptionId} className="text-label">
              {t('form.description.label')}
            </FieldLabel>
            <Textarea
              {...field}
              id={descriptionId}
              maxLength={LISTING_DESCRIPTION_MAX}
              aria-invalid={fieldState.invalid}
              aria-describedby={descriptionHintId}
              className="min-h-44"
            />
            <FieldDescription id={descriptionHintId}>
              {t('wizard.text.descriptionHint', {
                count: formatNumber(description.length),
                max: formatNumber(LISTING_DESCRIPTION_MAX),
              })}
            </FieldDescription>
            <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
          </Field>
        )}
      />
    </FieldGroup>
  );
}
