import { Link } from '@tanstack/react-router';
import { CalendarDaysIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { formatInspectionScore } from '../field-inspection.utils';

type SubmittedStateProps = {
  submittedAt: string | null;
  score: number | null;
};

export function SubmittedState({ submittedAt, score }: SubmittedStateProps) {
  const { t } = useTranslation('fieldInspection');

  return (
    <div
      role="status"
      className="flex flex-col items-start gap-3 rounded-xl bg-success-surface p-6"
    >
      <strong className="text-title-xs font-extrabold text-success">
        {t('submitted.title', {
          time: submittedAt ? formatDate(submittedAt, { hour: '2-digit', minute: '2-digit' }) : '',
        })}
      </strong>
      <p className="text-body-sm">{t('submitted.text')}</p>
      {score === null ? null : (
        <p className="text-body-sm font-bold">
          {t('submitted.score', {
            score: formatInspectionScore(score),
          })}
        </p>
      )}
      <Button asChild>
        <Link to="/field" search={{ day: 'today' }}>
          <CalendarDaysIcon aria-hidden />
          {t('submitted.back')}
        </Link>
      </Button>
    </div>
  );
}
