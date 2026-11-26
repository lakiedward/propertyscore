import { cva } from 'class-variance-authority';
import { Building2Icon, HouseIcon, KeyRoundIcon, TagIcon, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TilePicker } from '@/components/forms/tile-picker';
import type { ListingFormValues } from '../listing-form.schemas';

const tileVariants = cva(
  'group/type inline-flex h-auto min-h-21 min-w-8 shrink-0 items-center justify-start gap-3.5 rounded-lg border-2 border-border bg-card p-4 text-left text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-background hover:text-foreground focus:z-10 focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-primary data-[state=on]:bg-surface-selected [&_svg]:pointer-events-none [&_svg]:shrink-0',
);

type ListingTypeCardProps = {
  control: Control<ListingFormValues>;
};

export function ListingTypeCard({ control }: ListingTypeCardProps) {
  const { t } = useTranslation('myListings');
  const propertyTypeHeadingId = useId();
  const transactionHeadingId = useId();

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-card bg-card p-5 shadow-card-soft sm:p-6">
      <div className="flex flex-col gap-3.5">
        <h2 id={propertyTypeHeadingId} className="text-h4 text-foreground">
          {t('sections.propertyType')}
        </h2>
        <ListingTiles
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
        <ListingTiles
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

type TileName = 'transaction' | 'property_type';

type ListingTilesProps<N extends TileName> = {
  control: Control<ListingFormValues>;
  name: N;
  labelledBy: string;
  options: readonly {
    value: ListingFormValues[N];
    icon: LucideIcon;
    label: string;
    hint: string;
  }[];
};

function ListingTiles<N extends TileName>({
  control,
  name,
  labelledBy,
  options,
}: ListingTilesProps<N>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TilePicker
          value={field.value}
          onChange={field.onChange}
          labelledBy={labelledBy}
          className="grid w-full grid-cols-1 items-center gap-3 rounded-lg sm:grid-cols-2"
          options={options.map(({ value, icon: Icon, label, hint }) => ({
            value,
            className: tileVariants(),
            content: (
              <>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cta/35 text-brand group-data-[state=on]/type:bg-primary group-data-[state=on]/type:text-cta">
                  <Icon aria-hidden className="size-5.5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-title-3xs leading-snug font-bold text-foreground">
                    {label}
                  </span>
                  <span className="text-small font-normal text-muted-foreground">{hint}</span>
                </span>
              </>
            ),
          }))}
        />
      )}
    />
  );
}
