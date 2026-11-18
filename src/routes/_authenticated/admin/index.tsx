import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/admin/')({
  head: panelPageHead('panel.admin.nav.dashboard'),
  component: () => <PanelPage titleKey="panel.admin.nav.dashboard" />,
});
