import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { favoriteQueries, FavoritesPage } from '@/features/listings';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/account/favorites')({
  beforeLoad: () => loadFeatureNamespaces(['listings']),
  loader: ({ context }) =>
    context.queryClient.infiniteQuery({
      ...favoriteQueries.list(context.user.id),
      staleTime: 'static',
    }),
  head: panelPageHead('panel.account.nav.favorites'),
  pendingComponent: PendingPage,
  component: FavoritesPage,
});
