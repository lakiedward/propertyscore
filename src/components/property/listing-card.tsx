import { MapPinIcon } from 'lucide-react';
import { useId, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';

type ListingCardBaseProps = {
  photoUrl: string | undefined;
  title: string;
  price: ReactNode;
  meta: string;
  badge?: ReactNode;
  isSelected: boolean;
  onHoverChange: (isHovered: boolean) => void;
};

type HorizontalListingCardProps = ListingCardBaseProps & {
  layout?: 'horizontal';
  accessibleName: string;
  onSelect: () => void;
  ref?: Ref<HTMLButtonElement>;
};

type VerticalListingCardProps = ListingCardBaseProps & {
  layout: 'vertical';
  actions: ReactNode;
  favorite?: ReactNode;
};

type StackedListingCardProps = {
  layout: 'stacked';
  photoUrl: string | undefined;
  title: ReactNode;
  price?: ReactNode;
  facts?: string;
  location?: string;
  status?: ReactNode;
  favorite?: ReactNode;
  isDimmed?: boolean;
};

type ListingCardProps =
  HorizontalListingCardProps | VerticalListingCardProps | StackedListingCardProps;

export function ListingCard(props: ListingCardProps) {
  if (props.layout === 'stacked') {
    return <StackedListingCard {...props} />;
  }
  return props.layout === 'vertical' ? (
    <VerticalListingCard {...props} />
  ) : (
    <HorizontalListingCard {...props} />
  );
}

function HorizontalListingCard({
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
}: HorizontalListingCardProps) {
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
        'grid w-full grid-cols-[6rem_1fr] gap-3.5 rounded-tile border-(length:--border-width-control) border-border-subtle bg-card p-2 text-left transition-[border-color,box-shadow] duration-(--duration-fast) hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[7.25rem_1fr]',
        isSelected && 'border-primary shadow-listing-selected hover:border-primary',
      )}
    >
      <span className="block min-h-24 overflow-hidden rounded-thumb bg-surface-alt">
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
        <span className="truncate text-small font-bold text-brand">{title}</span>
        <span className="truncate text-meta text-muted-foreground">{meta}</span>
        {badge}
      </span>
    </button>
  );
}

function VerticalListingCard({
  photoUrl,
  title,
  price,
  meta,
  badge,
  isSelected,
  actions,
  favorite,
  onHoverChange,
}: VerticalListingCardProps) {
  const titleId = useId();

  return (
    <article
      aria-labelledby={titleId}
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
        'group/card flex h-full flex-col overflow-hidden rounded-xl border border-card bg-card shadow-card-soft transition-[border-color,box-shadow] duration-180 hover:border-border-control hover:shadow-card-hover',
        isSelected && 'border-primary hover:border-primary',
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-surface-alt">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-4/3 size-full object-cover transition-transform duration-350 ease-standard group-hover/card:scale-103"
          />
        ) : null}
        {badge}
        {favorite ? <div className="absolute top-3 right-3">{favorite}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-4 pt-3.5 pb-4">
        {price}
        <h3
          id={titleId}
          className="text-body leading-tight font-bold tracking-[-0.025em] text-foreground"
        >
          {title}
        </h3>
        <p className="text-caption text-muted-foreground">{meta}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3.5">{actions}</div>
      </div>
    </article>
  );
}

function StackedListingCard({
  photoUrl,
  title,
  price,
  facts,
  location,
  status,
  favorite,
  isDimmed = false,
}: StackedListingCardProps) {
  const titleId = useId();

  return (
    <article
      aria-labelledby={titleId}
      className="group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground transition-[box-shadow,border-color] duration-(--duration-base) ease-standard hover:border-border-strong hover:shadow-md has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring"
    >
      <div className="relative aspect-4/3 bg-muted">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn('size-full object-cover', isDimmed && 'opacity-50 grayscale')}
          />
        ) : null}
        {favorite ? <div className="absolute top-1.5 right-1.5 z-10">{favorite}</div> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4.5 pt-4 pb-4.5">
        {price ? <div className="flex flex-wrap items-baseline gap-2">{price}</div> : null}
        <h3
          id={titleId}
          className={cn(
            'line-clamp-2 text-body leading-[1.35] font-bold',
            '[&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0',
            isDimmed && 'text-muted-foreground',
          )}
        >
          {title}
        </h3>
        {facts ? <p className="text-small tabular-nums">{facts}</p> : null}
        {location ? (
          <p className="flex min-w-0 items-center gap-1.25 text-small leading-copy text-muted-foreground">
            <MapPinIcon aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        ) : null}
        {status ? <div className="mt-auto">{status}</div> : null}
      </div>
    </article>
  );
}
