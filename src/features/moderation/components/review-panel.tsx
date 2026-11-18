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
    <div className="flex w-full flex-col gap-5">
      {toastMessage ? <InlineToast tone="success" message={toastMessage} /> : null}
      <ListingReviewCard listing={listing} />
      {isPending ? (
        <div className="flex flex-col gap-5">
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
        </div>
      ) : (
        <>
          {latestDecision ? <DecidedCard decision={latestDecision} /> : null}
          {listing.status === 'approved' ? (
            <DecisionCard
              listing={listing}
              canApprove={false}
              isPublished
              onDecided={(decision) => {
                onDecided(decision, listing.title);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
