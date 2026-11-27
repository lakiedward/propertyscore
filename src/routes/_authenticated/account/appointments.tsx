import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';
import { APPOINTMENT_MODES, AppointmentsPage, inspectionQueries } from '@/features/inspections';
import { loadFeatureNamespaces } from '@/i18n/i18n';

const appointmentsSearchSchema = z.object({
  sheet: z.uuid().optional().catch(undefined),
  mode: z.enum(APPOINTMENT_MODES).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/account/appointments')({
  validateSearch: appointmentsSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['inspections']),
  loader: ({ context }) =>
    context.queryClient.query({ ...inspectionQueries.mine(context.user.id), staleTime: 'static' }),
  head: panelPageHead('panel.account.nav.appointments'),
  pendingComponent: PendingPage,
  component: AppointmentsPage,
});
