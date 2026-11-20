import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { MyAvailabilityPage } from '@/features/staff';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_authenticated/field/availability')({
  beforeLoad: () => loadFeatureNamespaces(['staff']),
  head: panelPageHead('panel.field.nav.availability'),
  component: MyAvailabilityPage,
});
