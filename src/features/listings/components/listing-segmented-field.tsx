import { Controller, type Control } from 'react-hook-form';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ListingFormValues } from '../listing-form.schemas';

type SegmentedName = 'currency' | 'bathrooms' | 'partitioning' | 'comfort';

type ListingSegmentedFieldProps<N extends SegmentedName> = {
  control: Control<ListingFormValues>;
  name: N;
  legend: string;
  options: readonly { value: ListingFormValues[N]; label: string }[];
  isClearable?: boolean;
};

export function ListingSegmentedField<N extends SegmentedName>({
  control,
  name,
  legend,
  options,
  isClearable = false,
}: ListingSegmentedFieldProps<N>) {
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
            onValueChange={(value) => {
              const option = options.find((item) => item.value === value);
              if (option) {
                field.onChange(option.value);
              } else if (isClearable) {
                field.onChange('');
              }
            }}
            aria-label={legend}
            className="w-fit flex-wrap gap-1 rounded-lg bg-surface-alt p-1"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-10 rounded-md px-4 text-small font-bold text-foreground hover:bg-surface-alt data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
