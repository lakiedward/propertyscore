import { createFileRoute, notFound } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { ListingEditorPage, myListingQueries } from '@/features/listings';
import { loadFeatureNamespaces } from '@/i18n/i18n';
import { isAppError } from '@/lib/errors';

export const Route = createFileRoute('/_authenticated/account/listings/$listingId')({
  beforeLoad: () => loadFeatureNamespaces(['myListings']),
  loader: async ({ context, params }) => {
    try {
      await Promise.all([
        context.queryClient.query({
          ...myListingQueries.detail(params.listingId, context.user.id),
          staleTime: 'static',
        }),
        context.queryClient.query({ ...myListingQueries.cities(), staleTime: 'static' }),
      ]);
    } catch (error) {
      if (isAppError(error) && error.code === 'not_found') {
        throw notFound();
      }
      throw error;
    }
  },
  head: panelPageHead('panel.account.nav.listings'),
  pendingComponent: PendingPage,
  component: ListingRoute,
});

function ListingRoute() {
  const { listingId } = Route.useParams();
  return <ListingEditorPage listingId={listingId} />;
}
