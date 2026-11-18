import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate } from '@/i18n/format';

type ListingDecisionNoticeProps = {
  decision: { message: string | null; created_at: string } | undefined;
  isRevision: boolean;
};

export function ListingDecisionNotice({ decision, isRevision }: ListingDecisionNoticeProps) {
  const { t } = useTranslation('myListings');
  const notice = isRevision ? 'revisionRejected' : 'rejected';

  return (
    <Alert tone="warning">
      <AlertTitle>{t(`notice.${notice}.title`)}</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <span>{t(`notice.${notice}.description`)}</span>
        {decision?.message ? (
          <span className="font-semibold whitespace-pre-line text-foreground">
            {t('notice.reason', { message: decision.message })}
          </span>
        ) : null}
        {decision ? (
          <span className="text-meta">
            {t('notice.decidedAt', { date: formatDate(decision.created_at) })}
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
