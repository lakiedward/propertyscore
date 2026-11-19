import { useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FieldGroup } from '@/components/ui/field';
import type { ListingFormValues } from '../listing-form.schemas';
import {
  BUILDING_SERVICES,
  COOLINGS,
  FURNISHINGS,
  heatingsFor,
  INTERIOR_CONDITIONS,
  PETS,
  POOLS,
  utilitiesFor,
  YARDS,
} from '../listing-property.options';
import { ListingCheckboxFields } from './listing-checkbox-fields';
import { ListingSelectField } from './listing-select-field';
import { ListingTextField } from './listing-text-field';

type ListingExtrasSectionProps = {
  control: Control<ListingFormValues>;
};

export function ListingExtrasSection({ control }: ListingExtrasSectionProps) {
  const { t } = useTranslation(['myListings', 'common']);
  const propertyType = useWatch({ control, name: 'property_type' });
  const transaction = useWatch({ control, name: 'transaction' });
  const isApartment = propertyType === 'apartment';

  return (
    <FieldGroup className="gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListingSelectField
          control={control}
          name="interior_condition"
          label={t('common:listingDetails.fields.interiorCondition')}
          options={INTERIOR_CONDITIONS.map((condition) => ({
            value: condition,
            label: t(`common:listingDetails.options.interiorCondition.${condition}`),
          }))}
        />
        <ListingSelectField
          control={control}
          name="heating"
          label={t('common:listingDetails.fields.heating')}
          options={heatingsFor(propertyType).map((heating) => ({
            value: heating,
            label: t(`common:listingDetails.options.heating.${heating}`),
          }))}
        />
        <ListingSelectField
          control={control}
          name="cooling"
          label={t('common:listingDetails.fields.cooling')}
          options={COOLINGS.map((cooling) => ({
            value: cooling,
            label: t(`common:listingDetails.options.cooling.${cooling}`),
          }))}
        />
        <ListingSelectField
          control={control}
          name="furnishing"
          label={t('common:listingDetails.fields.furnishing')}
          options={FURNISHINGS.map((furnishing) => ({
            value: furnishing,
            label: t(`common:listingDetails.options.furnishing.${furnishing}`),
          }))}
        />
        {transaction === 'rent' ? (
          <ListingSelectField
            control={control}
            name="pets"
            label={t('common:listingDetails.fields.pets')}
            options={PETS.map((pets) => ({
              value: pets,
              label: t(`common:listingDetails.options.pets.${pets}`),
            }))}
          />
        ) : null}
        {isApartment ? null : (
          <>
            <ListingSelectField
              control={control}
              name="pool"
              label={t('common:listingDetails.fields.pool')}
              options={POOLS.map((pool) => ({
                value: pool,
                label: t(`common:listingDetails.options.pool.${pool}`),
              }))}
            />
            <ListingSelectField
              control={control}
              name="yard"
              label={t('common:listingDetails.fields.yard')}
              options={YARDS.map((yard) => ({
                value: yard,
                label: t(`common:listingDetails.options.yard.${yard}`),
              }))}
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListingTextField
          control={control}
          name="balconies"
          label={t('common:listingDetails.fields.balconies')}
          inputMode="numeric"
        />
        <ListingTextField
          control={control}
          name="parking_spaces"
          label={t('common:listingDetails.fields.parkingSpaces')}
          inputMode="numeric"
        />
      </div>
      <ListingCheckboxFields
        control={control}
        legend={t('common:listingDetails.fields.utilities')}
        options={utilitiesFor(propertyType).map((utility) => ({
          kind: 'list',
          name: 'utilities',
          value: utility,
          label: t(`common:listingDetails.options.utilities.${utility}`),
        }))}
      />
      <ListingCheckboxFields
        control={control}
        legend={t('common:listingDetails.fields.buildingServices')}
        options={BUILDING_SERVICES.map((service) => ({
          kind: 'list',
          name: 'building_services',
          value: service,
          label: t(`common:listingDetails.options.buildingServices.${service}`),
        }))}
      />
      <ListingCheckboxFields
        control={control}
        legend={t('common:listingDetails.fields.features')}
        options={
          isApartment
            ? [
                {
                  kind: 'flag',
                  name: 'has_elevator',
                  label: t('common:listingDetails.flags.hasElevator'),
                },
                {
                  kind: 'flag',
                  name: 'has_shared_yard',
                  label: t('common:listingDetails.flags.hasSharedYard'),
                },
              ]
            : [
                {
                  kind: 'flag',
                  name: 'is_passive_house',
                  label: t('common:listingDetails.flags.isPassiveHouse'),
                },
              ]
        }
      />
    </FieldGroup>
  );
}
