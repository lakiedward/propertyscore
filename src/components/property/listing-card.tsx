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

const CARD_SURFACE_CLASS =
  'group/card flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-card bg-card text-foreground shadow-card-soft transition-[border-color,box-shadow]';

const CARD_HOVER_CLASS = 'hover:border-border-control hover:shadow-card-hover';

type ListingCardPhotoProps = {
  photoUrl: string | undefined;
  className: string;
  imageClassName: string;
  children?: ReactNode;
};

function ListingCardPhoto({
  photoUrl,
  className,
  imageClassName,
  children,
}: ListingCardPhotoProps) {
  return (
    <div className={cn('relative aspect-4/3', className)}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn('size-full object-cover', imageClassName)}
        />
      ) : null}
      {children}
    </div>
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
        CARD_SURFACE_CLASS,
        CARD_HOVER_CLASS,
        'duration-180',
        isSelected && 'border-primary hover:border-primary',
      )}
    >
      <ListingCardPhoto
        photoUrl={photoUrl}
        className="overflow-hidden bg-surface-alt"
        imageClassName="aspect-4/3 transition-transform duration-350 ease-standard group-hover/card:scale-103"
      >
        {badge}
        {favorite ? <div className="absolute top-3 right-3">{favorite}</div> : null}
      </ListingCardPhoto>
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
      className={cn(
        CARD_SURFACE_CLASS,
        'relative duration-(--duration-base) ease-standard has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring',
        !isDimmed && CARD_HOVER_CLASS,
      )}
    >
      <ListingCardPhoto
        photoUrl={photoUrl}
        className="bg-muted"
        imageClassName={cn(isDimmed && 'opacity-50 grayscale')}
      >
        {favorite ? <div className="absolute top-1.5 right-1.5 z-10">{favorite}</div> : null}
      </ListingCardPhoto>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4.5 pt-4 pb-4.5">
        {price ? <div className="flex flex-wrap items-baseline gap-2">{price}</div> : null}
        <h2
          id={titleId}
          className={cn(
            'line-clamp-2 text-body leading-[1.35] font-bold',
            '[&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0',
            isDimmed && 'text-muted-foreground',
          )}
        >
          {title}
        </h2>
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
