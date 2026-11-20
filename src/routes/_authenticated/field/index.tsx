import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { AGENDA_DAYS, AgendaPage, agendaRange, inspectionQueries } from '@/features/inspections';
import { loadFeatureNamespaces } from '@/i18n/i18n';

const agendaSearchSchema = z.object({
  day: z.enum(AGENDA_DAYS).catch('today').default('today'),
});

export const Route = createFileRoute('/_authenticated/field/')({
  validateSearch: agendaSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['inspections']),
  loader: ({ context }) =>
    context.queryClient.query({
      ...inspectionQueries.agenda(agendaRange(new Date())),
      staleTime: 'static',
    }),
  head: panelPageHead('panel.field.nav.agenda'),
  pendingComponent: PendingPage,
  component: AgendaPage,
});
