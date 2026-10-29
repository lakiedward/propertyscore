import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const mapPinVariants = cva(
  'relative flex h-7 items-center rounded-full border-2 border-card px-2.5 text-meta font-extrabold whitespace-nowrap tabular-nums shadow-md transition-transform duration-(--duration-fast) ease-standard focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
  {
    variants: {
      kind: {
        physical: 'bg-trust-physical text-trust-physical-foreground',
        online: 'bg-info text-info-foreground',
        none: 'border-trust-none-border bg-card text-brand',
      },
      isActive: {
        true: 'z-10 scale-110 border-brand bg-cta text-cta-foreground',
        false: '',
      },
    },
  },
);

type MapPinProps = {
  kind: 'physical' | 'online' | 'none';
  label: string;
  accessibleName: string;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
};

export function MapPin({
  kind,
  label,
  accessibleName,
  isActive,
  isSelected,
  onSelect,
}: MapPinProps) {
  return (
    <button
      type="button"
      aria-label={accessibleName}
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(mapPinVariants({ kind, isActive }))}
    >
      {label}
    </button>
  );
}
