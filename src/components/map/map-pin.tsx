import { cva } from 'class-variance-authority';
import type { TrustKind } from '@/components/trust/trust.utils';
import { cn } from '@/lib/utils';

const mapPinVariants = cva(
  'relative flex items-center rounded-full whitespace-nowrap tabular-nums transition-transform duration-(--duration-fast) ease-standard focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
  {
    variants: {
      shape: {
        pill: 'h-7 border-2 border-card px-2.5 text-meta font-extrabold shadow-md',
        tag: 'px-3 py-1.5 text-small leading-[1.25] font-extrabold shadow-pin-tag after:absolute after:-bottom-1.75 after:left-1/2 after:-z-10 after:size-3 after:-translate-x-1/2 after:rotate-45 after:rounded-br-[3px] after:bg-inherit after:shadow-[3px_3px_0_0_var(--card)] hover:scale-108',
      },
      kind: {
        physical: 'bg-trust-physical text-trust-physical-foreground',
        online: 'bg-info text-info-foreground',
        none: 'border-trust-none-border bg-card text-brand',
        brand: 'bg-primary text-primary-foreground',
      },
      isActive: { true: 'z-10', false: '' },
      isSelected: { true: '', false: '' },
    },
    compoundVariants: [
      {
        shape: 'pill',
        isActive: true,
        className: 'scale-110 border-brand bg-cta text-cta-foreground',
      },
      {
        shape: 'tag',
        isActive: true,
        isSelected: false,
        className: 'scale-112 shadow-pin-tag-active hover:scale-112',
      },
      {
        shape: 'tag',
        isSelected: true,
        className:
          'z-10 border-2 border-card bg-foreground px-3.5 text-body-sm text-card shadow-pin-tag-selected',
      },
    ],
  },
);

type MapPinProps = {
  kind: TrustKind | 'brand';
  shape?: 'pill' | 'tag';
  label: string;
  accessibleName: string;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
};

export function MapPin({
  kind,
  shape = 'pill',
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
      className={cn(mapPinVariants({ shape, kind, isActive, isSelected }))}
    >
      {label}
    </button>
  );
}
