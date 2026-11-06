import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { initialsOf } from '@/features/profile';
import { formatDate } from '@/i18n/format';
import type { ReviewListing } from '../moderation.types';
import { dayBucket } from '../moderation.utils';
import { ListingPreviewDialog } from './listing-preview-dialog';
import { ListingSummary } from './listing-summary';

type ListingReviewCardProps = {
  listing: ReviewListing;
};

export function ListingReviewCard({ listing }: ListingReviewCardProps) {
  const { t } = useTranslation('moderation');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const ownerName = listing.owner.full_name ?? t('listing.owner.unnamed');
  const submittedAt = listing.submitted_at;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card pb-5.5">
      <ListingSummary listing={listing} />
      <div className="mx-5.5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3.5">
        <div className="flex min-w-0 items-center gap-3">
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
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-body font-bold"
          onClick={() => {
            setIsPreviewOpen(true);
          }}
        >
          {t('listing.preview')}
        </Button>
      </div>
      <ListingPreviewDialog
        listing={listing}
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </article>
  );
}
