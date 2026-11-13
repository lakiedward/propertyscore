import type { InfiniteData } from '@tanstack/react-query';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { ListingCard } from '@/components/property/listing-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EXPLORER_SORTS, type ExplorerSort } from '@/config/listings-explorer';
import { formatPrice, toCurrency } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import type { listExplorerListings } from '../api/listings.api';
import { getListingMediumUrl } from '../api/listings.storage';
import type { ListingTransaction } from '../listing.types';

type ExplorerPage = Awaited<ReturnType<typeof listExplorerListings>>;
export type ExplorerListing = ExplorerPage['items'][number];

const SKELETON_COUNT = 6;

export type ExplorerEmptyKind = 'none' | 'outside' | 'filters';

type ListingsExplorerListProps = {
  transaction: ListingTransaction;
  data: InfiniteData<ExplorerPage> | undefined;
  allCount: number | undefined;
  isInView: boolean;
  isLoading: boolean;
  hasError: boolean;
  emptyKind: ExplorerEmptyKind;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  sort: ExplorerSort;
  activeId: string | undefined;
  onInViewChange: (isInView: boolean) => void;
  onSortChange: (sort: ExplorerSort) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onEmptyAction: () => void;
  onSelect: (listing: ExplorerListing) => void;
  onHoverChange: (id: string | undefined) => void;
};

export function ListingsExplorerList({
  transaction,
  data,
  allCount,
  isInView,
  isLoading,
  hasError,
  emptyKind,
  hasNextPage,
  isFetchingNextPage,
  sort,
  activeId,
  onInViewChange,
  onSortChange,
  onLoadMore,
  onRetry,
  onEmptyAction,
  onSelect,
  onHoverChange,
}: ListingsExplorerListProps) {
  const { t } = useTranslation(['listings', 'common']);
  const headingId = useId();
  const inViewId = useId();
  const listings = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total;

  const title = isLoading
    ? t('explore.list.searching')
    : total === undefined
      ? ''
      : isInView
        ? t('explore.list.inView', { count: total })
        : t('explore.list.all', { count: total });
  const scope =
    isInView && allCount !== undefined
      ? t(`explore.list.scopeInView.${transaction}`, { count: allCount })
      : t(`explore.list.scopeAll.${transaction}`);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id={headingId}
            aria-live="polite"
            className="text-[clamp(22px,2.2vw,30px)] leading-tight font-title tracking-[-0.035em]"
          >
            {title}
          </h2>
          <small className="text-caption text-muted-foreground">{scope}</small>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex min-h-11 items-center gap-2.5">
            <Checkbox
              id={inViewId}
              checked={isInView}
              onCheckedChange={(checked) => {
                onInViewChange(checked === true);
              }}
            />
            <label htmlFor={inViewId} className="cursor-pointer text-[13px] font-bold text-brand">
              {t('explore.list.onlyInView')}
            </label>
          </div>
          <div className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground">
            <span aria-hidden="true">{t('explore.list.sortLabel')}</span>
            <Select
              value={sort}
              onValueChange={(value) => {
                const next = oneOf(EXPLORER_SORTS, value);
                if (next) {
                  onSortChange(next);
                }
              }}
            >
              <SelectTrigger
                aria-label={t('explore.list.sortLabel')}
                className="h-11 rounded-md border-border px-3 text-[13px] font-bold text-brand"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPLORER_SORTS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`explore.list.sort.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {hasError ? (
        <EmptyState
          kind="error"
          variant="card"
          title={t('board.error.title')}
          description={t('board.error.description')}
          action={<NoticeAction label={t('common:actions.retry')} onClick={onRetry} />}
        />
      ) : isLoading ? (
        <ul aria-busy="true" aria-label={t('explore.list.searching')} className={GRID_CLASS}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index} className="overflow-hidden rounded-xl border border-border bg-card">
              <Skeleton className="aspect-4/3 rounded-none" />
              <div className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-[85%]" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </li>
          ))}
        </ul>
      ) : listings.length === 0 ? (
        emptyKind === 'none' ? (
          <EmptyState
            kind="empty"
            variant="card"
            title={t(`explore.empty.none.${transaction}`)}
            description={t('explore.empty.none.description')}
          />
        ) : (
          <EmptyState
            kind="empty"
            variant="card"
            title={t(`explore.empty.${emptyKind}.title`)}
            description={t(`explore.empty.${emptyKind}.description`)}
            action={
              <NoticeAction
                label={t(`explore.empty.${emptyKind}.action`)}
                onClick={onEmptyAction}
              />
            }
          />
        )
      ) : (
        <>
          <ul aria-label={t('explore.list.label')} className={GRID_CLASS}>
            {listings.map((listing) => {
              const currency = toCurrency(listing.currency);
              const price = formatPrice(listing.price, currency);
              const address = t('explore.address', {
                street: listing.street_label,
                city: listing.city,
              });
              const isRent = listing.transaction === 'rent';
              return (
                <li key={listing.id}>
                  <ListingCard
                    layout="vertical"
                    photoUrl={
                      listing.photo_path ? getListingMediumUrl(listing.photo_path) : undefined
                    }
                    title={listing.title}
                    accessibleName={t('explore.card', {
                      title: listing.title,
                      address,
                      price: isRent ? t('common:price.perMonth', { price }) : price,
                    })}
                    price={
                      <span className="mb-1 text-[22px] font-extrabold tracking-[-0.03em] text-foreground tabular-nums">
                        {price}
                        {isRent ? (
                          <small className="ml-1 text-small font-semibold tracking-normal text-muted-foreground">
                            {t('explore.perMonthSuffix')}
                          </small>
                        ) : null}
                      </span>
                    }
                    meta={address}
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
          {hasNextPage || isFetchingNextPage ? (
            <div className="mt-2 flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={onLoadMore}
                className="h-12.5 border-border-control bg-transparent px-5.5 text-small font-control hover:bg-surface-alt"
              >
                {t('explore.list.more')}
              </Button>
              {total === undefined ? null : (
                <span className="text-caption text-muted-foreground">
                  {t('explore.list.shownOf', { shown: listings.length, total })}
                </span>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5';

type NoticeActionProps = {
  label: string;
  onClick: () => void;
};

function NoticeAction({ label, onClick }: NoticeActionProps) {
  return (
    <Button type="button" onClick={onClick} className="mt-1.5 h-11.5 text-small">
      {label}
    </Button>
  );
}
