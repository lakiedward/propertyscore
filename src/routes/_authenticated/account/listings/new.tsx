import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import {
  ListingEditorPage,
  listingEditorSearchSchema,
  myListingQueries,
} from '@/features/listings';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/account/listings/new')({
  validateSearch: listingEditorSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['myListings']),
  loader: ({ context }) =>
    context.queryClient.query({ ...myListingQueries.cities(), staleTime: 'static' }),
  head: panelPageHead('panel.account.nav.listings'),
  pendingComponent: PendingPage,
  component: NewListingRoute,
});

function NewListingRoute() {
  const { step } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ListingEditorPage
      step={step}
      onStepChange={(next) => void navigate({ search: { step: next } })}
    />
  );
}
