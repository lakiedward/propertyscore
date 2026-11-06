import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { myListingQueries, MyListingsPage } from '@/features/listings';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/account/listings/')({
  beforeLoad: () => loadFeatureNamespaces(['myListings']),
  loader: ({ context }) =>
    context.queryClient.query({
      ...myListingQueries.list(context.user.id),
      staleTime: 'static',
    }),
  head: panelPageHead('panel.account.nav.listings'),
  pendingComponent: PendingPage,
  component: MyListingsPage,
});
