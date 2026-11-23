import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, ArrowRightIcon, MapPinIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPrice } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import { CHECK_PRICE_RON } from '../check.utils';
import {
  checkDetailsFormSchema,
  toDetailsFormValues,
  toDetailsSearch,
  type CheckDetailsFormValues,
  type CheckDetailsSearch,
} from '../smart-check.schemas';

type NumberFieldName = 'rooms' | 'area' | 'floor' | 'floors' | 'year';
type UnknownGroup = 'size' | 'floor' | 'year';

const GROUP_FIELDS = {
  size: ['rooms', 'area'],
  floor: ['floor', 'floors'],
  year: ['year'],
} as const satisfies Record<UnknownGroup, readonly NumberFieldName[]>;

const ANSWER_GROUPS = 4;
const ELEVATOR_OPTIONS = ['yes', 'no', 'unknown'] as const;

type CheckDetailsStepProps = {
  initialDetails: CheckDetailsSearch;
  onBack: () => void;
  onContinue: (details: CheckDetailsSearch) => void;
};

export function CheckDetailsStep({ initialDetails, onBack, onContinue }: CheckDetailsStepProps) {
  const { t } = useTranslation('smartCheck');
  const elevatorLegendId = useId();
  const [unknown, setUnknown] = useState<Record<UnknownGroup, boolean>>({
    size: false,
    floor: false,
    year: false,
  });
  const form = useForm<CheckDetailsFormValues>({
    resolver: zodResolver(checkDetailsFormSchema),
    defaultValues: toDetailsFormValues(initialDetails),
  });
  const values = useWatch({ control: form.control });
  const isAnswered = (group: UnknownGroup) =>
    unknown[group] || GROUP_FIELDS[group].some((name) => (values[name] ?? '').trim() !== '');
  const answered =
    (['size', 'floor', 'year'] as const).filter(isAnswered).length + (values.elevator ? 1 : 0);

  const toggleUnknown = (group: UnknownGroup, isPressed: boolean) => {
    setUnknown((current) => ({ ...current, [group]: isPressed }));
    if (isPressed) {
      for (const name of GROUP_FIELDS[group]) {
        form.setValue(name, '');
        form.clearErrors(name);
      }
    }
  };

  const handleSubmit = form.handleSubmit((submitted) => {
    onContinue(toDetailsSearch(submitted));
  });

  return (
    <div className="page-wrap grid max-w-default grid-cols-1 items-start gap-6 py-8 w767:py-10 w1059:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-6 rounded-lg border border-card bg-card p-5 shadow-card-soft w767:p-7"
      >
        <div className="flex flex-col gap-2 border-b border-border-subtle pb-5">
          <p className="text-body">{t('check.details.intro')}</p>
          <p className="flex items-center gap-1.5 text-small font-bold text-info-ink">
            <MapPinIcon aria-hidden className="size-4" />
            {t('check.details.requiredNote')}
          </p>
        </div>
        <div className="flex flex-col gap-5 [&>*+*]:border-t [&>*+*]:border-border-subtle [&>*+*]:pt-5">
          <DetailGroup
            legend={t('check.details.size.legend')}
            isUnknown={unknown.size}
            onUnknownChange={(isPressed) => {
              toggleUnknown('size', isPressed);
            }}
          >
            <NumberField
              control={form.control}
              name="rooms"
              label={t('check.details.size.rooms')}
              placeholder={t('check.details.size.roomsPlaceholder')}
              inputMode="numeric"
              isDisabled={unknown.size}
            />
            <NumberField
              control={form.control}
              name="area"
              label={t('check.details.size.area')}
              placeholder={t('check.details.size.areaPlaceholder')}
              suffix={t('check.details.size.areaUnit')}
              inputMode="decimal"
              isDisabled={unknown.size}
            />
          </DetailGroup>
          <DetailGroup
            legend={t('check.details.floor.legend')}
            isUnknown={unknown.floor}
            hint={t('check.details.floor.floorHint')}
            onUnknownChange={(isPressed) => {
              toggleUnknown('floor', isPressed);
            }}
          >
            <NumberField
              control={form.control}
              name="floor"
              label={t('check.details.floor.floor')}
              placeholder={t('check.details.floor.floorPlaceholder')}
              inputMode="numeric"
              isDisabled={unknown.floor}
            />
            <NumberField
              control={form.control}
              name="floors"
              label={t('check.details.floor.floors')}
              placeholder={t('check.details.floor.floorsPlaceholder')}
              suffix={t('check.details.floor.floorsUnit')}
              inputMode="numeric"
              isDisabled={unknown.floor}
            />
          </DetailGroup>
          <Controller
            name="elevator"
            control={form.control}
            render={({ field }) => (
              <div>
                <FieldSet className="gap-2">
                  <FieldLegend
                    id={elevatorLegendId}
                    variant="label"
                    className="text-label font-bold"
                  >
                    {t('check.details.elevator.legend')}
                  </FieldLegend>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(
                        value === 'yes' || value === 'no' || value === 'unknown' ? value : '',
                      );
                    }}
                    aria-labelledby={elevatorLegendId}
                    className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1"
                  >
                    {ELEVATOR_OPTIONS.map((option) => (
                      <ToggleGroupItem
                        key={option}
                        value={option}
                        className="h-10 rounded-md px-3 text-small font-bold text-foreground hover:bg-surface-alt data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover"
                      >
                        {t(`check.details.elevator.${option}`)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
              </div>
            )}
          />
          <DetailGroup
            legend={t('check.details.year.legend')}
            isUnknown={unknown.year}
            onUnknownChange={(isPressed) => {
              toggleUnknown('year', isPressed);
            }}
          >
            <NumberField
              control={form.control}
              name="year"
              label={t('check.details.year.label')}
              placeholder={t('check.details.year.placeholder')}
              inputMode="numeric"
              isDisabled={unknown.year}
            />
          </DetailGroup>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 border-t border-border-subtle pt-5">
          <Button type="button" variant="ghost" size="lg" onClick={onBack} className="mr-auto">
            <ArrowLeftIcon aria-hidden />
            {t('check.details.back')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              onContinue({});
            }}
          >
            {t('check.details.skip')}
          </Button>
          <Button type="submit" size="lg">
            {t('check.details.continue', { price: formatPrice(CHECK_PRICE_RON, 'RON') })}
            <ArrowRightIcon aria-hidden />
          </Button>
        </div>
      </form>
      <aside
        aria-labelledby="check-why-title"
        className="rounded-lg bg-category-education-surface p-5 w767:p-6"
      >
        <h2 id="check-why-title" className="text-body font-extrabold text-info-ink">
          {t('check.details.why.title')}
        </h2>
        <p className="mt-2 text-small leading-copy text-foreground">
          {t('check.details.why.text')}
        </p>
        <p className="mt-3 text-caption text-ink-soft" aria-live="polite">
          {t('check.details.why.progress', { count: answered, total: ANSWER_GROUPS })}
        </p>
      </aside>
    </div>
  );
}

type DetailGroupProps = {
  legend: string;
  hint?: string;
  isUnknown: boolean;
  children: React.ReactNode;
  onUnknownChange: (isPressed: boolean) => void;
};

function DetailGroup({ legend, hint, isUnknown, children, onUnknownChange }: DetailGroupProps) {
  const { t } = useTranslation('smartCheck');

  return (
    <div>
      <FieldSet className="gap-3">
        <FieldLegend variant="label" className="text-label font-bold">
          {legend}
        </FieldLegend>
        <div className="grid grid-cols-1 items-end gap-3 w480:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          {children}
          <Toggle
            variant="outline"
            pressed={isUnknown}
            onPressedChange={onUnknownChange}
            className="h-control rounded-md border-border bg-card px-3.5 text-small font-bold text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground w480:col-start-3"
          >
            {t('check.details.unknown')}
          </Toggle>
        </div>
        {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      </FieldSet>
    </div>
  );
}

type NumberFieldProps = {
  control: Control<CheckDetailsFormValues>;
  name: NumberFieldName;
  label: string;
  placeholder: string;
  suffix?: string;
  inputMode: 'numeric' | 'decimal';
  isDisabled: boolean;
};

function NumberField({
  control,
  name,
  label,
  placeholder,
  suffix,
  inputMode,
  isDisabled,
}: NumberFieldProps) {
  const validationMessage = useValidationMessage();
  const id = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="gap-1.5">
          <FieldLabel htmlFor={id} className="text-small font-semibold">
            {label}
          </FieldLabel>
          <div className="relative">
            <Input
              {...field}
              id={id}
              placeholder={placeholder}
              inputMode={inputMode}
              disabled={isDisabled}
              aria-invalid={fieldState.invalid}
              className={cn(
                'h-control rounded-md border-border bg-card px-(--control-padding-x) text-(length:--control-font-size) md:text-(length:--control-font-size)',
                suffix && 'pr-16',
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
          <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
        </Field>
      )}
    />
  );
}
