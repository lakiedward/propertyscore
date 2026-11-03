import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { PendingPage } from '@/components/layout/pending-page';
import {
  OnlineReportPage,
  onlineReportQueries,
  onlineReportSearchSchema,
} from '@/features/online-reports';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { isAppError } from '@/lib/errors';

export const Route = createFileRoute('/_site/check/result/$reportId')({
  validateSearch: onlineReportSearchSchema,
  loaderDeps: ({ search }) => ({ share: search.share }),
  beforeLoad: async ({ context, location, search }) => {
    if (!context.auth.user && search.share === undefined) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    await loadFeatureNamespaces(['onlineReports']);
  },
  loader: async ({ context, params, deps }) => {
    try {
      await context.queryClient.query({
        ...(deps.share === undefined
          ? onlineReportQueries.detail(params.reportId)
          : onlineReportQueries.shared(params.reportId, deps.share)),
        staleTime: 'static',
      });
    } catch (error) {
      if (isAppError(error) && error.code === 'not_found') throw notFound();
      throw error;
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('onlineReports:pageTitle')) }] }),
  pendingComponent: PendingPage,
  component: OnlineReportRoute,
});

function OnlineReportRoute() {
  const { reportId } = Route.useParams();
  const { tab = 'summary', share } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <OnlineReportPage
      reportId={reportId}
      shareToken={share}
      chapter={tab}
      onChapterChange={(next) => {
        void navigate({
          search: (previous) => ({ ...previous, tab: next }),
          resetScroll: false,
          replace: true,
        });
      }}
    />
  );
}
