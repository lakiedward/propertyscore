import type { LucideIcon } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ListingFormValues } from '../listing-form.schemas';

type TileName = 'transaction' | 'property_type';

type ListingTileFieldProps<N extends TileName> = {
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

export function ListingTileField<N extends TileName>({
  control,
  name,
  labelledBy,
  options,
}: ListingTileFieldProps<N>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <ToggleGroup
          type="single"
          value={field.value}
          onValueChange={(value) => {
            const option = options.find((item) => item.value === value);
            if (option) {
              field.onChange(option.value);
            }
          }}
          aria-labelledby={labelledBy}
          className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {options.map(({ value, icon: Icon, label, hint }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="group/type h-auto min-h-21 justify-start gap-3.5 rounded-lg border-2 border-border bg-card p-4 text-left hover:bg-background data-[state=on]:border-primary data-[state=on]:bg-surface-selected"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cta/35 text-brand group-data-[state=on]/type:bg-primary group-data-[state=on]/type:text-cta">
                <Icon aria-hidden className="size-5.5" />
              </span>
              <span className="flex flex-col">
                <span className="text-[17px] leading-snug font-bold text-foreground">{label}</span>
                <span className="text-small font-normal text-muted-foreground">{hint}</span>
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    />
  );
}
