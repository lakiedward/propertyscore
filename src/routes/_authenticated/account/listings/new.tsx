import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { ListingEditorPage, myListingQueries } from '@/features/listings';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/account/listings/new')({
  beforeLoad: () => loadFeatureNamespaces(['myListings']),
  loader: ({ context }) =>
    context.queryClient.query({ ...myListingQueries.cities(), staleTime: 'static' }),
  head: panelPageHead('panel.account.nav.listings'),
  pendingComponent: PendingPage,
  component: NewListingRoute,
});

function NewListingRoute() {
  return <ListingEditorPage />;
}
