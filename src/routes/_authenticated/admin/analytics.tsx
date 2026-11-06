import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/admin/analytics')({
  head: panelPageHead('panel.admin.nav.analytics'),
  component: () => <PanelPage titleKey="panel.admin.nav.analytics" />,
});
