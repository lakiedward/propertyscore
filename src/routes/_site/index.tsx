import { createFileRoute } from '@tanstack/react-router';
import { HomePage, homeSearchSchema } from '@/features/home';
import { LISTINGS_PREVIEW_LIMIT, listingQueries } from '@/features/listings';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_site/')({
  validateSearch: homeSearchSchema,
  loaderDeps: ({ search }) => ({ transaction: search.transaction ?? 'sale' }),
  loader: ({ context, deps }) => {
    void context.queryClient
      .query(listingQueries.list({ transaction: deps.transaction, limit: LISTINGS_PREVIEW_LIMIT }))
      .catch(() => undefined);
  },
  head: () => ({ meta: [{ title: pageTitle(i18n.t('home:pageTitle')) }] }),
  component: HomePage,
});
