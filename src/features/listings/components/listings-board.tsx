import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { boundsOf, type LngLat } from '@/components/map/map.config';
import { MapPin } from '@/components/map/map-pin';
import { ListingCard } from '@/components/property/listing-card';
import { Price } from '@/components/property/price';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNumber, formatPrice } from '@/i18n/format';
import { listingQueries } from '../api/listings.queries';
import { getListingPhotoUrl } from '../api/listings.storage';
import type { Listing, ListingTransaction } from '../listing.types';
import { toCurrency, toTrustKind } from '../listing.utils';

const MapCanvas = lazy(() =>
  import('@/components/map/map-canvas').then((module) => ({ default: module.MapCanvas })),
);

export const LISTINGS_PREVIEW_LIMIT = 6;
const TIMISOARA_CENTER: LngLat = [21.2303, 45.7546];
const TRANSACTIONS: readonly ListingTransaction[] = ['sale', 'rent'];

type ListingsBoardProps = {
  transaction: ListingTransaction;
  onTransactionChange: (transaction: ListingTransaction) => void;
};

export function ListingsBoard({ transaction, onTransactionChange }: ListingsBoardProps) {
  const { t } = useTranslation(['listings', 'common']);
  const query = useQuery(listingQueries.list({ transaction, limit: LISTINGS_PREVIEW_LIMIT }));
  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [focus, setFocus] = useState<LngLat>();
  const [hasMapError, setHasMapError] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  const items = query.data?.items ?? [];
  const activeId = items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id;
  const city = items[0]?.city ?? '';

  const handleTransactionChange = (value: string) => {
    const next = TRANSACTIONS.find((option) => option === value);
    if (next && next !== transaction) {
      setSelectedId(undefined);
      setFocus(undefined);
      onTransactionChange(next);
    }
  };

  const handleCardSelect = (listing: Listing) => {
    setSelectedId(listing.id);
    setFocus([listing.longitude, listing.latitude]);
  };

  const handlePinSelect = (listing: Listing) => {
    setSelectedId(listing.id);
    cardRefs.current.get(listing.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const describe = (listing: Listing) => {
    const currency = toCurrency(listing.currency);
    const price = formatPrice(listing.price, currency);
    const badge =
      listing.verification === 'smartcheck'
        ? t('common:trust.smartcheck', { score: listing.smartcheck_score ?? 0 })
        : t(`verification.${listing.verification}`);
    return {
      currency,
      price,
      label: t('card.label', {
        title: listing.title,
        price: listing.transaction === 'rent' ? t('price.perMonth', { price }) : price,
        badge,
      }),
    };
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl bg-card p-3.5 shadow-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ToggleGroup
          type="single"
          value={transaction}
          onValueChange={handleTransactionChange}
          aria-label={t('board.transactionLabel')}
          className="gap-1 rounded-lg bg-secondary p-1"
        >
          {TRANSACTIONS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="h-10 rounded-md px-4 text-label text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t(`transaction.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-small text-muted-foreground" aria-live="polite">
          {query.data ? t(`board.count.${transaction}`, { count: query.data.total, city }) : null}
        </p>
      </div>

      {query.isError ? (
        <EmptyState
          kind="error"
          title={t('board.error.title')}
          description={t('board.error.description')}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t('common:actions.retry')}
            </Button>
          }
        />
      ) : query.data && items.length === 0 ? (
        <EmptyState
          kind="empty"
          title={t('board.empty.title')}
          description={t('board.empty.description')}
        />
      ) : (
        <div className="grid gap-3.5 lg:h-140 lg:grid-cols-[1.45fr_1fr]">
          <div className="relative h-95 lg:h-full">
            {hasMapError ? (
              <Alert className="h-full">
                <AlertDescription>{t('board.mapError')}</AlertDescription>
              </Alert>
            ) : (
              <Suspense fallback={<Skeleton className="size-full rounded-xl" />}>
                <MapCanvas
                  label={t('board.mapLabel')}
                  center={TIMISOARA_CENTER}
                  zoom={14}
                  bounds={boundsOf(items.map((item) => [item.longitude, item.latitude]))}
                  focus={focus}
                  onError={() => {
                    setHasMapError(true);
                  }}
                  className="size-full"
                  markers={items.map((listing) => {
                    const { currency, label } = describe(listing);
                    return {
                      id: listing.id,
                      position: [listing.longitude, listing.latitude],
                      node: (
                        <MapPin
                          kind={toTrustKind(listing.verification)}
                          label={formatPrice(listing.price, currency)}
                          accessibleName={label}
                          isSelected={listing.id === activeId}
                          isActive={listing.id === activeId || listing.id === hoveredId}
                          onSelect={() => {
                            handlePinSelect(listing);
                          }}
                        />
                      ),
                    };
                  })}
                />
              </Suspense>
            )}
          </div>
          <ul
            aria-label={t('board.listLabel')}
            aria-busy={query.isPending}
            className="flex max-h-105 flex-col gap-2.5 overflow-y-auto lg:max-h-none"
          >
            {query.isPending
              ? Array.from({ length: LISTINGS_PREVIEW_LIMIT }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </li>
                ))
              : items.map((listing) => {
                  const { currency, label } = describe(listing);
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
                          listing.photo_path ? getListingPhotoUrl(listing.photo_path) : undefined
                        }
                        title={listing.title}
                        accessibleName={label}
                        price={
                          <Price
                            amount={listing.price}
                            currency={currency}
                            period={listing.transaction === 'rent' ? 'month' : undefined}
                            size="sm"
                          />
                        }
                        meta={[
                          listing.street_label,
                          t('card.rooms', { count: listing.rooms }),
                          t('card.area', { area: formatNumber(listing.area_m2) }),
                        ].join(' · ')}
                        badge={
                          <TrustBadge
                            kind={toTrustKind(listing.verification)}
                            score={listing.smartcheck_score}
                          />
                        }
                        isSelected={listing.id === activeId}
                        onSelect={() => {
                          handleCardSelect(listing);
                        }}
                        onHoverChange={(isHovered) => {
                          setHoveredId(isHovered ? listing.id : undefined);
                        }}
                      />
                    </li>
                  );
                })}
          </ul>
        </div>
      )}
    </div>
  );
}
