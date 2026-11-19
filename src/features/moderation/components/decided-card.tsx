import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { formatDate } from '@/i18n/format';
import { STATUS_META } from '../moderation-status';
import type { ReviewListing } from '../moderation.types';

type DecidedCardProps = {
  decision: ReviewListing['decisions'][number];
};

export function DecidedCard({ decision }: DecidedCardProps) {
  const { t } = useTranslation('moderation');
  const status = decision.decision;
  const meta = STATUS_META[status];

  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill shape="tag" tone={meta.tone} icon={meta.icon} label={t(`status.${status}`)} />
        <span className="text-meta text-muted-foreground">
          {t(`decided.${status}`, {
            date: formatDate(decision.created_at, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
          })}
        </span>
      </div>
      {decision.message ? (
        <p className="text-small leading-copy whitespace-pre-line text-muted-foreground">
          {decision.message}
        </p>
      ) : null}
    </section>
  );
}
