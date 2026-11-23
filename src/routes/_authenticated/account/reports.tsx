import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { MyReportsPage, smartCheckQueries } from '@/features/smart-check';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/account/reports')({
  beforeLoad: () => loadFeatureNamespaces(['smartCheck']),
  loader: ({ context }) =>
    context.queryClient.infiniteQuery({
      ...smartCheckQueries.myReports(context.user.id),
      staleTime: 'static',
    }),
  head: panelPageHead('panel.account.nav.reports'),
  pendingComponent: PendingPage,
  component: MyReportsPage,
});
