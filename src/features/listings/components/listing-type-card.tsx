import { Building2Icon, HouseIcon, KeyRoundIcon, TagIcon } from 'lucide-react';
import { useId } from 'react';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ListingFormValues } from '../listing-form.schemas';
import { ListingTileField } from './listing-tile-field';

type ListingTypeCardProps = {
  control: Control<ListingFormValues>;
};

export function ListingTypeCard({ control }: ListingTypeCardProps) {
  const { t } = useTranslation('myListings');
  const propertyTypeHeadingId = useId();
  const transactionHeadingId = useId();

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-3.5">
        <h2 id={propertyTypeHeadingId} className="text-h4 text-foreground">
          {t('sections.propertyType')}
        </h2>
        <ListingTileField
          control={control}
          name="property_type"
          labelledBy={propertyTypeHeadingId}
          options={[
            {
              value: 'apartment',
              icon: Building2Icon,
              label: t('wizard.propertyType.apartment.label'),
              hint: t('wizard.propertyType.apartment.hint'),
            },
            {
              value: 'house',
              icon: HouseIcon,
              label: t('wizard.propertyType.house.label'),
              hint: t('wizard.propertyType.house.hint'),
            },
          ]}
        />
      </div>
      <div className="flex flex-col gap-3.5">
        <h2 id={transactionHeadingId} className="text-h4 text-foreground">
          {t('sections.transactionType')}
        </h2>
        <ListingTileField
          control={control}
          name="transaction"
          labelledBy={transactionHeadingId}
          options={[
            {
              value: 'sale',
              icon: TagIcon,
              label: t('wizard.type.sale.label'),
              hint: t('wizard.type.sale.hint'),
            },
            {
              value: 'rent',
              icon: KeyRoundIcon,
              label: t('wizard.type.rent.label'),
              hint: t('wizard.type.rent.hint'),
            },
          ]}
        />
      </div>
    </section>
  );
}
