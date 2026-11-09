import { MapPinIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import { ListingSummary } from '@/components/property/listing-summary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useListingPhotoSummary } from '@/features/listings';
import { initialsOf } from '@/features/profile';
import { formatDate, formatList } from '@/i18n/format';
import type { ReviewListing } from '../moderation.types';
import { dayBucket, listingChanges } from '../moderation.utils';

const LISTING_MAP_ZOOM = 15;
const LISTING_MARKER_ID = 'review-listing';

type ListingReviewCardProps = {
  listing: ReviewListing;
};

export function ListingReviewCard({ listing }: ListingReviewCardProps) {
  const { t } = useTranslation('moderation');
  const summary = useListingPhotoSummary(listing);
  const locationHeadingId = useId();
  const ownerName = listing.owner.full_name ?? t('listing.owner.unnamed');
  const submittedAt = listing.submitted_at;
  const changes = listing.original ? listingChanges(listing, listing.original) : null;
  const position: [number, number] = [listing.longitude, listing.latitude];

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card pb-5.5">
      {changes ? (
        <Alert tone="info" className="rounded-none border-x-0 border-t-0">
          <AlertTitle>{t('revision.title')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <span>{t('revision.description')}</span>
            <span className="font-semibold text-foreground">
              {changes.length > 0
                ? t('revision.changed', {
                    changes: formatList(changes.map((change) => t(`revision.changes.${change}`))),
                  })
                : t('revision.noChanges')}
            </span>
          </AlertDescription>
        </Alert>
      ) : null}
      <ListingSummary content={summary} />
      <section
        aria-labelledby={locationHeadingId}
        className="mx-5.5 mt-4 flex flex-col gap-2.5 border-t border-border-subtle pt-3.5"
      >
        <h3 id={locationHeadingId} className="text-label font-bold text-foreground">
          {t('listing.location')}
        </h3>
        <p className="text-body-sm text-muted-foreground">
          {t('listing.address', { street: listing.street_label, city: listing.city })}
        </p>
        <LazyMapCanvas
          label={t('listing.mapLabel')}
          center={position}
          zoom={LISTING_MAP_ZOOM}
          markers={[
            {
              id: LISTING_MARKER_ID,
              position,
              node: (
                <MapPinIcon aria-hidden className="size-8 fill-cta text-brand drop-shadow-md" />
              ),
            },
          ]}
          errorFallback={
            <p className="p-4 text-small text-muted-foreground">{t('listing.mapError')}</p>
          }
          className="h-64 rounded-md"
          fallbackClassName="h-64 rounded-md"
        />
      </section>
      <div className="mx-5.5 mt-4 flex min-w-0 items-center gap-3 border-t border-border-subtle pt-3.5">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-alt text-caption font-extrabold text-foreground"
        >
          {initialsOf(ownerName)}
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="truncate text-small font-bold text-foreground">{ownerName}</strong>
          {submittedAt ? (
            <span className="text-meta text-muted-foreground">
              {t('listing.owner.submitted', {
                when: t(`listing.owner.${dayBucket(submittedAt)}`, {
                  time: formatDate(submittedAt, { timeStyle: 'short' }),
                  date: formatDate(submittedAt, { day: 'numeric', month: 'short' }),
                }),
              })}
            </span>
          ) : null}
        </span>
      </div>
    </article>
  );
}
