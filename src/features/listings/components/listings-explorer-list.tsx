import type { InfiniteData } from '@tanstack/react-query';
import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { ListingCard } from '@/components/property/listing-card';
import { Price } from '@/components/property/price';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { listListingsInBounds } from '../api/listings.api';
import { getListingThumbUrl } from '../api/listings.storage';
import type { ListingTransaction } from '../listing.types';
import { TransactionSwitch } from './transaction-switch';

type InBoundsPage = Awaited<ReturnType<typeof listListingsInBounds>>;
type InBoundsListing = InBoundsPage['items'][number];

const SKELETON_COUNT = 4;

type ListingsExplorerListProps = {
  transaction: ListingTransaction;
  onTransactionChange: (transaction: ListingTransaction) => void;
  data: InfiniteData<InBoundsPage> | undefined;
  hasNoListings: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  activeId: string | undefined;
  cardRefs: RefObject<Map<string, HTMLButtonElement>>;
  onLoadMore: () => void;
  onRetry: () => void;
  onShowAll: () => void;
  onSelect: (listing: InBoundsListing) => void;
  onHoverChange: (id: string | undefined) => void;
};

export function ListingsExplorerList({
  transaction,
  onTransactionChange,
  data,
  hasNoListings,
  isLoading,
  isRefreshing,
  hasError,
  hasNextPage,
  isFetchingNextPage,
  activeId,
  cardRefs,
  onLoadMore,
  onRetry,
  onShowAll,
  onSelect,
  onHoverChange,
}: ListingsExplorerListProps) {
  const { t } = useTranslation(['listings', 'common']);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listings = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total;
  const canLoadMore = hasNextPage && !isFetchingNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canLoadMore || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [canLoadMore, onLoadMore]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border-hairline bg-background px-4 pt-5 pb-4 sm:px-5">
        <h1 className="text-title-sm leading-tight font-extrabold tracking-title text-foreground">
          {t('explore.title')}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <TransactionSwitch value={transaction} onChange={onTransactionChange} />
          <p className="text-small text-muted-foreground" aria-live="polite">
            {total === undefined ? null : t(`explore.count.${transaction}`, { count: total })}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary transition-opacity duration-(--duration-fast)',
            isRefreshing ? 'animate-pulse opacity-100' : 'opacity-0',
          )}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4 pt-4 pb-28 sm:px-5 lg:pb-6">
        {hasError ? (
          <EmptyState
            kind="error"
            title={t('board.error.title')}
            description={t('board.error.description')}
            action={
              <Button variant="outline" onClick={onRetry}>
                {t('common:actions.retry')}
              </Button>
            }
          />
        ) : hasNoListings ? (
          <EmptyState
            kind="empty"
            title={t(`explore.emptyNone.${transaction}`)}
            description={t('explore.emptyNone.description')}
          />
        ) : isLoading ? (
          <ul aria-label={t('explore.loading')} className="flex flex-col gap-2.5">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-28 w-full rounded-tile" />
              </li>
            ))}
          </ul>
        ) : listings.length === 0 ? (
          <EmptyState
            kind="empty"
            title={t('explore.emptyInView.title')}
            description={t('explore.emptyInView.description')}
            action={
              <Button variant="outline" onClick={onShowAll}>
                {t('explore.emptyInView.action')}
              </Button>
            }
          />
        ) : (
          <>
            <ul aria-label={t('explore.listLabel')} className="flex flex-col gap-2.5">
              {listings.map((listing) => {
                const currency = toCurrency(listing.currency);
                const price = formatPrice(listing.price, currency);
                return (
                  <li key={listing.id}>
                    <ListingCard
                      ref={(element) => {
                        if (element) {
                          cardRefs.current.set(listing.id, element);
                        } else {
                          cardRefs.current.delete(listing.id);
                        }
                      }}
                      photoUrl={
                        listing.photo_path ? getListingThumbUrl(listing.photo_path) : undefined
                      }
                      title={listing.title}
                      accessibleName={t('explore.card', {
                        title: listing.title,
                        price:
                          listing.transaction === 'rent'
                            ? t('common:price.perMonth', { price })
                            : price,
                      })}
                      price={
                        <Price
                          amount={listing.price}
                          currency={currency}
                          period={listing.transaction === 'rent' ? 'month' : undefined}
                          size="sm"
                          className="text-lg tracking-[-0.02em] text-brand"
                        />
                      }
                      meta={t('card.meta', {
                        type: t(`common:listingDetails.propertyType.${listing.property_type}`),
                        street: listing.street_label,
                        count: listing.rooms,
                        area: formatNumber(listing.area_m2),
                      })}
                      isSelected={listing.id === activeId}
                      onSelect={() => {
                        onSelect(listing);
                      }}
                      onHoverChange={(isHovered) => {
                        onHoverChange(isHovered ? listing.id : undefined);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
            <div ref={sentinelRef} aria-hidden className="h-px" />
            {isFetchingNextPage ? (
              <p className="text-center text-small text-muted-foreground" role="status">
                {t('explore.loadingMore')}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
