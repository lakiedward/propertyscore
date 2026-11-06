import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { getListingThumbUrl } from '@/features/listings';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { STATUS_META, toModerationStatus } from '../moderation-status';
import type { QueueListing } from '../moderation.types';
import { dayBucket } from '../moderation.utils';
import { useListingPrice } from '../hooks/use-listing-price';

type QueueRowProps = {
  listing: QueueListing;
  isSelected: boolean;
  onSelect: () => void;
};

export function QueueRow({ listing, isSelected, onSelect }: QueueRowProps) {
  const { t } = useTranslation('moderation');
  const { price, area } = useListingPrice(listing);
  const status = toModerationStatus(listing.status);
  const meta = STATUS_META[status];
  const eventAt = status === 'pending_approval' ? listing.submitted_at : listing.decided_at;

  return (
    <Link
      to="/admin/listings"
      search={(previous) => ({ ...previous, listing: listing.id })}
      onClick={onSelect}
      aria-current={isSelected ? 'true' : undefined}
      className={cn(
        'grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 border-l-3 border-transparent px-3.5 py-3 hover:bg-background focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
        isSelected && 'border-l-primary bg-surface-selected hover:bg-surface-selected',
      )}
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
        <strong className="text-small leading-[1.3] font-bold text-foreground">
          {listing.title}
        </strong>
        <span className="text-caption leading-copy text-muted-foreground tabular-nums">
          {t('queue.priceArea', { price, area })}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusPill shape="tag" tone={meta.tone} icon={meta.icon} label={t(`status.${status}`)} />
          {eventAt ? (
            <span className="text-meta text-muted-foreground">
              {t(`when.${dayBucket(eventAt)}`, {
                time: formatDate(eventAt, { timeStyle: 'short' }),
                date: formatDate(eventAt, { day: 'numeric', month: 'short' }),
              })}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
