import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { smartCheckQueries } from '../../api/smart-check.queries';
import type { ReportTab } from '../../report-chapter-meta';
import { isReadyReport } from '../../report.utils';
import { ReportChapterNav } from './report-chapter-nav';
import { ReportChapters } from './report-chapters';
import { ReportHero } from './report-hero';

const route = getRouteApi('/_report/check/result/$reportId');

const PANEL_ID = 'report-chapter';

type ReportPageProps = {
  reportId: string;
  shareToken?: string;
};

export function ReportPage({ reportId, shareToken }: ReportPageProps) {
  const { t } = useTranslation('smartCheck');
  const { chapter = 'summary' } = route.useSearch();
  const navigate = route.useNavigate();
  const navRef = useRef<HTMLDivElement>(null);
  const { data: report } = useSuspenseQuery(
    shareToken === undefined
      ? smartCheckQueries.report(reportId)
      : smartCheckQueries.sharedReport(reportId, shareToken),
  );

  const handleSelect = (tab: ReportTab) => {
    void navigate({
      search: (previous) => ({ ...previous, chapter: tab === 'summary' ? undefined : tab }),
      replace: true,
      resetScroll: false,
    });
    const nav = navRef.current;
    if (!nav) return;
    const stickyTop = Number.parseFloat(getComputedStyle(nav).top) || 0;
    const chapters = nav.nextElementSibling;
    if (!chapters) return;
    const top =
      chapters.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - stickyTop;
    if (window.scrollY > top) {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  if (isReadyReport(report)) {
    return (
      <article aria-labelledby="report-title">
        <ReportHero report={report} shareToken={shareToken} />
        <ReportChapterNav
          ref={navRef}
          report={report}
          selected={chapter}
          panelId={PANEL_ID}
          onSelect={handleSelect}
        />
        <ReportChapters
          report={report}
          shareToken={shareToken}
          chapter={chapter}
          panelId={PANEL_ID}
          onOpenChapter={handleSelect}
        />
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
