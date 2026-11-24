import { cva } from 'class-variance-authority';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const itemVariants = cva(
  'touch-target rounded-[6px] px-3 text-caption font-bold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
  {
    variants: {
      size: {
        sm: 'h-7.5',
        md: 'h-8',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

type SegmentedControlOption<Value extends string> = {
  value: Value;
  label: string;
  lang?: string;
};

type SegmentedControlProps<Value extends string> = {
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
};

export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'sm',
}: SegmentedControlProps<Value>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) {
          onChange(option.value);
        }
      }}
      aria-label={ariaLabel}
      className="gap-0 rounded-md border border-border bg-card p-0.75"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          lang={option.lang}
          className={itemVariants({ size })}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
