import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { MyAvailabilityPage, staffQueries } from '@/features/staff';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/field/availability')({
  beforeLoad: () => loadFeatureNamespaces(['staff']),
  loader: ({ context }) => {
    const inspectorId = context.user.id;
    void context.queryClient.query(staffQueries.weeklyHours(inspectorId)).catch(() => undefined);
  },
  head: panelPageHead('panel.field.nav.availability'),
  component: MyAvailabilityPage,
});
