import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadMoreButton } from '@/components/layout/load-more-button';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { smartCheckQueries } from '../api/smart-check.queries';
import { REPORT_STATUS_TONE } from '../report-status.utils';

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
          <ul aria-label={t('common:panel.account.nav.reports')} className="flex flex-col gap-3">
            {items.map((report) => (
              <li key={report.id}>
                <Link
                  to="/check/result/$reportId"
                  params={{ reportId: report.id }}
                  className="flex flex-col gap-2 rounded-xl border border-card bg-card p-4 shadow-card-soft transition-colors hover:bg-surface-subtle w560:flex-row w560:items-center w560:justify-between"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-bold text-foreground">
                      {report.address_text}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t('smartCheck:myReports.meta', {
                        number: report.number,
                        date: formatDate(report.created_at),
                      })}
                    </span>
                  </span>
                  <StatusPill
                    tone={REPORT_STATUS_TONE[report.status]}
                    label={t(`smartCheck:status.${report.status}`)}
                  />
                </Link>
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
          variant="card"
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
