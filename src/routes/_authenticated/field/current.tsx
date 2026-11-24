import { createFileRoute, redirect } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { CurrentInspectionEmpty } from '@/features/field-inspection';
import { agendaRange, inspectionQueries } from '@/features/inspections';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/field/current')({
  beforeLoad: () => loadFeatureNamespaces(['fieldInspection']),
  loader: async ({ context }) => {
    const now = new Date();
    const agenda = await context.queryClient.query(inspectionQueries.agenda(agendaRange(now)));
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const current =
      agenda.find((item) => item.status === 'in_progress') ??
      agenda.find(
        (item) =>
          item.status === 'inspector_assigned' &&
          new Date(item.starts_at).toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' }) ===
            today,
      );
    if (current) {
      throw redirect({
        to: '/field/inspections/$inspectionId',
        params: { inspectionId: current.id },
        search: {},
      });
    }
  },
  head: panelPageHead('panel.field.nav.current'),
  pendingComponent: PendingPage,
  component: CurrentInspectionEmpty,
});
