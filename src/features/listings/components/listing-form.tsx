import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useErrorMessage } from '@/i18n/error-message';
import { useValidationMessage } from '@/i18n/validation';
import { applyServerErrors } from '@/lib/forms';
import { myListingQueries } from '../api/my-listings.queries';
import { listingFormSchema, type ListingFormValues } from '../listing-form.schemas';
import { ListingPinField } from './listing-pin-field';

export type ListingFormAction = 'save' | 'submit';

type ListingFormProps = {
  defaultValues: ListingFormValues;
  isEditable: boolean;
  isPending: boolean;
  saveLabel: string;
  submitLabel?: string;
  onSave: (values: ListingFormValues, action: ListingFormAction) => Promise<void>;
  photos?: ReactNode;
};

const INPUT_CLASS =
  'h-control rounded-md border-border bg-card px-(--control-padding-x) text-(length:--control-font-size) md:text-(length:--control-font-size)';

const TOGGLE_ITEM_CLASS =
  'h-10 rounded-full px-4 text-small font-bold text-foreground hover:bg-surface-alt data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';

type TextFieldName =
  | 'title'
  | 'street_label'
  | 'rooms'
  | 'area_m2'
  | 'price'
  | 'floor'
  | 'building_floors'
  | 'year_built';

export function ListingForm({
  defaultValues,
  isEditable,
  isPending,
  saveLabel,
  submitLabel,
  onSave,
  photos,
}: ListingFormProps) {
  const { t } = useTranslation('myListings');
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const { data: cities } = useSuspenseQuery(myListingQueries.cities());
  const [formError, setFormError] = useState<unknown>(null);
  const ids = {
    city: useId(),
    description: useId(),
    descriptionHint: useId(),
    pin: useId(),
    pinHint: useId(),
  };
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues,
    disabled: !isEditable,
  });
  const cityName = useWatch({ control: form.control, name: 'city' });
  const transaction = useWatch({ control: form.control, name: 'transaction' });
  const cityCenter = cities.find((city) => city.name === cityName)?.center;

  const submitWith = (action: ListingFormAction) =>
    form.handleSubmit(async (values) => {
      setFormError(null);
      try {
        await onSave(values, action);
      } catch (error) {
        if (!applyServerErrors(form, error)) {
          setFormError(error);
        }
      }
    });

  return (
    <form
      noValidate
      onSubmit={(event) => void submitWith('save')(event)}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-(--card-padding)">
        <h2 className="text-body font-bold text-foreground">{t('form.details')}</h2>
        <FieldGroup className="gap-4">
          <SegmentedField
            control={form.control}
            name="transaction"
            legend={t('form.transaction.label')}
            options={[
              { value: 'sale', label: t('form.transaction.sale') },
              { value: 'rent', label: t('form.transaction.rent') },
            ]}
            isDisabled={!isEditable}
          />
          <TextField
            control={form.control}
            name="title"
            label={t('form.title.label')}
            placeholder={t('form.title.placeholder')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              control={form.control}
              name="rooms"
              label={t('form.rooms.label')}
              inputMode="numeric"
            />
            <TextField
              control={form.control}
              name="area_m2"
              label={t('form.area.label')}
              inputMode="decimal"
            />
            <TextField
              control={form.control}
              name="price"
              label={t('form.price.label')}
              inputMode="decimal"
              hint={transaction === 'rent' ? t('form.price.rentHint') : undefined}
            />
          </div>
          <SegmentedField
            control={form.control}
            name="currency"
            legend={t('form.currency.label')}
            options={[
              { value: 'EUR', label: t('form.currency.EUR') },
              { value: 'RON', label: t('form.currency.RON') },
            ]}
            isDisabled={!isEditable}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              control={form.control}
              name="floor"
              label={t('form.floor.label')}
              hint={t('form.floor.hint')}
              inputMode="numeric"
            />
            <TextField
              control={form.control}
              name="building_floors"
              label={t('form.buildingFloors.label')}
              hint={t('form.buildingFloors.hint')}
              inputMode="numeric"
            />
            <TextField
              control={form.control}
              name="year_built"
              label={t('form.yearBuilt.label')}
              hint={t('form.yearBuilt.hint')}
              inputMode="numeric"
            />
          </div>
        </FieldGroup>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-(--card-padding)">
        <h2 className="text-body font-bold text-foreground">{t('form.location')}</h2>
        <FieldGroup className="gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="city"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={ids.city} className="text-label">
                    {t('form.city.label')}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={field.disabled}
                  >
                    <SelectTrigger
                      id={ids.city}
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
            <TextField
              control={form.control}
              name="street_label"
              label={t('form.street.label')}
              placeholder={t('form.street.placeholder')}
            />
          </div>
          <Controller
            name="pin"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={ids.pin} className="text-label">
                  {t('form.pin.label')}
                </FieldLabel>
                <FieldDescription id={ids.pinHint}>{t('form.pin.hint')}</FieldDescription>
                <ListingPinField
                  id={ids.pin}
                  value={field.value}
                  cityCenter={cityCenter}
                  isDisabled={!isEditable}
                  isInvalid={fieldState.invalid}
                  describedBy={ids.pinHint}
                  onChange={field.onChange}
                />
                <FieldError>{fieldState.invalid ? t('form.pin.missing') : undefined}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-(--card-padding)">
        <h2 className="text-body font-bold text-foreground">{t('form.descriptionSection')}</h2>
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={ids.description} className="text-label">
                {t('form.description.label')}
              </FieldLabel>
              <Textarea
                {...field}
                id={ids.description}
                aria-invalid={fieldState.invalid}
                aria-describedby={ids.descriptionHint}
                maxLength={4000}
                className="min-h-36"
              />
              <FieldDescription id={ids.descriptionHint}>
                {t('form.description.hint')}
              </FieldDescription>
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </section>

      {photos ? (
        <div className="rounded-lg border border-border bg-card p-(--card-padding)">{photos}</div>
      ) : null}

      {formError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(formError)}</AlertDescription>
        </Alert>
      ) : null}

      {isEditable ? (
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button
            type="submit"
            size="md"
            variant={submitLabel ? 'outline' : 'default'}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? t('editor.saving') : saveLabel}
          </Button>
          {submitLabel ? (
            <Button
              type="button"
              size="md"
              disabled={isPending}
              aria-busy={isPending}
              onClick={(event) => void submitWith('submit')(event)}
            >
              {isPending ? t('editor.submitting') : submitLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

type TextFieldProps = {
  control: Control<ListingFormValues>;
  name: TextFieldName;
  label: string;
  placeholder?: string;
  hint?: string | undefined;
  inputMode?: 'numeric' | 'decimal';
};

function TextField({ control, name, label, placeholder, hint, inputMode }: TextFieldProps) {
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
          <Input
            {...field}
            id={id}
            placeholder={placeholder}
            inputMode={inputMode}
            aria-invalid={fieldState.invalid}
            aria-describedby={hint ? hintId : undefined}
            className={INPUT_CLASS}
          />
          {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
          <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
        </Field>
      )}
    />
  );
}

type SegmentedFieldProps<TName extends 'transaction' | 'currency'> = {
  control: Control<ListingFormValues>;
  name: TName;
  legend: string;
  options: readonly { value: ListingFormValues[TName]; label: string }[];
  isDisabled: boolean;
};

function SegmentedField<TName extends 'transaction' | 'currency'>({
  control,
  name,
  legend,
  options,
  isDisabled,
}: SegmentedFieldProps<TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FieldSet className="gap-2">
          <FieldLegend variant="label" className="text-label">
            {legend}
          </FieldLegend>
          <ToggleGroup
            type="single"
            value={field.value}
            disabled={isDisabled}
            onValueChange={(value) => {
              const option = options.find((item) => item.value === value);
              if (option) {
                field.onChange(option.value);
              }
            }}
            aria-label={legend}
            className="w-fit gap-1 rounded-full bg-surface-alt p-1"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className={TOGGLE_ITEM_CLASS}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
      )}
    />
  );
}
