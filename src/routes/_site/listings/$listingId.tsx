import { createFileRoute, notFound } from '@tanstack/react-router';
import { PendingPage } from '@/components/layout/pending-page';
import { preloadMapCanvas } from '@/components/map/load-map-canvas';
import { ListingPage, ListingUnavailable, listingQueries } from '@/features/listings';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { isAppError } from '@/lib/errors';

export const Route = createFileRoute('/_site/listings/$listingId')({
  beforeLoad: () => loadFeatureNamespaces(['listings']),
  loader: async ({ context, params }) => {
    preloadMapCanvas();
    try {
      const listing = await context.queryClient.query({
        ...listingQueries.detail(params.listingId),
        staleTime: 'static',
      });
      return { title: listing.title };
    } catch (error) {
      if (isAppError(error) && (error.code === 'not_found' || error.code === 'validation')) {
        throw notFound();
      }
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: pageTitle(loaderData?.title ?? i18n.t('listings:detail.unavailable.title')) }],
  }),
  pendingComponent: PendingPage,
  notFoundComponent: ListingUnavailable,
  component: ListingRoute,
});

function ListingRoute() {
  const { listingId } = Route.useParams();
  return <ListingPage listingId={listingId} />;
}
