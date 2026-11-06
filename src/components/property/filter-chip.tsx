import { cva } from 'class-variance-authority';
import { CheckIcon } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';

const filterChipVariants = cva(
  'h-9 rounded-full bg-card text-caption font-bold text-foreground hover:bg-surface-sunken data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
  {
    variants: {
      variant: {
        filter: 'gap-1.5 border border-border px-3.5',
        reason: 'h-auto min-h-9 border-[1.5px] border-border px-3 py-1 text-left whitespace-normal',
      },
    },
    defaultVariants: { variant: 'filter' },
  },
);

type FilterChipProps = {
  label: string;
  variant?: 'filter' | 'reason';
  count?: number | undefined;
  isSelected: boolean;
  onSelectedChange: (isSelected: boolean) => void;
  isDisabled?: boolean;
  className?: string;
};

export function FilterChip({
  label,
  count,
  isSelected,
  onSelectedChange,
  isDisabled = false,
  variant = 'filter',
  className,
}: FilterChipProps) {
  return (
    <Toggle
      pressed={isSelected}
      onPressedChange={onSelectedChange}
      disabled={isDisabled}
      className={cn(filterChipVariants({ variant }), className)}
    >
      {isSelected && variant === 'filter' ? <CheckIcon aria-hidden className="size-3.5" /> : null}
      {label}
      {count === undefined ? null : (
        <span className="rounded-full bg-surface-sunken px-1.5 text-meta text-muted-foreground tabular-nums group-data-[state=on]/toggle:bg-on-inverse/20 group-data-[state=on]/toggle:text-primary-foreground">
          {formatNumber(count)}
        </span>
      )}
    </Toggle>
  );
}
