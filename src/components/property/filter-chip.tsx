import { CheckIcon } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';

type FilterChipProps = {
  label: string;
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
  className,
}: FilterChipProps) {
  return (
    <Toggle
      pressed={isSelected}
      onPressedChange={onSelectedChange}
      disabled={isDisabled}
      className={cn(
        'h-9 gap-1.5 rounded-full border border-border bg-card px-3.5 text-caption font-bold text-foreground hover:bg-surface-sunken data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
        className,
      )}
    >
      {isSelected ? <CheckIcon aria-hidden className="size-3.5" /> : null}
      {label}
      {count === undefined ? null : (
        <span className="rounded-full bg-surface-sunken px-1.5 text-meta text-muted-foreground tabular-nums group-data-[state=on]/toggle:bg-on-inverse/20 group-data-[state=on]/toggle:text-primary-foreground">
          {formatNumber(count)}
        </span>
      )}
    </Toggle>
  );
}
