import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  Building2Icon,
  HouseIcon,
  MapPinCheckIcon,
  MapPinIcon,
  MapPinOffIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PinField } from '@/components/map/pin-field';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import { inspectionQueries } from '../api/inspections.queries';
import {
  ADDRESS_MAX,
  homeFormSchema,
  toBookingHome,
  toHomeFormValues,
  type HomeFormValues,
} from '../booking.schemas';
import { useBookingStore } from '../booking.store';
import type { InspectionCity, PropertyType } from '../inspection.types';
import { BookingTextField } from './booking-text-field';

const PROPERTY_TYPES = [
  { value: 'apartment', icon: Building2Icon },
  { value: 'house', icon: HouseIcon },
] as const satisfies readonly { value: PropertyType; icon: LucideIcon }[];

const COORDINATE_DIGITS = 5;

const ADDRESS_AUTOCOMPLETE = 'street-address';

type BookingStepHomeProps = {
  formId: string;
  onSaved: () => void;
};

export function BookingStepHome({ formId, onSaved }: BookingStepHomeProps) {
  const cities = useQuery(inspectionQueries.cities());

  if (cities.isPending) {
    return <Skeleton className="h-150 rounded-photo" />;
  }
  return <HomeForm formId={formId} onSaved={onSaved} cities={cities.data ?? []} />;
}

type HomeFormProps = BookingStepHomeProps & { cities: readonly InspectionCity[] };

