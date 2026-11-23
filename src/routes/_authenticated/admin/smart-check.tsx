import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { UnlimitedAccessPage, unlimitedAccessQueries } from '@/features/smart-check';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/admin/smart-check')({
  beforeLoad: () => loadFeatureNamespaces(['smartCheck']),
  loader: ({ context }) =>
    context.queryClient.query({ ...unlimitedAccessQueries.list(), staleTime: 'static' }),
  head: panelPageHead('panel.admin.nav.smartCheck'),
  pendingComponent: PendingPage,
  component: UnlimitedAccessPage,
});
