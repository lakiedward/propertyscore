import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DEFAULT_TRANSACTION } from '@/config/home-search';
import { ListingsExplorerPage, listingQueries } from '@/features/listings';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { Constants } from '@/lib/supabase/database.types';

const listingsSearchSchema = z.object({
  transaction: z.enum(Constants.public.Enums.listing_transaction).optional().catch(undefined),
});

export const Route = createFileRoute('/_site/listings')({
  validateSearch: listingsSearchSchema,
  loaderDeps: ({ search }) => ({ transaction: search.transaction ?? DEFAULT_TRANSACTION }),
  beforeLoad: () => loadFeatureNamespaces(['listings']),
  loader: ({ context, deps }) => {
    void context.queryClient
      .query(listingQueries.mapPoints(deps.transaction))
      .catch(() => undefined);
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('listings:explore.pageTitle')) }] }),
  staticData: { isFullScreen: true },
  component: ListingsRoute,
});

function ListingsRoute() {
  const { transaction = DEFAULT_TRANSACTION } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ListingsExplorerPage
      transaction={transaction}
      onTransactionChange={(next) => {
        void navigate({ search: { transaction: next }, replace: true });
      }}
    />
  );
}
