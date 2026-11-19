import { Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ListingMapPopupContent = {
  id: string;
  photoUrl: string | undefined;
  title: string;
  address: string;
  price: string;
};

type ListingMapPopupProps = {
  variant: 'popup' | 'sheet';
  listing: ListingMapPopupContent | undefined;
  isRent: boolean;
  onClose: () => void;
};

const popupVariants = cva('relative text-foreground', {
  variants: {
    variant: {
      popup:
        'w-65 rounded-tile bg-card shadow-map-popup after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:bg-card',
      sheet: 'flex gap-3 pr-10',
    },
  },
});

const photoVariants = cva('shrink-0', {
  variants: {
    variant: {
      popup: 'h-35 w-full rounded-t-tile',
      sheet: 'size-27.5 rounded-lg',
    },
  },
});

const bodyVariants = cva('flex min-w-0 flex-col', {
  variants: {
    variant: {
      popup: 'px-3.5 pt-3 pb-3.5',
      sheet: '',
    },
  },
});

const closeVariants = cva('absolute rounded-full border-0 bg-card text-brand shadow-map-control', {
  variants: {
    variant: {
      popup: 'top-2 right-2 size-7',
      sheet: '-top-2 -right-2 size-11 shadow-none',
    },
  },
});

export function ListingMapPopup({ variant, listing, isRent, onClose }: ListingMapPopupProps) {
  const { t } = useTranslation(['listings', 'common']);

  return (
    <div className={popupVariants({ variant })}>
      {listing ? (
        <>
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl}
              alt=""
              className={cn(photoVariants({ variant }), 'block bg-surface-alt object-cover')}
            />
          ) : null}
          <div className={cn(bodyVariants({ variant }), 'gap-0.75')}>
            <strong className="mt-1 text-body leading-tight">{listing.title}</strong>
            <span className="text-meta text-muted-foreground">{listing.address}</span>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <strong className="text-[18px] font-extrabold tracking-[-0.025em] text-brand tabular-nums">
                {listing.price}
                {isRent ? (
                  <small className="ml-1 text-caption font-semibold tracking-normal">
                    {t('listings:explore.perMonthSuffix')}
                  </small>
                ) : null}
              </strong>
              <Button asChild size="sm" className="h-9 rounded-md px-3 text-meta font-control">
                <Link to="/listings/$listingId" params={{ listingId: listing.id }}>
                  {t('listings:explore.popup.viewListing')}
                </Link>
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <Skeleton
            className={cn(photoVariants({ variant }), variant === 'popup' && 'rounded-b-none')}
          />
          <div className={cn(bodyVariants({ variant }), 'flex-1 gap-2')}>
            <Skeleton className="mt-1 h-5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="mt-2 h-9 w-full" />
          </div>
        </>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={t('common:actions.close')}
        onClick={onClose}
        className={closeVariants({ variant })}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
