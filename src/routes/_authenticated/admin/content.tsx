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
  beforeLoad: () => loadFeatureNamespaces(['inspectionForm']),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({ ...inspectionFormQueries.editor(), staleTime: 'static' }),
      context.queryClient.query({ ...inspectionFormQueries.consent(), staleTime: 'static' }),
    ]),
  head: panelPageHead('panel.admin.nav.content'),
  pendingComponent: PendingPage,
  component: ContentPage,
});
