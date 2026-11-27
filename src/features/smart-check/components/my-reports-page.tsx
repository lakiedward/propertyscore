import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadMoreButton } from '@/components/layout/load-more-button';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Button } from '@/components/ui/button';
import { smartCheckQueries } from '../api/smart-check.queries';
import { MyReportCard } from './my-report-card';

const authenticatedRoute = getRouteApi('/_authenticated');

export function MyReportsPage() {
  const { t } = useTranslation(['smartCheck', 'common']);
  const { user } = authenticatedRoute.useRouteContext();
  const reports = useSuspenseInfiniteQuery(smartCheckQueries.myReports(user.id));
  const items = reports.data.pages.flatMap((page) => page.items);
  const total = reports.data.pages[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PanelPageHeader
        description={total > 0 ? t('smartCheck:myReports.count', { count: total }) : undefined}
      />
      {items.length > 0 ? (
        <>
          <ul aria-label={t('common:panel.account.nav.reports')} className="flex flex-col gap-4">
            {items.map((report) => (
              <li key={report.id}>
                <MyReportCard report={report} />
              </li>
            ))}
          </ul>
          {reports.hasNextPage ? (
            <LoadMoreButton
              label={t('smartCheck:myReports.more')}
              isLoading={reports.isFetchingNextPage}
              onLoadMore={() => void reports.fetchNextPage()}
              className="self-center"
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          kind="empty"
          title={t('smartCheck:myReports.empty.title')}
          description={t('smartCheck:myReports.empty.description')}
          action={
            <Button asChild size="md" className="touch-target">
              <Link to="/check">{t('smartCheck:myReports.empty.action')}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