function HomeForm({ formId, onSaved, cities }: HomeFormProps) {
  const { t } = useTranslation('inspections');
  const validationMessage = useValidationMessage();
  const home = useBookingStore((state) => state.home);
  const prefill = useBookingStore((state) => state.prefill);
  const saveHome = useBookingStore((state) => state.saveHome);
  const cityFieldId = useId();
  const pinLabelId = useId();
  const pinHintId = useId();
  const floorLegendId = useId();
  const defaultCity = cities.find((city) => city.has_inspectors)?.id ?? '';
  const form = useForm<HomeFormValues>({
    resolver: zodResolver(homeFormSchema),
    defaultValues: home
      ? toHomeFormValues(home, defaultCity)
      : (prefill ?? toHomeFormValues(null, defaultCity)),
  });
  const cityId = useWatch({ control: form.control, name: 'cityId' });
  const propertyType = useWatch({ control: form.control, name: 'propertyType' });
  const pin = useWatch({ control: form.control, name: 'pin' });
  const city = cities.find((option) => option.id === cityId);
  const isCovered = city?.has_inspectors ?? false;

  const handleSubmit = form.handleSubmit((values) => {
    const saved = toBookingHome(values);
    if (!saved || !isCovered) {
      return;
    }
    saveHome(saved);
    onSaved();
  });

  return (
    <form
      id={formId}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="overflow-hidden rounded-photo border border-card bg-card shadow-card-soft"
    >
      <div className="flex flex-col gap-3.5 p-4.5 sm:p-6">
        <SectionHead
          number={1}
          title={t('booking.address.title')}
          text={t('booking.address.text')}
        />
        <div className="grid gap-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <BookingTextField
            control={form.control}
            name="addressText"
            label={t('booking.address.street')}
            placeholder={t('booking.address.streetPlaceholder')}
            autoComplete={ADDRESS_AUTOCOMPLETE}
            maxLength={ADDRESS_MAX}
          />
          <Controller
            name="cityId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={cityFieldId} className="text-label">
                  {t('booking.address.city')}
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('pin', null);
                  }}
                >
                  <SelectTrigger id={cityFieldId} aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder={t('booking.address.cityPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
        </div>
      </div>
      {city && !isCovered ? (
        <div className="flex flex-col gap-3 border-t border-border-subtle p-4.5 sm:p-6">
          <strong className="flex items-center gap-2.5 text-h4">
            <MapPinOffIcon aria-hidden className="size-5 text-warning" />
            {t('booking.address.noCoverage.title', { city: city.name })}
          </strong>
          <p className="text-muted-foreground">{t('booking.address.noCoverage.text')}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3.5 border-t border-border-subtle px-3.5 pt-4.5 pb-3.5 sm:px-5">
            <div className="px-1">
              <SectionHead
                number={2}
                title={t('booking.pin.title')}
                text={t('booking.pin.text')}
                titleId={pinLabelId}
              />
            </div>
            <Controller
              name="pin"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <PinField
                    labelledBy={pinLabelId}
                    describedBy={pinHintId}
                    value={field.value ? [field.value.lng, field.value.lat] : null}
                    cityCenter={city ? [city.longitude, city.latitude] : undefined}
                    isDisabled={false}
                    isInvalid={fieldState.invalid}
                    mapLabel={t('booking.pin.mapLabel')}
                    errorText={t('booking.pin.mapError')}
                    mapClassName="h-75 sm:h-95"
                    onChange={([lng, lat]) => {
                      field.onChange({ lng, lat });
                    }}
                  />
                  <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
                </Field>
              )}
            />
            <div id={pinHintId} className="flex items-center gap-2.5 px-1" role="status">
              {pin ? (
                <MapPinCheckIcon aria-hidden className="size-5 shrink-0 text-success" />
              ) : (
                <MapPinIcon aria-hidden className="size-5 shrink-0 text-step-leaf-solid" />
              )}
              <span className="flex min-w-0 flex-col">
                <strong className="text-body-sm">
                  {pin ? t('booking.pin.placed') : t('booking.pin.empty')}
                </strong>
                {pin ? (
                  <span className="text-meta text-muted-foreground tabular-nums">
                    {t('booking.pin.coordinates', {
                      lat: formatNumber(pin.lat, { maximumFractionDigits: COORDINATE_DIGITS }),
                      lng: formatNumber(pin.lng, { maximumFractionDigits: COORDINATE_DIGITS }),
                    })}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-border-subtle p-4.5 sm:p-6">
            <SectionHead
              number={3}
              title={t('booking.details.title')}
              text={t('booking.details.text')}
            />
            <Controller
              name="propertyType"
              control={form.control}
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-label={t('booking.details.type')}
                  className="grid grid-cols-2 gap-2.5"
                >
                  {PROPERTY_TYPES.map(({ value, icon: Icon }) => {
                    const isSelected = field.value === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          field.onChange(value);
                        }}
                        className={cn(
                          'flex min-h-16 items-center gap-3 rounded-lg border-2 px-3.5 py-3 text-left hover:border-primary',
                          isSelected ? 'border-primary bg-step-leaf-soft' : 'border-border bg-card',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-full',
                            isSelected
                              ? 'bg-primary text-cta'
                              : 'bg-step-leaf-surface text-step-leaf-ink',
                          )}
                        >
                          <Icon aria-hidden className="size-5" />
                        </span>
                        <strong className="text-body">{t(`propertyType.${value}`)}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            <div className="grid gap-3.5 md:grid-cols-3">
              <BookingTextField
                control={form.control}
                name="areaM2"
                label={t('booking.details.area')}
                suffix={t('booking.details.areaSuffix')}
                inputMode="decimal"
                hint={t('booking.details.areaHint')}
              />
              <BookingTextField
                control={form.control}
                name="yearBuilt"
                label={t('booking.details.year')}
                inputMode="numeric"
                hint={t('booking.details.yearHint')}
                maxLength={4}
              />
              {propertyType === 'apartment' ? (
                <fieldset aria-labelledby={floorLegendId} className="flex min-w-0 flex-col gap-1.5">
                  <span id={floorLegendId} className="text-label">
                    {t('booking.details.floor')}
                  </span>
                  <span className="-mt-0.5 mb-0.5 text-small text-muted-foreground">
                    {t('booking.details.floorHint')}
                  </span>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <BookingTextField
                        control={form.control}
                        name="floor"
                        label={t('booking.details.floorLabel')}
                        isLabelHidden
                        inputMode="numeric"
                        maxLength={2}
                      />
                    </div>
                    <span className="mt-2.5 text-body-sm text-muted-foreground">
                      {t('booking.details.of')}
                    </span>
                    <div className="flex-1">
                      <BookingTextField
                        control={form.control}
                        name="buildingFloors"
                        label={t('booking.details.buildingFloors')}
                        isLabelHidden
                        inputMode="numeric"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </fieldset>
              ) : null}
            </div>
          </div>
          {city ? (
            <div className="flex items-center gap-2.5 bg-step-leaf-surface px-3.5 py-3 text-body-sm font-bold text-step-leaf-ink sm:px-5">
              <MapPinCheckIcon aria-hidden className="size-5 shrink-0" />
              {t('booking.address.covered', { city: city.name })}
            </div>
          ) : null}
        </>
      )}
    </form>
  );
}

type SectionHeadProps = {
  number: number;
  title: string;
  text: string;
  titleId?: string;
};

function SectionHead({ number, title, text, titleId }: SectionHeadProps) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-caption font-extrabold text-cta"
      >
        {number}
      </span>
      <div className="flex flex-col gap-0.5">
        <strong id={titleId} className="text-[17px]">
          {title}
        </strong>
        <span className="text-small text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}
