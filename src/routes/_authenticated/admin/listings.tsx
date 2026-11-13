import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { ModerationPage, moderationQueries, moderationSearchSchema } from '@/features/moderation';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/admin/listings')({
  validateSearch: moderationSearchSchema,
  loaderDeps: ({ search }) => ({ status: search.status, listing: search.listing }),
  beforeLoad: () => loadFeatureNamespaces(['moderation']),
  loader: async ({ context, deps }) => {
    const [, queue] = await Promise.all([
      context.queryClient.query({ ...moderationQueries.counts(), staleTime: 'static' }),
      context.queryClient.query({ ...moderationQueries.queue(deps.status), staleTime: 'static' }),
    ]);
    const selected = queue.items.find((item) => item.id === deps.listing) ?? queue.items[0];
    if (selected) {
      await context.queryClient.query({
        ...moderationQueries.detail(selected.id),
        staleTime: 'static',
      });
    }
  },
  head: panelPageHead('panel.admin.nav.listings'),
  pendingComponent: PendingPage,
  component: ModerationPage,
});
