import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { MapFocus } from '@/components/map/map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { boundsOf } from '@/components/map/map.utils';
import { MapPin } from '@/components/map/map-pin';
import { ListingCard } from '@/components/property/listing-card';
import { Price } from '@/components/property/price';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTrustLabel } from '@/hooks/use-trust-label';
import { formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import { LISTINGS_PREVIEW_LIMIT, listingQueries } from '../api/listings.queries';
import { getListingThumbUrl } from '../api/listings.storage';
import type { Listing, ListingTransaction } from '../listing.types';
import { toTrustKind } from '../listing.utils';

const TIMISOARA_CENTER: LngLat = [21.2303, 45.7546];
const TRANSACTIONS: readonly ListingTransaction[] = ['sale', 'rent'];

type ListingsBoardProps = {
  transaction: ListingTransaction;
  onTransactionChange: (transaction: ListingTransaction) => void;
};

export function ListingsBoard({ transaction, onTransactionChange }: ListingsBoardProps) {
  const { t } = useTranslation(['listings', 'common']);
  const trustLabel = useTrustLabel();
  const query = useQuery(listingQueries.list({ transaction, limit: LISTINGS_PREVIEW_LIMIT }));
  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [focus, setFocus] = useState<MapFocus>();
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  const items = query.data?.items ?? [];
  const activeId = items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id;
  const firstItem = items[0];
  const hasError = query.isError && !query.data;

  const handleTransactionChange = (value: string) => {
    const next = oneOf(TRANSACTIONS, value);
    if (next && next !== transaction) {
      setSelectedId(undefined);
      setFocus(undefined);
      onTransactionChange(next);
    }
  };

  const handleCardSelect = (listing: Listing) => {
    setSelectedId(listing.id);
    setFocus((previous) => ({
      position: [listing.longitude, listing.latitude],
      requestId: (previous?.requestId ?? 0) + 1,
    }));
  };

  const handlePinSelect = (listing: Listing) => {
    setSelectedId(listing.id);
    cardRefs.current.get(listing.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const describe = (listing: Listing) => {
    const currency = toCurrency(listing.currency);
    const price = formatPrice(listing.price, currency);
    const badge = trustLabel(toTrustKind(listing.verification), listing.smartcheck_score);
    return {
      currency,
      price,
      label: t('card.label', {
        title: listing.title,
        price: listing.transaction === 'rent' ? t('common:price.perMonth', { price }) : price,
        badge,
      }),
    };
  };

  return (
    <div className="mt-2 flex flex-col rounded-2xl bg-card p-3.5 shadow-bundle">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-1 pt-1 pb-3.5">
        <ToggleGroup
          type="single"
          value={transaction}
          onValueChange={handleTransactionChange}
          aria-label={t('board.transactionLabel')}
          className="gap-1 rounded-full bg-surface-leaf p-1"
        >
          {TRANSACTIONS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="h-10 rounded-full px-4 text-small font-bold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t(`transaction.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-small text-muted-foreground" aria-live="polite">
          {query.data && firstItem
            ? t(`board.count.${transaction}`, { count: query.data.total, city: firstItem.city })
            : null}
        </p>
      </div>

      {hasError ? (
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
        <div className="grid grid-cols-1 gap-3.5 lg:h-140 lg:grid-cols-[1.45fr_1fr]">
          <div className="relative h-95 overflow-hidden rounded-xl lg:h-full">
            <LazyMapCanvas
              label={t('board.mapLabel')}
              center={TIMISOARA_CENTER}
              zoom={14}
              bounds={boundsOf(items.map((item) => [item.longitude, item.latitude]))}
              focus={focus}
              fallbackClassName="size-full rounded-xl"
              errorFallback={
                <Alert className="h-full">
                  <AlertDescription>{t('board.mapError')}</AlertDescription>
                </Alert>
              }
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
                          listing.photo_path ? getListingThumbUrl(listing.photo_path) : undefined
                        }
                        title={listing.title}
                        accessibleName={label}
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
