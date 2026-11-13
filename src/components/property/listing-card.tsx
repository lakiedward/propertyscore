import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

type ListingCardProps = {
  layout?: 'horizontal' | 'vertical';
  photoUrl: string | undefined;
  title: string;
  price: ReactNode;
  meta: string;
  badge?: ReactNode;
  accessibleName: string;
  isSelected: boolean;
  onSelect: () => void;
  onHoverChange: (isHovered: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
};

export function ListingCard({
  layout = 'horizontal',
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
  const photo = photoUrl ? (
    <img
      src={photoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        'size-full object-cover',
        layout === 'vertical' &&
          'aspect-4/3 transition-transform duration-350 ease-standard group-hover/card:scale-103',
      )}
    />
  ) : null;

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
        'w-full bg-card text-left focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
        layout === 'horizontal'
          ? 'grid grid-cols-[6rem_1fr] gap-3.5 rounded-tile border-[1.5px] border-border-subtle p-2 transition-[border-color,box-shadow] duration-(--duration-fast) hover:border-border-strong sm:grid-cols-[7.25rem_1fr]'
          : 'group/card flex h-full flex-col overflow-hidden rounded-xl border border-border transition-[border-color,box-shadow] duration-180 hover:border-border-control hover:shadow-card-hover',
        isSelected &&
          (layout === 'horizontal'
            ? 'border-primary shadow-listing-selected hover:border-primary'
            : 'border-primary hover:border-primary'),
      )}
    >
      {layout === 'horizontal' ? (
        <>
          <span className="block min-h-24 overflow-hidden rounded-thumb bg-surface-alt">
            {photo}
          </span>
          <span className="flex min-w-0 flex-col justify-between gap-1 py-0.5" aria-hidden="true">
            {price}
            <span className="truncate text-small font-bold text-brand">{title}</span>
            <span className="truncate text-meta text-muted-foreground">{meta}</span>
            {badge}
          </span>
        </>
      ) : (
        <>
          <span className="relative block aspect-4/3 overflow-hidden bg-surface-alt">
            {photo}
            {badge}
          </span>
          <span className="flex flex-1 flex-col gap-0.5 px-4 pt-3.5 pb-4" aria-hidden="true">
            {price}
            <span className="text-body leading-[1.25] font-bold tracking-[-0.025em] text-foreground">
              {title}
            </span>
            <span className="text-caption text-muted-foreground">{meta}</span>
          </span>
        </>
      )}
    </button>
  );
}
