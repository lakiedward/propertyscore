import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate } from '@/i18n/format';
import { OWNER_STATUS_META, type ListingStatus } from '../listing-status';

type ListingDecisionNoticeProps = {
  status: ListingStatus;
  decision: { message: string | null; created_at: string } | undefined;
  className?: string;
};

export function ListingDecisionNotice({ status, decision, className }: ListingDecisionNoticeProps) {
  const { t } = useTranslation('myListings');
  const showsDecision = decision !== undefined && (status === 'rejected' || status === 'blocked');

  return (
    <Alert tone={OWNER_STATUS_META[status].notice} className={className}>
      <AlertTitle>{t(`notice.${status}.title`)}</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <span>{t(`notice.${status}.description`)}</span>
        {showsDecision && decision.message ? (
          <span className="font-semibold whitespace-pre-line text-foreground">
            {t('notice.reason', { message: decision.message })}
          </span>
        ) : null}
        {showsDecision ? (
          <span className="text-meta">
            {t('notice.decidedAt', { date: formatDate(decision.created_at) })}
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
