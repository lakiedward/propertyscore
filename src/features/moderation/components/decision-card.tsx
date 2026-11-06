import { BanIcon, CheckIcon, Undo2Icon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { useDecideListing } from '../api/moderation.queries';
import type { FormDecision } from '../moderation.reasons';
import type { DecisionFormValues } from '../moderation.schemas';
import type { ListingDecision, ReviewListing } from '../moderation.types';
import { DecisionForm } from './decision-form';

type DecisionCardProps = {
  listing: ReviewListing;
  canApprove: boolean;
  onDecided: (decision: ListingDecision) => void;
};

export function DecisionCard({ listing, canApprove, onDecided }: DecisionCardProps) {
  const { t } = useTranslation('moderation');
  const errorMessage = useErrorMessage();
  const headingId = useId();
  const hintId = useId();
  const [mode, setMode] = useState<FormDecision | null>(null);
  const decide = useDecideListing();

  const submitDecision = async (values: DecisionFormValues) => {
    if (!mode) {
      return;
    }
    await decide.mutateAsync({
      listingId: listing.id,
      decision: mode,
      reasons: values.reasons,
      message: values.message,
    });
    onDecided(mode);
  };

  const approve = () => {
    decide.mutate(
      { listingId: listing.id, decision: 'approved', reasons: [], message: null },
      {
        onSuccess: () => {
          onDecided('approved');
        },
      },
    );
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4.5"
    >
      <h2 id={headingId} className="text-body font-bold text-foreground">
        {t('decision.title')}
      </h2>
      {mode ? (
        <DecisionForm
          key={mode}
          decision={mode}
          listingTitle={listing.title}
          isPending={decide.isPending}
          onSubmit={submitDecision}
          onCancel={() => {
            decide.reset();
            setMode(null);
          }}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {decide.isError ? (
            <Alert tone="error">
              <AlertDescription>{errorMessage(decide.error)}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            size="md"
            disabled={!canApprove || decide.isPending}
            aria-busy={decide.isPending}
            aria-describedby={canApprove ? undefined : hintId}
            onClick={approve}
          >
            <CheckIcon aria-hidden />
            {decide.isPending ? t('decision.pending') : t('decision.approve')}
          </Button>
          {canApprove ? null : (
            <p id={hintId} className="text-center text-meta text-muted-foreground">
              {t('decision.approveHint')}
            </p>
          )}
          <Button
            type="button"
            size="md"
            variant="outline"
            disabled={decide.isPending}
            onClick={() => {
              decide.reset();
              setMode('rejected');
            }}
          >
            <Undo2Icon aria-hidden />
            {t('decision.reject')}
          </Button>
          <Button
            type="button"
            size="md"
            variant="ghost"
            disabled={decide.isPending}
            onClick={() => {
              decide.reset();
              setMode('blocked');
            }}
          >
            <BanIcon aria-hidden />
            {t('decision.block')}
          </Button>
        </div>
      )}
    </section>
  );
}
