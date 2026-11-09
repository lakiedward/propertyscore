import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ListIcon, MapIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { MapFocus } from '@/components/map/map-canvas';
import { MapCluster } from '@/components/map/map-cluster';
import { MapPin } from '@/components/map/map-pin';
import type { LngLat } from '@/components/map/map.config';
import { boundsOf } from '@/components/map/map.utils';
import { ListingCard } from '@/components/property/listing-card';
import { Price } from '@/components/property/price';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { listListingsInBounds } from '../api/listings.api';
import { listingQueries } from '../api/listings.queries';
import { getListingThumbUrl } from '../api/listings.storage';
import { useDebouncedBounds } from '../hooks/use-debounced-bounds';
import type { ListingBounds, ListingTransaction } from '../listing.types';
import { toListingBounds } from '../listing.utils';
import { ListingsExplorerList } from './listings-explorer-list';

const ROMANIA_CENTER: LngLat = [24.9668, 45.9432];
const COUNTRY_ZOOM = 6;
const EMPTY_BOUNDS: ListingBounds = { west: 0, south: 0, east: 0, north: 0 };

type InBoundsListing = Awaited<ReturnType<typeof listListingsInBounds>>['items'][number];

type MobileView = 'list' | 'map';

type ListingsExplorerPageProps = {
  transaction: ListingTransaction;
  onTransactionChange: (transaction: ListingTransaction) => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ListingsExplorerPage({
  transaction,
  onTransactionChange,
}: ListingsExplorerPageProps) {
  const { t } = useTranslation(['listings', 'common']);
  const points = useQuery(listingQueries.mapPoints(transaction));
  const { bounds, handleViewportChange } = useDebouncedBounds();
  const pointList = points.data ?? [];
  const allBounds = boundsOf(pointList.map((point) => [point.longitude, point.latitude]));
  const cardBounds = bounds ?? (allBounds ? toListingBounds(allBounds) : undefined);
  const cards = useInfiniteQuery({
    ...listingQueries.inBounds({ transaction, bounds: cardBounds ?? EMPTY_BOUNDS }),
    enabled: cardBounds !== undefined,
    placeholderData: keepPreviousData,
  });
  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [focus, setFocus] = useState<MapFocus>();
  const [fitRequestId, setFitRequestId] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  const pointsById = new Map(pointList.map((point) => [point.id, point]));
  const cardListings = cards.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedListing = cardListings.find((listing) => listing.id === selectedId);
  const hasNoListings = points.isSuccess && pointList.length === 0;

  const handleTransactionChange = (next: ListingTransaction) => {
    setSelectedId(undefined);
    setHoveredId(undefined);
    setFocus(undefined);
    onTransactionChange(next);
  };

  const handleCardSelect = (listing: InBoundsListing) => {
    setSelectedId(listing.id);
    setFocus((previous) => ({
      position: [listing.longitude, listing.latitude],
      requestId: (previous?.requestId ?? 0) + 1,
    }));
  };

  const handlePinSelect = (id: string) => {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  const showAll = () => {
    setFitRequestId((current) => current + 1);
  };

  const pinLabel = (price: number, currency: string) => formatPrice(price, toCurrency(currency));

  return (
    <div className="relative grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_35rem]">
      <div
        className={cn(
          'relative min-h-0 lg:order-1 lg:block',
          mobileView === 'map' ? 'block' : 'hidden',
        )}
      >
        <LazyMapCanvas
          label={t('explore.mapLabel')}
          center={ROMANIA_CENTER}
          zoom={COUNTRY_ZOOM}
          bounds={allBounds}
          boundsRequestId={fitRequestId}
          focus={focus}
          markers={[]}
          hidesPointsOfInterest
          isScrollZoomEnabled
          onViewportChange={handleViewportChange}
          clusters={{
            points: pointList.map((point) => ({
              id: point.id,
              position: [point.longitude, point.latitude],
            })),
            renderPoint: (id) => {
              const point = pointsById.get(id);
              if (!point) {
                return null;
              }
              const label = pinLabel(point.price, point.currency);
              return (
                <MapPin
                  kind="brand"
                  label={label}
                  accessibleName={t('explore.pin', { title: point.title, price: label })}
                  isActive={id === hoveredId || id === selectedId}
                  isSelected={id === selectedId}
                  onSelect={() => {
                    handlePinSelect(id);
                  }}
                />
              );
            },
            renderCluster: ({ count, onExpand }) => (
              <MapCluster
                label={formatNumber(count)}
                accessibleName={t('explore.cluster', { count })}
                onExpand={onExpand}
              />
            ),
          }}
          className="size-full rounded-none"
          fallbackClassName="size-full rounded-none"
          errorFallback={
            <Alert className="m-4">
              <AlertDescription>{t('explore.mapError')}</AlertDescription>
            </Alert>
          }
        />
        {mobileView === 'map' && selectedListing ? (
          <div className="absolute inset-x-3 bottom-24 z-10 lg:hidden">
            <div className="relative">
              <ListingCard
                photoUrl={
                  selectedListing.photo_path
                    ? getListingThumbUrl(selectedListing.photo_path)
                    : undefined
                }
                title={selectedListing.title}
                accessibleName={t('explore.card', {
                  title: selectedListing.title,
                  price: pinLabel(selectedListing.price, selectedListing.currency),
                })}
                price={
                  <Price
                    amount={selectedListing.price}
                    currency={toCurrency(selectedListing.currency)}
                    period={selectedListing.transaction === 'rent' ? 'month' : undefined}
                    size="sm"
                    className="text-lg tracking-[-0.02em] text-brand"
                  />
                }
                meta={t('card.meta', {
                  type: t(`common:listingDetails.propertyType.${selectedListing.property_type}`),
                  street: selectedListing.street_label,
                  count: selectedListing.rooms,
                  area: formatNumber(selectedListing.area_m2),
                })}
                isSelected
                onSelect={() => {
                  handleCardSelect(selectedListing);
                }}
                onHoverChange={() => undefined}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="inverse"
                className="absolute -top-2 -right-2 shadow-md"
                aria-label={t('common:actions.close')}
                onClick={() => {
                  setSelectedId(undefined);
                }}
              >
                <XIcon aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          'min-h-0 overflow-y-auto overscroll-contain bg-background lg:order-2 lg:block lg:border-l lg:border-border-hairline',
          mobileView === 'list' ? 'block' : 'hidden',
        )}
      >
        <ListingsExplorerList
          transaction={transaction}
          onTransactionChange={handleTransactionChange}
          data={cards.data}
          hasNoListings={hasNoListings}
          isLoading={!cards.data && !cards.isError && !hasNoListings}
          isRefreshing={cards.isPlaceholderData || (cards.isFetching && !cards.isFetchingNextPage)}
          hasError={(cards.isError && !cards.data) || (points.isError && !points.data)}
          hasNextPage={cards.hasNextPage}
          isFetchingNextPage={cards.isFetchingNextPage}
          activeId={selectedId}
          cardRefs={cardRefs}
          onLoadMore={() => void cards.fetchNextPage()}
          onRetry={() => {
            void points.refetch();
            void cards.refetch();
          }}
          onShowAll={showAll}
          onSelect={handleCardSelect}
          onHoverChange={setHoveredId}
        />
      </div>
      <Button
        type="button"
        shape="pill"
        className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 shadow-float lg:hidden"
        onClick={() => {
          setMobileView((current) => (current === 'list' ? 'map' : 'list'));
        }}
      >
        {mobileView === 'list' ? <MapIcon aria-hidden /> : <ListIcon aria-hidden />}
        {mobileView === 'list' ? t('explore.showMap') : t('explore.showList')}
      </Button>
    </div>
  );
}
