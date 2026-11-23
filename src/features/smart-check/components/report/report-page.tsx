import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { smartCheckQueries } from '../../api/smart-check.queries';
import { isReadyReport } from '../../report.utils';
import { ReportChapters } from './report-chapters';

type ReportPageProps = {
  reportId: string;
  shareToken?: string;
};

export function ReportPage({ reportId, shareToken }: ReportPageProps) {
  const { t } = useTranslation('smartCheck');
  const { data: report } = useSuspenseQuery(
    shareToken === undefined
      ? smartCheckQueries.report(reportId)
      : smartCheckQueries.sharedReport(reportId, shareToken),
  );

  if (isReadyReport(report)) {
    return (
      <article aria-labelledby="report-title" className="page-wrap flex flex-col py-8">
        <h1 id="report-title" className="text-h2">
          {report.address_text}
        </h1>
        <ReportChapters report={report} />
      </article>
    );
  }

  return (
    <div className="page-wrap py-10">
      <EmptyState
        variant="card"
        kind={report.status === 'failed' ? 'error' : 'empty'}
        title={t(`report.state.${report.status}.title`)}
        description={t(`report.state.${report.status}.description`)}
        action={
          shareToken === undefined ? (
            <Button asChild size="md" variant="outline" className="touch-target">
              <Link to="/account/reports">{t('report.state.backToReports')}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
