import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DEFAULT_TRANSACTION } from '@/config/home-search';
import {
  DEFAULT_EXPLORER_SORT,
  EXPLORER_CITY_IDS,
  EXPLORER_SORTS,
} from '@/config/listings-explorer';
import { ListingsExplorerPage, listingQueries } from '@/features/listings';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { Constants } from '@/lib/supabase/database.types';

const listingsSearchSchema = z.object({
  transaction: z.enum(Constants.public.Enums.listing_transaction).optional().catch(undefined),
  city: z.enum(EXPLORER_CITY_IDS).optional().catch(undefined),
  price: z.coerce.number().int().positive().optional().catch(undefined),
  sort: z.enum(EXPLORER_SORTS).optional().catch(undefined),
});

export const Route = createFileRoute('/_site/listings')({
  validateSearch: listingsSearchSchema,
  loaderDeps: ({ search }) => ({ transaction: search.transaction ?? DEFAULT_TRANSACTION }),
  beforeLoad: () => loadFeatureNamespaces(['listings']),
  loader: ({ context, deps }) => {
    void context.queryClient
      .query(listingQueries.mapPoints(deps.transaction))
      .catch(() => undefined);
    void context.queryClient.query(listingQueries.romaniaRegions()).catch(() => undefined);
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('listings:explore.pageTitle')) }] }),
  staticData: { hasCompactFooter: true },
  component: ListingsRoute,
});

function ListingsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ListingsExplorerPage
      search={{
        transaction: search.transaction ?? DEFAULT_TRANSACTION,
        city: search.city,
        maxPrice: search.price,
        sort: search.sort ?? DEFAULT_EXPLORER_SORT,
      }}
      onSearchChange={(patch) => {
        void navigate({
          search: (previous) => {
            const next = { ...previous };
            if ('transaction' in patch) {
              next.transaction =
                patch.transaction === DEFAULT_TRANSACTION ? undefined : patch.transaction;
            }
            if ('city' in patch) {
              next.city = patch.city;
            }
            if ('maxPrice' in patch) {
              next.price = patch.maxPrice;
            }
            if ('sort' in patch) {
              next.sort = patch.sort === DEFAULT_EXPLORER_SORT ? undefined : patch.sort;
            }
            return next;
          },
          replace: true,
        });
      }}
    />
  );
}
