import { Controller, type Control } from 'react-hook-form';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ListingFormValues } from '../listing-form.schemas';

type SegmentedName = 'currency';

type ListingSegmentedFieldProps = {
  control: Control<ListingFormValues>;
  name: SegmentedName;
  legend: string;
  options: readonly { value: ListingFormValues[SegmentedName]; label: string }[];
};

export function ListingSegmentedField({
  control,
  name,
  legend,
  options,
}: ListingSegmentedFieldProps) {
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
              }
            }}
            aria-label={legend}
            className="w-fit gap-1 rounded-full bg-surface-alt p-1"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-10 rounded-full px-4 text-small font-bold text-foreground hover:bg-surface-alt data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
