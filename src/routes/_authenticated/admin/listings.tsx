import { createFileRoute, redirect } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import {
  ModerationPage,
  moderationQueries,
  moderationSearchSchema,
  selectQueueListing,
} from '@/features/moderation';
import { loadFeatureNamespaces } from '@/i18n/i18n';
import { isAppError } from '@/lib/errors';

export const Route = createFileRoute('/_authenticated/admin/listings')({
  validateSearch: moderationSearchSchema,
  loaderDeps: ({ search }) => ({ status: search.status, listing: search.listing }),
  beforeLoad: () => loadFeatureNamespaces(['moderation']),
  loader: async ({ context, deps }) => {
    const linkedListing = deps.listing
      ? context.queryClient
          .query({ ...moderationQueries.detail(deps.listing), staleTime: 'static' })
          .then(
            () => true,
            (error: unknown) => {
              if (isAppError(error) && error.code === 'not_found') {
                return false;
              }
              throw error;
            },
          )
      : Promise.resolve(true);
    const [, queue, isLinkedListingFound] = await Promise.all([
      context.queryClient.query({ ...moderationQueries.counts(), staleTime: 'static' }),
      context.queryClient.infiniteQuery({
        ...moderationQueries.queue(deps.status),
        staleTime: 'static',
      }),
      linkedListing,
    ]);
    if (!isLinkedListingFound) {
      throw redirect({ to: '/admin/listings', search: { status: deps.status } });
    }
    const selectedId = selectQueueListing(
      queue.pages.flatMap((page) => page.items),
      deps.listing,
    );
    if (selectedId && !deps.listing) {
      await context.queryClient.query({
        ...moderationQueries.detail(selectedId),
        staleTime: 'static',
      });
    }
  },
  head: panelPageHead('panel.admin.nav.listings'),
  pendingComponent: PendingPage,
  component: ModerationPage,
});
