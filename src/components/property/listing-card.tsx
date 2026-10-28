import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

type ListingCardProps = {
  photoUrl: string | undefined;
  title: string;
  price: ReactNode;
  meta: string;
  badge: ReactNode;
  accessibleName: string;
  isSelected: boolean;
  onSelect: () => void;
  onHoverChange: (isHovered: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
};

export function ListingCard({
  photoUrl,
  title,
  price,
  meta,
  badge,
  accessibleName,
  isSelected,
  onSelect,
  onHoverChange,
  ref,
}: ListingCardProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={isSelected}
      aria-label={accessibleName}
      onClick={onSelect}
      onMouseEnter={() => {
        onHoverChange(true);
      }}
      onMouseLeave={() => {
        onHoverChange(false);
      }}
      onFocus={() => {
        onHoverChange(true);
      }}
      onBlur={() => {
        onHoverChange(false);
      }}
      className={cn(
        'grid w-full grid-cols-[6rem_1fr] gap-3.5 rounded-xl border border-border-subtle bg-card p-2 text-left transition-[border-color,box-shadow] duration-(--duration-fast) hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[7.25rem_1fr]',
        isSelected && 'border-primary shadow-md hover:border-primary',
      )}
    >
      <span className="block min-h-24 overflow-hidden rounded-lg bg-surface-alt">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col justify-between gap-1 py-0.5" aria-hidden="true">
        {price}
        <span className="truncate text-small font-bold text-foreground">{title}</span>
        <span className="truncate text-meta text-muted-foreground">{meta}</span>
        {badge}
      </span>
    </button>
  );
}
