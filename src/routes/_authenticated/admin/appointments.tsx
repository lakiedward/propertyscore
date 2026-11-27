import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { panelPageHead } from '@/components/layout/panel-page-head';
import {
  AdminSchedulePage,
  APPOINTMENT_MODES,
  inspectionQueries,
  SCHEDULE_TABS,
  SCHEDULE_VIEWS,
} from '@/features/inspections';
import { loadFeatureNamespaces } from '@/i18n/i18n';

const scheduleSearchSchema = z.object({
  tab: z.enum(SCHEDULE_TABS).catch('calendar').default('calendar'),
  view: z.enum(SCHEDULE_VIEWS).catch('day').default('day'),
  date: z.iso.date().optional().catch(undefined),
  city: z.uuid().optional().catch(undefined),
  inspector: z.uuid().optional().catch(undefined),
  sheet: z.uuid().optional().catch(undefined),
  pick: z.uuid().optional().catch(undefined),
  queueCity: z.uuid().optional().catch(undefined),
  queueDate: z.iso.date().optional().catch(undefined),
  mode: z.enum(APPOINTMENT_MODES).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/admin/appointments')({
  validateSearch: scheduleSearchSchema,
  beforeLoad: () => loadFeatureNamespaces(['inspections', 'staff']),
  loader: ({ context }) => {
    void context.queryClient.query(inspectionQueries.unassigned(null)).catch(() => undefined);
    void context.queryClient.query(inspectionQueries.inspectors(null)).catch(() => undefined);
  },
  head: panelPageHead('panel.admin.nav.appointments'),
  component: AdminSchedulePage,
});
