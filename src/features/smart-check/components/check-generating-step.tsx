import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from '@tanstack/react-router';
import { CircleAlertIcon, LoaderCircleIcon, RotateCcwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { cn } from '@/lib/utils';
import { smartCheckQueries, useCreateOnlineReport } from '../api/smart-check.queries';
import type { CheckOrder } from '../smart-check.schemas';

type CheckGeneratingStepProps = {
  reportId: string;
  order: CheckOrder;
  onCreated: (reportId: string) => void;
};

export function CheckGeneratingStep({ reportId, order, onCreated }: CheckGeneratingStepProps) {
  const { t } = useTranslation('smartCheck');
  const errorMessage = useErrorMessage();
  const report = useQuery(smartCheckQueries.report(reportId));
  const retry = useCreateOnlineReport();
  const status = report.data?.status;

  if (status === 'ready') {
    return <Navigate to="/check/result/$reportId" params={{ reportId }} replace />;
  }

  const isFailed = status === 'failed';

  return (
    <div className="page-wrap flex max-w-narrow flex-col py-8 w767:py-12">
      <section
        aria-labelledby="check-done-title"
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-lg border border-card bg-card px-6 py-10 text-center shadow-card-soft"
      >
        <span
          aria-hidden
          className={cn(
            'grid size-16 place-items-center rounded-full',
            isFailed ? 'bg-error-surface text-destructive' : 'bg-info-surface text-info',
          )}
        >
          {isFailed ? (
            <CircleAlertIcon className="size-8" />
          ) : (
            <LoaderCircleIcon className="size-8 animate-spin" />
          )}
        </span>
        <h2 id="check-done-title" className="text-h3 font-extrabold">
          {isFailed ? t('check.done.failedTitle') : t('check.done.title')}
        </h2>
        <p className="max-w-copy text-body text-muted-foreground">
          {isFailed
            ? t('check.done.failedDescription')
            : t('check.done.description', { address: order.address })}
        </p>
        {status === 'queued' ? (
          <p className="text-small text-ink-soft">{t('check.done.queued')}</p>
        ) : null}
        {report.isError && !report.data ? (
          <p className="text-small text-destructive">{t('check.done.loadError')}</p>
        ) : null}
        {retry.isError ? (
          <Alert tone="error" className="text-left">
            <CircleAlertIcon aria-hidden />
            <AlertDescription>{errorMessage(retry.error)}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2.5 pt-2">
          {isFailed ? (
            <Button
              type="button"
              size="lg"
              disabled={retry.isPending}
              aria-busy={retry.isPending}
              onClick={() => {
                retry.mutate(order, { onSuccess: onCreated });
              }}
            >
              <RotateCcwIcon aria-hidden />
              {t('check.done.retry')}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="lg">
            <Link to="/account/reports">{t('check.done.myReports')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
