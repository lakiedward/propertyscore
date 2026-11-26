import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type TilePickerOption<Value extends string> = {
  value: Value;
  content: ReactNode;
  className?: string;
  isDisabled?: boolean;
};

type TilePickerProps<Value extends string> = {
  value: Value | null;
  options: readonly TilePickerOption<Value>[];
  onChange: (value: Value) => void;
  legend?: ReactNode;
  isLegendHidden?: boolean;
  legendClassName?: string;
  labelledBy?: string;
  className?: string;
  fieldSetClassName?: string;
};

export function TilePicker<Value extends string>({
  value,
  options,
  onChange,
  legend,
  isLegendHidden = false,
  legendClassName,
  labelledBy,
  className,
  fieldSetClassName,
}: TilePickerProps<Value>) {
  const legendId = useId();
  const group = (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value ?? ''}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === (next || value));
        if (option) {
          onChange(option.value);
        }
      }}
      aria-labelledby={legend === undefined ? labelledBy : legendId}
      className={className}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.isDisabled}
          className={option.className}
        >
          {option.content}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );

  if (legend === undefined) {
    return group;
  }
  return (
    <FieldSet className={cn('min-w-0', fieldSetClassName)}>
      <FieldLegend id={legendId} className={cn(isLegendHidden && 'sr-only', legendClassName)}>
        {legend}
      </FieldLegend>
      {group}
    </FieldSet>
  );
}
