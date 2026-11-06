import { KeyRoundIcon, TagIcon } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ListingFormValues } from '../listing-form.schemas';

const TYPES = [
  { value: 'sale', icon: TagIcon },
  { value: 'rent', icon: KeyRoundIcon },
] as const;

type ListingTypeStepProps = {
  control: Control<ListingFormValues>;
  labelledBy: string;
};

export function ListingTypeStep({ control, labelledBy }: ListingTypeStepProps) {
  const { t } = useTranslation('myListings');

  return (
    <Controller
      name="transaction"
      control={control}
      render={({ field }) => (
        <ToggleGroup
          type="single"
          value={field.value}
          onValueChange={(value) => {
            const type = TYPES.find((item) => item.value === value);
            if (type) {
              field.onChange(type.value);
            }
          }}
          aria-labelledby={labelledBy}
          className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {TYPES.map(({ value, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="group/type h-auto min-h-21 justify-start gap-3.5 rounded-lg border-2 border-border bg-card p-4 text-left hover:bg-background data-[state=on]:border-primary data-[state=on]:bg-surface-selected"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cta/35 text-brand group-data-[state=on]/type:bg-primary group-data-[state=on]/type:text-cta">
                <Icon aria-hidden className="size-5.5" />
              </span>
              <span className="flex flex-col">
                <span className="text-[17px] leading-snug font-bold text-foreground">
                  {t(`wizard.type.${value}.label`)}
                </span>
                <span className="text-small font-normal text-muted-foreground">
                  {t(`wizard.type.${value}.hint`)}
                </span>
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    />
  );
}
