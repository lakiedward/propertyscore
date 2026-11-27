import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import {
  ContentPage,
  contentSearchSchema,
  inspectionFormQueries,
} from '@/features/inspection-form';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/admin/content')({
  validateSearch: contentSearchSchema,
  loaderDeps: ({ search }) => ({ tab: search.tab, version: search.version ?? null }),
  beforeLoad: () => loadFeatureNamespaces(['inspectionForm']),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query({
        ...inspectionFormQueries.editor(deps.tab === 'form' ? deps.version : null),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...inspectionFormQueries.consent(deps.tab === 'consent' ? deps.version : null),
        staleTime: 'static',
      }),
    ]),
  head: panelPageHead('panel.admin.nav.content'),
  pendingComponent: PendingPage,
  component: ContentPage,
});
