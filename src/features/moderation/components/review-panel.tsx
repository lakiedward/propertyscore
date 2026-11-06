import { useState } from 'react';
import { InlineToast } from '@/components/feedback/inline-toast';
import type { ListingDecision, ReviewListing } from '../moderation.types';
import { DecidedCard } from './decided-card';
import { DecisionCard } from './decision-card';
import { ListingReviewCard } from './listing-review-card';
import { REVIEW_CHECKS, UNCHECKED_REVIEW, type ReviewChecks } from '../moderation.checks';
import { ReviewChecklist } from './review-checklist';

type ReviewPanelProps = {
  listing: ReviewListing;
  toastMessage: string | null;
  onDecided: (decision: ListingDecision, title: string) => void;
};

export function ReviewPanel({ listing, toastMessage, onDecided }: ReviewPanelProps) {
  const [checks, setChecks] = useState<ReviewChecks>(UNCHECKED_REVIEW);
  const [latestDecision] = listing.decisions;
  const isPending = listing.status === 'pending_approval';
  const canApprove = REVIEW_CHECKS.every((check) => checks[check]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <ListingReviewCard listing={listing} />
      <div className="flex flex-col gap-4 xl:sticky xl:top-[calc(var(--header-height)+16px)]">
        {toastMessage ? <InlineToast tone="success" message={toastMessage} /> : null}
        {isPending ? (
          <>
            <ReviewChecklist
              listing={listing}
              checks={checks}
              onCheckedChange={(check, isChecked) => {
                setChecks((current) => ({ ...current, [check]: isChecked }));
              }}
            />
            <DecisionCard
              listing={listing}
              canApprove={canApprove}
              onDecided={(decision) => {
                onDecided(decision, listing.title);
              }}
            />
          </>
        ) : latestDecision ? (
          <DecidedCard decision={latestDecision} />
        ) : null}
      </div>
    </div>
  );
}
