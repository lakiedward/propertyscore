import { Controller, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FieldError, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { parseLocaleNumber } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import type { ListingFormValues } from '../listing-form.schemas';
import {
  BUILDING_TYPES,
  COMFORTS,
  floorChoices,
  HOUSE_TYPES,
  MAX_BATHROOM_CHOICE,
  PARTITIONINGS,
} from '../listing-property.options';
import { ListingCheckboxFields } from './listing-checkbox-fields';
import { ListingSegmentedField } from './listing-segmented-field';
import { ListingSelectField } from './listing-select-field';
import { ListingTextField } from './listing-text-field';

const ROOM_CHOICES = ['1', '2', '3', '4'] as const;
const MANY_ROOMS = '5';

type ListingDetailsSectionProps = {
  control: Control<ListingFormValues>;
};

function roomChoice(rooms: string): string {
  const value = parseLocaleNumber(rooms);
  if (value === undefined) {
    return '';
  }
  return value >= Number(MANY_ROOMS) ? MANY_ROOMS : String(value);
}

const BATHROOM_CHOICES = Array.from({ length: MAX_BATHROOM_CHOICE }, (_, index) =>
  String(index + 1),
);

export function ListingDetailsSection({ control }: ListingDetailsSectionProps) {
  const { t } = useTranslation(['myListings', 'common']);
  const propertyType = useWatch({ control, name: 'property_type' });
  const isApartment = propertyType === 'apartment';
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListingSegmentedField
          control={control}
          name="bathrooms"
          legend={t('common:listingDetails.fields.bathrooms')}
          isClearable
          options={BATHROOM_CHOICES.map((choice) => ({
            value: choice,
            label:
              Number(choice) === MAX_BATHROOM_CHOICE ? t('wizard.details.bathroomsMore') : choice,
          }))}
        />
        {isApartment ? (
          <ListingSegmentedField
            control={control}
            name="comfort"
            legend={t('common:listingDetails.fields.comfort')}
            isClearable
            options={COMFORTS.map((comfort) => ({
              value: comfort,
              label: t(`common:listingDetails.options.comfort.${comfort}`),
            }))}
          />
        ) : (
          <ListingTextField
            control={control}
            name="land_area_m2"
            label={t('common:listingDetails.fields.landArea')}
            suffix={t('wizard.details.areaSuffix')}
            inputMode="decimal"
          />
        )}
      </div>
      {isApartment ? (
        <>
          <ListingSegmentedField
            control={control}
            name="partitioning"
            legend={t('common:listingDetails.fields.partitioning')}
            isClearable
            options={PARTITIONINGS.map((partitioning) => ({
              value: partitioning,
              label: t(`common:listingDetails.options.partitioning.${partitioning}`),
            }))}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ListingSelectField
              control={control}
              name="floor"
              label={t('form.floor.label')}
              isRequired
              options={floorChoices().map((floor) => ({
                value: String(floor),
                label:
                  floor < 0
                    ? t('wizard.details.floorBasement')
                    : floor === 0
                      ? t('wizard.details.floorGround')
                      : t('wizard.details.floorNumber', { floor }),
              }))}
            />
            <ListingSelectField
              control={control}
              name="building_type"
              label={t('common:listingDetails.fields.buildingType')}
              options={BUILDING_TYPES.map((type) => ({
                value: type,
                label: t(`common:listingDetails.options.buildingType.${type}`),
              }))}
            />
          </div>
        </>
      ) : (
        <ListingSelectField
          control={control}
          name="house_type"
          label={t('common:listingDetails.fields.houseType')}
          isRequired
          options={HOUSE_TYPES.map((type) => ({
            value: type,
            label: t(`common:listingDetails.options.houseType.${type}`),
          }))}
        />
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      {isApartment ? null : (
        <ListingCheckboxFields
          control={control}
          legend={t('common:listingDetails.fields.levels')}
          options={[
            {
              kind: 'flag',
              name: 'has_basement',
              label: t('common:listingDetails.flags.hasBasement'),
            },
            {
              kind: 'flag',
              name: 'has_semibasement',
              label: t('common:listingDetails.flags.hasSemibasement'),
            },
            { kind: 'flag', name: 'has_attic', label: t('common:listingDetails.flags.hasAttic') },
          ]}
        />
      )}
    </FieldGroup>
  );
}
