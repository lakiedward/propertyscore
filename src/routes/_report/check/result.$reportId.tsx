import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { PendingPage } from '@/components/layout/pending-page';
import { ReportPage, reportSearchSchema, smartCheckQueries } from '@/features/smart-check';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { isAppError } from '@/lib/errors';

export const Route = createFileRoute('/_report/check/result/$reportId')({
  validateSearch: reportSearchSchema,
  loaderDeps: ({ search }) => ({ share: search.share }),
  beforeLoad: ({ context, location, search }) => {
    if (!context.auth.user && search.share === undefined) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  loader: async ({ context, params, deps }) => {
    try {
      await context.queryClient.query({
        ...(deps.share === undefined
          ? smartCheckQueries.report(params.reportId)
          : smartCheckQueries.sharedReport(params.reportId, deps.share)),
        staleTime: 'static',
      });
    } catch (error) {
      if (isAppError(error) && error.code === 'not_found') throw notFound();
      throw error;
    }
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('smartCheck:report.pageTitle')) }] }),
  pendingComponent: PendingPage,
  component: ReportRoute,
});

function ReportRoute() {
  const { reportId } = Route.useParams();
  const { share } = Route.useSearch();
  return <ReportPage reportId={reportId} shareToken={share} />;
}
