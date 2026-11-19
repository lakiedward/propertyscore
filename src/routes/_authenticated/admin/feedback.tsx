import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/admin/feedback')({
  head: panelPageHead('panel.admin.nav.feedback'),
  component: () => <PanelPage titleKey="panel.admin.nav.feedback" />,
});
