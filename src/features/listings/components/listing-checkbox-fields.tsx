import { Controller, type Control } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import type { ListingFormValues } from '../listing-form.schemas';

type FlagName =
  | 'has_basement'
  | 'has_semibasement'
  | 'has_attic'
  | 'is_passive_house'
  | 'has_elevator'
  | 'has_shared_yard';

type ListName = 'utilities' | 'building_services';

type CheckboxOption =
  | { kind: 'flag'; name: FlagName; label: string }
  | { kind: 'list'; name: ListName; value: ListingFormValues[ListName][number]; label: string };

type ListingCheckboxFieldsProps = {
  control: Control<ListingFormValues>;
  legend: string;
  options: readonly CheckboxOption[];
};

const BOX_CLASS =
  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-3 text-body-sm text-foreground has-data-[state=checked]:border-primary has-data-[state=checked]:bg-surface-selected';

export function ListingCheckboxFields({ control, legend, options }: ListingCheckboxFieldsProps) {
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="text-label">
        {legend}
      </FieldLegend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) =>
          option.kind === 'flag' ? (
            <Controller
              key={option.name}
              name={option.name}
              control={control}
              render={({ field }) => (
                <label className={BOX_CLASS}>
                  <Checkbox
                    ref={field.ref}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true);
                    }}
                    onBlur={field.onBlur}
                  />
                  {option.label}
                </label>
              )}
            />
          ) : (
            <Controller
              key={`${option.name}-${option.value}`}
              name={option.name}
              control={control}
              render={({ field }) => {
                const values: readonly string[] = field.value;
                return (
                  <label className={BOX_CLASS}>
                    <Checkbox
                      checked={values.includes(option.value)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked === true
                            ? [...values, option.value]
                            : values.filter((value) => value !== option.value),
                        );
                      }}
                      onBlur={field.onBlur}
                    />
                    {option.label}
                  </label>
                );
              }}
            />
          ),
        )}
      </div>
    </FieldSet>
  );
}
