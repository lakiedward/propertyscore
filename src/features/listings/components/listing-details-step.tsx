import { Controller, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FieldError, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { parseLocaleNumber } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import type { ListingFormValues } from '../listing-form.schemas';
import { ListingSegmentedField } from './listing-segmented-field';
import { ListingTextField } from './listing-text-field';

const ROOM_CHOICES = ['1', '2', '3', '4'] as const;
const MANY_ROOMS = '5';

type ListingDetailsStepProps = {
  control: Control<ListingFormValues>;
};

function roomChoice(rooms: string): string {
  const value = parseLocaleNumber(rooms);
  if (value === undefined) {
    return '';
  }
  return value >= Number(MANY_ROOMS) ? MANY_ROOMS : String(value);
}

export function ListingDetailsStep({ control }: ListingDetailsStepProps) {
  const { t } = useTranslation('myListings');
  const validationMessage = useValidationMessage();
  const currency = useWatch({ control, name: 'currency' });
  const transaction = useWatch({ control, name: 'transaction' });
  const rooms = useWatch({ control, name: 'rooms' });
  const hasManyRooms = roomChoice(rooms) === MANY_ROOMS;

  return (
    <FieldGroup className="gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListingTextField
          control={control}
          name="price"
          label={
            transaction === 'rent' ? t('wizard.details.priceRent') : t('wizard.details.priceSale')
          }
          suffix={t(`wizard.details.suffix${currency}`)}
          inputMode="decimal"
        />
        <ListingSegmentedField
          control={control}
          name="currency"
          legend={t('form.currency.label')}
          options={[
            { value: 'EUR', label: t('wizard.details.currencyEUR') },
            { value: 'RON', label: t('wizard.details.currencyRON') },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListingTextField
          control={control}
          name="area_m2"
          label={t('form.area.label')}
          suffix={t('wizard.details.areaSuffix')}
          inputMode="decimal"
        />
        <Controller
          name="rooms"
          control={control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid} className="gap-2">
              <FieldLegend variant="label" className="text-label">
                {t('wizard.details.rooms')}
              </FieldLegend>
              <ToggleGroup
                type="single"
                value={roomChoice(field.value)}
                onValueChange={(value) => {
                  if (value) {
                    field.onChange(value);
                  }
                }}
                aria-label={t('wizard.details.rooms')}
                className="w-fit flex-wrap gap-1.5"
              >
                {[...ROOM_CHOICES, MANY_ROOMS].map((choice) => (
                  <ToggleGroupItem
                    key={choice}
                    value={choice}
                    className="size-11 rounded-full border-[1.5px] border-border bg-card text-small font-bold text-foreground hover:bg-background data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {choice === MANY_ROOMS ? t('wizard.details.roomsMore') : choice}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {hasManyRooms ? null : (
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              )}
            </FieldSet>
          )}
        />
      </div>
      {hasManyRooms ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ListingTextField
            control={control}
            name="rooms"
            label={t('wizard.details.roomsExact')}
            inputMode="numeric"
          />
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ListingTextField
          control={control}
          name="floor"
          label={t('form.floor.label')}
          hint={t('form.floor.hint')}
          inputMode="numeric"
        />
        <ListingTextField
          control={control}
          name="building_floors"
          label={t('form.buildingFloors.label')}
          hint={t('form.buildingFloors.hint')}
          inputMode="numeric"
        />
        <ListingTextField
          control={control}
          name="year_built"
          label={t('form.yearBuilt.label')}
          hint={t('form.yearBuilt.hint')}
          inputMode="numeric"
        />
      </div>
    </FieldGroup>
  );
}
