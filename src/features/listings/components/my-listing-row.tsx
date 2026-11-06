import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { formatDate, formatNumber, formatPrice } from '@/i18n/format';
import { getListingThumbUrl } from '../api/listings.storage';
import type { listMyListings } from '../api/my-listings.api';
import { isEditableStatus, OWNER_STATUS_META } from '../listing-status';
import { toCurrency } from '../listing.utils';

type MyListingRowProps = {
  listing: Awaited<ReturnType<typeof listMyListings>>['items'][number];
};

export function MyListingRow({ listing }: MyListingRowProps) {
  const { t } = useTranslation('myListings');
  const meta = OWNER_STATUS_META[listing.status];
  const [decision] = listing.decisions;
  const price = formatPrice(listing.price, toCurrency(listing.currency));
  const showsReason =
    decision?.message && (listing.status === 'rejected' || listing.status === 'blocked');

  return (
    <Link
      to="/account/listings/$listingId"
      params={{ listingId: listing.id }}
      className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 hover:bg-background focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
    >
      {listing.photo_path ? (
        <img
          src={getListingThumbUrl(listing.photo_path)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-13.5 w-18 rounded-md bg-surface-alt object-cover"
        />
      ) : (
        <span aria-hidden className="h-13.5 w-18 rounded-md bg-surface-sunken" />
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <strong className="truncate text-small font-bold text-foreground">{listing.title}</strong>
        <span className="text-caption leading-copy text-muted-foreground tabular-nums">
          {t('list.priceArea', {
            price,
            area: t('list.area', { value: formatNumber(listing.area_m2) }),
          })}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusPill
            shape="tag"
            tone={meta.tone}
            icon={meta.icon}
            label={t(`status.${listing.status}`)}
          />
          <span className="text-meta text-muted-foreground">
            {t('list.updated', { date: formatDate(listing.updated_at) })}
          </span>
        </span>
        {showsReason ? (
          <span className="line-clamp-2 text-small text-foreground">
            {t('notice.reason', { message: decision.message })}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1 text-small font-bold text-brand">
        {isEditableStatus(listing.status) ? t('list.edit') : t('list.view')}
        <ChevronRightIcon aria-hidden className="size-4" />
      </span>
    </Link>
  );
}
