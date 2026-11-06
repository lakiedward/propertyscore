import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/appointments')({
  head: panelPageHead('panel.account.nav.appointments'),
  component: () => <PanelPage titleKey="panel.account.nav.appointments" />,
});
