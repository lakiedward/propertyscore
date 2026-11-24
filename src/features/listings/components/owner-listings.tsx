import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadMoreButton } from '@/components/layout/load-more-button';
import { ListingCard } from '@/components/property/listing-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, toCurrency } from '@/i18n/format';
import type { OwnerListing } from '../api/listings.api';
import { listingQueries } from '../api/listings.queries';
import { getListingMediumUrl } from '../api/listings.storage';
import { useCardFacts } from '../hooks/use-card-facts';
import { LISTING_STATUS_META } from '../listing-status';
import { ListingPriceLabel } from './listing-price-label';

const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4';

type OwnerListingsProps = {
  ownerId: string;
};

export function OwnerListings({ ownerId }: OwnerListingsProps) {
  const { t } = useTranslation('listings');
  const listings = useInfiniteQuery(listingQueries.owner(ownerId));
  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];

  if (listings.isPending) {
    return (
      <div className={GRID_CLASS}>
        <Skeleton className="aspect-4/3 rounded-xl" />
        <Skeleton className="aspect-4/3 rounded-xl" />
        <Skeleton className="aspect-4/3 rounded-xl" />
      </div>
    );
  }

  if (listings.isError && items.length === 0) {
    return (
      <EmptyState
        kind="error"
        title={t('owner.error.title')}
        description={t('owner.error.description')}
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState title={t('owner.empty.title')} description={t('owner.empty.description')} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className={GRID_CLASS}>
        {items.map((listing) => (
          <li key={listing.id} className="flex">
            <OwnerListingCard listing={listing} />
          </li>
        ))}
      </ul>
      {listings.hasNextPage ? (
        <div className="flex justify-center">
          <LoadMoreButton
            label={t('owner.more')}
            isLoading={listings.isFetchingNextPage}
            onLoadMore={() => void listings.fetchNextPage()}
          />
        </div>
      ) : null}
    </div>
  );
}

type OwnerListingCardProps = {
  listing: OwnerListing;
};

function OwnerListingCard({ listing }: OwnerListingCardProps) {
  const { t } = useTranslation('myListings');
  const cardFacts = useCardFacts();
  const meta = LISTING_STATUS_META[listing.status];

  return (
    <ListingCard
      layout="stacked"
      photoUrl={listing.photo_path ? getListingMediumUrl(listing.photo_path) : undefined}
      title={
        listing.status === 'approved' ? (
          <Link to="/listings/$listingId" params={{ listingId: listing.id }}>
            {listing.title}
          </Link>
        ) : (
          listing.title
        )
      }
      price={
        <ListingPriceLabel
          price={formatPrice(listing.price, toCurrency(listing.currency))}
          isRent={listing.transaction === 'rent'}
          look="stacked"
        />
      }
      facts={cardFacts(listing.rooms, listing.area_m2)}
      location={listing.city}
      status={
        <StatusPill tone={meta.tone} icon={meta.icon} label={t(`status.${listing.status}`)} />
      }
    />
  );
}
