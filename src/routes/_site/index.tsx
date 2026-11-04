import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DEFAULT_TRANSACTION, HOME_DELIVERABLES } from '@/config/home-search';
import { HomePage } from '@/features/home';
import { LISTINGS_PREVIEW_LIMIT, listingQueries } from '@/features/listings';
import { i18n, loadFeatureNamespaces } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import { Constants } from '@/lib/supabase/database.types';

const homeSearchSchema = z.object({
  transaction: z.enum(Constants.public.Enums.listing_transaction).optional().catch(undefined),
  deliverable: z.enum(HOME_DELIVERABLES).optional().catch(undefined),
});

export const Route = createFileRoute('/_site/')({
  validateSearch: homeSearchSchema,
  loaderDeps: ({ search }) => ({ transaction: search.transaction ?? DEFAULT_TRANSACTION }),
  beforeLoad: () => loadFeatureNamespaces(['home', 'listings']),
  loader: ({ context, deps }) => {
    void context.queryClient
      .query(listingQueries.list({ transaction: deps.transaction, limit: LISTINGS_PREVIEW_LIMIT }))
      .catch(() => undefined);
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('home:pageTitle')) }] }),
  codeSplitGroupings: [['loader', 'component']],
  component: HomePage,
});
